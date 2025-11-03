from fastapi import FastAPI, Depends, HTTPException, Body
from fastapi.security import OAuth2PasswordBearer
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, EmailStr, Field, condecimal
from motor.motor_asyncio import AsyncIOMotorDatabase
from database import get_database
from bson import ObjectId
from passlib.context import CryptContext
from datetime import datetime, timedelta, timezone
from jose import jwt, JWTError
from typing import Optional, Literal
from decimal import Decimal
import os
from dotenv import load_dotenv
import smtplib
from email.mime.text import MIMEText
import threading  # ← ADD THIS LINE

# ------------------------------
# Load environment variables
# ------------------------------
load_dotenv()

SECRET_KEY = os.getenv("SECRET_KEY")
ALGORITHM = os.getenv("ALGORITHM", "HS256")
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", 60))

# Email config (for development, use Gmail or any SMTP)
SMTP_HOST = os.getenv("SMTP_HOST", "smtp.gmail.com")
SMTP_PORT = int(os.getenv("SMTP_PORT", 587))
SMTP_USER = os.getenv("SMTP_USER")  # e.g., your_email@gmail.com
SMTP_PASS = os.getenv("SMTP_PASS")  # app password
EMAIL_FROM = os.getenv("EMAIL_FROM", "no-reply@yourapp.com")

# ------------------------------
# Password hashing
# ------------------------------
pwd_context = CryptContext(schemes=["argon2"], deprecated="auto")

# ------------------------------
# FastAPI App
# ------------------------------
app = FastAPI(title="FastAPI + MongoDB Atlas Example")

# ------------------------------
# CORS Middleware
# ------------------------------
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ------------------------------
# Pydantic Models
# ------------------------------
class SubscriptionUpdate(BaseModel):
    name: Optional[str] = None
    cost: Optional[float] = None
    billing_cycle: Optional[Literal["monthly", "yearly", "custom"]] = None
    category_id: Optional[str] = None
    custom_cycle_days: Optional[int] = None
    next_billing_date: Optional[str] = None  # Accept string from frontend
    payment_method: Optional[str] = None
    notes: Optional[str] = None
    is_active: Optional[bool] = None

    class Config:
        extra = "forbid"

class UserSignup(BaseModel):
    name: str = Field(..., min_length=2, max_length=100)
    email: EmailStr
    password: str = Field(..., min_length=6)

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"

class SubscriptionCreate(BaseModel):
    name: str = Field(..., max_length=100)
    cost: condecimal(gt=0, max_digits=10, decimal_places=2)
    billing_cycle: Literal["monthly", "yearly", "custom"]
    custom_cycle_days: Optional[int] = None
    next_billing_date: datetime
    category_id: Optional[str] = None
    payment_method: str
    logo_url: Optional[str] = None
    notes: Optional[str] = None

# ------------------------------
# JWT
# ------------------------------
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/login")

def hash_password(password: str) -> str:
    return pwd_context.hash(password)

def verify_password(plain: str, hashed: str) -> bool:
    return pwd_context.verify(plain, hashed)

def create_access_token(data: dict, expires_delta: timedelta | None = None):
    to_encode = data.copy()
    expire = datetime.utcnow() + (expires_delta if expires_delta else timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES))
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)

async def get_current_user(token: str = Depends(oauth2_scheme), db: AsyncIOMotorDatabase = Depends(get_database)):
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id: str = payload.get("sub")
        if not user_id:
            raise HTTPException(status_code=401, detail="Invalid token")
        user = await db["users"].find_one({"_id": ObjectId(user_id)})
        if not user:
            raise HTTPException(status_code=401, detail="User not found")
        return user
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid token")

# ------------------------------
# Helper: Serialize MongoDB document
# ------------------------------
def serialize_doc(doc: dict) -> dict:
    serialized = {}
    for k, v in doc.items():
        if isinstance(v, ObjectId):
            serialized[k] = str(v)
        elif isinstance(v, datetime):
            serialized[k] = v.isoformat()
        else:
            serialized[k] = v
    return serialized

# ------------------------------
# Email Sending Function
# ------------------------------
def send_email_sync(to_email: str, subject: str, body: str):
    """Synchronous email sender using SMTP (for scheduler)"""
    if not SMTP_USER or not SMTP_PASS:
        print(f"[EMAIL SKIPPED] SMTP not configured. Would send to {to_email}")
        return

    msg = MIMEText(body)
    msg['Subject'] = subject
    msg['From'] = EMAIL_FROM
    msg['To'] = to_email

    try:
        with smtplib.SMTP(SMTP_HOST, SMTP_PORT) as server:
            server.starttls()
            server.login(SMTP_USER, SMTP_PASS)
            server.send_message(msg)
        print(f"[EMAIL SENT] {subject} → {to_email}")
    except Exception as e:
        print(f"[EMAIL FAILED] {to_email}: {e}")

# ------------------------------
# APScheduler Setup
# ------------------------------
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.cron import CronTrigger

scheduler = AsyncIOScheduler()

async def send_reminder_emails():
    db: AsyncIOMotorDatabase = get_database()  # ← FIXED: No await
    now = datetime.now(timezone.utc)
    print(f"[REMINDER JOB] Running at {now.isoformat()}")

    targets = [
        (now + timedelta(days=3)).date(),
        (now + timedelta(days=1)).date(),
        now.date()
    ]

    for target_date in targets:
        start_of_day = datetime.combine(target_date, datetime.min.time(), tzinfo=timezone.utc)
        end_of_day = datetime.combine(target_date, datetime.max.time(), tzinfo=timezone.utc)

        query = {
            "next_billing_date": {"$gte": start_of_day, "$lte": end_of_day},
            "is_active": True
        }

        cursor = db["subscriptions"].find(query)
        async for sub in cursor:
            user = await db["users"].find_one({"_id": sub["user_id"]})
            if not user:
                continue

            days_left = (sub["next_billing_date"].date() - now.date()).days
            if days_left not in [0, 1, 3]:
                continue

            prefix = {0: "TODAY", 1: "TOMORROW", 3: "IN 3 DAYS"}.get(days_left, "SOON")
            subject = f"{prefix}: {sub['name']} Renewal Reminder"

            body = f"""
Hi {user['name']},

Your subscription is renewing {prefix.lower()}!

Subscription Details:
• Name: {sub['name']}
• Cost: ${sub['cost']:.2f}
• Next Billing Date: {sub['next_billing_date'].strftime('%Y-%m-%d')}

Manage your subscriptions:
http://localhost:3000/dashboard

---
Subscription Manager
            """.strip()

            threading.Thread(target=send_email_sync, args=(user["email"], subject, body)).start()

    print(f"[REMINDER JOB] Completed at {datetime.now(timezone.utc).isoformat()}")
# ------------------------------
# Startup: Start Scheduler
# ------------------------------
@app.on_event("startup")
async def startup_event():
    print("Starting APScheduler for daily reminders...")
    scheduler.add_job(
        send_reminder_emails,
        trigger=CronTrigger(hour=8, minute=0, timezone="UTC"),  # 8 AM UTC daily
        id="daily_subscription_reminders",
        replace_existing=True,
        max_instances=1
    )
    scheduler.start()
    print("Scheduler started: reminders will run daily at 8:00 AM UTC")

@app.on_event("shutdown")
async def shutdown_event():
    print("Shutting down scheduler...")
    scheduler.shutdown()
    print("Scheduler stopped.")

# ------------------------------
# Routes
# ------------------------------
@app.post("/signup")
async def signup(user: UserSignup, db: AsyncIOMotorDatabase = Depends(get_database)):
    existing = await db["users"].find_one({"email": user.email})
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered.")
    new_user = {"name": user.name, "email": user.email, "password": hash_password(user.password)}
    result = await db["users"].insert_one(new_user)
    return {"message": "User registered successfully!", "user_id": str(result.inserted_id)}

@app.post("/login", response_model=Token)
async def login(user: UserLogin, db: AsyncIOMotorDatabase = Depends(get_database)):
    db_user = await db["users"].find_one({"email": user.email})
    if not db_user or not verify_password(user.password, db_user["password"]):
        raise HTTPException(status_code=401, detail="Invalid email or password.")
    token = create_access_token({"sub": str(db_user["_id"])})
    return {"access_token": token, "token_type": "bearer"}

@app.get("/dashboard")
async def dashboard(current_user: dict = Depends(get_current_user), db: AsyncIOMotorDatabase = Depends(get_database)):
    cursor = db["subscriptions"].find({"user_id": ObjectId(current_user["_id"]), "is_active": True})
    subs = await cursor.to_list(None)
    subs_serialized = [serialize_doc(s) for s in subs]
    return {"count": len(subs_serialized), "subscriptions": subs_serialized}

@app.post("/dashboard/subscription")
async def add_subscription(subscription: SubscriptionCreate, current_user: dict = Depends(get_current_user), db: AsyncIOMotorDatabase = Depends(get_database)):
    sub_data = {
        "user_id": ObjectId(current_user["_id"]),
        "name": subscription.name,
        "cost": float(subscription.cost),
        "billing_cycle": subscription.billing_cycle,
        "custom_cycle_days": subscription.custom_cycle_days,
        "next_billing_date": subscription.next_billing_date,
        "payment_method": subscription.payment_method,
        "category_id": ObjectId(subscription.category_id) if subscription.category_id else None,
        "logo_url": subscription.logo_url,
        "notes": subscription.notes,
        "is_active": True,
        "created_at": datetime.utcnow(),
        "updated_at": datetime.utcnow(),
    }
    result = await db["subscriptions"].insert_one(sub_data)
    return {"message": "Subscription added successfully!", "id": str(result.inserted_id)}

@app.get("/dashboard/subscriptions")
async def list_subscriptions(current_user: dict = Depends(get_current_user), db: AsyncIOMotorDatabase = Depends(get_database)):
    cursor = db["subscriptions"].find({"user_id": ObjectId(current_user["_id"])})
    subs = await cursor.to_list(None)
    subs_serialized = [serialize_doc(s) for s in subs]
    return {"subscriptions": subs_serialized}

@app.put("/dashboard/subscription/{subscription_id}")
async def edit_subscription(
    subscription_id: str,
    updated_data: SubscriptionUpdate = Body(...),
    current_user: dict = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    print("="*60)
    print("EDIT SUBSCRIPTION REQUEST START")
    print(f"Subscription ID: {subscription_id}")
    print(f"Current user ID: {current_user['_id']}")
    print(f"Raw updated_data: {updated_data}")

    try:
        existing = await db["subscriptions"].find_one({
            "_id": ObjectId(subscription_id),
            "user_id": ObjectId(current_user["_id"])
        })
        if not existing:
            print("Subscription not found in database")
            raise HTTPException(status_code=404, detail="Subscription not found.")
        print(f"Found subscription: {existing.get('name')}")
    except Exception as e:
        print(f"Error fetching subscription: {e}")
        raise HTTPException(status_code=400, detail=f"Invalid subscription ID: {e}")

    updated_fields = updated_data.dict(exclude_unset=True)
    print(f"[Step 2] Fields to update: {updated_fields}")
    
    updated_fields["updated_at"] = datetime.utcnow()

    if "cost" in updated_fields and isinstance(updated_fields["cost"], (Decimal, int)):
        updated_fields["cost"] = float(updated_fields["cost"])

    if "category_id" in updated_fields and updated_fields["category_id"]:
        try:
            updated_fields["category_id"] = ObjectId(updated_fields["category_id"])
        except Exception as e:
            raise HTTPException(status_code=400, detail=f"Invalid category_id: {e}")

    if "next_billing_date" in updated_fields:
        date_str = updated_fields["next_billing_date"]
        if date_str and date_str.strip():
            try:
                naive_dt = datetime.strptime(date_str.strip(), "%Y-%m-%d")
                updated_fields["next_billing_date"] = naive_dt.replace(tzinfo=timezone.utc)
            except ValueError:
                raise HTTPException(status_code=400, detail="next_billing_date must be in YYYY-MM-DD format")
        else:
            updated_fields["next_billing_date"] = None

    print(f"[Step 7] Updating database with: {updated_fields}")
    try:
        result = await db["subscriptions"].update_one(
            {"_id": ObjectId(subscription_id)},
            {"$set": updated_fields}
        )
        if result.matched_count == 0:
            raise HTTPException(status_code=404, detail="Subscription not found during update")
    except Exception as e:
        print(f"Database update failed: {e}")
        raise HTTPException(status_code=500, detail=f"Database update failed: {e}")

    updated_fields_serialized = {
        k: str(v) if isinstance(v, ObjectId) else v.isoformat() if isinstance(v, datetime) else v
        for k, v in updated_fields.items()
    }
    print("EDIT SUBSCRIPTION REQUEST SUCCESS")
    print("="*60)

    return {"message": "Subscription updated successfully!", "updated_fields": updated_fields_serialized}

@app.delete("/dashboard/subscription/{subscription_id}")
async def delete_subscription(
    subscription_id: str,
    confirm: bool = False,
    current_user: dict = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    existing = await db["subscriptions"].find_one({"_id": ObjectId(subscription_id), "user_id": ObjectId(current_user["_id"])})
    if not existing:
        raise HTTPException(status_code=404, detail="Subscription not found.")
    if not confirm:
        return {"message": "Please confirm deletion by setting ?confirm=true"}
    await db["subscriptions"].delete_one({"_id": ObjectId(subscription_id)})
    return {"message": "Subscription deleted successfully!"}

# -------------------------------------------------
# TEMPORARY: Manual trigger for testing reminders
# -------------------------------------------------
@app.get("/admin/trigger-reminders")
async def trigger_reminders():
    """Call this endpoint to run the reminder job immediately."""
    await send_reminder_emails()
    return {"status": "Reminder job executed – check your inbox and terminal"}
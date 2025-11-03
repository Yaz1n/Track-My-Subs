from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from pydantic import BaseModel, EmailStr, Field, condecimal
from motor.motor_asyncio import AsyncIOMotorDatabase
from database import get_database
from bson import ObjectId
from passlib.context import CryptContext
from datetime import datetime, timedelta
from jose import jwt, JWTError
import os
from dotenv import load_dotenv
from typing import Optional, Literal

# ------------------------------
# Load environment variables
# ------------------------------
load_dotenv()

SECRET_KEY = os.getenv("SECRET_KEY")
ALGORITHM = os.getenv("ALGORITHM", "HS256")
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", 60))

# ------------------------------
# Password hashing with Argon2
# ------------------------------
pwd_context = CryptContext(schemes=["argon2"], deprecated="auto")

# ------------------------------
# FastAPI App
# ------------------------------
app = FastAPI(title="FastAPI + MongoDB Atlas Example")

# ------------------------------
# Pydantic Models
# ------------------------------
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
# OAuth2 scheme for JWT
# ------------------------------
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/login")

# ------------------------------
# Utility Functions
# ------------------------------
def hash_password(password: str) -> str:
    return pwd_context.hash(password)

def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)

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
            raise HTTPException(status_code=401, detail="Invalid authentication credentials")
        user = await db["users"].find_one({"_id": ObjectId(user_id)})
        if not user:
            raise HTTPException(status_code=401, detail="User not found")
        return user
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid token")

# ------------------------------
# Routes
# ------------------------------
@app.get("/")
async def root(db: AsyncIOMotorDatabase = Depends(get_database)):
    try:
        sample_user = await db["users"].find_one()
        return {"message": "Connected successfully to MongoDB Atlas!", "sample_user": sample_user}
    except Exception as e:
        return {"error": str(e)}

@app.post("/signup", response_model=dict)
async def signup(user: UserSignup, db: AsyncIOMotorDatabase = Depends(get_database)):
    existing_user = await db["users"].find_one({"email": user.email})
    if existing_user:
        raise HTTPException(status_code=400, detail="Email already registered.")
    new_user = {"name": user.name, "email": user.email, "password": hash_password(user.password)}
    result = await db["users"].insert_one(new_user)
    return {"message": "User registered successfully!", "user_id": str(result.inserted_id), "email": user.email}

@app.post("/login", response_model=Token)
async def login(user: UserLogin, db: AsyncIOMotorDatabase = Depends(get_database)):
    db_user = await db["users"].find_one({"email": user.email})
    if not db_user or not verify_password(user.password, db_user["password"]):
        raise HTTPException(status_code=401, detail="Invalid email or password.")
    access_token = create_access_token({"sub": str(db_user["_id"])})
    return {"access_token": access_token, "token_type": "bearer"}

@app.get("/dashboard")
async def dashboard(current_user: dict = Depends(get_current_user)):
    return {"message": f"Welcome to your dashboard, {current_user['name']}!", "email": current_user["email"]}

# ------------------------------
# Add Subscription Route
# ------------------------------
@app.post("/dashboard/subscription")
async def add_subscription(
    subscription: SubscriptionCreate,
    current_user: dict = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    """Add a new subscription for the logged-in user."""
    subscription_data = {
        "user_id": ObjectId(current_user["_id"]),
        "name": subscription.name,
        "cost": float(subscription.cost),
        "billing_cycle": subscription.billing_cycle,
        "custom_cycle_days": subscription.custom_cycle_days,
        "next_billing_date": subscription.next_billing_date,
        "category_id": ObjectId(subscription.category_id) if subscription.category_id else None,
        "payment_method": subscription.payment_method,
        "logo_url": subscription.logo_url,
        "notes": subscription.notes,
        "is_active": True,
        "created_at": datetime.utcnow(),
        "updated_at": datetime.utcnow(),
        "last_reminder_sent": None,
    }

    result = await db["subscriptions"].insert_one(subscription_data)

    return {
        "message": "Subscription added successfully!",
        "subscription_id": str(result.inserted_id),
        "name": subscription.name,
        "next_billing_date": subscription.next_billing_date,
    }
# ------------------------------
# List Subscriptions Route
# ------------------------------
@app.get("/dashboard/subscriptions")
async def list_subscriptions(
    current_user: dict = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    """List all subscriptions for the logged-in user."""
    cursor = db["subscriptions"].find({"user_id": ObjectId(current_user["_id"])})
    subscriptions = await cursor.to_list(length=None)

    # Convert ObjectId and datetime fields for JSON serialization
    for sub in subscriptions:
        sub["_id"] = str(sub["_id"])
        sub["user_id"] = str(sub["user_id"])
        if sub.get("category_id"):
            sub["category_id"] = str(sub["category_id"])
        if sub.get("next_billing_date"):
            sub["next_billing_date"] = sub["next_billing_date"].isoformat()
        if sub.get("created_at"):
            sub["created_at"] = sub["created_at"].isoformat()
        if sub.get("updated_at"):
            sub["updated_at"] = sub["updated_at"].isoformat()
        if sub.get("last_reminder_sent"):
            sub["last_reminder_sent"] = sub["last_reminder_sent"].isoformat() if sub["last_reminder_sent"] else None

    return {
        "count": len(subscriptions),
        "subscriptions": subscriptions
    }

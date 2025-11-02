# backend/main.py
from fastapi import FastAPI, Depends
from database import get_database
from motor.motor_asyncio import AsyncIOMotorDatabase

app = FastAPI(title="FastAPI + MongoDB Atlas Example")

@app.get("/")
async def root(db: AsyncIOMotorDatabase = Depends(get_database)):
    """Test MongoDB connection"""
    try:
        # Attempt to fetch a single document (or None)
        sample_user = await db["users"].find_one()
        return {
            "message": "Connected successfully to MongoDB Atlas!",
            "sample_user": sample_user
        }
    except Exception as e:
        return {"error": str(e)}

@app.on_event("startup")
async def startup_event():
    print("🚀 FastAPI app started successfully!")

@app.on_event("shutdown")
async def shutdown_event():
    print("🛑 FastAPI app shutting down...")

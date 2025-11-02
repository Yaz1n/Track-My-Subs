# backend/database.py
import motor.motor_asyncio
from dotenv import load_dotenv
import os

# Load environment variables from .env
load_dotenv()

# Read MongoDB connection details
MONGODB_URI = os.getenv("MONGODB_URI")
DB_NAME = os.getenv("MONGODB_DB_NAME")

# Create a single client instance (MongoDB client is thread-safe)
client = motor.motor_asyncio.AsyncIOMotorClient(
    MONGODB_URI,
    maxPoolSize=10,  # optional: connection pool size
    minPoolSize=1,
    serverSelectionTimeoutMS=5000
)

# Reference to the database
database = client[DB_NAME]

# Dependency function
def get_database():
    return database

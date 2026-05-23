"""
Seed dev data: a few users (with profiles) + a few sample matches.
Run: python /app/backend/seed_data.py
Idempotent — uses fixed emails / IDs.
"""
import asyncio
import os
from datetime import datetime, timezone, timedelta
from pathlib import Path
from dotenv import load_dotenv
from motor.motor_asyncio import AsyncIOMotorClient
import bcrypt

ROOT = Path(__file__).parent
load_dotenv(ROOT / ".env")

client = AsyncIOMotorClient(os.environ["MONGO_URL"])
db = client[os.environ["DB_NAME"]]


def hash_pw(pw: str) -> str:
    return bcrypt.hashpw(pw.encode(), bcrypt.gensalt()).decode()


USERS = [
    {
        "user_id": "user_seed_alex01",
        "email": "alex.demo@huddle.app",
        "display_name": "Alex Rivera",
        "photo_url": "https://images.unsplash.com/photo-1610041321420-a596dd14ebc9?crop=entropy&cs=srgb&fm=jpg&ixid=M3w4NjY2NzF8MHwxfHNlYXJjaHwzfHxlc3BvcnRzJTIwZ2FtaW5nJTIwbmVvbiUyMGRhcmt8ZW58MHx8fHwxNzc5NTcyNDQyfDA&ixlib=rb-4.1.0&q=85",
        "preferred_sports": ["Basketball", "Tennis"],
        "skill_level": "Intermediate",
        "location_name": "Brooklyn, NY",
        "bio": "Pickup ball most weekends. Looking for a regular squad.",
    },
    {
        "user_id": "user_seed_maya02",
        "email": "maya.demo@huddle.app",
        "display_name": "Maya Chen",
        "photo_url": "https://images.pexels.com/photos/30050102/pexels-photo-30050102.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940",
        "preferred_sports": ["Soccer", "Running"],
        "skill_level": "Advanced",
        "location_name": "San Francisco, CA",
        "bio": "Striker. Marathon runner. Always up for a kickabout.",
    },
    {
        "user_id": "user_seed_jay03",
        "email": "jay.demo@huddle.app",
        "display_name": "Jay Patel",
        "photo_url": None,
        "preferred_sports": ["Valorant", "CS2", "Esports"],
        "skill_level": "Pro",
        "location_name": "Austin, TX",
        "bio": "Diamond Valorant. Looking for a serious 5-stack.",
    },
    {
        "user_id": "user_seed_sam04",
        "email": "sam.demo@huddle.app",
        "display_name": "Sam Okafor",
        "photo_url": None,
        "preferred_sports": ["Soccer", "Basketball"],
        "skill_level": "Beginner",
        "location_name": "London, UK",
        "bio": "Just starting out — patient teammates welcome.",
    },
]

MATCHES = [
    {
        "id": "match_seed_bball01",
        "creator_id": "user_seed_alex01",
        "sport": "Basketball",
        "title": "Sunday Pickup at Prospect Park",
        "location_name": "Prospect Park, Brooklyn",
        "max_players": 10,
        "participants": ["user_seed_alex01", "user_seed_sam04"],
        "skill_level": "Intermediate",
        "description": "Casual 5v5 pickup. Bring your A-game and water.",
        "cover_image": "https://images.unsplash.com/photo-1590227632180-80a3bf110871?crop=entropy&cs=srgb&fm=jpg&ixid=M3w4NjA1MDZ8MHwxfHNlYXJjaHwxfHxiYXNrZXRiYWxsJTIwcGxheWVyJTIwZGFya3xlbnwwfHx8fDE3Nzk1NzI0NDJ8MA&ixlib=rb-4.1.0&q=85",
    },
    {
        "id": "match_seed_soccer02",
        "creator_id": "user_seed_maya02",
        "sport": "Soccer",
        "title": "Friday Night 7v7",
        "location_name": "Golden Gate Park Field 2",
        "max_players": 14,
        "participants": ["user_seed_maya02"],
        "skill_level": "Advanced",
        "description": "Competitive 7v7. Cleats required.",
        "cover_image": None,
    },
    {
        "id": "match_seed_val03",
        "creator_id": "user_seed_jay03",
        "sport": "Valorant",
        "title": "Ranked Grind — Diamond+",
        "location_name": "Online · NA Server",
        "max_players": 5,
        "participants": ["user_seed_jay03"],
        "skill_level": "Pro",
        "description": "Looking for 4 more for a ranked grind session. Comms required.",
        "cover_image": None,
    },
]


async def main():
    now = datetime.now(timezone.utc)
    for u in USERS:
        doc = {
            **u,
            "password_hash": hash_pw("password123"),
            "auth_provider": "email",
            "latitude": None, "longitude": None,
            "created_at": now,
        }
        await db.users.update_one({"user_id": u["user_id"]}, {"$set": doc}, upsert=True)
    for i, m in enumerate(MATCHES):
        doc = {
            **m,
            "date_time": now + timedelta(hours=24 + i * 12),
            "latitude": None, "longitude": None,
            "created_at": now,
        }
        await db.matches.update_one({"id": m["id"]}, {"$set": doc}, upsert=True)
    print(f"Seeded {len(USERS)} users and {len(MATCHES)} matches.")


if __name__ == "__main__":
    asyncio.run(main())

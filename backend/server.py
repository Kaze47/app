"""
Sports & Gaming Community App backend.
- JWT email/password auth + Emergent Google session_token auth (dual)
- Users, Matches, Teams, Messages (REST + WebSocket chat)
"""
import os
import uuid
import logging
import secrets
from pathlib import Path
from datetime import datetime, timezone, timedelta
from typing import List, Optional, Dict, Any

import bcrypt
import jwt
import httpx
from fastapi import (
    FastAPI, APIRouter, HTTPException, Depends, Request, WebSocket,
    WebSocketDisconnect, Header, status,
)
from fastapi.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel, EmailStr, Field
from dotenv import load_dotenv

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / ".env")

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
log = logging.getLogger("sports-app")

# ---------- Config ----------
MONGO_URL = os.environ["MONGO_URL"]
DB_NAME = os.environ["DB_NAME"]
JWT_SECRET = os.environ.get("JWT_SECRET", "dev-secret-change-me-please-32chars-min")
JWT_ALGO = "HS256"
JWT_TTL_DAYS = 7
EMERGENT_SESSION_API = "https://demobackend.emergentagent.com/auth/v1/env/oauth/session-data"

client = AsyncIOMotorClient(MONGO_URL)
db = client[DB_NAME]

app = FastAPI(title="Sports Community API")
api = APIRouter(prefix="/api")


# ---------- Models ----------
class RegisterBody(BaseModel):
    email: EmailStr
    password: str = Field(min_length=6)
    display_name: str

class LoginBody(BaseModel):
    email: EmailStr
    password: str

class SessionBody(BaseModel):
    session_token: str

class ProfileUpdate(BaseModel):
    display_name: Optional[str] = None
    photo_url: Optional[str] = None
    preferred_sports: Optional[List[str]] = None
    skill_level: Optional[str] = None  # beginner / intermediate / pro
    location_name: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    bio: Optional[str] = None

class MatchCreate(BaseModel):
    sport: str
    title: str
    location_name: str
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    date_time: datetime
    max_players: int = Field(ge=2, le=100)
    skill_level: Optional[str] = None
    description: Optional[str] = None
    cover_image: Optional[str] = None  # url or base64

class TeamCreate(BaseModel):
    team_name: str
    sport: str
    description: Optional[str] = None

class MessageBody(BaseModel):
    text: str

class SwipeBody(BaseModel):
    target_user_id: str
    direction: str  # "right" | "left"


# ---------- Helpers ----------
def utcnow() -> datetime:
    return datetime.now(timezone.utc)

def hash_pw(pw: str) -> str:
    return bcrypt.hashpw(pw.encode(), bcrypt.gensalt()).decode()

def check_pw(pw: str, hashed: str) -> bool:
    try:
        return bcrypt.checkpw(pw.encode(), hashed.encode())
    except Exception:
        return False

def make_jwt(user_id: str) -> str:
    payload = {
        "sub": user_id,
        "iat": utcnow(),
        "exp": utcnow() + timedelta(days=JWT_TTL_DAYS),
        "kind": "jwt",
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGO)

def decode_jwt(token: str) -> Optional[str]:
    try:
        data = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGO])
        return data.get("sub")
    except Exception:
        return None

def normalize_dt(dt):
    if isinstance(dt, datetime) and dt.tzinfo is None:
        return dt.replace(tzinfo=timezone.utc)
    return dt

def public_user(u: Dict[str, Any]) -> Dict[str, Any]:
    if not u:
        return {}
    return {
        "user_id": u.get("user_id"),
        "email": u.get("email"),
        "display_name": u.get("display_name"),
        "photo_url": u.get("photo_url"),
        "preferred_sports": u.get("preferred_sports", []),
        "skill_level": u.get("skill_level"),
        "location_name": u.get("location_name"),
        "latitude": u.get("latitude"),
        "longitude": u.get("longitude"),
        "bio": u.get("bio"),
        "auth_provider": u.get("auth_provider", "email"),
    }


async def get_current_user(authorization: Optional[str] = Header(None)) -> Dict[str, Any]:
    if not authorization or not authorization.lower().startswith("bearer "):
        raise HTTPException(401, "Missing bearer token")
    token = authorization.split(" ", 1)[1].strip()

    # Try JWT first
    uid = decode_jwt(token)
    if uid:
        user = await db.users.find_one({"user_id": uid}, {"_id": 0})
        if user:
            return user

    # Otherwise treat as session_token (Emergent Google)
    session = await db.user_sessions.find_one({"session_token": token}, {"_id": 0})
    if session:
        expires_at = normalize_dt(session.get("expires_at"))
        if expires_at and expires_at < utcnow():
            await db.user_sessions.delete_one({"session_token": token})
            raise HTTPException(401, "Session expired")
        user = await db.users.find_one({"user_id": session["user_id"]}, {"_id": 0})
        if user:
            return user

    raise HTTPException(401, "Invalid token")


# ---------- Startup: indexes ----------
@app.on_event("startup")
async def on_startup():
    await db.users.create_index("email", unique=True)
    await db.users.create_index("user_id", unique=True)
    await db.user_sessions.create_index("session_token", unique=True)
    await db.user_sessions.create_index("user_id")
    await db.user_sessions.create_index("expires_at", expireAfterSeconds=0)
    await db.matches.create_index("created_at")
    await db.teams.create_index("invite_code", unique=True, sparse=True)
    await db.messages.create_index([("match_id", 1), ("created_at", 1)])
    log.info("DB indexes ready")


@app.on_event("shutdown")
async def on_shutdown():
    client.close()


# ---------- Health ----------
@api.get("/")
async def root():
    return {"ok": True, "service": "sports-community"}


# ---------- Auth ----------
@api.post("/auth/register")
async def register(body: RegisterBody):
    existing = await db.users.find_one({"email": body.email.lower()}, {"_id": 0})
    if existing:
        raise HTTPException(400, "Email already registered")
    user_id = f"user_{uuid.uuid4().hex[:12]}"
    doc = {
        "user_id": user_id,
        "email": body.email.lower(),
        "display_name": body.display_name,
        "password_hash": hash_pw(body.password),
        "auth_provider": "email",
        "photo_url": None,
        "preferred_sports": [],
        "skill_level": None,
        "location_name": None,
        "latitude": None,
        "longitude": None,
        "bio": None,
        "created_at": utcnow(),
    }
    await db.users.insert_one(doc)
    token = make_jwt(user_id)
    return {"token": token, "user": public_user(doc)}


@api.post("/auth/login")
async def login(body: LoginBody):
    user = await db.users.find_one({"email": body.email.lower()}, {"_id": 0})
    if not user or not user.get("password_hash"):
        raise HTTPException(401, "Invalid email or password")
    if not check_pw(body.password, user["password_hash"]):
        raise HTTPException(401, "Invalid email or password")
    token = make_jwt(user["user_id"])
    return {"token": token, "user": public_user(user)}


@api.post("/auth/session")
async def session_login(body: SessionBody):
    """Exchange Emergent session_token for an app session record (Google login)."""
    async with httpx.AsyncClient(timeout=15) as hc:
        r = await hc.get(EMERGENT_SESSION_API, headers={"X-Session-ID": body.session_token})
    if r.status_code != 200:
        raise HTTPException(401, "Invalid session token")
    data = r.json()
    email = (data.get("email") or "").lower()
    if not email:
        raise HTTPException(400, "No email on session")

    user = await db.users.find_one({"email": email}, {"_id": 0})
    if not user:
        user_id = f"user_{uuid.uuid4().hex[:12]}"
        user = {
            "user_id": user_id,
            "email": email,
            "display_name": data.get("name") or email.split("@")[0],
            "photo_url": data.get("picture"),
            "auth_provider": "google",
            "preferred_sports": [],
            "skill_level": None,
            "location_name": None,
            "latitude": None,
            "longitude": None,
            "bio": None,
            "created_at": utcnow(),
        }
        await db.users.insert_one(user)

    persistent_token = data.get("session_token") or body.session_token
    await db.user_sessions.update_one(
        {"session_token": persistent_token},
        {"$set": {
            "session_token": persistent_token,
            "user_id": user["user_id"],
            "expires_at": utcnow() + timedelta(days=7),
            "created_at": utcnow(),
        }},
        upsert=True,
    )
    return {"token": persistent_token, "user": public_user(user)}


@api.get("/auth/me")
async def me(current=Depends(get_current_user)):
    return {"user": public_user(current)}


@api.post("/auth/logout")
async def logout(authorization: Optional[str] = Header(None), current=Depends(get_current_user)):
    token = authorization.split(" ", 1)[1].strip() if authorization else None
    if token:
        await db.user_sessions.delete_one({"session_token": token})
    return {"ok": True}


# ---------- Users ----------
@api.put("/users/me")
async def update_me(body: ProfileUpdate, current=Depends(get_current_user)):
    upd = {k: v for k, v in body.dict().items() if v is not None}
    if upd:
        await db.users.update_one({"user_id": current["user_id"]}, {"$set": upd})
    user = await db.users.find_one({"user_id": current["user_id"]}, {"_id": 0})
    return {"user": public_user(user)}


@api.get("/users/discover")
async def discover_users(
    sport: Optional[str] = None,
    location: Optional[str] = None,
    current=Depends(get_current_user),
):
    q: Dict[str, Any] = {"user_id": {"$ne": current["user_id"]}}
    if sport:
        q["preferred_sports"] = sport
    if location:
        q["location_name"] = {"$regex": location, "$options": "i"}
    cursor = db.users.find(q, {"_id": 0, "password_hash": 0}).limit(50)
    items = [public_user(u) async for u in cursor]
    return {"items": items}


@api.get("/users/{user_id}")
async def get_user(user_id: str, current=Depends(get_current_user)):
    u = await db.users.find_one({"user_id": user_id}, {"_id": 0})
    if not u:
        raise HTTPException(404, "Not found")
    return {"user": public_user(u)}


@api.post("/users/swipe")
async def swipe(body: SwipeBody, current=Depends(get_current_user)):
    await db.swipes.insert_one({
        "swiper_id": current["user_id"],
        "target_user_id": body.target_user_id,
        "direction": body.direction,
        "created_at": utcnow(),
    })
    matched = False
    if body.direction == "right":
        reverse = await db.swipes.find_one({
            "swiper_id": body.target_user_id,
            "target_user_id": current["user_id"],
            "direction": "right",
        }, {"_id": 0})
        matched = bool(reverse)
    return {"ok": True, "matched": matched}


# ---------- Matches ----------
def serialize_match(m: Dict[str, Any]) -> Dict[str, Any]:
    if not m:
        return {}
    return {
        "id": m.get("id"),
        "creator_id": m.get("creator_id"),
        "sport": m.get("sport"),
        "title": m.get("title"),
        "location_name": m.get("location_name"),
        "latitude": m.get("latitude"),
        "longitude": m.get("longitude"),
        "date_time": (m.get("date_time").isoformat() if isinstance(m.get("date_time"), datetime) else m.get("date_time")),
        "max_players": m.get("max_players"),
        "participants": m.get("participants", []),
        "skill_level": m.get("skill_level"),
        "description": m.get("description"),
        "cover_image": m.get("cover_image"),
        "created_at": (m.get("created_at").isoformat() if isinstance(m.get("created_at"), datetime) else m.get("created_at")),
    }


@api.post("/matches")
async def create_match(body: MatchCreate, current=Depends(get_current_user)):
    match_id = f"match_{uuid.uuid4().hex[:12]}"
    doc = {
        "id": match_id,
        "creator_id": current["user_id"],
        "sport": body.sport,
        "title": body.title,
        "location_name": body.location_name,
        "latitude": body.latitude,
        "longitude": body.longitude,
        "date_time": body.date_time,
        "max_players": body.max_players,
        "participants": [current["user_id"]],
        "skill_level": body.skill_level,
        "description": body.description,
        "cover_image": body.cover_image,
        "created_at": utcnow(),
    }
    await db.matches.insert_one(doc)
    return {"match": serialize_match(doc)}


@api.get("/matches")
async def list_matches(sport: Optional[str] = None, mine: bool = False, current=Depends(get_current_user)):
    q: Dict[str, Any] = {}
    if sport:
        q["sport"] = sport
    if mine:
        q["participants"] = current["user_id"]
    cursor = db.matches.find(q, {"_id": 0}).sort("date_time", 1).limit(100)
    items = [serialize_match(m) async for m in cursor]
    return {"items": items}


@api.get("/matches/{match_id}")
async def get_match(match_id: str, current=Depends(get_current_user)):
    m = await db.matches.find_one({"id": match_id}, {"_id": 0})
    if not m:
        raise HTTPException(404, "Match not found")
    return {"match": serialize_match(m)}


@api.post("/matches/{match_id}/join")
async def join_match(match_id: str, current=Depends(get_current_user)):
    m = await db.matches.find_one({"id": match_id}, {"_id": 0})
    if not m:
        raise HTTPException(404, "Match not found")
    if current["user_id"] in m.get("participants", []):
        return {"match": serialize_match(m), "already_joined": True}
    if len(m.get("participants", [])) >= m.get("max_players", 0):
        raise HTTPException(400, "Match is full")
    await db.matches.update_one(
        {"id": match_id},
        {"$addToSet": {"participants": current["user_id"]}},
    )
    m = await db.matches.find_one({"id": match_id}, {"_id": 0})
    return {"match": serialize_match(m), "already_joined": False}


@api.post("/matches/{match_id}/leave")
async def leave_match(match_id: str, current=Depends(get_current_user)):
    await db.matches.update_one(
        {"id": match_id},
        {"$pull": {"participants": current["user_id"]}},
    )
    m = await db.matches.find_one({"id": match_id}, {"_id": 0})
    if not m:
        raise HTTPException(404, "Match not found")
    return {"match": serialize_match(m)}


# ---------- Teams ----------
def serialize_team(t: Dict[str, Any]) -> Dict[str, Any]:
    if not t:
        return {}
    return {
        "id": t.get("id"),
        "team_name": t.get("team_name"),
        "sport": t.get("sport"),
        "description": t.get("description"),
        "members": t.get("members", []),
        "creator_id": t.get("creator_id"),
        "invite_code": t.get("invite_code"),
        "created_at": (t.get("created_at").isoformat() if isinstance(t.get("created_at"), datetime) else t.get("created_at")),
    }


@api.post("/teams")
async def create_team(body: TeamCreate, current=Depends(get_current_user)):
    team_id = f"team_{uuid.uuid4().hex[:12]}"
    invite_code = secrets.token_urlsafe(8)
    doc = {
        "id": team_id,
        "team_name": body.team_name,
        "sport": body.sport,
        "description": body.description,
        "creator_id": current["user_id"],
        "members": [current["user_id"]],
        "invite_code": invite_code,
        "created_at": utcnow(),
    }
    await db.teams.insert_one(doc)
    return {"team": serialize_team(doc)}


@api.get("/teams")
async def list_teams(mine: bool = True, current=Depends(get_current_user)):
    q = {"members": current["user_id"]} if mine else {}
    cursor = db.teams.find(q, {"_id": 0}).sort("created_at", -1).limit(100)
    items = [serialize_team(t) async for t in cursor]
    return {"items": items}


@api.get("/teams/{team_id}")
async def get_team(team_id: str, current=Depends(get_current_user)):
    t = await db.teams.find_one({"id": team_id}, {"_id": 0})
    if not t:
        raise HTTPException(404, "Team not found")
    return {"team": serialize_team(t)}


@api.post("/teams/{team_id}/regenerate-invite")
async def regen_invite(team_id: str, current=Depends(get_current_user)):
    t = await db.teams.find_one({"id": team_id}, {"_id": 0})
    if not t:
        raise HTTPException(404, "Team not found")
    if t["creator_id"] != current["user_id"]:
        raise HTTPException(403, "Only creator can regenerate invite")
    code = secrets.token_urlsafe(8)
    await db.teams.update_one({"id": team_id}, {"$set": {"invite_code": code}})
    t["invite_code"] = code
    return {"team": serialize_team(t)}


@api.post("/teams/join/{invite_code}")
async def join_team(invite_code: str, current=Depends(get_current_user)):
    t = await db.teams.find_one({"invite_code": invite_code}, {"_id": 0})
    if not t:
        raise HTTPException(404, "Invalid invite code")
    await db.teams.update_one(
        {"id": t["id"]},
        {"$addToSet": {"members": current["user_id"]}},
    )
    t = await db.teams.find_one({"id": t["id"]}, {"_id": 0})
    return {"team": serialize_team(t)}


# ---------- Chat (REST + WebSocket) ----------
def serialize_message(m: Dict[str, Any]) -> Dict[str, Any]:
    return {
        "id": m.get("id"),
        "match_id": m.get("match_id"),
        "sender_id": m.get("sender_id"),
        "sender_name": m.get("sender_name"),
        "sender_photo": m.get("sender_photo"),
        "text": m.get("text"),
        "created_at": m.get("created_at").isoformat() if isinstance(m.get("created_at"), datetime) else m.get("created_at"),
    }


@api.get("/matches/{match_id}/messages")
async def list_messages(match_id: str, current=Depends(get_current_user)):
    cursor = db.messages.find({"match_id": match_id}, {"_id": 0}).sort("created_at", 1).limit(500)
    items = [serialize_message(m) async for m in cursor]
    return {"items": items}


@api.post("/matches/{match_id}/messages")
async def post_message(match_id: str, body: MessageBody, current=Depends(get_current_user)):
    if not body.text.strip():
        raise HTTPException(400, "Empty message")
    msg = {
        "id": f"msg_{uuid.uuid4().hex[:12]}",
        "match_id": match_id,
        "sender_id": current["user_id"],
        "sender_name": current.get("display_name"),
        "sender_photo": current.get("photo_url"),
        "text": body.text.strip(),
        "created_at": utcnow(),
    }
    await db.messages.insert_one(msg)
    # broadcast over websocket
    await ws_manager.broadcast(match_id, serialize_message(msg))
    return {"message": serialize_message(msg)}


class WSManager:
    def __init__(self):
        self.rooms: Dict[str, List[WebSocket]] = {}

    async def connect(self, match_id: str, ws: WebSocket):
        await ws.accept()
        self.rooms.setdefault(match_id, []).append(ws)

    def disconnect(self, match_id: str, ws: WebSocket):
        if match_id in self.rooms:
            try:
                self.rooms[match_id].remove(ws)
            except ValueError:
                pass

    async def broadcast(self, match_id: str, payload: Dict[str, Any]):
        for ws in list(self.rooms.get(match_id, [])):
            try:
                await ws.send_json({"type": "message", "data": payload})
            except Exception:
                self.disconnect(match_id, ws)


ws_manager = WSManager()


@app.websocket("/api/ws/chat/{match_id}")
async def ws_chat(websocket: WebSocket, match_id: str, token: Optional[str] = None):
    # Authenticate via ?token=... query param
    if not token:
        await websocket.close(code=1008)
        return
    uid = decode_jwt(token)
    user = None
    if uid:
        user = await db.users.find_one({"user_id": uid}, {"_id": 0})
    if not user:
        sess = await db.user_sessions.find_one({"session_token": token}, {"_id": 0})
        if sess:
            user = await db.users.find_one({"user_id": sess["user_id"]}, {"_id": 0})
    if not user:
        await websocket.close(code=1008)
        return

    await ws_manager.connect(match_id, websocket)
    try:
        while True:
            data = await websocket.receive_json()
            text = (data.get("text") or "").strip()
            if not text:
                continue
            msg = {
                "id": f"msg_{uuid.uuid4().hex[:12]}",
                "match_id": match_id,
                "sender_id": user["user_id"],
                "sender_name": user.get("display_name"),
                "sender_photo": user.get("photo_url"),
                "text": text,
                "created_at": utcnow(),
            }
            await db.messages.insert_one(msg)
            await ws_manager.broadcast(match_id, serialize_message(msg))
    except WebSocketDisconnect:
        ws_manager.disconnect(match_id, websocket)
    except Exception as e:
        log.warning("ws error: %s", e)
        ws_manager.disconnect(match_id, websocket)


# ---------- Mount ----------
app.include_router(api)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

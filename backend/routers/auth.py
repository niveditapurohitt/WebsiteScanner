from datetime import datetime, timezone

from bson import ObjectId
from bson.errors import InvalidId
from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from config import settings
from database import get_users_collection
from models import AuthResponse, LoginRequest, SignupRequest, UserPublic
from services.auth_service import create_access_token, decode_access_token, hash_password, verify_password

router = APIRouter(prefix="/auth", tags=["auth"])
security = HTTPBearer()


def _to_public_user(doc: dict) -> UserPublic:
    created_at = doc["created_at"]
    if isinstance(created_at, datetime):
        created_at = created_at.isoformat()

    return UserPublic(
        id=str(doc["_id"]),
        email=doc["email"],
        full_name=doc["full_name"],
        scans_remaining=doc["scans_remaining"],
        created_at=created_at,
    )


async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)) -> dict:
    user_id = decode_access_token(credentials.credentials)
    if not user_id:
        raise HTTPException(status_code=401, detail="Invalid or expired token")

    try:
        oid = ObjectId(user_id)
    except InvalidId:
        raise HTTPException(status_code=401, detail="Invalid token subject")

    user = await get_users_collection().find_one({"_id": oid})
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    return user


@router.post("/signup", response_model=AuthResponse)
async def signup(data: SignupRequest):
    users = get_users_collection()

    existing = await users.find_one({"email": data.email.lower()})
    if existing:
        raise HTTPException(status_code=409, detail="An account with this email already exists")

    password_hash, salt = hash_password(data.password)

    user_doc = {
        "email": data.email.lower(),
        "password_hash": password_hash,
        "salt": salt,
        "full_name": data.full_name,
        "scans_remaining": settings.free_tier_scans,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }

    result = await users.insert_one(user_doc)
    user_doc["_id"] = result.inserted_id

    token = create_access_token(str(result.inserted_id))
    return AuthResponse(user=_to_public_user(user_doc), token=token)


@router.post("/login", response_model=AuthResponse)
async def login(data: LoginRequest):
    users = get_users_collection()
    user = await users.find_one({"email": data.email.lower()})

    if not user or not verify_password(data.password, user["password_hash"], user["salt"]):
        raise HTTPException(status_code=401, detail="Invalid email or password")

    token = create_access_token(str(user["_id"]))
    return AuthResponse(user=_to_public_user(user), token=token)


@router.get("/me", response_model=UserPublic)
async def me(current_user: dict = Depends(get_current_user)):
    return _to_public_user(current_user)

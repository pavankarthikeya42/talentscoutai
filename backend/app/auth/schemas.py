from pydantic import BaseModel, EmailStr
from typing import Optional
from datetime import datetime


# ── Request Schemas ──

class SignUpRequest(BaseModel):
    email: EmailStr
    password: str
    full_name: str


class SignInRequest(BaseModel):
    email: EmailStr
    password: str


class RefreshTokenRequest(BaseModel):
    refresh_token: str


class UpdateProfileRequest(BaseModel):
    full_name: Optional[str] = None
    avatar_url: Optional[str] = None
    password: Optional[str] = None
    display_name: Optional[str] = None


# ── Response Schemas ──

class UserProfile(BaseModel):
    id: str
    full_name: str
    email: str
    role: str
    avatar_url: Optional[str] = None
    display_name: Optional[str] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None


class AuthResponse(BaseModel):
    access_token: str
    refresh_token: str
    user: UserProfile


class MessageResponse(BaseModel):
    message: str

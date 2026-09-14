from datetime import datetime

from pydantic import BaseModel, EmailStr


class LoginRequest(BaseModel):
    username: str
    password: str


class TokenResponse(BaseModel):
    access_token: str
    username: str
    role: str
    token_type: str = "bearer"


class UserProfile(BaseModel):
    id: int
    username: str
    full_name: str
    email: EmailStr
    role: str
    created_at: datetime

    model_config = {"from_attributes": True}


class UserListItem(BaseModel):
    id: int
    username: str
    role: str
    created_at: datetime

    model_config = {"from_attributes": True}


class DeploymentStatusResponse(BaseModel):
    id: int
    component: str
    status: str
    message: str

    model_config = {"from_attributes": True}

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


class CourseProgressItem(BaseModel):
    id: int
    title: str
    skill: str
    icon: str
    accent: str
    accent_rgb: str
    summary: str
    progress_percent: int
    status_label: str


class CourseProgressSummary(BaseModel):
    overall_progress: int
    total_modules: int
    strong_modules: int
    in_progress_modules: int


class StudentProgressResponse(BaseModel):
    summary: CourseProgressSummary
    courses: list[CourseProgressItem]

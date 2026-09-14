from contextlib import asynccontextmanager

from fastapi import Depends, FastAPI, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text
from sqlalchemy.orm import Session

from .auth import create_access_token, get_current_user, verify_password
from .database import get_db
from .models import CourseModule, DeploymentStatus, User, UserCourseProgress
from .schemas import (
    DeploymentStatusResponse,
    LoginRequest,
    StudentProgressResponse,
    TokenResponse,
    UserListItem,
    UserProfile,
)
from .seed import initialize_database


@asynccontextmanager
async def lifespan(app: FastAPI):
    initialize_database()
    yield


app = FastAPI(
    title="Next Kode School Lab Backend",
    description="FastAPI service for Next Kode School Lab.",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
def health(db: Session = Depends(get_db)):
    db.execute(text("SELECT 1"))
    return {
        "service": "backend",
        "status": "healthy",
        "database": "connected",
    }


@app.post("/api/auth/login", response_model=TokenResponse)
def login(payload: LoginRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.username == payload.username).first()
    if not user or not verify_password(payload.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid username or password",
        )

    return TokenResponse(
        access_token=create_access_token(user.username),
        username=user.username,
        role=user.role,
    )


@app.get("/api/user/profile", response_model=UserProfile)
def profile(current_user: User = Depends(get_current_user)):
    return current_user


@app.get("/api/users", response_model=list[UserListItem])
def users(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if current_user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Permission denied",
        )

    return db.query(User).order_by(User.id.asc()).all()


def progress_status_label(progress_percent: int) -> str:
    if progress_percent >= 90:
        return "Excellent"
    if progress_percent >= 75:
        return "On Track"
    if progress_percent >= 50:
        return "Building"
    return "Needs Focus"


@app.get("/api/student/progress", response_model=StudentProgressResponse)
def student_progress(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    modules = db.query(CourseModule).order_by(CourseModule.position.asc()).all()
    progress_rows = (
        db.query(UserCourseProgress)
        .filter(UserCourseProgress.user_id == current_user.id)
        .all()
    )
    progress_by_module = {
        progress.course_module_id: progress.progress_percent
        for progress in progress_rows
    }

    courses = []
    for module in modules:
        progress_percent = progress_by_module.get(module.id, 0)
        courses.append(
            {
                "id": module.id,
                "title": module.title,
                "skill": module.skill,
                "icon": module.icon,
                "accent": module.accent,
                "accent_rgb": module.accent_rgb,
                "summary": module.summary,
                "progress_percent": progress_percent,
                "status_label": progress_status_label(progress_percent),
            }
        )

    total_modules = len(courses)
    overall_progress = (
        round(sum(course["progress_percent"] for course in courses) / total_modules)
        if total_modules
        else 0
    )

    return {
        "summary": {
            "overall_progress": overall_progress,
            "total_modules": total_modules,
            "strong_modules": sum(
                1 for course in courses if course["progress_percent"] >= 80
            ),
            "in_progress_modules": sum(
                1 for course in courses if 0 < course["progress_percent"] < 80
            ),
        },
        "courses": courses,
    }


@app.get("/api/deployment/status", response_model=list[DeploymentStatusResponse])
def deployment_status(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return db.query(DeploymentStatus).order_by(DeploymentStatus.id.asc()).all()

from contextlib import asynccontextmanager

from fastapi import Depends, FastAPI, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text
from sqlalchemy.orm import Session

from .auth import create_access_token, get_current_user, verify_password
from .database import get_db
from .models import DeploymentStatus, User
from .schemas import (
    DeploymentStatusResponse,
    LoginRequest,
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


@app.get("/api/deployment/status", response_model=list[DeploymentStatusResponse])
def deployment_status(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return db.query(DeploymentStatus).order_by(DeploymentStatus.id.asc()).all()

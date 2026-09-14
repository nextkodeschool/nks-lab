from datetime import datetime

from sqlalchemy import Column, DateTime, Integer, String

from .database import Base


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(80), unique=True, nullable=False, index=True)
    password_hash = Column(String(255), nullable=False)
    full_name = Column(String(160), nullable=False)
    email = Column(String(160), unique=True, nullable=False)
    role = Column(String(80), nullable=False, default="Student")
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)


class DeploymentStatus(Base):
    __tablename__ = "deployment_status"

    id = Column(Integer, primary_key=True, index=True)
    component = Column(String(80), unique=True, nullable=False, index=True)
    status = Column(String(80), nullable=False)
    message = Column(String(255), nullable=False)

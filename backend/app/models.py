from datetime import datetime

from sqlalchemy import Column, DateTime, ForeignKey, Integer, String, UniqueConstraint

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


class CourseModule(Base):
    __tablename__ = "course_modules"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(120), nullable=False)
    skill = Column(String(120), unique=True, nullable=False, index=True)
    icon = Column(String(80), nullable=False)
    accent = Column(String(20), nullable=False)
    accent_rgb = Column(String(40), nullable=False)
    summary = Column(String(255), nullable=False)
    position = Column(Integer, unique=True, nullable=False, index=True)


class UserCourseProgress(Base):
    __tablename__ = "user_course_progress"
    __table_args__ = (
        UniqueConstraint("user_id", "course_module_id", name="uq_user_course_progress"),
    )

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    course_module_id = Column(
        Integer,
        ForeignKey("course_modules.id"),
        nullable=False,
        index=True,
    )
    progress_percent = Column(Integer, nullable=False, default=0)

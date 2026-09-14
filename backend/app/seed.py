import os
import time

from sqlalchemy import text
from sqlalchemy.exc import OperationalError
from sqlalchemy.orm import Session

from .auth import hash_password
from .database import Base, engine
from .models import DeploymentStatus, User


def upsert_env_user(
    db: Session,
    username: str | None,
    password: str | None,
    role: str,
) -> None:
    if not username or not password:
        raise RuntimeError("Default user credentials must be configured")

    existing_user = db.query(User).filter(User.username == username).first()
    password_hash = hash_password(password)
    email = f"{username}@nextkodeschool.com"
    full_name = username.replace(".", " ").replace("_", " ").title()

    if existing_user:
        existing_user.password_hash = password_hash
        existing_user.email = email
        existing_user.full_name = full_name
        existing_user.role = role
        return

    db.add(
        User(
            username=username,
            password_hash=password_hash,
            full_name=full_name,
            email=email,
            role=role,
        )
    )


def wait_for_database(max_attempts: int = 30, delay_seconds: int = 2) -> None:
    for attempt in range(1, max_attempts + 1):
        try:
            with engine.connect() as connection:
                connection.execute(text("SELECT 1"))
            return
        except OperationalError:
            if attempt == max_attempts:
                raise
            time.sleep(delay_seconds)


def initialize_database() -> None:
    wait_for_database()
    Base.metadata.create_all(bind=engine)

    configured_users = [
        ("ADMIN", "admin"),
        ("STUDENT1", "student"),
        ("STUDENT2", "student"),
    ]

    with Session(engine) as db:
        active_usernames = set()
        for env_prefix, role in configured_users:
            username = os.getenv(f"{env_prefix}_USERNAME")
            if username:
                active_usernames.add(username)
            upsert_env_user(
                db=db,
                username=username,
                password=os.getenv(f"{env_prefix}_PASSWORD"),
                role=role,
            )

        db.query(User).filter(
            User.role == "Deployment Lab Student",
            User.username.notin_(active_usernames),
        ).delete(synchronize_session=False)

        statuses = [
            ("Frontend", "Running", "React + Vite application is available."),
            ("Backend", "Connected", "FastAPI service is authenticated and healthy."),
            ("PostgreSQL", "Connected", "Database queries are succeeding."),
        ]
        active_components = {component for component, _, _ in statuses}

        for component, status, message in statuses:
            existing_status = (
                db.query(DeploymentStatus)
                .filter(DeploymentStatus.component == component)
                .first()
            )
            if existing_status:
                existing_status.status = status
                existing_status.message = message
            else:
                db.add(
                    DeploymentStatus(
                        component=component,
                        status=status,
                        message=message,
                    )
                )

        db.query(DeploymentStatus).filter(
            DeploymentStatus.component.notin_(active_components)
        ).delete(synchronize_session=False)

        db.commit()

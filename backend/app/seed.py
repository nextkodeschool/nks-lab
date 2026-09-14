import os
import time

from sqlalchemy import text
from sqlalchemy.exc import OperationalError
from sqlalchemy.orm import Session

from .auth import hash_password
from .database import Base, engine
from .models import CourseModule, DeploymentStatus, User, UserCourseProgress


COURSE_MODULES = [
    {
        "title": "Operating System",
        "skill": "Linux",
        "icon": "computer",
        "accent": "#22c55e",
        "accent_rgb": "34, 197, 94",
        "summary": "Linux commands, file systems, permissions, packages, and services.",
    },
    {
        "title": "Scripting",
        "skill": "Shell Scripting",
        "icon": "terminal",
        "accent": "#06b6d4",
        "accent_rgb": "6, 182, 212",
        "summary": "Automation scripts, variables, conditionals, loops, and cron-ready tasks.",
    },
    {
        "title": "Cloud Computing",
        "skill": "AWS",
        "icon": "cloud-cog",
        "accent": "#f59e0b",
        "accent_rgb": "245, 158, 11",
        "summary": "Core cloud services, IAM, compute, storage, networking, and deployment basics.",
    },
    {
        "title": "VCS",
        "skill": "Git and GitHub",
        "icon": "github",
        "accent": "#a855f7",
        "accent_rgb": "168, 85, 247",
        "summary": "Branching, commits, pull requests, collaboration, and release workflows.",
    },
    {
        "title": "IaC",
        "skill": "Terraform",
        "icon": "code",
        "accent": "#7c3aed",
        "accent_rgb": "124, 58, 237",
        "summary": "Reusable infrastructure modules, variables, state, and cloud provisioning.",
    },
    {
        "title": "CI/CD",
        "skill": "GitHub Actions",
        "icon": "workflow",
        "accent": "#3b82f6",
        "accent_rgb": "59, 130, 246",
        "summary": "Build pipelines, test automation, secrets, artifacts, and deploy stages.",
    },
    {
        "title": "Containerization",
        "skill": "Docker",
        "icon": "container",
        "accent": "#0ea5e9",
        "accent_rgb": "14, 165, 233",
        "summary": "Images, containers, Dockerfiles, volumes, ports, and Compose foundations.",
    },
    {
        "title": "Container Orchestration",
        "skill": "Kubernetes",
        "icon": "boxes",
        "accent": "#14b8a6",
        "accent_rgb": "20, 184, 166",
        "summary": "Pods, services, deployments, scaling, configuration, and cluster basics.",
    },
]

COURSE_PROGRESS_BY_USERNAME = {
    "admin": [100, 100, 96, 92, 88, 94, 98, 86],
    "student1": [92, 84, 76, 88, 62, 70, 82, 48],
    "student2": [78, 66, 58, 72, 44, 52, 63, 35],
}

DEFAULT_COURSE_PROGRESS = [72, 58, 46, 64, 38, 42, 54, 28]


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


def upsert_course_modules(db: Session) -> list[CourseModule]:
    modules = []

    for index, course_data in enumerate(COURSE_MODULES, start=1):
        course_module = (
            db.query(CourseModule)
            .filter(CourseModule.skill == course_data["skill"])
            .first()
        )

        if course_module:
            for key, value in course_data.items():
                setattr(course_module, key, value)
            course_module.position = index
        else:
            course_module = CourseModule(**course_data, position=index)
            db.add(course_module)

        modules.append(course_module)

    db.flush()
    return modules


def upsert_user_course_progress(
    db: Session,
    user: User,
    modules: list[CourseModule],
) -> None:
    progress_values = COURSE_PROGRESS_BY_USERNAME.get(
        user.username.lower(),
        DEFAULT_COURSE_PROGRESS,
    )

    for index, course_module in enumerate(modules):
        progress_percent = progress_values[index]
        user_progress = (
            db.query(UserCourseProgress)
            .filter(
                UserCourseProgress.user_id == user.id,
                UserCourseProgress.course_module_id == course_module.id,
            )
            .first()
        )

        if not user_progress:
            db.add(
                UserCourseProgress(
                    user_id=user.id,
                    course_module_id=course_module.id,
                    progress_percent=progress_percent,
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

        db.flush()
        course_modules = upsert_course_modules(db)

        for username in active_usernames:
            user = db.query(User).filter(User.username == username).first()
            if user:
                upsert_user_course_progress(db, user, course_modules)

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

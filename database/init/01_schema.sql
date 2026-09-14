CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(80) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(160) NOT NULL,
    email VARCHAR(160) UNIQUE NOT NULL,
    role VARCHAR(80) NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS ix_users_username ON users (username);

CREATE TABLE IF NOT EXISTS deployment_status (
    id SERIAL PRIMARY KEY,
    component VARCHAR(80) UNIQUE NOT NULL,
    status VARCHAR(80) NOT NULL,
    message VARCHAR(255) NOT NULL
);

CREATE INDEX IF NOT EXISTS ix_deployment_status_component
    ON deployment_status (component);

CREATE TABLE IF NOT EXISTS course_modules (
    id SERIAL PRIMARY KEY,
    title VARCHAR(120) NOT NULL,
    skill VARCHAR(120) UNIQUE NOT NULL,
    icon VARCHAR(80) NOT NULL,
    accent VARCHAR(20) NOT NULL,
    accent_rgb VARCHAR(40) NOT NULL,
    summary VARCHAR(255) NOT NULL,
    position INTEGER UNIQUE NOT NULL
);

CREATE INDEX IF NOT EXISTS ix_course_modules_skill ON course_modules (skill);
CREATE INDEX IF NOT EXISTS ix_course_modules_position ON course_modules (position);

CREATE TABLE IF NOT EXISTS user_course_progress (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id),
    course_module_id INTEGER NOT NULL REFERENCES course_modules(id),
    progress_percent INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT uq_user_course_progress UNIQUE (user_id, course_module_id)
);

CREATE INDEX IF NOT EXISTS ix_user_course_progress_user_id
    ON user_course_progress (user_id);

CREATE INDEX IF NOT EXISTS ix_user_course_progress_course_module_id
    ON user_course_progress (course_module_id);

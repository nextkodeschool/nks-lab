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

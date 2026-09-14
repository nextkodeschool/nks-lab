# Docker Compose Guide

This guide runs the complete Next Kode School Lab stack with Docker Compose.

Docker Compose is the easiest Docker path for this project because it creates the network, builds images, starts containers in dependency order, injects environment variables, and keeps PostgreSQL data in a named volume.

## Architecture

```text
Browser
  -> frontend service: React build served by Nginx
  -> backend service: FastAPI
  -> database service: PostgreSQL
```

Compose uses the service names `frontend`, `backend`, and `database` as DNS names on the internal Docker network.

## Prerequisites

- Docker Desktop or Docker Engine installed
- Docker Compose v2 available through `docker compose`
- Terminal opened at the project root

Check tools:

```bash
docker --version
docker compose version
```

## 1. Create Environment File

Create `.env` from the example:

```bash
cp .env.example .env
```

Open `.env` and use values like these:

```env
POSTGRES_DB=nextkode
POSTGRES_USER=nextkode
POSTGRES_PASSWORD=replace_me_postgres_password

JWT_SECRET=replace_me_jwt_secret
JWT_EXPIRE_MINUTES=60

ADMIN_USERNAME=admin
ADMIN_PASSWORD=replace_me_admin_password
STUDENT1_USERNAME=student1
STUDENT1_PASSWORD=replace_me_student1_password
STUDENT2_USERNAME=student2
STUDENT2_PASSWORD=replace_me_student2_password

BACKEND_PORT=8000
```

For local Docker Compose, sensitive values live in `.env`. For CI/CD, use GitHub Actions Secrets instead of writing real passwords in workflow files.

For Docker Compose, the backend database URL is built in `docker-compose.yml`:

```text
postgresql://${POSTGRES_USER}:${POSTGRES_PASSWORD}@database:5432/${POSTGRES_DB}
```

## 2. Build And Start

Start the full stack:

```bash
docker compose up -d --build
```

What this does:

- Builds `database` from `database/Dockerfile`
- Builds `backend` from `backend/Dockerfile`
- Builds `frontend` from `frontend/Dockerfile`
- Creates the Docker network
- Creates the PostgreSQL named volume
- Starts PostgreSQL first
- Waits for database health
- Starts backend
- Waits for backend health
- Starts frontend

## 3. Check Containers

```bash
docker compose ps
```

Expected services:

```text
database
backend
frontend
```

All services should show as running or healthy.

## 4. Open The Application

Open:

```text
http://localhost
```

Login:

```text
Use the usernames and passwords from your .env file.
```

## 5. Verify Backend

The backend is exposed on `BACKEND_PORT`, which defaults to `8000`.

```bash
curl http://localhost:8000/health
```

Expected response:

```json
{"service":"backend","status":"healthy","database":"connected"}
```

You can also verify through the frontend proxy:

```bash
curl http://localhost/health
```

## 6. View Logs

All services:

```bash
docker compose logs -f
```

Backend only:

```bash
docker compose logs -f backend
```

Database only:

```bash
docker compose logs -f database
```

Frontend only:

```bash
docker compose logs -f frontend
```

## 7. Rebuild After Code Changes

If backend, frontend, or database image files change:

```bash
docker compose up -d --build
```

If you only changed environment variables:

```bash
docker compose up -d
```

If a container does not pick up changes:

```bash
docker compose up -d --force-recreate
```

## 8. Stop The Stack

Stop containers but keep them available:

```bash
docker compose stop
```

Start them again:

```bash
docker compose start
```

Stop and remove containers and network:

```bash
docker compose down
```

Stop and remove containers, network, and database volume:

```bash
docker compose down -v
```

Use `docker compose down -v` only when you intentionally want to delete PostgreSQL data.

## 9. Reset The Database

To reset all data:

```bash
docker compose down -v
docker compose up -d --build
```

When PostgreSQL starts with a fresh volume, it runs:

```text
database/init/01_schema.sql
```

The backend also runs automatic setup at startup:

- waits for PostgreSQL
- creates missing tables
- hashes configured passwords
- inserts or updates configured users
- inserts service status records

## 10. Troubleshooting

If port `80` is already in use, edit `docker-compose.yml`:

```yaml
frontend:
  ports:
    - "8080:80"
```

Then run:

```bash
docker compose up -d
```

Open:

```text
http://localhost:8080
```

If port `8000` is already in use, set another backend port in `.env`:

```env
BACKEND_PORT=8001
```

Then run:

```bash
docker compose up -d
```

Check:

```bash
curl http://localhost:8001/health
```

If login fails, confirm the backend received the user variables:

```bash
docker compose exec backend env | grep USERNAME
```

If the backend says the database is unreachable:

```bash
docker compose ps
docker compose logs database
docker compose logs backend
```

## 11. Useful Compose Commands

Run a shell in the backend container:

```bash
docker compose exec backend sh
```

Run a shell in the database container:

```bash
docker compose exec database sh
```

List images:

```bash
docker compose images
```

List volumes:

```bash
docker volume ls
```

View service configuration after env substitution:

```bash
docker compose config
```

## References

- Docker Compose up reference: https://docs.docker.com/reference/cli/docker/compose/up/
- Docker Compose overview: https://docs.docker.com/compose/

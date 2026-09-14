# Next Kode School Lab

**Build. Deploy. Verify. Learn.**

Next Kode School Lab is a deployment-practice application for Next Kode School students. It is intentionally simple as a product, but complete as a multi-container teaching project for Docker, Docker Compose, PostgreSQL, service networking, environment variables, database connectivity, GitHub Actions, Docker Hub, and CI/CD.

## Architecture

```text
Browser
   |
   v
Frontend (React + Vite + Nginx)
   |
   v
Backend API (Python + FastAPI)
   |
   v
PostgreSQL Database
```

In Docker Compose, Nginx serves the React app and proxies `/api/*` requests to the backend service.
For local frontend development, Vite proxies `/api/*` requests to `http://127.0.0.1:8000`.

## Services

| Service | Stack | Purpose |
| --- | --- | --- |
| `frontend` | React, Vite, Nginx | Login, dashboard, responsive UI |
| `backend` | Python, FastAPI, SQLAlchemy | Authentication, JWT creation, database reads, health checks |
| `database` | PostgreSQL 16 Alpine | Persistent application data |

Database-specific Docker and SQL files live in `database/`:

```text
database/
  Dockerfile
  .env.example
  init/
    01_schema.sql
```

## Quick Start

There are two ways to run this project with Docker:

- **Docker Compose:** easiest path for students after they understand the services.
- **Manual Docker Run:** starts each container one by one so students can see networking, env vars, volumes, and ports clearly.

## Local Development Without Docker

Use this path when you want to run the app directly on your machine.

1. Create local environment files:

```bash
cp .env.example .env
cp frontend/.env.example frontend/.env
```

2. Install backend dependencies:

```bash
python3 -m venv .venv
.venv/bin/python -m pip install -r backend/requirements.txt
```

3. Start the backend from the repository root:

```bash
.venv/bin/python -m uvicorn backend.app.main:app --host 127.0.0.1 --port 8000
```

4. Start the frontend in a second terminal:

```bash
cd frontend
npm install
npm run dev -- --host 127.0.0.1 --port 5147
```

5. Open the app:

```text
http://127.0.0.1:5147
```

The local backend uses `local-dev.db` by default from the root `.env` file.

## Option 1: Docker Compose

1. Create your local environment file:

```bash
cp .env.example .env
```

2. Edit `.env` and set local values:

```env
POSTGRES_PASSWORD=your_database_password
JWT_SECRET=your_long_random_jwt_secret
ADMIN_USERNAME=admin
ADMIN_PASSWORD=your_admin_password
STUDENT1_USERNAME=student1
STUDENT1_PASSWORD=your_student1_password
STUDENT2_USERNAME=student2
STUDENT2_PASSWORD=your_student2_password
```

3. Build and start the whole stack:

```bash
docker compose up -d --build
```

4. Check containers:

```bash
docker compose ps
```

5. Open the app:

```text
http://localhost
```

Log in with any configured user from your `.env` file.

## Option 2: Manual Docker Run

Use this when teaching what Docker Compose is doing behind the scenes:

[Manual Docker Run Guide](docs/docker-run-manual.md)

## Deployment Guides

- [Complete Manual Docker and Docker Hub Guide](docs/docker-run-manual.md)
- [AWS End-to-End Deployment Guide](docs/aws-end-to-end-deployment.md)
- [Docker Compose Guide](docs/docker-compose-guide.md)
- [Kubernetes Deployment Guide](kubernetes/README.md)
- [Helm Deployment Guide](helm/nextkode-lab/README.md)
- [Terraform AWS Infrastructure Guide](terraform/README.md)
- [GitHub Actions Workflows](.github/workflows/README.md)

## Automatic Database Setup

When the backend starts, it automatically:

- waits for PostgreSQL to become reachable
- verifies the database schema exists
- hashes configured passwords with bcrypt
- inserts or safely updates the configured admin/student users
- inserts or updates service status records

The PostgreSQL image also runs `database/init/01_schema.sql` when a fresh database volume is created. No manual SQL setup is required.

## API Endpoints

The backend exposes:

```text
POST /api/auth/login
GET  /api/user/profile
GET  /api/deployment/status
GET  /api/student/progress
GET  /health
```

## Environment Variables

Use `.env` for local development. Do not commit `.env`.

For GitHub Actions and production deployments, configure sensitive values with GitHub Secrets or the deployment platform's secret manager. Never place database passwords, JWT secrets, student passwords, Docker Hub tokens, or other secrets directly in source files or workflow files.

The included workflows expect:

```text
DOCKER_USERNAME
DOCKER_PASSWORD
KUBE_CONFIG_DATA
AWS_ACCESS_KEY_ID
AWS_SECRET_ACCESS_KEY
POSTGRES_PASSWORD
JWT_SECRET
ADMIN_PASSWORD
STUDENT1_PASSWORD
STUDENT2_PASSWORD
```

`DOCKER_PASSWORD` should be a Docker Hub Personal Access Token.
Application usernames and passwords are runtime settings. They are not baked into Docker images and should be provided by `.env`, GitHub Secrets, or your deployment platform's secret manager.

## Docker Hub Images

The GitHub Actions workflow builds and pushes:

```text
${DOCKER_USERNAME}/nextkode-deploylab-database:latest
${DOCKER_USERNAME}/nextkode-deploylab-database:<git-sha>

${DOCKER_USERNAME}/nextkode-deploylab-frontend:latest
${DOCKER_USERNAME}/nextkode-deploylab-frontend:<git-sha>

${DOCKER_USERNAME}/nextkode-deploylab-backend:latest
${DOCKER_USERNAME}/nextkode-deploylab-backend:<git-sha>
```

## Useful Commands

```bash
docker compose logs -f
docker compose logs -f backend
docker compose down
docker compose down -v
```

Use `docker compose down -v` only when you intentionally want to remove the persistent PostgreSQL volume.

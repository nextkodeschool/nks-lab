# Manual Docker Run Guide

This guide starts the same application without Docker Compose. It is useful for learning what Compose automates.

## 1. Create A Docker Network

```bash
docker network create nextkode-lab-network
```

All containers will join this network so they can talk to each other by container name.

## 2. Build Images

Run these commands from the project root:

```bash
docker build -t nextkode-deploylab-database ./database
docker build -t nextkode-deploylab-backend ./backend
docker build -t nextkode-deploylab-frontend ./frontend
```

## 3. Create A Database Volume

```bash
docker volume create nextkode-postgres-data
```

This keeps PostgreSQL data after containers are removed.

## 4. Start PostgreSQL

```bash
docker run -d \
  --name nextkode-database \
  --network nextkode-lab-network \
  -e POSTGRES_DB=nextkode \
  -e POSTGRES_USER=nextkode \
  -e POSTGRES_PASSWORD=change_me \
  -v nextkode-postgres-data:/var/lib/postgresql/data \
  nextkode-deploylab-database
```

Check database logs:

```bash
docker logs -f nextkode-database
```

## 5. Start Backend

```bash
docker run -d \
  --name nextkode-backend \
  --network nextkode-lab-network \
  -p 8000:8000 \
  -e DATABASE_URL=postgresql://nextkode:change_me@nextkode-database:5432/nextkode \
  -e JWT_SECRET=change_me \
  -e JWT_EXPIRE_MINUTES=60 \
  -e ADMIN_USERNAME=admin \
  -e ADMIN_PASSWORD=admin@123 \
  -e STUDENT1_USERNAME=student1 \
  -e STUDENT1_PASSWORD=student@1 \
  -e STUDENT2_USERNAME=student2 \
  -e STUDENT2_PASSWORD=student@2 \
  nextkode-deploylab-backend
```

Check backend health:

```bash
curl http://localhost:8000/health
```

## 6. Start Frontend

```bash
docker run -d \
  --name nextkode-frontend \
  --network nextkode-lab-network \
  -p 80:80 \
  nextkode-deploylab-frontend
```

Open:

```text
http://localhost
```

## 7. Login

Use the credentials you passed to the backend container.

Default classroom values:

```text
admin / admin@123
student1 / student@1
student2 / student@2
```

## Useful Manual Commands

View containers:

```bash
docker ps
```

View logs:

```bash
docker logs -f nextkode-backend
docker logs -f nextkode-frontend
docker logs -f nextkode-database
```

Stop containers:

```bash
docker stop nextkode-frontend nextkode-backend nextkode-database
```

Remove containers:

```bash
docker rm nextkode-frontend nextkode-backend nextkode-database
```

Remove the network:

```bash
docker network rm nextkode-lab-network
```

Remove the database volume only when you want to delete all database data:

```bash
docker volume rm nextkode-postgres-data
```

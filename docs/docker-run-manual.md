# Complete Manual Docker and Docker Hub Guide

This guide runs Next Kode School Lab with plain Docker commands and then publishes the application images to Docker Hub.

Use this when students need to understand what Docker Compose automates: images, networks, volumes, environment variables, container names, ports, logs, and registry pushes.

## Architecture

```text
Browser
  -> frontend container: Nginx + React
  -> backend container: FastAPI
  -> database container: PostgreSQL
```

The frontend container uses `frontend/nginx.conf` to proxy `/api/*` and `/health` to the backend container named `backend` on the Docker network.

## Prerequisites

- Docker Desktop or Docker Engine installed
- Docker Hub account
- Docker Hub access token or password
- Terminal opened at the project root

Check Docker:

```bash
docker --version
docker info
```

## 1. Set Local Values

Use strong values for real deployments. These values are fine for classroom practice.

```bash
export POSTGRES_DB=nextkode
export POSTGRES_USER=nextkode
export POSTGRES_PASSWORD=change_me
export JWT_SECRET=change_me_to_a_long_random_secret
export JWT_EXPIRE_MINUTES=60

export ADMIN_USERNAME=admin
export ADMIN_PASSWORD=admin@123
export STUDENT1_USERNAME=student1
export STUDENT1_PASSWORD=student@1
export STUDENT2_USERNAME=student2
export STUDENT2_PASSWORD=student@2
```

## 2. Create A Docker Network

```bash
docker network create nextkode-lab-network
```

All containers will join this network so they can communicate by container name.

## 3. Build Images

Run from the project root:

```bash
docker build -t nextkode-deploylab-database:local ./database
docker build -t nextkode-deploylab-backend:local ./backend
docker build -t nextkode-deploylab-frontend:local ./frontend
```

Check images:

```bash
docker images | grep nextkode-deploylab
```

## 4. Create A Database Volume

```bash
docker volume create nextkode-postgres-data
```

This keeps PostgreSQL data even if the container is removed.

## 5. Start PostgreSQL

```bash
docker run -d \
  --name database \
  --network nextkode-lab-network \
  -e POSTGRES_DB=$POSTGRES_DB \
  -e POSTGRES_USER=$POSTGRES_USER \
  -e POSTGRES_PASSWORD=$POSTGRES_PASSWORD \
  -v nextkode-postgres-data:/var/lib/postgresql/data \
  nextkode-deploylab-database:local
```

Check logs:

```bash
docker logs -f database
```

Check readiness:

```bash
docker exec database pg_isready -U $POSTGRES_USER -d $POSTGRES_DB
```

## 6. Start Backend

```bash
docker run -d \
  --name backend \
  --network nextkode-lab-network \
  -p 8000:8000 \
  -e DATABASE_URL=postgresql://$POSTGRES_USER:$POSTGRES_PASSWORD@database:5432/$POSTGRES_DB \
  -e JWT_SECRET=$JWT_SECRET \
  -e JWT_EXPIRE_MINUTES=$JWT_EXPIRE_MINUTES \
  -e ADMIN_USERNAME=$ADMIN_USERNAME \
  -e ADMIN_PASSWORD=$ADMIN_PASSWORD \
  -e STUDENT1_USERNAME=$STUDENT1_USERNAME \
  -e STUDENT1_PASSWORD=$STUDENT1_PASSWORD \
  -e STUDENT2_USERNAME=$STUDENT2_USERNAME \
  -e STUDENT2_PASSWORD=$STUDENT2_PASSWORD \
  nextkode-deploylab-backend:local
```

Check backend health:

```bash
curl http://localhost:8000/health
```

Expected response:

```json
{"service":"backend","status":"healthy","database":"connected"}
```

## 7. Start Frontend

```bash
docker run -d \
  --name frontend \
  --network nextkode-lab-network \
  -p 80:80 \
  nextkode-deploylab-frontend:local
```

Open:

```text
http://localhost
```

## 8. Login

Use the credentials passed to the backend container:

```text
admin / admin@123
student1 / student@1
student2 / student@2
```

## 9. Publish Images To Docker Hub

Login to Docker Hub:

```bash
docker login
```

Set your Docker Hub username:

```bash
export DOCKER_USERNAME=your_dockerhub_username
```

Tag the images:

```bash
docker tag nextkode-deploylab-backend:local $DOCKER_USERNAME/nextkode-deploylab-backend:latest
docker tag nextkode-deploylab-frontend:local $DOCKER_USERNAME/nextkode-deploylab-frontend:latest
docker tag nextkode-deploylab-database:local $DOCKER_USERNAME/nextkode-deploylab-database:latest
```

Push the images:

```bash
docker push $DOCKER_USERNAME/nextkode-deploylab-backend:latest
docker push $DOCKER_USERNAME/nextkode-deploylab-frontend:latest
docker push $DOCKER_USERNAME/nextkode-deploylab-database:latest
```

Verify in Docker Hub:

```text
https://hub.docker.com/repositories
```

## 10. Run From Docker Hub Images

Stop and remove the local containers first:

```bash
docker stop frontend backend database
docker rm frontend backend database
```

Pull the images:

```bash
docker pull $DOCKER_USERNAME/nextkode-deploylab-database:latest
docker pull $DOCKER_USERNAME/nextkode-deploylab-backend:latest
docker pull $DOCKER_USERNAME/nextkode-deploylab-frontend:latest
```

Run the same containers using Docker Hub images:

```bash
docker run -d \
  --name database \
  --network nextkode-lab-network \
  -e POSTGRES_DB=$POSTGRES_DB \
  -e POSTGRES_USER=$POSTGRES_USER \
  -e POSTGRES_PASSWORD=$POSTGRES_PASSWORD \
  -v nextkode-postgres-data:/var/lib/postgresql/data \
  $DOCKER_USERNAME/nextkode-deploylab-database:latest
```

```bash
docker run -d \
  --name backend \
  --network nextkode-lab-network \
  -p 8000:8000 \
  -e DATABASE_URL=postgresql://$POSTGRES_USER:$POSTGRES_PASSWORD@database:5432/$POSTGRES_DB \
  -e JWT_SECRET=$JWT_SECRET \
  -e JWT_EXPIRE_MINUTES=$JWT_EXPIRE_MINUTES \
  -e ADMIN_USERNAME=$ADMIN_USERNAME \
  -e ADMIN_PASSWORD=$ADMIN_PASSWORD \
  -e STUDENT1_USERNAME=$STUDENT1_USERNAME \
  -e STUDENT1_PASSWORD=$STUDENT1_PASSWORD \
  -e STUDENT2_USERNAME=$STUDENT2_USERNAME \
  -e STUDENT2_PASSWORD=$STUDENT2_PASSWORD \
  $DOCKER_USERNAME/nextkode-deploylab-backend:latest
```

```bash
docker run -d \
  --name frontend \
  --network nextkode-lab-network \
  -p 80:80 \
  $DOCKER_USERNAME/nextkode-deploylab-frontend:latest
```

Open:

```text
http://localhost
```

## Useful Commands

View containers:

```bash
docker ps
docker ps -a
```

View logs:

```bash
docker logs -f frontend
docker logs -f backend
docker logs -f database
```

Open a shell inside a container:

```bash
docker exec -it backend sh
docker exec -it database sh
```

Stop and remove containers:

```bash
docker stop frontend backend database
docker rm frontend backend database
```

Remove the network:

```bash
docker network rm nextkode-lab-network
```

Remove the database volume only when you want to delete all database data:

```bash
docker volume rm nextkode-postgres-data
```

## Troubleshooting

If the backend cannot connect to PostgreSQL, check that the database container is named `database` and both containers are on `nextkode-lab-network`.

If the frontend cannot reach the backend, check that the backend container is named `backend`. The Nginx config uses that name.

If port `80` is already in use, map the frontend to another host port:

```bash
docker run -d \
  --name frontend \
  --network nextkode-lab-network \
  -p 8080:80 \
  nextkode-deploylab-frontend:local
```

Then open:

```text
http://localhost:8080
```

## References

- Docker image tag reference: https://docs.docker.com/reference/cli/docker/image/tag/
- Docker image push reference: https://docs.docker.com/reference/cli/docker/image/push/
- Docker Hub push guide: https://docs.docker.com/docker-hub/repos/manage/hub-images/push/

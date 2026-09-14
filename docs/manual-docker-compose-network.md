# Docker Compose & Networking Demo Lab

This lab is designed for classroom practice with **Docker Run, Docker Networking, Docker Compose, and Docker Hub**.

Docker Hub namespace used in this lab:

```text
nextkodeschool
```

The lab starts with a **manual container workflow**, then moves to **manual Docker networking**, and finally to **Docker Compose automation**.

---

## Learning Objectives

By the end of this lab, students should be able to:

- Build Docker images using Dockerfiles.
- Run containers manually using `docker run`.
- Stop and remove containers manually.
- Create a custom Docker bridge network.
- Connect multiple containers to the same Docker network.
- Verify container-to-container communication using container names.
- Understand why containers on different Docker networks cannot communicate directly.
- Define services and networks in a `compose.yaml` file.
- Start the complete application stack using one Docker Compose command.
- Push locally built images to Docker Hub.
- Run the application from Docker Hub images using Docker Compose.

---

# Application Used in This Lab

We will create a simple two-container application:

```text
Browser
   |
   | Port 8080
   v
Frontend Container
Nginx Web Server
   |
   | Same Docker Network
   v
Database Container
MySQL
```

> The frontend is only used to demonstrate a running web application. The database container is used to demonstrate networking, service discovery, and Docker Compose.

---

# Project Folder Structure

Create the following structure:

```text
docker-compose-lab/
|
|-- frontend/
|   |-- Dockerfile
|   `-- index.html
|
|-- database/
|   `-- Dockerfile
|
|-- compose.yaml
|-- compose-hub.yaml
`-- README.md
```

Create the folders:

```bash
mkdir -p docker-compose-lab/frontend docker-compose-lab/database
cd docker-compose-lab
```

---

# 1. Frontend Files

## `frontend/index.html`

Create the file:

```html
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>NextKodeSchool Docker Lab</title>

    <style>
        body {
            font-family: Arial, sans-serif;
            background: #071a33;
            color: white;
            text-align: center;
            padding-top: 120px;
        }

        h1 {
            color: #20d9ff;
            font-size: 48px;
        }

        p {
            font-size: 22px;
        }

        .box {
            width: 650px;
            max-width: 85%;
            margin: auto;
            padding: 40px;
            border: 1px solid #20d9ff;
            border-radius: 16px;
            background: #0b2548;
        }
    </style>
</head>
<body>

    <div class="box">
        <h1>NextKodeSchool Docker Lab</h1>
        <p>Frontend Container is Running Successfully!</p>
        <p>Practice Docker Run, Networking and Docker Compose.</p>
    </div>

</body>
</html>
```

---

## `frontend/Dockerfile`

```dockerfile
# Use the official lightweight Nginx image as the base image.
FROM nginx:alpine

# Copy our website into the default Nginx web directory.
COPY index.html /usr/share/nginx/html/index.html

# Document that the container listens on HTTP port 80.
EXPOSE 80

# Nginx starts automatically from the base image.
```

---

# 2. Database Dockerfile

## `database/Dockerfile`

```dockerfile
# Use the official MySQL image as the base image.
FROM mysql:8.0

# Port 3306 is the default MySQL database port.
EXPOSE 3306

# Username/password/database values are intentionally NOT stored here.
# They will be supplied at runtime using docker run or Docker Compose.
```

> Do not put passwords directly inside Dockerfiles. Runtime configuration should be supplied using environment variables, `.env` files, or secret-management systems.

---

# LAB 1 - Manual Process Using Docker Run

In this section, every step is performed manually.

## Step 1 - Build the Frontend Image

From the project root:

```bash
docker build -t nextkodeschool/nks-frontend:v1 ./frontend
```

## Step 2 - Build the Database Image

```bash
docker build -t nextkodeschool/nks-database:v1 ./database
```

Verify the images:

```bash
docker images
```

Expected image names:

```text
nextkodeschool/nks-frontend   v1
nextkodeschool/nks-database   v1
```

---

## Step 3 - Run Frontend Container Manually

```bash
docker run -d \
  --name nks-frontend \
  -p 8080:80 \
  nextkodeschool/nks-frontend:v1
```

Open:

```text
http://localhost:8080
```

If using an EC2 instance:

```text
http://<EC2-PUBLIC-IP>:8080
```

---

## Step 4 - Run MySQL Container Manually

```bash
docker run -d \
  --name nks-database \
  -e MYSQL_ROOT_PASSWORD=root@123 \
  -e MYSQL_DATABASE=nkslab \
  -e MYSQL_USER=nksuser \
  -e MYSQL_PASSWORD=nks@123 \
  nextkodeschool/nks-database:v1
```

> These passwords are only simple classroom-demo values. Do not use them in production.

---

## Step 5 - Check Running Containers

```bash
docker ps
```

You should see:

```text
nks-frontend
nks-database
```

---

## Step 6 - Stop Containers Manually

```bash
docker stop nks-frontend
```

```bash
docker stop nks-database
```

Start them again:

```bash
docker start nks-frontend
```

```bash
docker start nks-database
```

---

## Step 7 - Remove Manual Containers

Stop and remove them before starting the networking lab:

```bash
docker rm -f nks-frontend nks-database
```

---

# LAB 2 - Manual Docker Networking

By default, containers can be isolated depending on how they are created and connected.

We will create a custom Docker network and connect both containers to it.

---

## Step 1 - Create a Docker Network

```bash
docker network create app-network
```

List Docker networks:

```bash
docker network ls
```

---

## Step 2 - Run Frontend on `app-network`

```bash
docker run -d \
  --name nks-frontend \
  --network app-network \
  -p 8080:80 \
  nextkodeschool/nks-frontend:v1
```

---

## Step 3 - Run Database on `app-network`

```bash
docker run -d \
  --name nks-database \
  --network app-network \
  -e MYSQL_ROOT_PASSWORD=root@123 \
  -e MYSQL_DATABASE=nkslab \
  -e MYSQL_USER=nksuser \
  -e MYSQL_PASSWORD=nks@123 \
  nextkodeschool/nks-database:v1
```

---

## Step 4 - Inspect the Network

```bash
docker network inspect app-network
```

Look under the `Containers` section.

You should see both:

```text
nks-frontend
nks-database
```

---

# LAB 3 - Check Communication on the Same Network

Containers on a user-defined Docker network can resolve each other using their **container names**.

The default Nginx container may not contain the `ping` command, so for networking tests we will use small diagnostic containers.

## Test Same-Network Communication

Start two Alpine containers on `app-network`:

```bash
docker run -dit \
  --name test-container-1 \
  --network app-network \
  alpine sh
```

```bash
docker run -dit \
  --name test-container-2 \
  --network app-network \
  alpine sh
```

From container 1, ping container 2 by name:

```bash
docker exec -it test-container-1 ping -c 4 test-container-2
```

Expected result:

```text
PING test-container-2 (...)
64 bytes from ...
64 bytes from ...
```

This demonstrates:

```text
Same Network
     +
Container Name
     =
Communication Works
```

---

# LAB 4 - Containers on Different Networks Should Fail

Now create another Docker network.

```bash
docker network create isolated-network
```

Run another Alpine container on the second network:

```bash
docker run -dit \
  --name isolated-container \
  --network isolated-network \
  alpine sh
```

Now try to ping it from `test-container-1`:

```bash
docker exec -it test-container-1 ping -c 4 isolated-container
```

The name should not resolve / the communication should fail because:

```text
test-container-1
      |
 app-network

       X

isolated-network
      |
isolated-container
```

The two containers are attached to **different Docker networks**.

---

## Optional - Connect the Container to the Same Network

Connect `isolated-container` to `app-network`:

```bash
docker network connect app-network isolated-container
```

Try again:

```bash
docker exec -it test-container-1 ping -c 4 isolated-container
```

It should now work because both containers share `app-network`.

Disconnect it again:

```bash
docker network disconnect app-network isolated-container
```

---

# Useful Docker Network Commands

```bash
# List all Docker networks.
docker network ls

# Create a custom network.
docker network create app-network

# Inspect network details and connected containers.
docker network inspect app-network

# Connect an existing container to a network.
docker network connect app-network <container-name>

# Disconnect a container from a network.
docker network disconnect app-network <container-name>

# Remove a Docker network.
docker network rm app-network
```

---

# Cleanup Before Docker Compose Lab

Remove the containers created manually:

```bash
docker rm -f \
  nks-frontend \
  nks-database \
  test-container-1 \
  test-container-2 \
  isolated-container
```

Remove the networks if they are no longer in use:

```bash
docker network rm app-network isolated-network
```

---

# LAB 5 - Automated Process Using Docker Compose

Instead of manually running multiple Docker commands, Docker Compose allows us to define the complete application in one YAML file.

The workflow becomes:

```text
compose.yaml
     |
     v
Docker Compose
     |
     +---- Frontend Container
     |
     +---- Database Container
     |
     `---- Docker Network
```

---

# `compose.yaml`

Create this file in the project root:

```yaml
services:

  # -------------------------------
  # Frontend Service
  # -------------------------------
  frontend:

    # Build an image using frontend/Dockerfile.
    build:
      context: ./frontend
      dockerfile: Dockerfile

    # Name of the running container.
    container_name: nks-frontend

    # Map host port 8080 to Nginx port 80.
    ports:
      - "8080:80"

    # Attach this container to our custom Docker network.
    networks:
      - app-network

    # Start database before frontend.
    depends_on:
      - database


  # -------------------------------
  # Database Service
  # -------------------------------
  database:

    # Build an image using database/Dockerfile.
    build:
      context: ./database
      dockerfile: Dockerfile

    # Name of the database container.
    container_name: nks-database

    # Runtime environment variables required by MySQL.
    environment:
      MYSQL_ROOT_PASSWORD: root@123
      MYSQL_DATABASE: nkslab
      MYSQL_USER: nksuser
      MYSQL_PASSWORD: nks@123

    # Store MySQL data outside the container filesystem.
    volumes:
      - mysql-data:/var/lib/mysql

    # Attach database to the same application network.
    networks:
      - app-network


# -------------------------------
# Docker Network
# -------------------------------
networks:

  # Compose automatically creates this bridge network.
  app-network:
    driver: bridge


# -------------------------------
# Persistent Volume
# -------------------------------
volumes:

  # MySQL data remains available after container recreation.
  mysql-data:
```

---

# Start the Complete Stack

```bash
docker compose up -d --build
```

This single command will:

1. Build the frontend image.
2. Build the database image.
3. Create the Docker network.
4. Create the MySQL volume.
5. Create the frontend container.
6. Create the database container.
7. Connect both services to the same network.
8. Start the application.

---

# Check Docker Compose Containers

```bash
docker compose ps
```

Or:

```bash
docker ps
```

Open the frontend:

```text
http://localhost:8080
```

---

# Check the Docker Compose Network

Docker Compose usually creates a network name using the project directory as a prefix.

Check:

```bash
docker network ls
```

Example:

```text
docker-compose-lab_app-network
```

Inspect it:

```bash
docker network inspect docker-compose-lab_app-network
```

> The exact prefix can change depending on your project directory or Compose project name.

---

# Manage One Compose Container Manually

Even though Docker Compose started everything together, individual containers can still be managed manually.

Stop frontend:

```bash
docker stop nks-frontend
```

Start it again:

```bash
docker start nks-frontend
```

Stop database:

```bash
docker stop nks-database
```

Start it again:

```bash
docker start nks-database
```

---

# Stop the Complete Compose Stack

```bash
docker compose down
```

This removes the Compose containers and network.

The named database volume is kept.

To also delete the volume:

```bash
docker compose down -v
```

---

# LAB 6 - Push Images to Docker Hub

Login to Docker Hub:

```bash
docker login
```

Your Docker Hub namespace is:

```text
nextkodeschool
```

Build the images:

```bash
docker build -t nextkodeschool/nks-frontend:latest ./frontend
```

```bash
docker build -t nextkodeschool/nks-database:latest ./database
```

Push frontend:

```bash
docker push nextkodeschool/nks-frontend:latest
```

Push database:

```bash
docker push nextkodeschool/nks-database:latest
```

---

# LAB 7 - Docker Compose Using Docker Hub Images

Now create a second Compose file that does **not** build locally.

Instead, Docker Compose will pull the images from Docker Hub.

## `compose-hub.yaml`

```yaml
services:

  # -------------------------------
  # Frontend from Docker Hub
  # -------------------------------
  frontend:

    # Pull the already-built image from Docker Hub.
    image: nextkodeschool/nks-frontend:latest

    container_name: nks-frontend

    ports:
      - "8080:80"

    networks:
      - app-network

    depends_on:
      - database


  # -------------------------------
  # Database from Docker Hub
  # -------------------------------
  database:

    # Pull our MySQL-based image from Docker Hub.
    image: nextkodeschool/nks-database:latest

    container_name: nks-database

    # Supply runtime configuration to the database container.
    environment:
      MYSQL_ROOT_PASSWORD: root@123
      MYSQL_DATABASE: nkslab
      MYSQL_USER: nksuser
      MYSQL_PASSWORD: nks@123

    volumes:
      - mysql-data:/var/lib/mysql

    networks:
      - app-network


# Compose creates the network automatically.
networks:
  app-network:
    driver: bridge


# Persistent MySQL storage.
volumes:
  mysql-data:
```

Pull the images:

```bash
docker compose -f compose-hub.yaml pull
```

Start the application:

```bash
docker compose -f compose-hub.yaml up -d
```

Check:

```bash
docker compose -f compose-hub.yaml ps
```

Open:

```text
http://localhost:8080
```

Stop it:

```bash
docker compose -f compose-hub.yaml down
```

---

# Manual vs Docker Compose

| Manual Docker Run | Docker Compose |
|---|---|
| Multiple `docker run` commands | One `docker compose up` command |
| Create network manually | Compose creates network automatically |
| Connect containers manually | Services join network automatically |
| More commands to remember | Infrastructure declared in YAML |
| Harder to reproduce | Easy to reproduce |
| Good for learning individual commands | Better for multi-container applications |

---

# Complete Lab Flow

```text
1. Write Dockerfiles
        |
        v
2. Build Images Manually
        |
        v
3. Run Containers Manually
        |
        v
4. Create Docker Network Manually
        |
        v
5. Test Same-Network Communication
        |
        v
6. Test Different-Network Failure
        |
        v
7. Define compose.yaml
        |
        v
8. docker compose up -d --build
        |
        v
9. Compose Creates Containers + Network
        |
        v
10. Push Images to Docker Hub
        |
        v
11. Pull & Run Images Using compose-hub.yaml
```

---

# Important Commands Summary

```bash
# Build image.
docker build -t nextkodeschool/nks-frontend:v1 ./frontend

# Run container.
docker run -d --name nks-frontend -p 8080:80 nextkodeschool/nks-frontend:v1

# List containers.
docker ps

# Stop container.
docker stop nks-frontend

# Start container.
docker start nks-frontend

# Create network.
docker network create app-network

# List networks.
docker network ls

# Inspect network.
docker network inspect app-network

# Connect existing container to network.
docker network connect app-network <container-name>

# Disconnect container from network.
docker network disconnect app-network <container-name>

# Start Docker Compose stack.
docker compose up -d --build

# View Compose containers.
docker compose ps

# View Compose logs.
docker compose logs -f

# Stop and remove Compose containers/network.
docker compose down

# Remove Compose stack including volumes.
docker compose down -v
```

---

# Final Takeaway

```text
Docker Run
    = Manage containers individually

Docker Network
    = Allow containers to communicate

Docker Compose
    = Define and manage the complete application stack
      using one YAML configuration file
```

**NextKodeSchool Docker Lab**

**Build -> Run -> Network -> Compose -> Push -> Deploy**

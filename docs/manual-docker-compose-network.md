# NextKodeSchool Docker Compose & Networking Demo Lab

This classroom lab demonstrates **Docker Run, Docker Networking, container-to-container communication, Docker Compose, Docker Hub, and a working login application backed by MySQL**.

Docker Hub namespace used in this lab:

```text
nextkodeschool
```

The application contains two containers:

```text
Browser
   |
   | http://localhost:8080
   v
Frontend Container
PHP + Apache
Login UI
   |
   | Docker Network
   v
Database Container
MySQL 8
Users Table
```

The demo user stored in MySQL is:

```text
Username: admin
Password: admin@123
```

> This credential is intentionally simple for classroom demonstrations. Do not use it in production.

---

# Learning Objectives

By the end of this lab, students should be able to:

- Build Docker images from Dockerfiles.
- Run containers manually using `docker run`.
- Understand why application containers need networking to communicate.
- Create a custom Docker bridge network.
- Run frontend and database containers on the same network.
- Verify container-to-container communication using `ping`.
- Prove that containers on different custom networks cannot communicate by name.
- Login to a frontend application whose user data comes from MySQL.
- Define the same application using Docker Compose.
- Let Docker Compose create the network automatically.
- Start the entire application stack with one command.
- Push images to Docker Hub.
- Run the same application using Docker Hub images.

---

# Project Folder Structure

Create the following structure:

```text
nks-docker-compose-lab/
|
|-- frontend/
|   |-- Dockerfile
|   `-- index.php
|
|-- database/
|   |-- Dockerfile
|   `-- init.sql
|
|-- compose.yaml
|-- compose-hub.yaml
`-- README.md
```

Create the folders:

```bash
mkdir -p nks-docker-compose-lab/frontend nks-docker-compose-lab/database
cd nks-docker-compose-lab
```

---

# 1. Frontend Application

The frontend uses **PHP + Apache** because the browser should display a login page and the frontend container needs server-side code to query MySQL securely.

## `frontend/index.php`

Create:

```php
<?php
// Start the PHP session so we can remember the logged-in user.
session_start();

// Read database connection information from environment variables.
// These values are supplied using docker run or Docker Compose.
$dbHost = getenv('DB_HOST') ?: 'nks-database';
$dbPort = getenv('DB_PORT') ?: '3306';
$dbName = getenv('DB_NAME') ?: 'nkslab';
$dbUser = getenv('DB_USER') ?: 'nksapp';
$dbPassword = getenv('DB_PASSWORD') ?: 'nksdb@123';

$error = '';
$dbConnected = false;

// Create a MySQL connection.
$mysqli = @new mysqli($dbHost, $dbUser, $dbPassword, $dbName, (int)$dbPort);

if (!$mysqli->connect_errno) {
    $dbConnected = true;
}

// Logout request.
if (isset($_GET['logout'])) {
    session_destroy();
    header('Location: /');
    exit;
}

// Process the login form only when database connectivity is available.
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $username = trim($_POST['username'] ?? '');
    $password = $_POST['password'] ?? '';

    if (!$dbConnected) {
        $error = 'Database is not connected. Check Docker networking.';
    } elseif ($username === '' || $password === '') {
        $error = 'Please enter username and password.';
    } else {
        // Use a prepared statement to avoid SQL injection.
        $stmt = $mysqli->prepare('SELECT username, password_hash FROM users WHERE username = ? LIMIT 1');
        $stmt->bind_param('s', $username);
        $stmt->execute();
        $result = $stmt->get_result();
        $user = $result->fetch_assoc();

        // Passwords in this lab are stored as SHA-256 hashes.
        if ($user && hash('sha256', $password) === $user['password_hash']) {
            $_SESSION['username'] = $user['username'];
            header('Location: /');
            exit;
        }

        $error = 'Invalid username or password.';
    }
}

$loggedInUser = $_SESSION['username'] ?? null;
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>NextKodeSchool Deployment Lab</title>

    <style>
        * {
            box-sizing: border-box;
        }

        body {
            margin: 0;
            min-height: 100vh;
            font-family: Arial, Helvetica, sans-serif;
            color: #ffffff;
            background:
                radial-gradient(circle at top right, rgba(255, 204, 0, 0.16), transparent 32%),
                linear-gradient(135deg, #050505 0%, #111111 55%, #080808 100%);
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 24px;
        }

        .shell {
            width: 100%;
            max-width: 1080px;
            display: grid;
            grid-template-columns: 1.1fr 0.9fr;
            background: #0d0d0d;
            border: 1px solid #2b2b2b;
            border-radius: 24px;
            overflow: hidden;
            box-shadow: 0 30px 80px rgba(0, 0, 0, 0.55);
        }

        .brand-panel {
            padding: 64px 56px;
            background:
                linear-gradient(160deg, rgba(255, 204, 0, 0.16), transparent 48%),
                #0a0a0a;
            border-right: 1px solid #242424;
        }

        .brand-badge {
            display: inline-block;
            padding: 8px 14px;
            color: #111111;
            background: #ffcc00;
            border-radius: 999px;
            font-weight: 800;
            letter-spacing: .08em;
            font-size: 12px;
            text-transform: uppercase;
            margin-bottom: 28px;
        }

        h1 {
            margin: 0 0 18px;
            font-size: clamp(42px, 6vw, 72px);
            line-height: .98;
            letter-spacing: -2px;
        }

        h1 span {
            color: #ffcc00;
        }

        .lead {
            margin: 0;
            color: #cfcfcf;
            font-size: 18px;
            line-height: 1.7;
            max-width: 530px;
        }

        .architecture {
            margin-top: 38px;
            padding: 20px;
            border: 1px solid #2c2c2c;
            border-radius: 16px;
            background: #101010;
            color: #dcdcdc;
            font-family: monospace;
            line-height: 1.9;
        }

        .architecture strong {
            color: #ffcc00;
        }

        .form-panel {
            padding: 64px 48px;
            display: flex;
            align-items: center;
        }

        .form-box {
            width: 100%;
        }

        .form-box h2 {
            font-size: 30px;
            margin: 0 0 8px;
        }

        .muted {
            color: #969696;
            margin-bottom: 30px;
        }

        label {
            display: block;
            margin: 0 0 8px;
            color: #dedede;
            font-weight: 700;
        }

        input {
            width: 100%;
            padding: 15px 16px;
            margin-bottom: 18px;
            border-radius: 10px;
            border: 1px solid #383838;
            background: #151515;
            color: #ffffff;
            font-size: 16px;
            outline: none;
        }

        input:focus {
            border-color: #ffcc00;
            box-shadow: 0 0 0 3px rgba(255, 204, 0, 0.12);
        }

        button, .button-link {
            width: 100%;
            display: inline-block;
            border: none;
            border-radius: 10px;
            padding: 15px 18px;
            background: #ffcc00;
            color: #111111;
            font-size: 16px;
            font-weight: 900;
            cursor: pointer;
            text-decoration: none;
            text-align: center;
        }

        button:hover, .button-link:hover {
            background: #ffd633;
        }

        .status {
            margin-top: 22px;
            padding: 12px 14px;
            border-radius: 10px;
            font-size: 14px;
            background: #151515;
            border: 1px solid #303030;
        }

        .status.ok {
            color: #9eff9e;
        }

        .status.fail, .error {
            color: #ff9a9a;
        }

        .error {
            background: rgba(255, 75, 75, 0.08);
            border: 1px solid rgba(255, 75, 75, 0.3);
            padding: 12px 14px;
            border-radius: 10px;
            margin-bottom: 18px;
        }

        .success-card {
            padding: 28px;
            border: 1px solid rgba(255, 204, 0, 0.35);
            border-radius: 18px;
            background: linear-gradient(145deg, rgba(255, 204, 0, 0.12), rgba(255,255,255,0.02));
        }

        .success-card h2 {
            color: #ffcc00;
            font-size: 34px;
            margin-bottom: 14px;
        }

        .username {
            font-size: 26px;
            font-weight: 800;
            margin: 18px 0 26px;
        }

        @media (max-width: 820px) {
            .shell {
                grid-template-columns: 1fr;
            }

            .brand-panel {
                border-right: none;
                border-bottom: 1px solid #242424;
                padding: 42px 30px;
            }

            .form-panel {
                padding: 42px 30px;
            }
        }
    </style>
</head>
<body>

<div class="shell">
    <section class="brand-panel">
        <div class="brand-badge">NextKodeSchool</div>

        <h1>Docker <span>Deployment Lab</span></h1>

        <p class="lead">
            Practice Docker Run, Docker Networking and Docker Compose with a real login application connected to MySQL.
        </p>

        <div class="architecture">
            <strong>Browser</strong> → Frontend Container<br>
            Frontend → <strong>Docker Network</strong><br>
            Docker Network → MySQL Database
        </div>
    </section>

    <section class="form-panel">
        <div class="form-box">

            <?php if ($loggedInUser): ?>
                <div class="success-card">
                    <h2>Awesome! 🎉</h2>
                    <p>You have successfully deployed and connected the application.</p>

                    <div class="username">
                        Logged in with <?= htmlspecialchars($loggedInUser) ?> user
                    </div>

                    <p>Frontend and Database are connected successfully.</p>

                    <div class="status ok">● Database Connected</div>
                    <br>
                    <a class="button-link" href="/?logout=1">Logout</a>
                </div>
            <?php else: ?>
                <h2>Login to Deployment Lab</h2>
                <p class="muted">Authenticate using the user stored in MySQL.</p>

                <?php if ($error): ?>
                    <div class="error"><?= htmlspecialchars($error) ?></div>
                <?php endif; ?>

                <form method="POST">
                    <label for="username">Username</label>
                    <input id="username" name="username" type="text" placeholder="Enter username" required>

                    <label for="password">Password</label>
                    <input id="password" name="password" type="password" placeholder="Enter password" required>

                    <button type="submit">Login</button>
                </form>

                <?php if ($dbConnected): ?>
                    <div class="status ok">● Database Connected</div>
                <?php else: ?>
                    <div class="status fail">● Database Not Connected</div>
                <?php endif; ?>
            <?php endif; ?>

        </div>
    </section>
</div>

</body>
</html>
```

---

# 2. Frontend Dockerfile

## `frontend/Dockerfile`

```dockerfile
# Use PHP with Apache so the frontend can process the login form.
FROM php:8.2-apache

# Install the PHP MySQL extension required to connect to MySQL.
RUN docker-php-ext-install mysqli

# Copy the login application into Apache's web root.
COPY index.php /var/www/html/index.php

# Apache listens on port 80 inside the container.
EXPOSE 80

# The base image automatically starts Apache.
```

---

# 3. Database Initialization

## `database/init.sql`

Create:

```sql
-- Use the database created by the MySQL container.
USE nkslab;

-- Create the application users table.
CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(100) NOT NULL UNIQUE,
    password_hash VARCHAR(64) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create the classroom demo user.
-- We store a SHA-256 hash instead of the plain-text password.
INSERT INTO users (username, password_hash)
VALUES ('admin', SHA2('admin@123', 256))
ON DUPLICATE KEY UPDATE username = VALUES(username);
```

Demo login:

```text
Username: admin
Password: admin@123
```

---

# 4. Database Dockerfile

## `database/Dockerfile`

```dockerfile
# Use the official MySQL 8 image.
FROM mysql:8.0

# Copy the SQL initialization script into the directory that
# the MySQL image automatically executes on first initialization.
COPY init.sql /docker-entrypoint-initdb.d/01-init.sql

# MySQL listens on port 3306 inside the container.
EXPOSE 3306

# Root password, application database name and application DB user
# are supplied at runtime using docker run or Docker Compose.
```

> `init.sql` is executed when MySQL initializes a new data directory. If an existing Docker volume already contains MySQL data, the initialization script is not executed again.

---

# LAB 1 — Build Images Manually

Build the frontend image:

```bash
docker build -t nextkodeschool/nks-frontend:v1 ./frontend
```

Build the database image:

```bash
docker build -t nextkodeschool/nks-database:v1 ./database
```

Check images:

```bash
docker images
```

Expected:

```text
nextkodeschool/nks-frontend   v1
nextkodeschool/nks-database   v1
```

---

# LAB 2 — Manual Process Without a Custom Network

This section is useful to show **why Docker networking matters**.

Run the database:

```bash
docker run -d \
  --name nks-database \
  -e MYSQL_ROOT_PASSWORD=root@123 \
  -e MYSQL_DATABASE=nkslab \
  -e MYSQL_USER=nksapp \
  -e MYSQL_PASSWORD=nksdb@123 \
  nextkodeschool/nks-database:v1
```

Run the frontend:

```bash
docker run -d \
  --name nks-frontend \
  -p 8080:80 \
  -e DB_HOST=nks-database \
  -e DB_PORT=3306 \
  -e DB_NAME=nkslab \
  -e DB_USER=nksapp \
  -e DB_PASSWORD=nksdb@123 \
  nextkodeschool/nks-frontend:v1
```

Open:

```text
http://localhost:8080
```

The page loads, but the frontend should show:

```text
Database Not Connected
```

and login will fail.

Why?

```text
nks-frontend        nks-database
     |                   |
 default bridge      default bridge

Container-name DNS is not provided in the same useful way as a user-defined bridge network.
```

This creates a good classroom problem to solve in the next lab.

Remove the containers:

```bash
docker rm -f nks-frontend nks-database
```

---

# LAB 3 — Manual Docker Networking + Working Login

Now create a user-defined network:

```bash
docker network create app-network
```

Check networks:

```bash
docker network ls
```

## Run the Database on `app-network`

```bash
docker run -d \
  --name nks-database \
  --network app-network \
  -e MYSQL_ROOT_PASSWORD=root@123 \
  -e MYSQL_DATABASE=nkslab \
  -e MYSQL_USER=nksapp \
  -e MYSQL_PASSWORD=nksdb@123 \
  nextkodeschool/nks-database:v1
```

## Run the Frontend on `app-network`

```bash
docker run -d \
  --name nks-frontend \
  --network app-network \
  -p 8080:80 \
  -e DB_HOST=nks-database \
  -e DB_PORT=3306 \
  -e DB_NAME=nkslab \
  -e DB_USER=nksapp \
  -e DB_PASSWORD=nksdb@123 \
  nextkodeschool/nks-frontend:v1
```

The important setting is:

```text
DB_HOST=nks-database
```

The frontend does **not** need the MySQL container IP address. Docker's user-defined network resolves the container name.

Open:

```text
http://localhost:8080
```

Or on EC2:

```text
http://<EC2-PUBLIC-IP>:8080
```

Login with:

```text
Username: admin
Password: admin@123
```

After login, the page should show:

```text
Awesome! 🎉

You have successfully deployed and connected the application.

Logged in with admin user

Frontend and Database are connected successfully.
```

---

# Inspect the Manual Network

```bash
docker network inspect app-network
```

Under `Containers`, you should see:

```text
nks-frontend
nks-database
```

---

# LAB 4 — Check Ping on the Same Network

The PHP and MySQL application images are intentionally focused on application functionality, so use small Alpine diagnostic containers for a clean networking demo.

Run two Alpine containers on the same network:

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

Ping container 2 from container 1:

```bash
docker exec -it test-container-1 ping -c 4 test-container-2
```

Expected:

```text
PING test-container-2 (...)
64 bytes from ...
64 bytes from ...
```

This proves:

```text
Same Docker Network
       +
Container Name
       =
Communication Works
```

---

# LAB 5 — Different Networks Should Fail

Create another network:

```bash
docker network create isolated-network
```

Run a container on it:

```bash
docker run -dit \
  --name isolated-container \
  --network isolated-network \
  alpine sh
```

Try to ping it from `test-container-1`:

```bash
docker exec -it test-container-1 ping -c 4 isolated-container
```

The request should fail because the containers are on different networks:

```text
test-container-1
      |
 app-network
      |
      X
      |
isolated-network
      |
isolated-container
```

Now attach `isolated-container` to `app-network`:

```bash
docker network connect app-network isolated-container
```

Try again:

```bash
docker exec -it test-container-1 ping -c 4 isolated-container
```

Now it should work.

Disconnect it again:

```bash
docker network disconnect app-network isolated-container
```

---

# Useful Docker Network Commands

```bash
# List Docker networks.
docker network ls

# Create a network.
docker network create app-network

# Inspect connected containers and network details.
docker network inspect app-network

# Connect an existing container to a network.
docker network connect app-network <container-name>

# Disconnect a container from a network.
docker network disconnect app-network <container-name>

# Remove a network.
docker network rm app-network
```

---

# Cleanup Before Docker Compose

Remove manual containers:

```bash
docker rm -f \
  nks-frontend \
  nks-database \
  test-container-1 \
  test-container-2 \
  isolated-container
```

Remove networks:

```bash
docker network rm app-network isolated-network
```

---

# LAB 6 — Automated Process Using Docker Compose

Docker Compose will now automate what we did manually:

```text
compose.yaml
     |
     v
Docker Compose
     |
     +---- Build Frontend Image
     +---- Build Database Image
     +---- Create Network
     +---- Create Volume
     +---- Start Database
     `---- Start Frontend
```

## `compose.yaml`

Create this file in the project root:

```yaml
services:

  # ============================================================
  # Frontend service
  # ============================================================
  frontend:

    # Build the frontend image using frontend/Dockerfile.
    build:
      context: ./frontend
      dockerfile: Dockerfile

    # Give the running container an easy classroom-friendly name.
    container_name: nks-frontend

    # Map host port 8080 to Apache port 80 inside the container.
    ports:
      - "8080:80"

    # Pass database connection information to PHP.
    # Notice DB_HOST uses the Compose service name: database.
    environment:
      DB_HOST: database
      DB_PORT: 3306
      DB_NAME: nkslab
      DB_USER: nksapp
      DB_PASSWORD: nksdb@123

    # Start the database container before starting the frontend.
    depends_on:
      - database

    # Connect frontend to the application network.
    networks:
      - app-network


  # ============================================================
  # Database service
  # ============================================================
  database:

    # Build our MySQL image containing init.sql.
    build:
      context: ./database
      dockerfile: Dockerfile

    container_name: nks-database

    # Environment variables used by the official MySQL entrypoint.
    environment:
      MYSQL_ROOT_PASSWORD: root@123
      MYSQL_DATABASE: nkslab
      MYSQL_USER: nksapp
      MYSQL_PASSWORD: nksdb@123

    # Persist MySQL data even if the container is recreated.
    volumes:
      - mysql-data:/var/lib/mysql

    # Connect database to the same application network.
    networks:
      - app-network


# ============================================================
# Docker network
# ============================================================
networks:

  # Compose automatically creates this bridge network.
  app-network:
    driver: bridge


# ============================================================
# Persistent volume
# ============================================================
volumes:

  # MySQL data is stored outside the writable container layer.
  mysql-data:
```

---

# Start the Complete Application

```bash
docker compose up -d --build
```

This one command will:

1. Build the frontend image.
2. Build the database image.
3. Create the Docker network.
4. Create the MySQL volume.
5. Start MySQL.
6. Execute `init.sql` on first database initialization.
7. Create the `admin` application user.
8. Start the frontend.
9. Connect both containers to the same network.

Check:

```bash
docker compose ps
```

Open:

```text
http://localhost:8080
```

Login:

```text
Username: admin
Password: admin@123
```

---

# Docker Compose Networking

The key section is:

```yaml
networks:
  app-network:
    driver: bridge
```

Both services use:

```yaml
networks:
  - app-network
```

Therefore:

```text
frontend
   |
   | app-network
   |
database
```

The frontend connects to MySQL using the **Compose service name**:

```text
database:3306
```

not an IP address.

---

# Check the Compose Network

```bash
docker network ls
```

Compose usually creates a name similar to:

```text
nks-docker-compose-lab_app-network
```

Inspect it:

```bash
docker network inspect nks-docker-compose-lab_app-network
```

> The prefix depends on the directory name or Compose project name.

---

# Stop and Start One Container Manually

Even if Compose created the stack, individual containers can still be controlled manually.

Stop frontend:

```bash
docker stop nks-frontend
```

Start frontend:

```bash
docker start nks-frontend
```

Stop database:

```bash
docker stop nks-database
```

Start database:

```bash
docker start nks-database
```

This is useful for demonstrating what happens when one application component becomes unavailable.

---

# Stop the Complete Compose Stack

```bash
docker compose down
```

This removes the containers and Compose network, but keeps the named MySQL volume.

To remove the database data too:

```bash
docker compose down -v
```

> Use `-v` when you want `init.sql` to run again from a fresh database during the next `docker compose up`.

---

# LAB 7 — Push Images to Docker Hub

Login:

```bash
docker login
```

Docker Hub namespace:

```text
nextkodeschool
```

Build frontend:

```bash
docker build -t nextkodeschool/nks-frontend:latest ./frontend
```

Build database:

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

# LAB 8 — Docker Compose Using Docker Hub Images

This Compose file does not build anything locally. It pulls both images from Docker Hub.

## `compose-hub.yaml`

```yaml
services:

  # ============================================================
  # Frontend image from Docker Hub
  # ============================================================
  frontend:

    # Pull the published frontend image.
    image: nextkodeschool/nks-frontend:latest

    container_name: nks-frontend

    ports:
      - "8080:80"

    # Database settings are supplied at runtime.
    environment:
      DB_HOST: database
      DB_PORT: 3306
      DB_NAME: nkslab
      DB_USER: nksapp
      DB_PASSWORD: nksdb@123

    depends_on:
      - database

    networks:
      - app-network


  # ============================================================
  # Database image from Docker Hub
  # ============================================================
  database:

    # Pull the MySQL image containing our initialization SQL.
    image: nextkodeschool/nks-database:latest

    container_name: nks-database

    environment:
      MYSQL_ROOT_PASSWORD: root@123
      MYSQL_DATABASE: nkslab
      MYSQL_USER: nksapp
      MYSQL_PASSWORD: nksdb@123

    volumes:
      - mysql-data:/var/lib/mysql

    networks:
      - app-network


# Compose creates the custom network automatically.
networks:
  app-network:
    driver: bridge


# Keep MySQL data persistent.
volumes:
  mysql-data:
```

Pull images:

```bash
docker compose -f compose-hub.yaml pull
```

Start:

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

Login:

```text
Username: admin
Password: admin@123
```

Stop:

```bash
docker compose -f compose-hub.yaml down
```

Delete the database volume too:

```bash
docker compose -f compose-hub.yaml down -v
```

---

# Manual Docker Run vs Docker Compose

| Manual Docker Run | Docker Compose |
|---|---|
| Multiple commands | One `docker compose up` command |
| Create network manually | Compose creates network automatically |
| Attach containers manually | Compose attaches services automatically |
| Pass environment variables repeatedly | Configuration stays in YAML |
| More commands to reproduce | Easy to reproduce |
| Excellent for learning Docker basics | Better for multi-container applications |

---

# Complete Classroom Demo Flow

```text
1. Create Frontend + Database Dockerfiles
                 |
                 v
2. Build Images Manually
                 |
                 v
3. Run Without Custom Network
                 |
                 v
4. Login Fails / DB Not Connected
                 |
                 v
5. Create app-network
                 |
                 v
6. Run Both Containers on Same Network
                 |
                 v
7. Login Works
   admin / admin@123
                 |
                 v
8. Test Ping on Same Network
                 |
                 v
9. Test Different Network → Fails
                 |
                 v
10. Docker Compose Automates Everything
                 |
                 v
11. Push Images to Docker Hub
                 |
                 v
12. Pull Images with compose-hub.yaml
                 |
                 v
13. Login Works Again
```

---

# Quick Command Reference

```bash
# Build frontend image.
docker build -t nextkodeschool/nks-frontend:v1 ./frontend

# Build database image.
docker build -t nextkodeschool/nks-database:v1 ./database

# Create application network.
docker network create app-network

# Start the complete Compose stack.
docker compose up -d --build

# View containers.
docker compose ps

# View logs.
docker compose logs -f

# Stop one container.
docker stop nks-frontend

# Start one container.
docker start nks-frontend

# Stop the Compose stack.
docker compose down

# Stop stack and remove persistent DB data.
docker compose down -v

# List networks.
docker network ls

# Inspect a network.
docker network inspect app-network
```

---

# Demo Credentials

```text
Application Login
-----------------
Username: admin
Password: admin@123

MySQL Application Account
-------------------------
Database: nkslab
User: nksapp
Password: nksdb@123
```

The MySQL account is used by the frontend application to connect to the database. The `admin / admin@123` account is the **application login user stored inside the `users` table**.

---

# Final Result

When everything is working:

```text
Browser
   |
   v
Yellow + Black Login UI
   |
   v
nks-frontend
PHP + Apache
   |
   | app-network
   v
nks-database
MySQL
   |
   v
users table
   |
   v
admin / password hash
```

Successful login displays:

```text
Awesome! 🎉
You have successfully deployed and connected the application.
Logged in with admin user
Frontend and Database are connected successfully.
```

**Developed for NextKodeSchool Docker & DevOps Lab Practice.**

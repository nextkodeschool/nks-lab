# Use the official lightweight PostgreSQL image.
FROM postgres:16-alpine

# SQL files in this folder run automatically the first time the DB volume is created.
COPY init/ /docker-entrypoint-initdb.d/

# PostgreSQL listens on port 5432 inside the container.
EXPOSE 5432

# Database

This service uses PostgreSQL for application users and deployment status data.

The Dockerfile stays simple for students:

```dockerfile
FROM postgres:16-alpine
COPY init/ /docker-entrypoint-initdb.d/
```

## Files

- `Dockerfile` builds a classroom-friendly PostgreSQL image.
- `init/01_schema.sql` creates the database tables when the PostgreSQL volume is initialized for the first time.
- `.env.example` documents the database credentials that should be copied into the root `.env`.

## Users

Login users still come from the database.

The schema file creates the `users` table, but it does not insert application passwords. The FastAPI backend reads usernames and passwords from environment variables, hashes passwords with bcrypt, then creates or updates database users idempotently during startup.

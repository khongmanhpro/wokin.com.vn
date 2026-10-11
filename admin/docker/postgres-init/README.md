# PostgreSQL initialization

This directory intentionally contains no automatic SQL initialization scripts.
The local database role and password are created only from values explicitly supplied by the developer through `POSTGRES_PASSWORD` when the Compose service is first started.

Create any additional local-only roles manually with `docker compose exec postgres psql`; never add a default password or production credential here.

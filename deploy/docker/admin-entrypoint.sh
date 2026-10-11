#!/bin/sh
# Applies pending database migrations, then starts the admin. Migrations are idempotent.
set -e
cd /app/admin
npm run db:migrate
exec npm run start -- -p "${PORT:-3000}" -H 0.0.0.0

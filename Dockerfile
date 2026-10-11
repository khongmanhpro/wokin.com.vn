# WOKIN admin (Payload) + the website toolchain its "Xuất bản website" button runs.
# One image: the admin serves /admin and /api; publishing builds the static site from this same checkout.
FROM node:22.19.0-alpine3.22

# rsync: hard-linked website releases; tini: forwards signals so `docker compose stop` is clean.
RUN apk add --no-cache rsync tini \
  && mkdir -p /app /data/media /srv/site \
  && chown node:node /app /data/media /srv/site

USER node
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1

# Dependencies first so code changes do not reinstall them.
COPY --chown=node:node package.json package-lock.json ./
COPY --chown=node:node admin/package.json admin/package-lock.json ./admin/
RUN npm ci --no-audit --no-fund && npm ci --prefix admin --no-audit --no-fund && npm cache clean --force

COPY --chown=node:node . .
# Responsive images are generated into the container on the first publish after each (re)build and reused
# afterwards; not a volume, because the generator swaps the whole folder (a mount point cannot be replaced).

# Build-time placeholders only: the admin build needs a valid-looking env, it does not connect to the database.
RUN cd admin \
  && PAYLOAD_SECRET=container-build-only-secret-0000000000000000 \
     DATABASE_URL=postgresql://build:build@127.0.0.1:5432/build \
     STORAGE_ADAPTER=local \
     npm run build

ENV NODE_ENV=production \
    PORT=3000 \
    HOSTNAME=0.0.0.0 \
    STORAGE_ADAPTER=local \
    WEBSITE_DIR=/app \
    MEDIA_UPLOAD_DIR=/data/media \
    WEBSITE_PUBLISH_DIR=/srv/site

EXPOSE 3000
ENTRYPOINT ["/sbin/tini", "--", "/app/deploy/docker/admin-entrypoint.sh"]

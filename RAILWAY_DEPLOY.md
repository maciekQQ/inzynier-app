Railway Deployment Guide

Variables do skopiowania

Backend Service:
APP_DB_URL=${{Postgres.DATABASE_URL}}
APP_DB_USER=${{Postgres.PGUSER}}
APP_DB_PASSWORD=${{Postgres.PGPASSWORD}}
APP_STORAGE_ENDPOINT=http://minio.railway.internal:9000
APP_STORAGE_PUBLIC_ENDPOINT=https://ZMIEŃ-NA-DOMENĘ-MINIO.railway.app
APP_STORAGE_ACCESS_KEY=minioadmin
APP_STORAGE_SECRET_KEY=minioadmin123
APP_STORAGE_BUCKET=inzynier-bucket
APP_STORAGE_BASE_URL=https://ZMIEŃ-NA-DOMENĘ-MINIO.railway.app/inzynier-bucket
APP_JWT_SECRET=super-secret-production-key-min-32-chars-change-this-xyz
APP_JWT_TTL_SECONDS=3600
APP_CORS_ALLOWED_ORIGINS=https://ZMIEŃ-NA-DOMENĘ-FRONTU.railway.app,http://localhost:3000
SPRING_PROFILES_ACTIVE=railway

Frontend Service:
NEXT_PUBLIC_API_URL=https://ZMIEŃ-NA-DOMENĘ-BACKENDU.railway.app

MinIO Service:
Docker Image: minio/minio:latest
Start Command: server /data --console-address ":9001"
Port: 9000
Variables:
MINIO_ROOT_USER=minioadmin
MINIO_ROOT_PASSWORD=minioadmin123

Root Directory settings:
Backend: apps/api
Frontend: apps/web


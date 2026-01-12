# Platforma zadań dydaktycznych (MVP)

Monorepo: Next.js 14 (App Router) + Spring Boot 3 + Postgres + Minio (S3). Front w `apps/web`, backend w `apps/api`, infrastruktura dev w `infra`.

## Struktura folderów
- `apps/web` – Next.js 14, Tailwind, minimalny ekran logowania + healthcheck, `NEXT_PUBLIC_API_URL`.
- `apps/api` – Spring Boot 3, JWT Security, JPA, Flyway (`db/migration`), seeder admina.
- `infra/docker-compose.yml` – Postgres 14, Minio, backend, frontend.
- `infra/` – miejsce na przyszłe IaC.

## Wymagania lokalnie
- Node 20+, npm 10+
- Java 17, Maven 3.9+
- Docker Desktop (do stacka dev)

## Szybki start (dev)
```bash
cd infra
docker-compose up --build
```
- Front: http://localhost:3000
- API: http://localhost:8080/api/health
- Logowanie demo: `admin@example.com` / `admin123`
- Seeder demo dodaje też: `teacher@example.com` / `teacher123` oraz 3 studentów (`s1@example.com`, `s2@example.com`, `s3@example.com` hasło `student123`) i kurs z zadaniem/etapem/artefaktem.

### Ręcznie (bez Docker)
Backend:
```bash
cd apps/api
mvn -B clean package
java -jar target/api-0.0.1-SNAPSHOT.jar
```
Wymagane zmienne (przykład):
```
APP_DB_URL=jdbc:postgresql://localhost:5432/inzynier
APP_DB_USER=postgres
APP_DB_PASSWORD=postgres
APP_JWT_SECRET=change-me-at-least-32-chars-secret
APP_BOOTSTRAP_ADMIN_PASSWORD=admin123
```

Frontend:
```bash
cd apps/web
npm install
NEXT_PUBLIC_API_URL=http://localhost:8080 npm run dev
```

### Zmienne środowiskowe (API)
- `APP_DB_URL` (np. jdbc:postgresql://postgres:5432/inzynier)
- `APP_DB_USER`, `APP_DB_PASSWORD`
- `APP_JWT_SECRET` (min. 32 znaki)
- `APP_JWT_TTL_SECONDS` (domyślnie 3600)
- `APP_BOOTSTRAP_ADMIN_PASSWORD`
- `APP_CORS_ALLOWED_ORIGINS` (domyślnie http://localhost:3000)
- `APP_STORAGE_BASE_URL` (domyślnie http://localhost:9000/dev-bucket dla linków bezpośrednich)
- `APP_STORAGE_BUCKET` (domyślnie dev-bucket)
- `APP_STORAGE_ENDPOINT` (np. http://minio:9000 albo https://s3.<region>.amazonaws.com)
- `APP_STORAGE_REGION` (domyślnie us-east-1)
- `APP_STORAGE_ACCESS_KEY`, `APP_STORAGE_SECRET_KEY`

### Deploy (Vercel + backend PaaS)
- Front: Vercel, zmienna `NEXT_PUBLIC_API_URL` wskazuje publiczny backend.
- Backend: Render/Railway/Fly.io
  - Build: `mvn -B clean package -DskipTests`
  - Start: `java -jar target/api-0.0.1-SNAPSHOT.jar`
  - Ustaw DB (host, user, pass), `APP_JWT_SECRET`, `APP_CORS_ALLOWED_ORIGINS` na domenę frontu.
  - Włącz Flyway (domyślnie włączony).
  - Storage: skonfiguruj S3/R2 endpoint (`APP_STORAGE_ENDPOINT`, `APP_STORAGE_BUCKET`, `APP_STORAGE_ACCESS_KEY`, `APP_STORAGE_SECRET_KEY`, `APP_STORAGE_REGION`); presigned URL generuje backend.

### S3 / Minio (dev)
- Minio w docker-compose: :9000 (API) / :9001 (console), user/pass `minio/minio123`.
- Presign: backend generuje podpisany PUT (15 min) i GET (60 min) via AWS SDK v2 z endpoint override na Minio; wymaga poprawnych zmiennych storage.

## Deploy (MVP)
- **Frontend (Vercel)**: połącz repo, ustaw `NEXT_PUBLIC_API_URL` na publiczny URL backendu, build command `npm run build`, output `.next`.
- **Backend (Render/Railway/Fly.io)**: build `mvn -B clean package -DskipTests`, start `java -jar target/api-0.0.1-SNAPSHOT.jar`. Ustaw zmienne DB (host, user, pass), `APP_JWT_SECRET`, `APP_BOOTSTRAP_ADMIN_PASSWORD`. Włącz Flyway (domyślnie on).
- **DB**: zarządzany Postgres (Railway/Supabase/Neon) – skonfiguruj SSL zgodnie z dostawcą.
- **Storage**: S3/R2 – docelowo ustaw `S3_ENDPOINT`, `S3_ACCESS_KEY`, `S3_SECRET_KEY` (placeholdery pod dalszy rozwój).

## Obecne funkcje (krok 1/iteracje)
- API: `/api/health`, `/api/auth/login`, `/api/auth/me` (JWT), seeder admina.
- Front: logowanie + proste widoki TEACHER (3 kolumny: kursy/zadania/etapy, kolejka, szczegóły) i STUDENT (kursy/zadania/etapy/artefakty + wysłanie rewizji mock).
- Dev stack: Postgres + Minio + kontenery web/api.

## Następne kroki (wg specyfikacji)
- Rozbudować UI (walidacje, historie rewizji, audyt wizualny, agregacje).
- Uzupełnić anonimizację/eksporty na pełne dane, rozbudować audyt.
- Dodać CI/CD oraz konfiguracje storage na produkcję (R2/S3).



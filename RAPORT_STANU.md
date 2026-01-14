# RAPORT STANU APLIKACJI - RZECZYWISTY

## 1. STRUKTURA PROJEKTU

### Główne katalogi
- `apps/web` – frontend (Next.js 14, TypeScript, Tailwind, prosty własny UI).
- `apps/api` – backend (Spring Boot 3.3, Java 17, JPA, JWT, AWS S3 SDK, Flyway migracje).
- `infra` – `docker-compose.yml` dla środowiska lokalnego.
- Pliki narzędziowe w root: `nixpacks.toml`, `RAILWAY_DEPLOY.md`, `README.md`.

### Typ projektu
- Monorepo: frontend i backend w katalogach `apps/`.

## 2. FRONTEND (apps/web)

### Technologie
- Framework: Next.js 14.2.35 (app router).
- React 18, TypeScript 5.
- Stylowanie: Tailwind CSS 3.4 (klasy utility w `globals.css`), własne komponenty, bez Material UI.
- Zarządzanie stanem: stan lokalny React (useState/useEffect/useMemo); brak Redux/Zustand.

### Struktura kodu (src/app)
- `page.tsx` – główna strona (panel logowania + dashboard dla ról).
- Podstrony: `materialy/page.tsx`, `ocenianie/page.tsx`, `przypisywanie/page.tsx`, `usuwanie/page.tsx`, `zadania/page.tsx`, `eksport/page.tsx`, `statystyki/page.tsx`, kopie `page_new.tsx`, `page_old_backup.tsx.bak`.
- `components/Toast.tsx` – prosty toast.
- `lib/api.ts` – helper do wywołań API z Bearer tokenem.
- Routing: app router (foldery z `page.tsx`).
- Layout: `layout.tsx` ładuje fonty lokalne Geist, ustawia `globals.css`, brak wrappera nawigacji – każdy widok rysuje własny nagłówek.

### Główne widoki / zachowanie
- **page.tsx (Panel dydaktyczny)**  
  - Logowanie formularzem (POST `/api/auth/login`), token trzymany w localStorage, endpoint `/api/auth/me` do pobrania profilu.  
  - Przełączniki dostępności: kontrast (high1/high2), zmiana wielkości czcionki, wskaźnik statusu API.  
  - Po zalogowaniu renderuje widok zależny od roli:
    - TEACHER: wybór grupy z `/api/teacher/class-groups`, dalsze linki/panele w komponencie TeacherHomeLinks (w kodzie page.tsx).  
    - STUDENT: StudentView (wewnątrz page.tsx) – pobiera profil `/api/student/profile`, kursy `/api/student/courses`, overview zadań `/api/student/courses/{id}/overview`, umożliwia oddawanie plików (presign + PUT + POST `/api/revisions`), historię rewizji, materiały nauczyciela, filtry statusów, etapy itp.  
    - ADMIN: AdminView (w page.tsx) – zarządzanie użytkownikami/kursami (wywołania /api/admin).  
  - Wsparcie: toasty dla komunikatów, proste badge statusów, brak centralnego store.
- **materialy/page.tsx** – edycja materiałów zadań dla nauczyciela (upload plików do presignowanego URL, lista materiałów).
- **ocenianie/page.tsx** – panel kolejki oceniania: pobiera queue z `/api/grading-queue/teacher`, pozwala zmieniać status rewizji, edytować punkty/komentarz, pobiera historię rewizji i materiały feedback.
- **przypisywanie/page.tsx** – przypisywanie zadań/studentów (operacje na `/api/task-students` i admin endpoints).
- **usuwanie/page.tsx** – masowe usuwanie zadań (DELETE `/api/course/tasks/bulk`).
- **zadania/page.tsx** – tworzenie/edycja zadań i etapów (POST/PUT do `/api/course/tasks` i `/api/course/stages`).
- **eksport/page.tsx** – eksporty CSV/ZIP (endpointy `/api/export/...`, `/api/archive/...`).
- **statystyki/page.tsx** – widok statystyk (GET `/api/stats/overview`), donut + tabela zliczeń.
- **API helper**: `lib/api.ts` – dokleja Authorization Bearer, rzuca błąd gdy response !ok.

### Layout/UX
- Główny nagłówek rysowany w `page.tsx`: tytuł, kontrast, wielkość fontu, status API, login info.
- Brak globalnego sidebaru; podstrony mają własne nagłówki (np. Statystyki).
- Dostępność: przełączniki kontrastu, A-/A+, aria-labele w części przycisków; brak kompleksowego wsparcia ARIA.
- Responsywność: układy oparte o Flex/Grid z klasami Tailwind (sm/md), brak dedykowanego mobile view lecz powinno się skalować.
- Theme: jasny, odcienie slate/indigo, brak dark mode.

## 3. BACKEND (apps/api)

### Technologie
- Spring Boot 3.3.2, Java 17.
- JPA/Hibernate, Postgres driver.
- JWT (jjwt 0.11.5) dla autoryzacji.
- AWS SDK S3 v2.25.61 (MinIO/S3 storage).
- Flyway zależność dodana, ale **wyłączona** w `application.yml` (flyway.enabled: false); schema tworzona przez JPA + istniejące migracje (19 plików).

### Konfiguracja (application.yml)
- Profile: `SPRING_PROFILES_ACTIVE` (domyślnie `dev`).
- DB: `SPRING_DATASOURCE_URL/USERNAME/PASSWORD`, driver Postgres, `ddl-auto: update`.
- JWT: `APP_JWT_SECRET`, `APP_JWT_TTL_SECONDS`.
- CORS: `APP_CORS_ALLOWED_ORIGINS`.
- Storage: endpoint/bucket/base-url/public-endpoint/region/access-key/secret-key z ENV (`AWS_*` / `APP_STORAGE_*`).
- Server port: `${PORT:8080}`.

### Struktura kodu (warstwy)
- Pakiety: `auth`, `admin`, `course`, `revision`, `grade`, `grading`, `export`, `storage`, `stats`, `queue`, `student`, `teacher`, `config`, `audit`, `bootstrap`.
- Wzorzec: klasy Controller + Repository/Service; domena w entity @Entity + repozytoria Spring Data.
- Security: `SecurityConfig` + filtr JWT (`JwtAuthenticationFilter`), role `UserRole` (ADMIN/TEACHER/STUDENT), CORS w `CorsConfig`.

### Główne endpointy (przykłady – JSON)
- **/api/health** GET – prosty status.
- **AuthController (/api/auth)**:  
  - POST `/login` (login, zwraca token + profil)  
  - POST `/me` (profil bieżącego użytkownika).
- **AdminController (/api/admin, rola ADMIN)**:  
  - POST `/users` (tworzenie usera)  
  - POST `/courses` (tworzenie kursu/grupy)  
  - POST `/courses/{id}/assign-teacher`  
  - POST `/courses/{id}/students/import` (lista ImportStudentRow)  
  - POST `/courses/{id}/students/assign-existing`  
  - POST `/courses/{id}/students/generate-test`  
  - GET `/courses` (lista kursów)  
  - GET `/users` (opcjonalnie filtr role)  
  - GET `/users/students-with-groups` (studenci + grupa).
- **AdminClassGroupController (/api/admin/class-groups, ADMIN/TEACHER w części)**:  
  - POST `/` (create class group)  
  - GET `/` (lista grup)  
  - GET `/{id}` (szczegóły, nauczyciele, studenci)  
  - POST `/{groupId}/teachers/{teacherId}` / DELETE `/{groupId}/teachers/{teacherId}`  
  - POST `/{groupId}/students/{studentId}` (assign student, teacher access check)  
  - PATCH `/{groupId}/students/{studentId}` (update album/group)  
  - DELETE `/{groupId}/students/{studentId}` (remove).
- **Course / Teacher / Student widoki (wybrane controllery)**:  
  - `TeacherCourseController`, `TeacherCourseManagementController` – zarządzanie kursami, listy zadań, kopiowanie? (szczegóły w kodzie pakietu `course`).  
  - `CourseStructureController (/api/course)` – tworzenie/edycja/usuwanie tasków, stage’y, artefaktów, walidacja dat, bulk delete `/tasks/bulk`.  
  - `TaskStudentController (/api/task-students)` – przypisywanie studentów do zadań.  
  - `StageExemptionController (/api/stage-exemptions)` – zwolnienia z terminów.  
  - `StudentViewController (/api/student)` – widok studenta: profile `/profile`, kursy `/courses`, overview `/courses/{id}/overview`.  
  - `TeacherClassGroupController (/api/teacher/class-groups)` – klasy/grupy dla nauczyciela.
- **Revision / Queue / Grading**:  
  - `RevisionController (/api/revisions)` – submit rewizji (POST), pobranie, itp.; `RevisionQueryController` – historia rewizji per artefakt/student.  
  - `GradingQueueController (/api/grading-queue)` – kolejka do oceniania (teacher view).  
  - `GradeController (/api/grades)` – wystawianie ocen, punkty netto/brutto.  
  - `AggregationController (/api/aggregation)` – agregacje ocen/kolejek.  
  - `StatsController (/api/stats/overview)` – agregacja per zadanie (passed/failed/pending).
- **StorageController (/api/storage)** – presign upload/download dla MinIO/S3, tworzenie bucketa jeśli brak.
- **Export/Archive**:  
  - `ExportController (/api/export/...)` – CSV aggregated/szczegółowe dla kursu.  
  - `ArchiveController (/api/archive/...)` – ZIP archiwum prac.
- **StudentProfileController (/api/student/profile)** – dane studenta.

Format odpowiedzi: JSON (Map/list/dto). Autoryzacja: JWT Bearer, role via `@PreAuthorize`.

### Baza danych
- Postgres (driver w pom).  
- Migracje Flyway przygotowane (V1–V19), ale Flyway wyłączony – schema utrzymywana też przez `ddl-auto:update`.
- Kluczowe tabele/relacje (wyciąg z migracji):
  - `users`: id, email, password_hash, role, first_name, last_name, album_number, class_group_id.  
  - `courses` (klasy/grupy), `course_teachers`, `course_students`.  
  - `tasks`: course_id, title, description, start_date, end_date, teacher_id, grading_mode, session_id, max_points, pass_threshold.  
  - `stages`: task_id, nazwa, waga %, soft/hard deadline, kary za opóźnienie.  
  - `artifacts`: stage_id, nazwa, typ, limity rozmiaru/rozszerzeń.  
  - `revisions`: artifact_id, student_id, plik (file_key, original_file_name, mime, size), status (varchar), comment, created_at.  
  - `grades`: revision_id, teacher_id, points (brutto/netto), comment, status_after_grade.  
  - `grading_queue`: read-model (artifact_id + student_id PK) z ostatnimi danymi rewizji/deadlinów/punktów.  
  - `stage_exemptions`: niestandardowe terminy dla studenta.  
  - `task_students`: przypisanie zadań -> studenci.  
  - `task_materials`: materiały zadania (plik).  
  - `sessions`: nazwa, type, grading_mode dla kursu, powiązanie z zadaniami.  
  - `revision_feedback_materials`: pliki feedback od nauczyciela.

## 4. MODEL DANYCH (skrót)
- **User (users)**: id, email, password_hash, role (ADMIN/TEACHER/STUDENT), first_name, last_name, album_number?, class_group_id?.  
- **ClassGroup/Course (courses)**: id, name, created_at; powiązania: course_teachers, course_students.  
- **Task (tasks)**: id, course_id, title, description, start/end, teacher_id, session_id, grading_mode (PERCENT/POINTS10), max_points (default 10), pass_threshold (opcjonalny).  
- **Stage (stages)**: id, task_id, name, weight_percent, soft_deadline, hard_deadline, penalty_k_percent_per_24h, penalty_max_m_percent.  
- **Artifact (artifacts)**: id, stage_id, name, type, max_size_bytes, allowed_extensions_csv.  
- **Revision (revisions)**: id, artifact_id, student_id, file_key, original_file_name, mime_type, size_bytes, status (SUBMITTED/NEEDS_FIX/ACCEPTED/REJECTED jako varchar), comment, created_at.  
- **Grade (grades)**: id, revision_id, teacher_id, points_brutto, points_netto, status_after_grade (varchar), comment, created_at.  
- **GradingQueue (grading_queue)**: pk (artifact_id, student_id), stage/task/course refs, deadlines, ostatnia rewizja/status/punkty, flag_new_submission.  
- **StageExemption**: per stage+student niestandardowe terminy.  
- **TaskStudent**: przypisanie task→student.  
- **TaskMaterial / RevisionFeedbackMaterial**: pliki podpięte do zadania lub feedbacku.  
- **Session**: agreguje zadania kursu, przechowuje grading_mode i type.

## 5. PRZEPŁYWY UŻYTKOWNIKA (z kodu)

### Tworzenie zadania (teacher)
1. Nauczyciel loguje się (POST `/api/auth/login`), wybiera kurs/grupę (GET `/api/teacher/class-groups`).
2. W widoku “Zadania” tworzy zadanie (POST `/api/course/tasks`), definiuje etapy/stage (POST `/api/course/stages`), artefakty.
3. (Opcjonalnie) dodaje materiały (POST `/api/course/task-materials` w controllerze CourseStructure/TaskMaterial).
4. Przypisuje studentów do zadania (POST `/api/task-students`).

### Oddawanie pracy (student)
1. Student loguje się, widzi kursy (GET `/api/student/courses`) i overview zadań (GET `/api/student/courses/{id}/overview`).
2. Wybiera zadanie/artefakt, pobiera presigned URL (POST `/api/storage/presign`), wysyła plik PUT na MinIO.
3. Zgłasza rewizję (POST `/api/revisions` z fileKey/originalName/mime/size).
4. Widzi historię (GET `/api/revisions/artifact/{artifactId}/me`), statusy (grading_queue).

### Ocenianie (teacher)
1. Kolejka do oceniania: GET `/api/grading-queue/teacher?courseId=...`.
2. Podgląd rewizji/historii: GET `/api/revisions/artifact/{artifactId}/student/{studentId}`.
3. Wystawienie oceny/statusu: POST/PATCH w `GradeController` / `RevisionController` (punkty netto/brutto, zmiana statusu ACCEPTED/NEEDS_FIX/REJECTED).
4. Dodanie materiałów feedback: `revision_feedback_materials` via RevisionController.

### Wyświetlanie wyników/statystyk
1. Statystyki ogólne: GET `/api/stats/overview` (agregacja passed/failed/pending per task).
2. Exporty: GET `/api/export/course/{id}/csv-detailed`, `/csv-aggregated`, ZIP archiwum przez `/api/archive/course/{id}`.
3. Widok studenta pokazuje obliczone progi/średnie zadań (logika w page.tsx).

## 6. FUNKCJONALNOŚCI SPECJALNE
- **Wagi etapów**: kolumna `weight_percent` w `stages`; walidacja w `StageValidator`/`TaskWeightValidator`.  
- **Terminy i kary**: `soft_deadline`/`hard_deadline` + `penalty_k_percent_per_24h`, `penalty_max_m_percent`; egzekwowane w `LatePenaltyCalculator` i walidacjach `StageValidator`.  
- **Wersjonowanie prac**: każda rewizja to nowy rekord `revisions`; status zmieniany w ocenianiu; grading_queue trzyma ostatni stan.  
- **Komentarze/feedback**: pola `comment` w revisions/grades; pliki feedback w `revision_feedback_materials`.  
- **Agregacja ocen**: `AggregationService` buduje podsumowania (queue + oceny); `StatsController` sumuje passed/failed/pending z grading_queue.  
- **Export/import**: CSV przez `ExportController`, ZIP przez `ArchiveController`; import studentów przez `/api/admin/courses/{id}/students/import`.

## 7. DEPLOYMENT I INFRASTRUKTURA
- Hosting docelowo Railway (pliki `nixpacks.toml`, `railway.toml` w web/api oraz w root).  
- Backend build: Java 17 + Maven (`./mvnw clean package -DskipTests`), start `java -Dserver.port=$PORT -jar target/*.jar`.  
- Frontend build: Next.js (`npm install`, `npm run build`), start `node .next/standalone/server.js` (via `start.sh`).  
- Storage: MinIO na Railway (endpoint z `AWS_ENDPOINT_URL`, bucket `student-artifacts`).  
- Baza danych: Postgres (Railway), konfig przez `SPRING_DATASOURCE_*`.  
- Docker: `infra/docker-compose.yml` dla lokalnego dev (nie analizowany tu szczegółowo).

## 8. DOSTĘPNOŚĆ I UX
- Kontrast high1/high2 (klasy globalne w `globals.css`, przełączane w page.tsx).
- Powiększanie czcionki (A-/A+).  
- Podstawowe aria-labele na inputach/przyciskach.  
- Responsywność: układy flex/grid, brak dedykowanego mobile-first, ale klasy sm/md obecne.  
- Brak dark mode; jasna paleta slate/indigo.

## 9. BEZPIECZEŃSTWO I ROLE
- Role: ADMIN, TEACHER, STUDENT (enum `UserRole`).  
- Autoryzacja backend: JWT Bearer, filtr `JwtAuthenticationFilter`, zabezpieczenia metod `@PreAuthorize`.  
- Autoryzacja frontend: token w localStorage, dołączany w `lib/api.ts`.  
- CORS: konfig w `CorsConfig` (ENV `APP_CORS_ALLOWED_ORIGINS` + whitelist localhost/produkcyjny).  
- Brak rate limiting w kodzie.  
- Hasła użytkowników: bcrypt (PasswordEncoder).  

## 10. TESTY I JAKOŚĆ KODU
- Testy: szkielet JUnit w `src/test/java/pl/inzynier/api/ApiApplicationTests.java` i `grading` (brak szczegółowej implementacji – wygląda na minimalny).  
- Lint/format: frontend – ESLint (konfig Next) i TypeScript; backend – brak wymuszonego checkstyle.  
- Dokumentacja API: brak Swagger/OpenAPI w projekcie.

---

**Uwagi końcowe:**  
- Flyway jest wyłączony – schema może zależeć od `ddl-auto:update`; migracje są obecne (V1–V19).  
- Storage wymaga poprawnego bucketa i zgodnych kluczy MinIO/ENV.  
- Frontend trzyma wiele logik w jednym dużym pliku `page.tsx` (3.5k linii) – role-based UI w jednym komponencie.  
- Statystyki korzystają z `grading_queue`, wymagają poprawnej synchronizacji danych (brak lazy-init błędów po ostatnich poprawkach).


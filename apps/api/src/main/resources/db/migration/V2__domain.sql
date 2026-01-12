-- Domain tables
CREATE TABLE courses (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE course_teachers (
    id BIGSERIAL PRIMARY KEY,
    course_id BIGINT NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    teacher_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE (course_id, teacher_id)
);

CREATE TABLE course_students (
    id BIGSERIAL PRIMARY KEY,
    course_id BIGINT NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    student_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    group_name VARCHAR(100),
    album_number VARCHAR(50),
    UNIQUE (course_id, student_id),
    UNIQUE (course_id, album_number)
);

CREATE TABLE tasks (
    id BIGSERIAL PRIMARY KEY,
    course_id BIGINT NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE stages (
    id BIGSERIAL PRIMARY KEY,
    task_id BIGINT NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    weight_percent INT NOT NULL,
    soft_deadline TIMESTAMPTZ,
    hard_deadline TIMESTAMPTZ,
    penalty_k_percent_per_24h NUMERIC(5,2) DEFAULT 0,
    penalty_max_m_percent NUMERIC(5,2) DEFAULT 0,
    CONSTRAINT chk_stage_weight CHECK (weight_percent BETWEEN 0 AND 100)
);

CREATE TABLE artifacts (
    id BIGSERIAL PRIMARY KEY,
    stage_id BIGINT NOT NULL REFERENCES stages(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    type VARCHAR(50),
    max_size_bytes BIGINT,
    allowed_extensions_csv TEXT
);

CREATE TYPE revision_status AS ENUM ('SUBMITTED', 'NEEDS_FIX', 'ACCEPTED', 'REJECTED');

CREATE TABLE revisions (
    id BIGSERIAL PRIMARY KEY,
    artifact_id BIGINT NOT NULL REFERENCES artifacts(id) ON DELETE CASCADE,
    student_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    file_key TEXT NOT NULL,
    original_file_name TEXT NOT NULL,
    mime_type VARCHAR(150),
    size_bytes BIGINT,
    status revision_status NOT NULL DEFAULT 'SUBMITTED'
);

CREATE TABLE grades (
    id BIGSERIAL PRIMARY KEY,
    revision_id BIGINT NOT NULL REFERENCES revisions(id) ON DELETE CASCADE,
    teacher_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    points NUMERIC(10,2),
    comment TEXT,
    status_after_grade revision_status NOT NULL
);

CREATE TABLE stage_exemptions (
    id BIGSERIAL PRIMARY KEY,
    stage_id BIGINT NOT NULL REFERENCES stages(id) ON DELETE CASCADE,
    student_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    allow_after_hard BOOLEAN DEFAULT FALSE,
    custom_soft TIMESTAMPTZ,
    custom_hard TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    teacher_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    reason TEXT,
    UNIQUE (stage_id, student_id)
);

CREATE TABLE audit_log (
    id BIGSERIAL PRIMARY KEY,
    event_type VARCHAR(100) NOT NULL,
    actor_id BIGINT REFERENCES users(id),
    occurred_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    context_json JSONB NOT NULL
);

-- Read-model grading_queue
CREATE TABLE grading_queue (
    stage_id BIGINT NOT NULL REFERENCES stages(id) ON DELETE CASCADE,
    artifact_id BIGINT NOT NULL REFERENCES artifacts(id) ON DELETE CASCADE,
    student_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    album_number VARCHAR(50),
    student_name VARCHAR(255),
    task_id BIGINT NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    course_id BIGINT NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    last_revision_id BIGINT REFERENCES revisions(id) ON DELETE SET NULL,
    last_revision_status revision_status,
    last_submitted_at TIMESTAMPTZ,
    soft_deadline TIMESTAMPTZ,
    hard_deadline TIMESTAMPTZ,
    late_days_started_24h INT,
    penalty_percent_applied NUMERIC(5,2),
    last_points_brutto NUMERIC(10,2),
    last_points_netto NUMERIC(10,2),
    flag_new_submission BOOLEAN DEFAULT FALSE,
    PRIMARY KEY (artifact_id, student_id)
);

CREATE INDEX idx_grading_queue_stage_status ON grading_queue(stage_id, last_revision_status);
CREATE INDEX idx_grading_queue_hard_deadline ON grading_queue(hard_deadline);
CREATE INDEX idx_grading_queue_student ON grading_queue(student_id);
CREATE INDEX idx_grading_queue_album ON grading_queue(album_number);







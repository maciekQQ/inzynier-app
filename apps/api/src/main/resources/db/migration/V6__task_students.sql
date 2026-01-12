-- Tabela przypisań studentów do zadań
CREATE TABLE task_students (
    id BIGSERIAL PRIMARY KEY,
    task_id BIGINT NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    student_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    assigned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    assigned_by BIGINT REFERENCES users(id),
    UNIQUE (task_id, student_id)
);

CREATE INDEX idx_task_students_task ON task_students(task_id);
CREATE INDEX idx_task_students_student ON task_students(student_id);


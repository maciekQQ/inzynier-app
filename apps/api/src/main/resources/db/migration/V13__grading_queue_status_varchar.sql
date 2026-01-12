ALTER TABLE grading_queue ALTER COLUMN last_revision_status TYPE VARCHAR(50) USING last_revision_status::VARCHAR;


ALTER TABLE grading_queue
    ADD COLUMN IF NOT EXISTS last_accepted_revision_id BIGINT,
    ADD COLUMN IF NOT EXISTS last_accepted_points_netto NUMERIC(10,2);







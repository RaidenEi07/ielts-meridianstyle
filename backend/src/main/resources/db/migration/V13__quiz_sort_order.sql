ALTER TABLE quizzes ADD COLUMN sort_order INT NOT NULL DEFAULT 0;

WITH ranked AS (
    SELECT id, ROW_NUMBER() OVER (PARTITION BY section_id ORDER BY created_at ASC, id ASC) - 1 AS rn
    FROM quizzes
)
UPDATE quizzes q SET sort_order = ranked.rn FROM ranked WHERE q.id = ranked.id;

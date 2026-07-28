-- =====================================================================
-- V33 — Khóa học lõi (Coursera-style): câu hỏi gắn theo mốc thời gian
--   video của 1 section. Một section có >=1 checkpoint thì trở thành
--   "khóa học lõi" — nút "Luyện tập" của section đó chỉ mở khi học viên
--   đã trả lời hết checkpoint (xem LessonProgressService/Lát 9).
-- =====================================================================
CREATE TABLE section_video_checkpoints (
    id            BIGINT       GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    section_id    BIGINT       NOT NULL REFERENCES course_sections (id) ON DELETE CASCADE,
    timestamp_sec NUMERIC(8,2) NOT NULL,
    question_id   BIGINT       NOT NULL REFERENCES questions (id) ON DELETE CASCADE,
    sort_order    INT          NOT NULL DEFAULT 0
);
CREATE INDEX ix_section_video_checkpoints_section ON section_video_checkpoints (section_id);

CREATE TABLE video_checkpoint_answers (
    id            BIGINT      GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    user_id       UUID        NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    checkpoint_id BIGINT      NOT NULL REFERENCES section_video_checkpoints (id) ON DELETE CASCADE,
    is_correct    BOOLEAN,
    answered_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (user_id, checkpoint_id)
);
CREATE INDEX ix_video_checkpoint_answers_user ON video_checkpoint_answers (user_id);

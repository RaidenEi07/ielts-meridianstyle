-- =====================================================================
-- V19 — Theo dõi hoàn thành buổi học (Phase 12).
--   Một dòng chỉ được tạo KHI hoàn thành (không track "đang học dở") —
--   tồn tại dòng = đã hoàn thành. Dùng cho mở khóa tuần tự ở giao diện
--   "Vào học" và (sau này) dashboard phụ huynh (Phase 18).
-- =====================================================================
CREATE TABLE lesson_progress (
    id           BIGINT      GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    user_id      UUID        NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    section_id   BIGINT      NOT NULL REFERENCES course_sections (id) ON DELETE CASCADE,
    completed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (user_id, section_id)
);
CREATE INDEX ix_lesson_progress_user ON lesson_progress (user_id);
CREATE INDEX ix_lesson_progress_section ON lesson_progress (section_id);

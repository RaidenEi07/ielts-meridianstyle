-- =====================================================================
-- V22 — Ghi âm giọng nói của trẻ khi học một buổi học (Phase 15).
--   Độc lập hoàn toàn với lesson_progress (không tính là hoàn thành buổi
--   học, không ảnh hưởng mở khóa tuần tự). Nhiều dòng cho cùng
--   (user, section) — mỗi lần ghi là 1 dòng mới, giữ lịch sử để tự nghe lại.
-- =====================================================================
CREATE TABLE lesson_recordings (
    id           BIGINT      GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    user_id      UUID        NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    section_id   BIGINT      NOT NULL REFERENCES course_sections (id) ON DELETE CASCADE,
    audio_url    VARCHAR(500) NOT NULL,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX ix_lesson_recordings_user_section ON lesson_recordings (user_id, section_id);

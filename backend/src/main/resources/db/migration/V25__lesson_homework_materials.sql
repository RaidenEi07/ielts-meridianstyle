-- =====================================================================
-- V25 — Tài liệu bài tập về nhà (Phase 21). Bảng con nhiều-dòng-mỗi-buổi,
--   mirror lesson_recordings (Phase 15) — 1 buổi có thể có nhiều file
--   audio/video, quản lý qua admin, hiển thị riêng với video bài giảng.
-- =====================================================================
CREATE TABLE lesson_homework_materials (
    id         BIGINT       GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    section_id BIGINT       NOT NULL REFERENCES course_sections (id) ON DELETE CASCADE,
    media_type VARCHAR(10)  NOT NULL CHECK (media_type IN ('AUDIO','VIDEO')),
    url        VARCHAR(500) NOT NULL,
    label      VARCHAR(200),
    sort_order INTEGER      NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ  NOT NULL DEFAULT now()
);
CREATE INDEX ix_lesson_homework_materials_section ON lesson_homework_materials (section_id);

-- =====================================================================
-- V20 — Phụ đề WebVTT cho buổi học (Phase 13).
--   Mốc "tua theo đoạn" ở frontend lấy trực tiếp từ cue trong file này,
--   không có bảng mốc riêng.
-- =====================================================================
ALTER TABLE course_sections ADD COLUMN subtitle_url VARCHAR(500);

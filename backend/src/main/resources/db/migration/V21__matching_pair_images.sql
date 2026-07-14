-- =====================================================================
-- V21 — Ảnh tùy chọn cho từng vế cặp MATCHING (Phase 14).
--   Dùng cho "chọn tranh đúng"/"ghép từ-hình" (luyện từ vựng trẻ em) —
--   không bắt buộc mọi cặp phải có ảnh.
-- =====================================================================
ALTER TABLE question_matching_pairs ADD COLUMN left_image_url VARCHAR(500);
ALTER TABLE question_matching_pairs ADD COLUMN right_image_url VARCHAR(500);

-- =====================================================================
-- V28 — Quản trị nội dung chi tiết khóa học: mô tả chi tiết (rich text),
--   mục tiêu khóa học, yêu cầu đầu vào, và mô tả ngắn cho từng buổi học.
--   Tất cả nullable — khóa học cũ không có dữ liệu vẫn hiển thị bình
--   thường (ẩn các mục rỗng), không cần migrate dữ liệu.
-- =====================================================================
ALTER TABLE courses ADD COLUMN description_html text;
ALTER TABLE courses ADD COLUMN objectives jsonb;
ALTER TABLE courses ADD COLUMN prerequisites text;
ALTER TABLE course_sections ADD COLUMN short_description text;

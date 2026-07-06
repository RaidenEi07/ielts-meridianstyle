-- =====================================================================
-- V10 — Đổi cơ chế đăng nhập sang tên đăng nhập (username)
--   Email vẫn được lưu (liên hệ/thông báo) nhưng KHÔNG còn dùng để đăng nhập.
--   Cột NOT NULL ngay từ đầu vì bảng users luôn rỗng tại thời điểm migration
--   chạy trên một CSDL mới (seed user diễn ra sau, qua CommandLineRunner).
-- =====================================================================

ALTER TABLE users ADD COLUMN username VARCHAR(50) NOT NULL;
CREATE UNIQUE INDEX ux_users_username ON users (lower(username));

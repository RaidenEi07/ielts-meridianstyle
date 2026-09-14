-- =====================================================================
-- V50 — Giới hạn số lần đăng nhập sai (chống dò mật khẩu/brute-force).
--   Bổ sung sau sự cố thật: 1 tài khoản admin bị lợi dụng qua mật khẩu mặc
--   định, không hề bị chặn dù gọi API liên tục — xem AuthService.login().
--
--   failed_login_attempts: đếm số lần sai LIÊN TIẾP gần nhất, reset về 0
--   ngay khi đăng nhập đúng.
--   locked_until: có giá trị + còn ở tương lai nghĩa là tài khoản đang tạm
--   khóa — hết hạn tự động (không cần thao tác mở khóa thủ công), reset
--   luôn failed_login_attempts về 0 ngay khi khóa (đếm lại từ đầu sau khi
--   hết khóa) và ngay khi đăng nhập đúng.
-- =====================================================================

ALTER TABLE users ADD COLUMN failed_login_attempts INT NOT NULL DEFAULT 0;
ALTER TABLE users ADD COLUMN locked_until TIMESTAMPTZ;

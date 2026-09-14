-- =====================================================================
-- V49 — Capability cho phép WEB TỔNG xem + chỉnh sửa role/quyền lẻ theo
--   khóa của tài khoản đang tồn tại ở MỘT WEB CON cụ thể (tài khoản vẫn do
--   web con tự tạo — đăng ký/admin local — capability này chỉ điều khiển
--   quyền của tài khoản đó, không tạo/xóa tài khoản).
--
--   Tách riêng khỏi course:distribute (chỉ đẩy NỘI DUNG khóa học) vì đây là
--   hành động nhạy cảm hơn — có thể nâng quyền 1 tài khoản ở web con từ xa
--   (vd biến 1 học viên thành admin web con) — không gộp chung để có thể
--   cấp course:distribute cho ai đó mà KHÔNG cấp luôn quyền sửa tài khoản.
--
--   Cấp thẳng cho role admin (khớp ý định gốc "admin có mọi capability" ở
--   V2) — không để dành cấp thủ công sau như course:distribute (V29), vì
--   tính năng cần chạy được ngay sau deploy không cần thêm bước tay.
-- =====================================================================

INSERT INTO capabilities (name, description) VALUES
    ('childsite:manage-accounts', 'Xem và chỉnh sửa role/quyền của tài khoản trên các web con');

INSERT INTO role_capabilities (role_id, capability_id, permission)
SELECT r.id, c.id, 'ALLOW'
FROM roles r JOIN capabilities c ON c.name = 'childsite:manage-accounts'
WHERE r.shortname = 'admin';

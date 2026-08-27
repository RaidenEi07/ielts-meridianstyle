-- =====================================================================
-- V46 — Đảo ngược V45: người dùng nhớ ra vẫn cần role "manager" riêng trong
--   dự án. Dựng lại NGUYÊN VĂN như định nghĩa gốc ở V41 (cùng shortname,
--   tên, mô tả, đúng bộ capability), gỡ enrollment:manage khỏi teacher
--   (đúng như trước khi gộp), và chuyển admin1 (tài khoản duy nhất bị ảnh
--   hưởng bởi V45 — xác nhận qua DB, không có role_assignment "teacher" nào
--   khác phát sinh từ lúc gộp tới giờ) trở lại "manager".
-- =====================================================================

-- 1. Gỡ enrollment:manage khỏi teacher (trả lại đúng như trước V45).
DELETE FROM role_capabilities
WHERE role_id = (SELECT id FROM roles WHERE shortname = 'teacher')
  AND capability_id = (SELECT id FROM capabilities WHERE name = 'enrollment:manage');

-- 2. Dựng lại role "manager" — nguyên văn định nghĩa gốc ở V41.
INSERT INTO roles (shortname, name, description) VALUES
    ('manager', 'Quản lý', 'Toàn bộ quyền giáo viên, cộng thêm ghi danh/gán học sinh cho giáo viên — không có quyền quản lý tài khoản/hệ thống của admin');

INSERT INTO role_capabilities (role_id, capability_id, permission)
SELECT r.id, c.id, 'ALLOW'
FROM roles r JOIN capabilities c
  ON c.name IN (
      'course:manage', 'course:view', 'enrollment:manage', 'question:manage',
      'quiz:overrideattempt', 'quiz:regrade', 'grade:view', 'report:viewlive')
WHERE r.shortname = 'manager';

-- 3. Chuyển tài khoản đang giữ "teacher" mà V45 từng chuyển TỪ "manager"
--    sang trở lại "manager" — chỉ đúng admin1 (xác nhận qua
--    role_assignments.created_at khớp thời điểm chạy V45, không đụng tới
--    12 tài khoản teacher gốc khác).
INSERT INTO role_assignments (user_id, role_id, context_id, created_at)
SELECT ra.user_id, (SELECT id FROM roles WHERE shortname = 'manager'), ra.context_id, now()
FROM role_assignments ra
JOIN users u ON u.id = ra.user_id
WHERE u.username = 'admin1'
  AND ra.role_id = (SELECT id FROM roles WHERE shortname = 'teacher')
  AND NOT EXISTS (
    SELECT 1 FROM role_assignments ra2
    WHERE ra2.user_id = ra.user_id
      AND ra2.role_id = (SELECT id FROM roles WHERE shortname = 'manager')
      AND ra2.context_id = ra.context_id
  );

DELETE FROM role_assignments
WHERE user_id = (SELECT id FROM users WHERE username = 'admin1')
  AND role_id = (SELECT id FROM roles WHERE shortname = 'teacher');

-- 4. Trả lại mô tả gốc của teacher (V45 từng sửa để nhắc tới "ghi danh").
UPDATE roles
SET description = 'Quản lý khóa học, câu hỏi, quiz và học viên'
WHERE shortname = 'teacher';

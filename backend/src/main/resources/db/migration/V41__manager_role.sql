-- =====================================================================
-- V41 — Role "manager": cao hơn giáo viên, thấp hơn admin. Có TOÀN BỘ
--   capability của giáo viên + được ghi danh/gỡ ghi danh học sinh vào bất kỳ
--   khóa nào (không giới hạn theo roster như enrollByTeacher) và gán/gỡ học
--   sinh cho giáo viên — nhưng KHÔNG có user:manage (không tạo/khóa tài
--   khoản, không tự gán role cho người khác) như admin thật.
--
--   Capability 'enrollment:manage' đã seed sẵn từ V2 nhưng CHƯA từng được
--   backend kiểm tra ở đâu cả (enrollByAdmin/unenrollByAdmin/roster đều
--   đang dùng 'user:manage') — tận dụng lại đúng capability này thay vì tạo
--   mới, đổi các chỗ đó sang kiểm tra 'enrollment:manage' trong code Java
--   (admin đã có capability này qua CROSS JOIN ở V2 nên không đổi hành vi
--   của admin). Gỡ khỏi giáo viên vì trước giờ vô dụng (không kiểm tra ở
--   đâu) — gỡ xong không đổi gì hành vi thật của giáo viên hiện tại, và
--   đúng ý "giáo viên KHÔNG có quyền này, chỉ manager mới có".
-- =====================================================================

DELETE FROM role_capabilities
WHERE role_id = (SELECT id FROM roles WHERE shortname = 'teacher')
  AND capability_id = (SELECT id FROM capabilities WHERE name = 'enrollment:manage');

INSERT INTO roles (shortname, name, description) VALUES
    ('manager', 'Quản lý', 'Toàn bộ quyền giáo viên, cộng thêm ghi danh/gán học sinh cho giáo viên — không có quyền quản lý tài khoản/hệ thống của admin');

INSERT INTO role_capabilities (role_id, capability_id, permission)
SELECT r.id, c.id, 'ALLOW'
FROM roles r JOIN capabilities c
  ON c.name IN (
      'course:manage', 'course:view', 'enrollment:manage', 'question:manage',
      'quiz:overrideattempt', 'quiz:regrade', 'grade:view', 'report:viewlive')
WHERE r.shortname = 'manager';

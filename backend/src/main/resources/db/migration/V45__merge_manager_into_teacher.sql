-- =====================================================================
-- V45 — Gộp role "manager" trở lại vào "teacher" theo yêu cầu người dùng:
--   không còn tách 2 tier "giáo viên"/"quản lý" như V41 nữa (V41 từng CỐ Ý
--   gỡ enrollment:manage khỏi teacher để chỉ manager mới ghi danh/gán học
--   sinh được — giờ đảo ngược quyết định đó, gộp lại đúng 1 role như kế
--   hoạch 3-role ban đầu admin/teacher/student).
--
--   "teacher" giờ có TOÀN BỘ quyền cũ của "manager": course:manage,
--   course:view, enrollment:manage, question:manage, quiz:overrideattempt,
--   quiz:regrade, grade:view, report:viewlive — cộng thêm quiz:attempt vốn
--   sẵn có ở teacher (không có ở manager, giữ nguyên không đổi vì manager
--   không cần tự làm quiz nhưng giáo viên vẫn cần tự kiểm tra quiz mình tạo
--   như từ V12, gỡ đi sẽ mất chức năng hiện có của teacher).
--
--   Tài khoản nào đang giữ role "manager" được CHUYỂN sang "teacher" tại
--   đúng context cũ (bỏ qua nếu đã sẵn có "teacher" ở context đó, tránh vi
--   phạm unique constraint) — không mất quyền, chỉ đổi tên role đang giữ.
--   Rồi role "manager" bị xóa hẳn (capabilities + assignments + chính role
--   đó) — không còn ai chọn được role này nữa ở /admin/users.
-- =====================================================================

-- 1. Trả lại enrollment:manage cho teacher (đã gỡ ở V41, giờ gộp ngược lại).
INSERT INTO role_capabilities (role_id, capability_id, permission)
SELECT (SELECT id FROM roles WHERE shortname = 'teacher'),
       (SELECT id FROM capabilities WHERE name = 'enrollment:manage'),
       'ALLOW'
WHERE NOT EXISTS (
    SELECT 1 FROM role_capabilities
    WHERE role_id = (SELECT id FROM roles WHERE shortname = 'teacher')
      AND capability_id = (SELECT id FROM capabilities WHERE name = 'enrollment:manage')
);

-- 2. Chuyển mọi role_assignment "manager" sang "teacher" tại đúng context cũ.
INSERT INTO role_assignments (user_id, role_id, context_id, created_at)
SELECT ra.user_id, (SELECT id FROM roles WHERE shortname = 'teacher'), ra.context_id, now()
FROM role_assignments ra
JOIN roles r ON r.id = ra.role_id
WHERE r.shortname = 'manager'
  AND NOT EXISTS (
    SELECT 1 FROM role_assignments ra2
    WHERE ra2.user_id = ra.user_id
      AND ra2.role_id = (SELECT id FROM roles WHERE shortname = 'teacher')
      AND ra2.context_id = ra.context_id
  );

-- 3. Xóa hẳn role "manager" (capabilities, assignments, rồi chính role đó).
DELETE FROM role_capabilities WHERE role_id = (SELECT id FROM roles WHERE shortname = 'manager');
DELETE FROM role_assignments WHERE role_id = (SELECT id FROM roles WHERE shortname = 'manager');
DELETE FROM roles WHERE shortname = 'manager';

-- 4. Cập nhật mô tả role cho khớp phạm vi quyền mới (đã gồm ghi danh).
UPDATE roles
SET description = 'Quản lý khóa học, câu hỏi, quiz, ghi danh và học viên'
WHERE shortname = 'teacher';

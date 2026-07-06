-- Cấp quyền quiz:attempt cho teacher để giáo viên tự kiểm tra quiz mình tạo.
INSERT INTO role_capabilities (role_id, capability_id, permission)
SELECT r.id, c.id, 'ALLOW'
FROM roles r JOIN capabilities c ON c.name = 'quiz:attempt'
WHERE r.shortname = 'teacher'
ON CONFLICT (role_id, capability_id) DO NOTHING;

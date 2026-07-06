-- =====================================================================
-- V2 — Seed dữ liệu tham chiếu RBAC: SYSTEM context, capabilities, roles
--      và bảng ánh xạ role -> capability.
--      (Tài khoản admin được tạo bởi DataInitializer để băm mật khẩu BCrypt.)
-- =====================================================================

-- SYSTEM context gốc (singleton, instance_id = 0, không có cha)
INSERT INTO contexts (type, instance_id, parent_context_id)
VALUES ('SYSTEM', 0, NULL);

-- ---------------------------------------------------------------------
-- Capabilities (namespace theo mục 2.1 của kế hoạch)
-- ---------------------------------------------------------------------
INSERT INTO capabilities (name, description) VALUES
    ('system:manage',        'Cấu hình hệ thống: site, theme, bảo mật, cache'),
    ('user:manage',          'CRUD / khóa / duyệt tài khoản người dùng'),
    ('user:bulkupload',      'Tải lên hàng loạt user / ảnh / audio'),
    ('role:assign',          'Gán role cho user ở bất kỳ context nào'),
    ('course:manage',        'CRUD khóa học, danh mục, section, ghi danh'),
    ('course:view',          'Xem khóa học và nội dung'),
    ('enrollment:manage',    'Ghi danh / quản lý nhóm học viên'),
    ('question:manage',      'Thêm/sửa/xóa/gắn thẻ câu hỏi trong ngân hàng'),
    ('quiz:attempt',         'Làm bài quiz / thi'),
    ('quiz:overrideattempt', 'Override thời gian / lượt làm bài của học viên'),
    ('quiz:regrade',         'Chấm lại bài'),
    ('grade:view',           'Xem điểm'),
    ('report:viewlive',      'Xem báo cáo và live log');

-- ---------------------------------------------------------------------
-- Roles (archetype: admin / teacher / student)
-- ---------------------------------------------------------------------
INSERT INTO roles (shortname, name, description) VALUES
    ('admin',   'Quản trị viên', 'Toàn quyền cấu hình và quản lý hệ thống'),
    ('teacher', 'Giáo viên',     'Quản lý khóa học, câu hỏi, quiz và học viên'),
    ('student', 'Học viên',      'Tham gia khóa học và làm bài thi');

-- ---------------------------------------------------------------------
-- role_capabilities
-- ---------------------------------------------------------------------
-- Admin: cấp tất cả capability
INSERT INTO role_capabilities (role_id, capability_id, permission)
SELECT r.id, c.id, 'ALLOW'
FROM roles r CROSS JOIN capabilities c
WHERE r.shortname = 'admin';

-- Teacher
INSERT INTO role_capabilities (role_id, capability_id, permission)
SELECT r.id, c.id, 'ALLOW'
FROM roles r JOIN capabilities c
  ON c.name IN (
      'course:manage', 'course:view', 'enrollment:manage', 'question:manage',
      'quiz:overrideattempt', 'quiz:regrade', 'grade:view', 'report:viewlive')
WHERE r.shortname = 'teacher';

-- Student
INSERT INTO role_capabilities (role_id, capability_id, permission)
SELECT r.id, c.id, 'ALLOW'
FROM roles r JOIN capabilities c
  ON c.name IN ('course:view', 'quiz:attempt', 'grade:view')
WHERE r.shortname = 'student';

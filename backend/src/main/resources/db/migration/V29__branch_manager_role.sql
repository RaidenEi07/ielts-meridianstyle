-- =====================================================================
-- V29 — Nền tảng phân quyền cho mô hình "web tổng / web con":
--   1 capability mới (course:distribute, chỉ web tổng dùng — quản lý
--   danh sách web con + đẩy khóa học đi) và 1 role mới dành riêng cho
--   nhân sự vận hành ở web con (branch_manager) — KHÔNG có course:manage
--   / question:manage, vì nội dung khóa học chỉ do web tổng làm chủ.
--
--   Không đụng tới role admin/teacher hiện có, không cấp course:distribute
--   cho ai ở đây — việc cấp cho tài khoản admin thật của web tổng làm
--   thủ công 1 lần sau khi deploy (xem ghi chú deploy).
-- =====================================================================

INSERT INTO capabilities (name, description) VALUES
    ('course:distribute', 'Quản lý danh sách web con + đẩy (xuất bản) khóa học sang web con');

INSERT INTO roles (shortname, name, description) VALUES
    ('branch_manager', 'Quản lý chi nhánh',
     'Vận hành 1 web con: ghi danh, chấm bài, xem báo cáo, quản lý tài khoản học viên tại chỗ — không được sửa nội dung khóa học (nội dung do web tổng làm chủ)');

INSERT INTO role_capabilities (role_id, capability_id, permission)
SELECT r.id, c.id, 'ALLOW'
FROM roles r JOIN capabilities c
  ON c.name IN (
      'course:view', 'enrollment:manage', 'user:manage',
      'quiz:overrideattempt', 'quiz:regrade', 'grade:view', 'report:viewlive')
WHERE r.shortname = 'branch_manager';

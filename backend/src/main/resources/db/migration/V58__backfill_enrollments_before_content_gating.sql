-- =====================================================================
-- V58 — Ghi danh bù TRƯỚC khi khóa nội dung học với người chưa ghi danh (Đợt 4).
--   Từ bản này, chỉ người đã được ghi danh (hoặc người phụ trách khóa) mới xem
--   được video, tài liệu, câu hỏi trong video… của khóa, và học viên không tự
--   ghi danh được nữa. Ai đang có dấu vết học một khóa (đã làm bài, đánh dấu
--   hoàn thành buổi học, ghi âm, trả lời câu hỏi trong video) mà chưa có ghi
--   danh thì được ghi danh bù ở đây để không bị mất quyền vào khóa đang học.
--
--   Bỏ qua tài khoản nhân sự (admin, teacher, manager, branch_manager): họ xem
--   được nội dung nhờ quyền phụ trách, ghi danh họ sẽ làm lẫn họ vào danh sách
--   học viên của khóa. Chạy lại nhiều lần không sao (NOT EXISTS).
--   Kiểm tra trước trên hệ thống thật ngày 26/10/2026: web tổng 2 học viên,
--   web con 0.
-- =====================================================================
INSERT INTO enrollments (user_id, course_id, status, progress_pct, enrolled_at, updated_at)
SELECT DISTINCT ev.user_id, ev.course_id, 'ACTIVE', 0, now(), now()
FROM (
    SELECT a.user_id, s.course_id
    FROM quiz_attempts a
    JOIN quizzes q ON q.id = a.quiz_id
    JOIN course_sections s ON s.id = q.section_id
    UNION
    SELECT v.user_id, s.course_id
    FROM video_checkpoint_answers v
    JOIN section_video_checkpoints c ON c.id = v.checkpoint_id
    JOIN course_sections s ON s.id = c.section_id
    UNION
    SELECT p.user_id, s.course_id
    FROM lesson_progress p
    JOIN course_sections s ON s.id = p.section_id
    UNION
    SELECT r.user_id, s.course_id
    FROM lesson_recordings r
    JOIN course_sections s ON s.id = r.section_id
) ev
JOIN courses co ON co.id = ev.course_id AND co.deleted_at IS NULL
WHERE NOT EXISTS (
        SELECT 1 FROM enrollments en WHERE en.user_id = ev.user_id AND en.course_id = ev.course_id)
  AND NOT EXISTS (
        SELECT 1 FROM role_assignments ra JOIN roles r ON r.id = ra.role_id
        WHERE ra.user_id = ev.user_id
          AND r.shortname IN ('admin', 'teacher', 'manager', 'branch_manager'));

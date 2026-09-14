-- =====================================================================
-- V48 — Bảo vệ nội dung đã sửa CỤC BỘ ở web con khỏi bị web tổng ghi đè khi
--   gửi lại (resend) 1 khóa học đã điều phối trước đó.
--
--   Trước migration này, CourseImportService LUÔN ghi đè toàn bộ nội dung
--   khóa học/câu hỏi mỗi lần resend (xem comment cũ trong importCourse()) —
--   đúng ý ban đầu ("web con luôn phản ánh bản mới nhất bên web tổng"),
--   nhưng có nghĩa 1 giáo viên sửa nội dung cục bộ ở web con sẽ mất sạch
--   ngay khi web tổng gửi lại đúng khóa học đó lần sau, không cảnh báo.
--
--   locally_modified: cờ do chính @PreUpdate của Question/Course tự bật lên
--   TRUE mỗi khi có bất kỳ chỉnh sửa nào (không phân biệt ai sửa) — CHÍNH
--   CourseImportService là nơi duy nhất chủ động tắt lại về FALSE ngay sau
--   khi ghi nội dung mới nhất từ web tổng xuống (qua 1 câu UPDATE JPQL
--   riêng, không đi qua entity lifecycle để tránh vòng lặp tự bật lại).
--   Mặc định FALSE — không ảnh hưởng nội dung tạo trực tiếp (không qua nhập
--   khẩu), cờ này chỉ có tác dụng với bản ghi từng được đồng bộ ít nhất 1 lần.
-- =====================================================================
ALTER TABLE questions ADD COLUMN locally_modified BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE courses ADD COLUMN locally_modified BOOLEAN NOT NULL DEFAULT FALSE;

-- Điều phối khóa học web tổng -> web con: theo dõi câu hỏi trên web con
-- được tạo ra TỪ câu hỏi nào bên web tổng, để lần gửi lại sau (resend) nhận
-- diện đúng bằng ID cố định thay vì chỉ dò theo tên — trước đây khi câu hỏi
-- bị đổi tên bên web tổng (vd chiến dịch đổi nhãn số câu hỏi), lần gửi lại
-- không tìm thấy bản ghi cũ theo tên mới nên tạo trùng thay vì cập nhật.
-- NULL với mọi câu hỏi được tạo trực tiếp trên chính deployment này (không
-- qua nhập khẩu), và với dữ liệu web tổng của chính nó (web tổng không có
-- "web tổng của nó" để tham chiếu).
ALTER TABLE questions ADD COLUMN master_question_id BIGINT;
CREATE INDEX idx_questions_master_question_id ON questions (master_question_id) WHERE master_question_id IS NOT NULL;

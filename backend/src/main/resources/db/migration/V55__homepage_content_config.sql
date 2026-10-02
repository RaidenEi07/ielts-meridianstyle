-- Nội dung mẫu ghi cứng trong giao diện nay đọc từ cấu hình để admin sửa hoặc ẩn được ở Cấu hình hệ thống.
-- Giá trị khởi tạo đúng bằng nội dung đang hiển thị, nên chưa có gì thay đổi cho tới khi admin chỉnh:
--   * Con số nổi bật (nhãn trên ảnh trang chủ, dải số liệu, panel đăng nhập). Để trống ô số = ẩn ở mọi nơi.
--   * Nhãn số giáo viên ở dải số liệu.
--   * Lời chứng thực học viên (JSON; danh sách rỗng = ẩn cả mục "Học viên nói gì").
--   * Số điện thoại và địa chỉ ở chân trang và trang Liên hệ (điện thoại rỗng = không hiện).
INSERT INTO web_configurations (config_key, value) VALUES
    ('HOMEPAGE_HIGHLIGHT_VALUE', '92%'),
    ('HOMEPAGE_HIGHLIGHT_LABEL', 'Đạt mục tiêu'),
    ('HOMEPAGE_TEACHERS_LABEL', 'Giáo viên IELTS 8.0+'),
    ('HOMEPAGE_TESTIMONIALS',
     '[{"name":"Hoàng Anh","band":"7.5","text":"Mô phỏng phòng thi máy giống thi thật đến từng chi tiết. Mình vào phòng thi không hề bỡ ngỡ."},'
     '{"name":"Thùy Dung","band":"8.0","text":"Giáo viên tận tâm, lộ trình rõ ràng. Từ 6.0 lên 8.0 chỉ sau một khóa học."},'
     '{"name":"Minh Quân","band":"7.0","text":"Ngân hàng đề phong phú, chấm tự động nhanh. Biết ngay điểm yếu để cải thiện."}]'),
    ('SUPPORT_PHONE', ''),
    ('SUPPORT_ADDRESS', 'Hà Nội · TP.HCM')
ON CONFLICT (config_key) DO NOTHING;

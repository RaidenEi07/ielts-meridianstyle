-- Mặc định cho section "4 thông tin nổi bật" trên trang chủ (chỉnh sửa được
-- ở /admin/settings). Lưu dạng JSON string trong web_configurations, đúng
-- quy ước key-value đã có (xem ConfigService.PUBLIC_KEYS).
INSERT INTO web_configurations (config_key, value) VALUES
    ('HOMEPAGE_INFO_CARDS', '[
        {"icon":"🎓","title":"Chương trình đào tạo bài bản","description":"Lộ trình IELTS rõ ràng cho mọi trình độ, từ mất gốc đến 8.0+"},
        {"icon":"🧑‍🏫","title":"Đội ngũ giáo viên","description":"Giáo viên giàu kinh nghiệm, tận tâm đồng hành cùng học viên"},
        {"icon":"⭐","title":"Kinh nghiệm giảng dạy","description":"Nhiều năm kinh nghiệm luyện thi IELTS cho hàng nghìn học viên"},
        {"icon":"🏆","title":"Cam kết đầu ra","description":"Cam kết lộ trình học tập và kết quả đầu ra rõ ràng"}
    ]')
ON CONFLICT (config_key) DO NOTHING;

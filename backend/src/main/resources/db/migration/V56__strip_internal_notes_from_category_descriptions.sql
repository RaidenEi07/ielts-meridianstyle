-- Mô tả danh mục hiện công khai (API /api/catalog/categories). Có danh mục nhập từ H5P còn dính ghi chú nội bộ của
-- lần di trú ("Di trú từ nội dung H5P Vocabulary Review.") — bỏ riêng câu đó, giữ phần mô tả còn lại.
-- Chạy lại nhiều lần vẫn an toàn: sau lần đầu không còn dòng nào khớp.
UPDATE course_categories
SET description = btrim(regexp_replace(description, '\s*Di trú từ nội dung H5P[^.]*\.', '', 'g'))
WHERE description LIKE '%Di trú từ nội dung H5P%';

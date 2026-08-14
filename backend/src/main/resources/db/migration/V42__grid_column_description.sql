-- GRID_MATCHING: cho phép gắn 1 đoạn mô tả cho từng cột (vd "List of
-- Conditions" -> A. The alone condition, B. The no-eye-contact condition...)
-- tách khỏi câu hỏi (stem) — trước đây bảng chú giải này phải gõ lẫn vào
-- ngay trong stem nên luôn hiện TRƯỚC lưới chấm điểm, không tách được để
-- hiện SAU lưới như định dạng đề IELTS thật.
ALTER TABLE question_grid_columns ADD COLUMN description TEXT;

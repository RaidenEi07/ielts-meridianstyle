-- =====================================================================
-- V4 — Seed Exam Template chuẩn IELTS (Computer-Delivered).
--   Cấu hình JSONB điều khiển layout/timer/quy đổi band cho quiz thuộc
--   category gắn template này (xem mục 3 của Kế hoạch V3).
--   Category/Course mẫu được tạo bởi CatalogDataInitializer (cần tạo context).
-- =====================================================================

INSERT INTO exam_templates (code, name, skill_layout_config, timer_rules, band_score_conversion)
VALUES (
    'IELTS',
    'IELTS Academic (Computer-Delivered)',
    '{
       "listening": { "layout": "two-column", "audioPlayOnce": true, "transferMinutes": 10 },
       "reading":   { "layout": "split-pane", "maxPages": 3, "tools": ["highlight", "note", "flag"] },
       "writing":   { "layout": "split-pane", "tasks": 2, "richText": false, "wordCount": true },
       "antiCheat": { "blockCopyPaste": true, "trackTabSwitch": true }
     }'::jsonb,
    '{
       "listening": { "minutes": 30, "transferMinutes": 10 },
       "reading":   { "minutes": 60 },
       "writing":   { "minutes": 60, "perTask": [20, 40] }
     }'::jsonb,
    '{
       "skill": "listening_reading",
       "scale": [
         { "rawMin": 39, "rawMax": 40, "band": 9.0 },
         { "rawMin": 37, "rawMax": 38, "band": 8.5 },
         { "rawMin": 35, "rawMax": 36, "band": 8.0 },
         { "rawMin": 33, "rawMax": 34, "band": 7.5 },
         { "rawMin": 30, "rawMax": 32, "band": 7.0 },
         { "rawMin": 27, "rawMax": 29, "band": 6.5 },
         { "rawMin": 23, "rawMax": 26, "band": 6.0 }
       ]
     }'::jsonb
);

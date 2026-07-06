Kế hoạch Tổng thể Phát triển Hệ thống Website Quản lý và Khóa học Trung tâm Tiếng Anh (V3)

## 1. Mục tiêu Dự án

- Xây dựng giải pháp SaaS/đóng gói cho các trung tâm tiếng Anh vừa và nhỏ, hỗ trợ đa khóa học, đa kỹ năng (Listening, Reading, Writing, Speaking).

- Cung cấp hệ thống phân quyền linh hoạt theo ngữ cảnh (Admin / Teacher / Student), cho phép gán role ở mọi cấp (toàn hệ thống, danh mục, khóa học, bài thi).

- Hỗ trợ ngân hàng câu hỏi đa dạng (10 dạng câu hỏi) phục vụ kiểm tra kỹ năng tiếng Anh học thuật và thi chứng chỉ.

- **Khóa học được phân loại theo Category, trong đó Category IELTS sẽ kích hoạt giao diện làm bài mô phỏng đúng chuẩn phòng thi IELTS thực tế** (timer theo từng phần, layout riêng cho Listening/Reading/Writing, cấm copy-paste, cảnh báo chuyển tab). Cơ chế này được thiết kế tổng quát để mở rộng cho các chứng chỉ khác (TOEFL, HSK...) sau này mà không cần sửa code cứng.

- Đảm bảo khả năng mở rộng, bảo mật, và tùy biến thương hiệu theo từng trung tâm.

## 2. Vai trò & Mô hình Phân quyền (RBAC theo Context)

### 2.1. Mô hình tổng quát

Thay vì gắn role cố định trên `users` (như V2), hệ thống dùng mô hình **Role-Context**, tương tự kiến trúc Moodle:

- **contexts**: mỗi context có `type` (SYSTEM / CATEGORY / COURSE / QUIZ), `instance_id` trỏ tới đối tượng tương ứng, và `parent_context_id` để kế thừa quyền theo cây phân cấp (System → Category → Course → Quiz).

- **capabilities**: danh sách quyền hạt nhân theo namespace, ví dụ `course:manage`, `quiz:overrideattempt`, `quiz:regrade`, `grade:view`, `report:viewlive`, `user:bulkupload`...

- **roles**: gom nhóm capabilities (Admin, Teacher, Student; có thể mở rộng Manager/TA sau).

- **role_assignments**: `(user_id, role_id, context_id)` — một user có thể có nhiều role tại nhiều context khác nhau (ví dụ: là Teacher ở Course A, Student ở Course B).

- Quyền hiệu lực = quyền tại context hiện tại + kế thừa từ context cha, có thể override/prevent ở context con. Đây là phần bắt buộc phải làm đúng từ đầu vì toàn bộ tính năng "gán role ở mọi cấp" của Admin phụ thuộc vào nó.

### 2.2. Bảng quyền theo vai trò

| Nhóm chức năng | Admin | Teacher | Student |
| --- | --- | --- | --- |
| Cấu hình hệ thống | Tên site, ngôn ngữ, theme sáng/tối, bảo mật, HTTP/SSL, cache | — | — |
| Quản lý người dùng | CRUD/khóa/duyệt tài khoản, upload hàng loạt (ảnh, audio) | — | — |
| Phân quyền | Sửa role, gán role ở mọi context | — | — |
| Khóa học | CRUD toàn bộ khóa & danh mục, backup/restore, thùng rác, ghi danh | Sửa cài đặt khóa (tên/shortname/summary), ẩn/hiện, sắp xếp section, quản lý file, reset khóa | Xem khóa & người tham gia, tải nội dung, xem completion report |
| Ngân hàng câu hỏi | (kế thừa quyền Teacher nếu cần) | Thêm/sửa/xóa/dùng/gắn thẻ/quản lý danh mục câu hỏi | — |
| Quiz nâng cao | — | Override thời gian/người dùng, chấm lại, xóa/mở lại lượt làm, xem báo cáo & thống kê, bật/tắt anti-cheat (chuyển tab) | Làm bài, xem lại lượt làm của mình |
| Quản lý người học | — | Ghi danh thủ công/tự ghi danh, quản lý nhóm, xem participant, xem user bị đình chỉ, gửi tin nhắn hàng loạt | Tự hủy ghi danh |
| Bài tập/Workshop | — | — | Assignment: nộp + xem tóm tắt + export; Workshop: nộp |
| Backup/Restore | Toàn hệ thống | Course/Activity/Section, thùng rác (xóa/khôi phục) | — |
| Báo cáo | Mọi báo cáo hệ thống, analytics | Completion, log, live log, participation, progress, stats, outline | Điểm của mình (grade:view, gradereport/user), portfolio export, xem chi tiết user |
| Hệ thống | Bảo trì, thông báo | — | — |

## 3. Cấu trúc Khóa học & Category đặc biệt (Exam Mode)

### 3.1. Phân cấp dữ liệu

`Category → Course → Section → Quiz → Question`, giữ nguyên cấu trúc phân cấp của V2 nhưng bổ sung khả năng category "điều khiển" hành vi giao diện của quiz bên trong nó.

### 3.2. Cơ chế Category Template / Exam Profile

Bổ sung bảng `exam_templates` (id, name, skill_layout_config JSON, timer_rules JSON, band_score_conversion JSON). Bảng `course_categories` có thêm cột `exam_template_id` (nullable). Khi category của một khóa học được gắn `exam_template_id` (ví dụ category "IELTS"), mọi quiz thuộc khóa học đó sẽ tự động render theo layout & quy tắc thời gian của template — không hard-code riêng cho IELTS, để dễ mở rộng sang TOEFL/HSK/JLPT sau này.

### 3.3. Giao diện làm bài mô phỏng IELTS (khi category = IELTS)

- **Listening:** audio phát đúng 1 lần (không tua/không pause), bố cục 2 cột (câu hỏi trái, ô điền phải), chia theo Part 1-4, có 10 phút "transfer time" cuối giờ.

- **Reading:** mỗi quiz tối đa **3 page** (Page = Part = 1 passage), layout chia màn hình theo chiều ngang với thanh chia có thể kéo giãn (passage trái scroll riêng, câu hỏi phải scroll riêng, một page có thể chứa nhiều nhóm câu hỏi với hướng dẫn riêng từng nhóm), công cụ highlight/note (mục 3.4), bookmark/flag từng câu, thanh điều hướng page cố định ở đáy màn hình hiển thị dải số câu của page hiện tại + nút chuyển Part trái/phải. Khái niệm "Page" (tối đa 3) là tính năng chung của Quiz (xem mục 4, dòng #10), không riêng IELTS — chỉ phần giao diện split-pane/Part-styling mới giới hạn cho category IELTS.

- **Writing:** 2 task (Task 1 mô tả biểu đồ/báo cáo, Task 2 luận), bộ đếm từ, không có rich-format phong phú (giống điều kiện thi thật), timer riêng từng task.

- **Speaking:** ghi âm theo 3 part hoặc đặt lịch với giáo viên (đề xuất đưa vào giai đoạn mở rộng, không thuộc MVP).

- **Chung:** tổng thời gian theo chuẩn thi thật (Listening ~30+10p, Reading 60p, Writing 60p), khóa copy-paste, ghi log cảnh báo khi chuyển tab (anti-cheat), màn hình xác nhận nộp bài, quy đổi band score tự động cho Listening/Reading; Writing cần giáo viên chấm theo rubric (Task Achievement, Coherence & Cohesion, Lexical Resource, Grammatical Range).

- Các khóa học thuộc category khác (Giao tiếp, Ngữ pháp...) dùng layout quiz tiêu chuẩn (không bị ép theo khuôn IELTS).

### 3.4. Highlight & Ghi chú (Annotation Tool) khi làm bài

Đây là tính năng có thật trên bài thi IELTS Computer-Delivered (CDT): thí sinh được phép highlight đoạn văn và ghi chú (Note Pad) trong lúc làm bài. Tính năng này nên áp dụng chung cho mọi giao diện làm bài (không chỉ riêng IELTS) để tăng trải nghiệm, và có thể bật/tắt theo cấu hình từng quiz.

- **Highlight:** người dùng chọn (select) một đoạn văn bản trong passage hoặc trong nội dung câu hỏi → một toolbar nổi (floating toolbar) xuất hiện ngay cạnh vùng chọn với các màu highlight (vàng/xanh/hồng) để chọn nhanh.

- **Ghi chú (Note):** từ cùng toolbar nổi đó, người dùng chọn "Add note" → mở popover nhập nội dung ghi chú, có thể gắn vào đúng đoạn văn bản đã chọn (note đi kèm highlight) hoặc ghi chú độc lập theo từng câu hỏi. Toàn bộ ghi chú được tổng hợp trong một panel "Note Pad" thu gọn/mở rộng, click vào từng note sẽ tự scroll tới vị trí tương ứng trong bài.

- **Lưu trữ & khôi phục:** annotation được lưu theo từng lượt làm bài (`attempt_id`) — nếu thí sinh load lại trang giữa giờ thi, highlight/note phải được khôi phục đúng vị trí; annotation không được chia sẻ chéo giữa các attempt/người dùng khác nhau (đảm bảo tính riêng tư và toàn vẹn khi thi lại).

- **Thiết kế dữ liệu:** bảng `attempt_annotations` (`id`, `attempt_id`, `target_type` [PASSAGE/QUESTION], `target_id`, `type` [HIGHLIGHT/NOTE], `color` nullable, `start_offset`, `end_offset`, `note_text` nullable, `created_at`, `updated_at`). Offset được tính theo vị trí ký tự trong nội dung văn bản đã chuẩn hóa của passage/question để có thể render lại chính xác.

- **Công nghệ đề xuất:** Selection/Range API của trình duyệt để lấy vùng chọn, kết hợp thư viện như `rangy` hoặc xử lý tự custom để serialize/deserialize offset; debounce autosave annotation qua API để tránh mất dữ liệu khi mất kết nối.

## 4. Ngân hàng Câu hỏi (10 dạng)

| # | Loại câu hỏi | Lưu ý thiết kế dữ liệu |
| --- | --- | --- |
| 1 | Multiple Choice (single/multi) | `question_options` + cờ `is_correct`, hỗ trợ chọn 1 hoặc nhiều đáp án |
| 2 | True/False/Not Given | Biến thể của multiple choice với 3 lựa chọn cố định |
| 3 | Matching | Bảng `question_matching_pairs` (left_item, right_item), hỗ trợ trộn thứ tự |
| 4 | Short Answer (1-3 từ) | `accepted_answers` (JSON danh sách đáp án chấp nhận) + cờ phân biệt hoa/thường |
| 5 | Essay | Cần `rubric` chấm tay, giới hạn số từ, không tự động chấm |
| 6 | Drag and drop into text | Văn bản có placeholder `[[1]] [[2]]`, danh sách item kéo-thả khớp placeholder |
| 7 | Drag and drop markers | Ảnh nền + `zones` (tọa độ vùng thả) + danh sách item, dùng cho bài tập sơ đồ/bản đồ |
| 8 | Embedded Answers (Cloze) | Câu hỏi composite chứa nhiều `question_cloze_subanswers`, mỗi sub-answer có type riêng (chọn/điền/số) |
| 9 | Audio | **Không phải loại câu hỏi độc lập** — là file âm thanh gắn vào câu hỏi/đoạn văn (passage), áp dụng cho Listening dù câu hỏi gốc là loại 1-8 |
| 10 | Phân trang (Pagination) cho Reading | **Thuộc cấu hình Quiz**, không phải loại câu hỏi — mọi quiz (mọi category) chia tối đa **3 page** qua bảng `quiz_pages` (`quiz_id`, `page_number` 1-3, `part_label`, `passage_id` nullable); riêng category IELTS, mỗi page render theo giao diện split-pane chuẩn thi (xem mục 3.6.2) |

> Ghi chú quan trọng: mục 9 và 10 nên được mô hình hóa như **thuộc tính / entity hỗ trợ** (audio đính kèm, passage chia trang) thay vì "loại câu hỏi" ngang hàng với 1-8, để một câu Multiple Choice vẫn có thể đi kèm audio hoặc thuộc một passage nhiều trang.

## 5. Quy trình tạo khóa học

`Tạo khóa học → Gán Category (kích hoạt Exam Template nếu có) → Tạo Section → Tạo Quiz (gắn Quiz Category, cấu hình thời gian/anti-cheat) → Thêm câu hỏi (tạo mới hoặc import từ Question Bank theo danh mục/tag) → Cấu hình Passage/Audio nếu cần phân trang → Xuất bản`

## 6. Kế hoạch Triển khai theo Giai đoạn

### Giai đoạn 0 — Phân tích & Thiết kế Kiến trúc

- Hạng mục: hoàn thiện ERD (bao gồm RBAC theo context, question bank 10 loại, exam template), wireframe luồng Admin/Teacher/Student, thiết kế API contract (OpenAPI).
- Công nghệ/Tool: dbdiagram.io hoặc Draw.io (ERD), Figma (wireframe/UI), Swagger/OpenAPI (API spec).
- Output: tài liệu ERD + wireframe + API spec được chốt.

### Giai đoạn 1 — Backend Core: Auth & RBAC

- Hạng mục: đăng ký/đăng nhập, JWT + refresh token, dựng bảng `roles/capabilities/contexts/role_assignments`, middleware kiểm tra quyền theo context kế thừa.
- Công nghệ/Tool: Spring Boot 3.x, Spring Security, JJWT, PostgreSQL, Flyway (migration).
- Output: API auth + RBAC hoạt động, có thể gán role ở mọi cấp qua Postman/test case.

### Giai đoạn 2 — Quản lý Khóa học & Category

- Hạng mục: CRUD Category (kèm `exam_template_id`), CRUD Course/Section, ghi danh (enrollment), soft-delete (thùng rác) cho course/section.
- Công nghệ/Tool: Spring Data JPA/Hibernate, MapStruct (DTO mapping).
- Output: module LMS API cơ bản, danh mục IELTS đã có thể gắn template (chưa cần render UI).

### Giai đoạn 3 — Question Bank Engine

- Hạng mục: xây schema cho 8 loại câu hỏi chính + entity `passages` (chia trang) + đính kèm audio; API quản lý danh mục/tag câu hỏi; import câu hỏi vào quiz.
- Công nghệ/Tool: PostgreSQL JSONB (lưu cấu trúc linh hoạt cho Cloze/Drag-drop/Matching), MinIO/S3 (lưu audio/ảnh), FFmpeg (chuẩn hóa/nén audio).
- Output: ngân hàng câu hỏi đầy đủ 10 dạng, có thể tạo/sửa/import.

### Giai đoạn 4 — Quiz Engine & Exam Simulation

- Hạng mục: quản lý `quiz_attempts`, override thời gian/người dùng, chấm lại, xóa/mở lại lượt làm; ghi log anti-cheat (`quiz_attempt_logs` cho sự kiện chuyển tab/thoát fullscreen); render giao diện theo `exam_templates` khi category = IELTS.
- Công nghệ/Tool: React/Next.js + TypeScript (FE quiz player), Page Visibility API + WebSocket/STOMP (theo dõi chuyển tab real-time), Howler.js (audio player tùy biến cho Listening), dnd-kit (kéo-thả cho câu hỏi loại 6-7), TipTap/CKEditor 5 (soạn câu hỏi essay/cloze), Selection/Range API + rangy (highlight & note-taking).
- Output: làm bài quiz tiêu chuẩn + giao diện mô phỏng IELTS hoạt động đầy đủ.

### Giai đoạn 5 — Gradebook & Báo cáo

- Hạng mục: sổ điểm, quy đổi band score (Listening/Reading), rubric chấm Writing/Essay, các báo cáo: completion, log, live log, participation, progress, stats, outline, analytics tổng hệ thống.
- Công nghệ/Tool: bảng `gradebook_items`, `grade_history` (audit), `report_logs`; Metabase (self-host BI) hoặc dashboard riêng với Recharts/Chart.js.
- Output: gradebook đầy đủ cho cả 3 vai trò, dashboard báo cáo cho Admin/Teacher.

### Giai đoạn 6 — Công cụ Quản trị (Admin Tools)

- Hạng mục: cấu hình site (ngôn ngữ, theme, cache, bảo mật, HTTPS flag), upload hàng loạt user/ảnh/audio, hệ thống thông báo (notification/announcement), backup/restore toàn diện (course/activity/section) dựa trên JSON export/import nội bộ.
- Công nghệ/Tool: Redis (cache cấu hình, session), bảng `web_configurations` (key-value), SMTP (SendGrid/Amazon SES) cho email, Firebase Cloud Messaging (push, tùy chọn).
- Output: Admin Dashboard quản trị đầy đủ theo yêu cầu.

### Giai đoạn 7 — Frontend Client (Trang chủ & Trang Khóa học)

- Hạng mục: trang chủ động (banner, giới thiệu), trang danh sách khóa học có filter theo category, trang chi tiết khóa học, responsive toàn diện.
- Công nghệ/Tool: Next.js (SSR/SEO), TailwindCSS + shadcn/ui, Zustand/Redux (state).
- Output: portal công khai hoàn chỉnh.

### Giai đoạn 8 — Kiểm thử, Bảo mật & Tối ưu

- Hạng mục: Unit test cho logic RBAC, test luồng anti-cheat, E2E test luồng làm bài IELTS, audit bảo mật endpoint `/api/admin/**`, nén ảnh/audio tự động.
- Công nghệ/Tool: JUnit5 + Mockito (BE), Jest + React Testing Library (FE unit), Cypress/Playwright (E2E), OWASP ZAP (security scan).
- Output: hệ thống đạt chuẩn chất lượng & bảo mật trước khi deploy.

### Giai đoạn 9 — Triển khai (Deployment)

- Hạng mục: containerize ứng dụng, CI/CD, cấu hình VPS, Nginx reverse proxy, SSL/TLS, giám sát hệ thống.
- Công nghệ/Tool: Docker + Docker Compose, GitHub Actions (CI/CD), Nginx, Certbot/Let's Encrypt (SSL), Prometheus + Grafana (monitoring), Sentry (error tracking).
- Output: hệ thống vận hành production, có giám sát và cảnh báo lỗi.

### Giai đoạn 10 (Mở rộng tương lai)

- Cổng thanh toán trực tuyến, ứng dụng mobile, chấm Writing/Speaking bằng AI hỗ trợ, thêm exam template cho TOEFL/HSK/JLPT dựa trên cơ chế Category Template đã xây ở Giai đoạn 0-2.

## 7. Tổng hợp Công nghệ theo Lớp Hệ thống

| Lớp | Công nghệ/Tool đề xuất |
| --- | --- |
| Backend | Spring Boot 3.x, Spring Security + JWT, Spring Data JPA/Hibernate, MapStruct |
| Database | PostgreSQL (JSONB cho câu hỏi phức tạp), Flyway (migration) |
| Cache | Redis |
| File/Media | MinIO hoặc AWS S3, FFmpeg |
| Frontend | React + TypeScript, Next.js, TailwindCSS, shadcn/ui, Zustand/Redux |
| Soạn nội dung | TipTap / CKEditor 5 |
| Kéo-thả & Audio Player | dnd-kit, Howler.js |
| Anti-cheat/Realtime | Page Visibility API, WebSocket (STOMP) |
| Testing | JUnit5, Mockito, Jest, React Testing Library, Cypress/Playwright |
| CI/CD & Hạ tầng | Docker, Docker Compose, GitHub Actions, Nginx, Certbot |
| Giám sát | Prometheus, Grafana, Sentry |
| Thông báo | SMTP (SendGrid/Amazon SES), Firebase Cloud Messaging |
| Báo cáo/BI | Metabase hoặc Recharts/Chart.js tự xây |

## 8. Thiết kế Cơ sở Dữ liệu Cập nhật (so với V2)

- **RBAC:** `contexts`, `roles`, `capabilities`, `role_assignments` (thay cho cột `role` cố định trên `users`).
- **Category & Exam Mode:** `course_categories` (+`exam_template_id`), `exam_templates`.
- **Question Bank:** `questions` (mở rộng enum type theo mục 4), `question_options`, `question_matching_pairs`, `question_dragdrop_items`, `question_dragdrop_zones`, `question_cloze_subanswers`, `passages` (đoạn văn/audio dùng chung), `quiz_pages` (tối đa 3 page/quiz, gắn `passage_id` cho Reading).
- **Quiz & Anti-cheat:** `quiz_attempts` (+override fields), `quiz_attempt_logs`.
- **Annotation:** `attempt_annotations` (highlight & note theo từng lượt làm bài, xem mục 3.4).
- **Backup/Trash:** cột `deleted_at` (soft-delete) trên các bảng học liệu chính, bảng `backups` (snapshot JSON theo course/activity/section).
- **Báo cáo & Thông báo:** `gradebook_items`, `grade_history`, `report_logs`, `notifications`, `system_announcements`.
- **Cấu hình:** `web_configurations` (mở rộng key: SITE_LANGUAGE, SITE_THEME_MODE, CACHE_TTL, SSL_FORCE_HTTPS).

## 9. Kế hoạch Mở rộng Tương lai

Sau MVP: cổng thanh toán trực tuyến, chấm tự động hỗ trợ AI cho Writing/Speaking, ứng dụng mobile, mở rộng Exam Template cho các chứng chỉ khác (TOEFL, HSK, JLPT) dựa trên cơ chế Category Template đã xây dựng sẵn.

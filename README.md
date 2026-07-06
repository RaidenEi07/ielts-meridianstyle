# Anh ngữ Meridian — Hệ thống LMS & Luyện thi IELTS

Triển khai theo [Kế hoạch Tổng thể V3](./Ke_hoach_Tong_the_Website_Trung_tam_Tieng_Anh_V3.md).
Thiết kế giao diện tham chiếu nằm trong [`frontend/_design/`](./frontend/_design/).

| Lớp | Công nghệ |
|---|---|
| Backend | Spring Boot 4.1 (Java 17), Spring Security + JWT, Spring Data JPA, Flyway |
| Database | PostgreSQL 17 |
| Frontend | Next.js 16 (App Router), React 19, TailwindCSS v4, Zustand |

## Trạng thái hiện tại

### Giai đoạn 1 — Auth & RBAC ✅

- **RBAC theo context** (kiểu Moodle): `contexts` (SYSTEM→CATEGORY→COURSE→QUIZ),
  `roles`, `capabilities`, `role_capabilities` (ALLOW/PREVENT), `role_assignments`.
  Quyền hiệu lực được phân giải có kế thừa theo cây context + hỗ trợ override.
- **Auth**: đăng ký / đăng nhập, JWT access + refresh token, endpoint `/me`.
- **Admin RBAC**: liệt kê user, **gán role ở mọi context**, thu hồi role —
  được bảo vệ bằng capability.
- **Frontend**: design system (light/dark theo design tokens), màn Auth 2 cột,
  dashboard hiển thị vai trò + quyền + bảng quản lý user (chỉ admin).

### Giai đoạn 2 — Khóa học & Category ✅

- **Exam Template**: `exam_templates` (cấu hình JSONB layout/timer/quy đổi band);
  category gắn `exam_template_id` (vd "Luyện thi IELTS" → template IELTS).
- **Catalog**: CRUD Category / Course / Section, **soft-delete** (`deleted_at`),
  khóa học có trạng thái DRAFT/PUBLISHED/ARCHIVED.
- **Context RBAC thật**: tạo Category/Course sẽ sinh CATEGORY/COURSE context
  (con của context cha) → giáo viên được gán tại một category chỉ quản lý được
  khóa học trong nhánh đó, không đụng nhánh khác.
- **Enrollment**: ghi danh, theo dõi tiến độ (%), tự hủy; chống ghi danh trùng.
- **Frontend**: trang `/courses` (lọc theo danh mục) + `/courses/[id]` (đề cương
  + ghi danh); dashboard có mục "Khóa học của tôi".

### Giai đoạn 3 — Ngân hàng câu hỏi ✅

- **8 loại câu hỏi**: Multiple Choice, True/False/Not Given, Matching, Short
  Answer, Essay, Drag-drop into text, Drag-drop markers, Cloze — mỗi loại có
  bảng con riêng (`question_options`, `question_matching_pairs`,
  `question_dragdrop_items`/`_zones`, `question_cloze_subanswers`).
- **Passages** (đoạn văn Reading / audio Listening) dùng chung + **danh mục/tag**
  câu hỏi. Cấu hình linh hoạt (acceptedAnswers, rubric, template...) lưu **JSONB**.
- API tạo/sửa/xóa mềm theo loại với validate riêng từng loại; đổi loại câu hỏi
  tự dọn bộ phận con cũ. Bảo vệ bằng `question:manage`.
- **Frontend**: trang `/teacher/questions` (cây danh mục + bảng câu hỏi, badge
  màu theo loại), link từ dashboard cho user có `question:manage`.

### Giai đoạn 4 — Quiz Engine & Exam Simulation ✅

- **Quiz** thuộc Section (tạo sinh QUIZ context), cấu hình thời gian, số lượt,
  **anti-cheat** (ngưỡng vi phạm), phân trang ≤3 (`quiz_pages`), import câu hỏi
  từ ngân hàng (`quiz_questions`).
- **Lượt làm** (`quiz_attempts`): bắt đầu → lưu đáp án (`quiz_attempt_answers`,
  JSONB) → nộp; **tự chấm** MC/TFNG/Short/Matching/Cloze/Drag (all-or-nothing),
  Essay chấm tay; **quy đổi band** theo `exam_template` (Listening/Reading).
- **Anti-cheat**: log sự kiện (`quiz_attempt_logs`), tự nộp khi vượt ngưỡng.
  Giáo viên: xem lượt/log, **override** thời gian, **regrade**, reopen, xóa.
- **Bảo mật**: player view loại bỏ đáp án đúng; chặn xem lượt của người khác (403).
- **Frontend**: `/quiz/[attemptId]` — timer đếm ngược, chống chuyển tab, khóa
  copy/paste, nộp bài → kết quả + band; nút "Làm bài" trên trang khóa học.

### Giai đoạn 5 — Gradebook & Báo cáo ✅

- **Chấm tay Essay**: giáo viên chấm từng câu, **tính lại điểm** lượt làm (giữ
  nguyên điểm khách quan đã chấm tự động), có **audit** (`grade_history`).
- **Sổ điểm học viên**: điểm/band tốt nhất mỗi bài (`grade:view`).
- **Báo cáo quiz** (giáo viên): thống kê lượt/học viên/điểm TB/max/min/pass rate/
  vi phạm + bảng theo học viên (`report:viewlive`).
- **Analytics hệ thống** (admin): tổng user/khóa/ghi danh/quiz/lượt thi, doanh
  thu, biểu đồ 6 tháng (`report:viewlive` @SYSTEM).
- **Frontend**: `/grades` (band + bảng điểm), Admin Analytics trên dashboard
  (stat cards + biểu đồ SVG doanh thu/ghi danh).

### Giai đoạn 6 — Công cụ Quản trị ✅

- **Cấu hình site** (`web_configurations` key-value): branding công khai
  (`/api/config/public`) + sửa cấu hình (`system:manage`) — tên, khẩu hiệu,
  theme, màu, HTTPS, mở đăng ký...
- **Thông báo hệ thống** (`system_announcements`): banner INFO/WARNING/CRITICAL,
  mọi user thấy khi active.
- **Notification cá nhân** (`notifications`): chuông + đếm chưa đọc, đánh dấu đọc;
  admin **broadcast** tới tất cả.
- **Import user hàng loạt** (`user:bulkupload`): tạo học viên từ danh sách.
- **Token auto-refresh**: 401 → tự làm mới bằng refresh token (không phải đăng
  nhập lại).
- **Frontend**: `/admin/settings` (branding + config + thông báo + broadcast +
  bulk import), chuông thông báo + banner trên dashboard.

### Giai đoạn 7 — Public Portal ✅

- **Trang chủ marketing đầy đủ**: hero 2 cột (floating badge 92%/CDT), stats
  strip (số liệu thật từ API), khóa học nổi bật, **đội ngũ giáo viên**
  (`teacher_profiles`), testimonial, **form đăng ký tư vấn** (lead capture) →
  footer tối.
- **Backend công khai**: `/api/catalog/teachers` (GV nổi bật), `/api/catalog/stats`
  (khóa/GV/học viên), `POST /api/inquiries` (phiếu tư vấn — không cần đăng nhập);
  admin xem/xử lý phiếu (`user:manage`). Seed 4 hồ sơ giáo viên.

### Giai đoạn 8 — Giao diện thi IELTS (mô phỏng CDT) ✅

- Player trả về **pages + passage** theo trang; giao diện thi kích hoạt khi có
  exam template.
- **Reading split-pane**: passage (Source Serif, đoạn văn) | **divider kéo được**
  (clamp 30–70%) | câu hỏi; **công cụ highlight** (bôi đen → `<mark>` vàng, xóa
  highlight).
- **Writing**: đề bài | editor với **đếm từ live** + mục tiêu.
- **Navigator** dưới cùng: pill số câu (đã trả lời = xanh, flag = cam), **cờ ⚑**
  từng câu. Vẫn giữ timer + anti-cheat + header phòng thi tối.

### Giai đoạn 9 — Listening, Kiểm thử tự động & Deploy ✅

- **Listening**: passage `kind=LISTENING` + audio placeholder tự sinh
  (`frontend/public/audio/listening-demo.wav`, không phải audio thi thật).
  Player: nút play/pause tùy chỉnh (**không cho tua** — chặn seek vượt mốc đã
  nghe), **waveform 40 vạch** tô xanh theo tiến độ, timestamp, **banner
  transfer time** (đếm ngược 10 phút) tự hiện sau khi audio kết thúc, câu Note
  Completion (blank gạch chân, xanh khi đã điền).
- **Test tự động** (JUnit 5 + Mockito + AssertJ, đã có sẵn qua test-starter
  của Boot 4): `PermissionServiceTest` (kế thừa + override PREVENT theo
  context), `GradingServiceTest` (tự chấm cả 6 loại khách quan), `AuthServiceTest`
  (đăng ký/đăng nhập/tài khoản khóa), `SlugsTest`. Chạy: `./mvnw test`.
- **Đóng gói deploy**: `backend/Dockerfile` (multi-stage Maven → JRE slim),
  `frontend/Dockerfile` (multi-stage, Next.js `output: "standalone"`),
  `docker-compose.prod.yml` (Postgres + backend + frontend, wiring qua `.env`).

> ⚠️ Docker daemon không chạy trên máy dev nên chưa build được image thật —
> đã xác nhận từng bước riêng lẻ (`mvnw package` tạo đúng jar Dockerfile cần,
> `npm run build` tạo đúng `.next/standalone` Dockerfile cần). Hãy tự chạy
> `docker compose -f docker-compose.prod.yml up -d --build` để kiểm tra lần đầu.

### Bổ sung — Giao diện quản trị Khóa học/Section/Quiz ✅

Trước đó admin chỉ **xem** được dữ liệu (dashboard, danh sách, ngân hàng câu
hỏi read-only) — không có màn hình nào để thực sự tạo nội dung, dù backend đã
đủ API từ Giai đoạn 2/4. Đã bổ sung:

- **`/admin/courses`** — danh sách danh mục (tạo mới) + danh sách khóa học
  **mọi trạng thái** (kể cả DRAFT, khác trang công khai chỉ hiện PUBLISHED) +
  tạo khóa học mới. Backend thêm `GET /api/admin/catalog/courses` cho việc này.
- **`/admin/courses/[id]`** — sửa/xóa khóa học; tạo/xóa **section**; mỗi
  section hiện danh sách quiz + tạo quiz mới.
- **`/admin/quizzes/[id]`** — sửa cấu hình quiz (thời gian, số lượt, trộn câu,
  chống gian lận, điểm đạt, trạng thái); quản lý **phân trang** (gắn passage
  Reading/Listening); **thêm câu hỏi từ ngân hàng** (chọn nhiều + đặt điểm) và
  gỡ câu hỏi khỏi quiz.
- Link "🏫 Quản lý khóa học" trên dashboard (hiện khi có quyền `course:manage`).

Đã browser-verify toàn luồng: tạo danh mục → khóa học (DRAFT) → section → quiz
→ import câu hỏi → xuất bản → khóa học/quiz xuất hiện đúng ở trang công khai →
học viên ghi danh và làm bài được.

## Yêu cầu

Java 17+, Node 20+, và PostgreSQL (đã chạy sẵn ở `localhost:5432`, hoặc dùng
`docker compose up -d` nếu có Docker).

## Chạy dự án

### 1. Database

Dùng Postgres có sẵn — tạo role + database:

```sql
CREATE ROLE meridian LOGIN PASSWORD 'meridian';
CREATE DATABASE meridian OWNER meridian;
```

Hoặc dùng Docker: `docker compose up -d` (đọc cấu hình từ `.env`, xem `.env.example`).

### 2. Backend (cổng 8090)

```bash
cd backend
./mvnw spring-boot:run        # Windows: mvnw.cmd spring-boot:run
```

Flyway tự tạo schema + seed roles/capabilities. `DataInitializer` tạo tài khoản
admin mặc định:

- **Tên đăng nhập:** `admin`
- **Mật khẩu:** `Admin@123`
- (Email `admin@meridian.edu.vn` vẫn được lưu để liên hệ/thông báo, **không**
  dùng để đăng nhập.)

Cấu hình qua biến môi trường (xem `backend/src/main/resources/application.properties`):
`DB_URL`, `DB_USER`, `DB_PASSWORD`, `JWT_SECRET`, `ADMIN_USERNAME`, `ADMIN_EMAIL`,
`ADMIN_PASSWORD`.

### 3. Frontend (cổng 3100)

```bash
cd frontend
npm install        # lần đầu
npm run dev
```

Mở http://localhost:3100 → Đăng nhập bằng **tên đăng nhập** `admin` (không phải
email) + mật khẩu ở trên, hoặc Đăng ký tài khoản học viên mới (cần cả tên đăng
nhập lẫn email).

> Cổng: backend **8090**, frontend **3100** (đổi để tránh trùng với dự án khác
> dùng 8080/3000). DB dùng PostgreSQL `:5432` nhưng database riêng `meridian`.

## API

### Giai đoạn 1 — Auth & RBAC

| Endpoint | Method | Quyền | Mô tả |
|---|---|---|---|
| `/api/auth/register` | POST | công khai | Đăng ký `{username, email, password, fullName}` (tự gán role `student`) |
| `/api/auth/login` | POST | công khai | Đăng nhập `{username, password}` → access + refresh token (**không** dùng email) |
| `/api/auth/refresh` | POST | công khai | Cấp lại token từ refresh token |
| `/api/auth/me` | GET | đã đăng nhập | Thông tin user + role + capability |
| `/api/admin/users` | GET | `user:manage` | Danh sách user |
| `/api/admin/roles` | GET | `role:assign` | Danh sách role |
| `/api/admin/capabilities` | GET | `role:assign` | Danh sách capability |
| `/api/admin/role-assignments` | POST | `role:assign` | Gán role tại context |
| `/api/admin/role-assignments/{id}` | DELETE | `role:assign` | Thu hồi role |

### Giai đoạn 2 — Khóa học & Category

| Endpoint | Method | Quyền | Mô tả |
|---|---|---|---|
| `/api/catalog/exam-templates` | GET | công khai | Danh sách exam template |
| `/api/catalog/categories` | GET | công khai | Danh sách danh mục |
| `/api/catalog/courses` | GET | công khai | Khóa học đã xuất bản (lọc `?categoryId=`) |
| `/api/catalog/courses/{id}` | GET | công khai | Chi tiết khóa + section |
| `/api/admin/catalog/categories` | POST | `course:manage` @SYSTEM | Tạo danh mục (+ context) |
| `/api/admin/catalog/categories/{id}` | PUT/DELETE | `course:manage` @ctx | Sửa / xóa mềm danh mục |
| `/api/admin/catalog/courses` | GET | `course:manage` | Khóa học **mọi trạng thái** (lọc `?categoryId=`) — dùng cho màn quản trị |
| `/api/admin/catalog/courses` | POST | `course:manage` @category | Tạo khóa (+ context) |
| `/api/admin/catalog/courses/{id}` | PUT/DELETE | `course:manage` @course | Sửa / xóa mềm khóa |
| `/api/admin/catalog/courses/{id}/sections` | POST | `course:manage` @course | Thêm section |
| `/api/admin/catalog/sections/{id}` | PUT/DELETE | `course:manage` @course | Sửa / xóa mềm section |
| `/api/enrollments` | POST | đã đăng nhập | Ghi danh khóa học |
| `/api/enrollments/me` | GET | đã đăng nhập | Khóa học của tôi |
| `/api/enrollments/{id}/progress` | PATCH | chủ ghi danh | Cập nhật tiến độ |
| `/api/enrollments/{id}` | DELETE | chủ ghi danh | Tự hủy ghi danh |

### Giai đoạn 3 — Ngân hàng câu hỏi

Tất cả dưới `/api/admin/question-bank/**`, yêu cầu `question:manage` @SYSTEM.

| Endpoint | Method | Mô tả |
|---|---|---|
| `/categories` | GET/POST | Danh mục câu hỏi (cây) |
| `/tags` | GET/POST | Tag câu hỏi |
| `/passages` | GET/POST | Passage (đoạn văn/audio) |
| `/passages/{id}` | GET/PUT/DELETE | Chi tiết / sửa / xóa mềm passage |
| `/questions` | GET | Liệt kê (lọc `?categoryId=`, `?type=`) |
| `/questions` | POST | Tạo câu hỏi (mọi loại, kèm bộ phận con) |
| `/questions/{id}` | GET/PUT/DELETE | Chi tiết / sửa / xóa mềm câu hỏi |

### Giai đoạn 4 — Quiz & lượt làm bài

| Endpoint | Method | Quyền | Mô tả |
|---|---|---|---|
| `/api/admin/quizzes` | POST | `course:manage` @ctx | Tạo quiz (dưới section) |
| `/api/admin/quizzes/{id}` | GET/PUT/DELETE | `course:manage` @ctx | Chi tiết / sửa / xóa mềm |
| `/api/admin/quizzes/{id}/questions` | POST | `course:manage` @ctx | Import câu hỏi |
| `/api/admin/quizzes/{id}/pages` | POST | `course:manage` @ctx | Cấu hình page (≤3) |
| `/api/admin/quizzes/{id}/attempts` | GET | `quiz:overrideattempt` | Danh sách lượt làm |
| `/api/admin/attempts/{id}/override` | POST | `quiz:overrideattempt` | Gia hạn thời gian |
| `/api/admin/attempts/{id}/regrade` | POST | `quiz:regrade` | Chấm lại |
| `/api/courses/{id}/quizzes` | GET | đã đăng nhập | Quiz đã xuất bản của khóa |
| `/api/quizzes/{id}/attempts` | POST | `quiz:attempt` | Bắt đầu lượt làm |
| `/api/attempts/{id}` | GET | chủ lượt | Trạng thái làm bài (ẩn đáp án) |
| `/api/attempts/{id}/answers` | PATCH | chủ lượt | Lưu đáp án |
| `/api/attempts/{id}/logs` | POST | chủ lượt | Ghi sự kiện anti-cheat |
| `/api/attempts/{id}/submit` | POST | chủ lượt | Nộp bài → chấm + band |

### Giai đoạn 5 — Gradebook & Báo cáo

| Endpoint | Method | Quyền | Mô tả |
|---|---|---|---|
| `/api/gradebook/me` | GET | `grade:view` | Sổ điểm của tôi (lọc `?courseId=`) |
| `/api/admin/attempts/{id}/answers` | GET | `quiz:regrade` | Danh sách đáp án để chấm |
| `/api/admin/attempts/{id}/answers/{ansId}/grade` | PATCH | `quiz:regrade` | Chấm tay Essay |
| `/api/admin/attempts/{id}/grade-history` | GET | `quiz:regrade` | Audit chấm điểm |
| `/api/admin/quizzes/{id}/report` | GET | `report:viewlive` | Báo cáo quiz |
| `/api/admin/analytics` | GET | `report:viewlive` @SYSTEM | Analytics hệ thống |

### Giai đoạn 6 — Admin Tools

| Endpoint | Method | Quyền | Mô tả |
|---|---|---|---|
| `/api/config/public` | GET | công khai | Branding công khai |
| `/api/admin/config` | GET/PUT | `system:manage` | Xem / cập nhật cấu hình |
| `/api/announcements` | GET | đã đăng nhập | Thông báo đang hiện |
| `/api/admin/announcements` | GET/POST | `system:manage` | Quản lý thông báo |
| `/api/admin/announcements/{id}` | PUT/DELETE | `system:manage` | Sửa / xóa thông báo |
| `/api/notifications/me` | GET | đã đăng nhập | Thông báo của tôi |
| `/api/notifications/unread-count` | GET | đã đăng nhập | Số chưa đọc |
| `/api/notifications/{id}/read` | POST | đã đăng nhập | Đánh dấu đã đọc |
| `/api/admin/notifications/broadcast` | POST | `system:manage` | Gửi tất cả |
| `/api/admin/users/bulk` | POST | `user:bulkupload` | Import user hàng loạt |

### Giai đoạn 7 — Public Portal

| Endpoint | Method | Quyền | Mô tả |
|---|---|---|---|
| `/api/catalog/teachers` | GET | công khai | Giáo viên nổi bật |
| `/api/catalog/stats` | GET | công khai | Thống kê (khóa/GV/học viên) |
| `/api/inquiries` | POST | công khai | Gửi phiếu tư vấn |
| `/api/admin/inquiries` | GET | `user:manage` | Danh sách phiếu tư vấn |
| `/api/admin/inquiries/{id}/status` | PATCH | `user:manage` | Cập nhật trạng thái phiếu |

### Ví dụ

```bash
# Đăng nhập admin (bằng tên đăng nhập, KHÔNG dùng email)
curl -X POST http://localhost:8090/api/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"username":"admin","password":"Admin@123"}'

# Dùng accessToken trả về:
curl http://localhost:8090/api/auth/me -H "Authorization: Bearer <TOKEN>"
```

## Kiểm thử

```bash
cd backend
./mvnw test                 # JUnit 5 + Mockito + AssertJ (unit) + context-load test
```

Test hiện có: `PermissionServiceTest`, `GradingServiceTest`, `AuthServiceTest`,
`SlugsTest` — chạy độc lập (mock repository, không cần DB). `BackendApplicationTests`
là context-load test, cần Postgres đang chạy.

## Deploy (production)

```bash
cp .env.example .env
# Chỉnh JWT_SECRET (≥32 ký tự), ADMIN_PASSWORD, CORS_ALLOWED_ORIGINS cho đúng domain.

docker compose -f docker-compose.prod.yml up -d --build
```

Compose này build từ source (`backend/Dockerfile`, `frontend/Dockerfile`) và khởi
động Postgres + backend (`:8090`) + frontend (`:3100`). Frontend dùng Next.js
`output: "standalone"` nên image runtime chỉ chứa `.next/standalone` + static +
`public` (không cần `node_modules` đầy đủ).

> **Lưu ý:** `NEXT_PUBLIC_API_BASE_URL` được Next.js nhúng vào bundle **lúc build**
> (build arg trong `docker-compose.prod.yml`), không phải lúc chạy. Đổi domain
> backend sau khi deploy cần build lại image frontend.

## Cấu trúc thư mục

```
backend/                     Spring Boot
  Dockerfile, .dockerignore
  src/main/java/com/meridian/
    auth/        — đăng ký/đăng nhập/refresh/me + DTO
    rbac/        — entity + service phân giải quyền theo context
    catalog/     — category/course/section/enrollment
    question/    — ngân hàng câu hỏi (8 loại) + passage
    quiz/        — quiz/page/attempt + chấm điểm + anti-cheat
    gradebook/   — chấm tay + audit + báo cáo
    admin/       — config site, thông báo, notification, bulk user
    portal/      — hồ sơ giáo viên, phiếu tư vấn (public portal)
    security/    — JwtService, JwtAuthenticationFilter, principal
    config/      — SecurityConfig, properties, DataInitializer (seed)
    user/        — User entity + repository
    common/      — ApiException, GlobalExceptionHandler, Slugs
  src/main/resources/db/migration/  — Flyway V1..V11
  src/test/java/com/meridian/       — JUnit tests (unit, mock-based)

frontend/                    Next.js
  Dockerfile, .dockerignore
  public/audio/  — audio placeholder cho demo Listening
  src/app/       — trang chủ, /courses, /login, /dashboard, /grades,
                   /quiz/[attemptId] (giao diện thi), /teacher/questions,
                   /admin/settings, /admin/courses(+[id]), /admin/quizzes/[id]
  src/lib/       — api client, types, useTheme, format
  src/store/     — Zustand auth store (kèm token auto-refresh)
  src/components/ — Logo, ThemeToggle, NotificationBell, CourseCard, SiteHeader
  _design/       — bản thiết kế hi-fi gốc (19 màn) + handoff doc

docker-compose.yml           Postgres (dev)
docker-compose.prod.yml      Full-stack (postgres + backend + frontend)
```

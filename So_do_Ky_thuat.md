# Sơ đồ kỹ thuật — Anh ngữ Meridian

*Dành cho đội kỹ thuật: kiến trúc backend, mô hình dữ liệu, route, luồng dữ liệu API. Bản dành cho BA/phi kỹ thuật (không có tên package/class/route/ERD) xem [So_do_Tong_Quat_Nghiep_Vu.md](./So_do_Tong_Quat_Nghiep_Vu.md). Bao quát cả nền tảng hiện có (Phase 1–9, production) và phần mở rộng đang lên kế hoạch (Phase 10–20, đánh dấu 🔜). Route/package/bảng đối chiếu trực tiếp mã nguồn tại thời điểm viết. Cú pháp [Mermaid](https://mermaid.js.org/) — hiện trực tiếp trên GitHub/VS Code/Obsidian; nếu không, dán vào [mermaid.live](https://mermaid.live).*

---

## 1. Kiến trúc Backend (14 package hiện có + 4 package kế hoạch)

```mermaid
flowchart LR
    subgraph Existing["Package hiện có (com.meridian.*)"]
        direction TB
        E1["auth<br/>AuthController/Service"]
        E2["rbac<br/>RbacController/Service,<br/>PermissionService, ContextService"]
        E3["catalog<br/>CatalogAdmin/PublicController,<br/>CatalogService, EnrollmentService"]
        E4["question<br/>QuestionBankController,<br/>QuestionService, TaxonomyService,<br/>QuestionBankExportService"]
        E5["quiz<br/>QuizAdmin/PlayerController,<br/>QuizService, AttemptService,<br/>GradingService"]
        E6["gradebook<br/>GradebookController,<br/>ReportService, GradingAdminService"]
        E7["admin<br/>Config/Announcement/<br/>NotificationController+Service"]
        E8["portal<br/>PortalPublicController,<br/>PortalService, InquiryAdminController"]
        E9["roster<br/>Admin/TeacherRosterController,<br/>RosterService"]
        E10["media<br/>MediaController/Service"]
        E11["security<br/>JWT filter,<br/>CurrentUserProvider"]
        E12["user, common, config<br/>(hạ tầng dùng chung)"]
    end

    subgraph New["🔜 Package kế hoạch"]
        direction TB
        N1["family<br/>FamilyService (parent-child)"]
        N2["lesson<br/>LessonService (video+luyện tập,<br/>mở khóa tuần tự)"]
        N3["pronunciation<br/>PronunciationService<br/>(gọi API bên thứ 3)"]
        N4["gamification<br/>GamificationService<br/>(điểm thưởng, leaderboard)"]
    end

    N1 -.mẫu hình từ.-> E9
    N2 -.tái dùng.-> E3
    N4 -.mẫu hình từ.-> E6
```

---

## 2. Route map (Next.js App Router — path chính xác)

```mermaid
flowchart TD
    Root["frontend/src/app"] --> Public
    Root --> Student
    Root --> Teacher
    Root --> Admin
    Root --> Future["🔜 Kế hoạch"]

    subgraph Public["Công khai"]
        PU1["/"]
        PU2["/courses<br/>/courses/[id]"]
        PU3["/login"]
    end

    subgraph Student["Học sinh (đăng nhập)"]
        ST1["/dashboard"]
        ST2["/quiz/[attemptId]"]
        ST3["/grades"]
    end

    subgraph Teacher["Giáo viên"]
        TE1["/teacher/questions<br/>/teacher/questions/new<br/>/teacher/questions/[id]"]
        TE2["/teacher/students<br/>/teacher/students/[id]"]
    end

    subgraph Admin["Admin"]
        AD1["/admin/courses<br/>/admin/courses/[id]"]
        AD2["/admin/quizzes/[id]"]
        AD3["/admin/users"]
        AD4["/admin/students<br/>/admin/students/[id]"]
        AD5["/admin/settings"]
    end

    subgraph Future["🔜 Kế hoạch"]
        FU1["/parent/*"]
        FU2["/vao-hoc/*"]
        FU3["/lesson/[id]"]
        FU4["/games/*"]
    end
```

---

## 3. Mô hình dữ liệu (nhóm theo migration Flyway, 17 migration hiện có + kế hoạch)

```mermaid
flowchart TB
    subgraph M1["V1–V2"]
        T1["users, roles, capabilities,<br/>role_capabilities, role_assignments,<br/>contexts"]
    end
    subgraph M2["V3–V4"]
        T2["course_categories, courses,<br/>course_sections, enrollments,<br/>exam_templates"]
    end
    subgraph M3["V5"]
        T3["question_categories, questions,<br/>question_options, question_matching_pairs,<br/>question_cloze_subanswers, question_dragdrop_*,<br/>question_tags, passages"]
    end
    subgraph M4["V6"]
        T4["quizzes, quiz_pages, quiz_questions,<br/>quiz_attempts, quiz_attempt_answers,<br/>quiz_attempt_logs"]
    end
    subgraph M5["V7"]
        T5["grade_history"]
    end
    subgraph M6["V8"]
        T6["web_configurations,<br/>system_announcements, notifications"]
    end
    subgraph M7["V9"]
        T7["teacher_profiles,<br/>contact_inquiries"]
    end
    subgraph M8["V14"]
        T8["teacher_student_assignments"]
    end
    subgraph M9["✅ V17 (MVP tháng 7, đã triển khai)"]
        T9["question_categories.audience,<br/>course_categories.audience_group,<br/>course_sections.video_url"]
    end
    subgraph M10["🔜 V18+ kế hoạch (v2 — xem ERD chi tiết bên dưới)"]
        T10["parent_child_profiles,<br/>lesson_progress,<br/>points_ledger, badges, user_badges"]
    end

    T1 --> T2
    T1 --> T3
    T2 --> T4
    T3 --> T4
    T4 --> T5
    T1 --> T8
    T3 -.mở rộng.-> T9
    T2 -.mở rộng.-> T9
    T1 -.mẫu hình.-> T10
    T2 -.tái dùng.-> T10
```

*V10–V13, V15–V16 là migration chỉnh sửa nhỏ (đổi đăng nhập sang username, thêm sort order, thêm trường giải thích câu hỏi, thêm cấu hình trang chủ) — không tạo module dữ liệu mới nên không tách riêng.*

### 3.1. ERD chi tiết — các bảng còn lại cho v2 (Phase 11 hồ sơ phụ huynh, Phase 19 game hóa)

*Vẽ theo Task #4 của Phase 10 ([Ke_hoach_Mo_rong_Tre_em_va_Tieu_hoc_V1.md](./Ke_hoach_Mo_rong_Tre_em_va_Tieu_hoc_V1.md)). Không vẽ lại `lesson`/`lesson_progress` riêng cho Phase 12 — xem ghi chú "Quyết định kiến trúc" ngay dưới đây, lý do không cần bảng `lesson` mới.*

```mermaid
erDiagram
    users ||--o{ parent_child_profiles : "là phụ huynh (parent_id)"
    users ||--o{ parent_child_profiles : "là hồ sơ con (child_id)"
    users ||--o{ lesson_progress : "hoàn thành (user_id)"
    course_sections ||--o{ lesson_progress : "được đánh dấu qua (section_id)"
    users ||--o{ points_ledger : "tích/tiêu điểm (user_id)"
    users ||--o{ user_badges : "đạt được (user_id)"
    badges ||--o{ user_badges : "trao qua (badge_id)"

    users {
        uuid id PK
        string username
    }
    course_sections {
        bigint id PK
        bigint course_id FK
        string video_url "đã có từ V17 (MVP)"
    }
    parent_child_profiles {
        bigint id PK
        uuid parent_id FK
        uuid child_id FK
        timestamp created_at
    }
    lesson_progress {
        bigint id PK
        uuid user_id FK
        bigint section_id FK
        timestamp completed_at
        timestamp created_at
    }
    points_ledger {
        bigint id PK
        uuid user_id FK
        int delta "cộng/trừ điểm, âm khi đổi thưởng"
        string reason "vd GAME_MEMORY_WIN, REDEEM_BADGE"
        string reference_type "nullable, vd game_session"
        bigint reference_id "nullable"
        timestamp created_at
    }
    badges {
        bigint id PK
        string code UK
        string name
        text description
        string icon_url
        int points_cost "nullable, null nếu không đổi bằng điểm"
        timestamp created_at
    }
    user_badges {
        bigint id PK
        uuid user_id FK
        bigint badge_id FK
        timestamp earned_at
    }
```

**Quyết định kiến trúc — không tạo bảng `lesson` mới cho Phase 12:** kế hoạch gốc đề xuất 1 entity `Lesson` riêng dưới `CourseSection`. Nhưng MVP tháng 7 (đã triển khai production) đã dùng thẳng `CourseSection` làm đơn vị "bài học" (thêm cột `video_url` trực tiếp, 1 section = 1 bài). Vì thực tế đã chạy đúng mô hình này, v2 **tiếp tục dùng `CourseSection` làm bài học**, không tạo `Lesson` trùng lặp — chỉ thêm bảng `lesson_progress` (mô phỏng `quiz_attempts`) để lưu trạng thái hoàn thành + tính logic mở khóa tuần tự (section N mở khi có `lesson_progress` cho section N-1, tính lúc truy vấn — không lưu cờ khóa/mở riêng để tránh dữ liệu cũ sai lệch).

**Điểm cần chốt khi code Phase 12:** thời điểm ghi `lesson_progress.completed_at` — đề xuất: tự động đánh dấu hoàn thành ngay khi học sinh **nộp bài luyện tập** (`QuizAttempt` của quiz gắn với section đó chuyển sang `SUBMITTED`/`GRADED`, không yêu cầu điểm tối thiểu vì đây là luyện tập chứ không phải bài thi). Với bài chỉ có video không có luyện tập, cần thêm 1 nút "Hoàn thành" gọi API đánh dấu trực tiếp.

**Không tạo bảng leaderboard riêng:** tính bảng xếp hạng bằng truy vấn `SUM(delta) GROUP BY user_id` trên `points_ledger` tại thời điểm đọc, tránh đồng bộ 2 nguồn dữ liệu. Nếu sau này số liệu lớn ảnh hưởng hiệu năng mới cân nhắc thêm bảng tổng hợp/cache.

**Đối chiếu không xung đột schema hiện có (Task #5 Phase 10):** `parent_child_profiles`/`lesson_progress`/`points_ledger`/`badges`/`user_badges` là tên bảng mới, không trùng bảng nào trong 17 migration hiện có. `parent_id`/`child_id`/`user_id` đều FK vào `users.id` (UUID) theo đúng kiểu khóa chính hiện tại — không cần đổi kiểu dữ liệu ở bảng `users`.

---

## 4. Kiến trúc hệ thống mở rộng — chi tiết luồng dữ liệu (Frontend/Backend/DB/External)

```mermaid
flowchart TB
    subgraph FE["Frontend — Next.js"]
        FE1["Trang phụ huynh (🔜)"]
        FE2["Trang Vào học 3 cấp (🔜)"]
        FE3["Trang buổi học: video +<br/>luyện tập + ghi âm (🔜)"]
        FE4["Trang game (🔜 — riêng Tiểu học)"]
        FE5["Trang quản trị câu hỏi<br/>trẻ em (🔜)"]
    end

    subgraph BE["Backend — Spring Boot"]
        BE1["AuthService / RBAC<br/>(có sẵn — thêm role parent)"]
        BE2["FamilyService (🔜)"]
        BE3["CatalogService<br/>(có sẵn — tái dùng nguyên)"]
        BE4["LessonService (🔜)"]
        BE5["QuestionService /<br/>GradingService (có sẵn —<br/>mở rộng audience + ảnh)"]
        BE6["MediaService<br/>(có sẵn — thêm video)"]
        BE7["PronunciationService (🔜)"]
        BE8["GamificationService (🔜)"]
        BE9["ReportService<br/>(có sẵn — mở rộng phụ huynh)"]
    end

    subgraph EXT["Bên ngoài"]
        EXT1["API chấm điểm phát âm<br/>(Azure / SpeechAce / SoapBox...)"]
    end

    subgraph DB["PostgreSQL"]
        DB1["users, roles,<br/>role_assignments"]
        DB2["parent_child_profiles (🔜)"]
        DB3["question_categories,<br/>questions (+audience)"]
        DB4["lessons, lesson_progress (🔜)"]
        DB5["points_ledger, badges (🔜)"]
    end

    FE1 --> BE2
    FE2 --> BE3
    FE2 --> BE4
    FE3 --> BE4
    FE3 --> BE5
    FE3 --> BE6
    FE3 --> BE7
    FE4 --> BE8

    BE2 --> DB1
    BE2 --> DB2
    BE3 --> DB1
    BE4 --> DB4
    BE5 --> DB3
    BE7 --> EXT1
    BE8 --> DB5
    BE9 --> DB4
```

---

## 5. Sequence diagram: chấm điểm phát âm (Phase 17 🔜)

```mermaid
sequenceDiagram
    participant HS as Học sinh (trình duyệt)
    participant FE as Frontend
    participant BE as PronunciationService
    participant API as Nhà cung cấp bên thứ 3
    participant DB as Database

    HS->>FE: Bấm ghi âm, đọc câu mẫu (≤15 giây)
    FE->>FE: Ghi âm qua MediaRecorder API
    HS->>FE: Bấm dừng ghi
    FE->>BE: Gửi file audio + câu mẫu
    BE->>API: Gọi API chấm điểm (1 lượt = 1 lần tính phí)
    API-->>BE: Trả điểm phát âm (theo âm vị/âm tiết)
    BE->>DB: Lưu điểm vào hồ sơ học viên
    BE-->>FE: Trả kết quả
    FE-->>HS: Hiển thị điểm + phản hồi

    opt Học sinh thử lại (trong giới hạn so_lan_thu_lai)
        HS->>FE: Ghi âm lại
        FE->>BE: Gửi lại file audio mới
        BE->>API: Gọi API chấm điểm (LƯỢT MỚI — tính phí lần nữa)
        API-->>BE: Trả điểm
    end
```

*Chi tiết giá theo lượt gọi API: xem [Tom_tat_Chi_phi_va_Deadline_Mo_rong_Tre_em_Tieu_hoc.md](./Tom_tat_Chi_phi_va_Deadline_Mo_rong_Tre_em_Tieu_hoc.md) mục 3.*

---

## 6. Sequence diagram: xuất/nhập ngân hàng câu hỏi (đã triển khai)

```mermaid
sequenceDiagram
    participant Admin as Admin/Giáo viên
    participant FE as Frontend
    participant BE as QuestionBankExportService
    participant Disk as Ổ đĩa uploads/

    Admin->>FE: Bấm "Xuất" ở 1 danh mục
    FE->>BE: GET .../categories/{id}/export
    BE->>BE: Quét stem/passage tìm link media,<br/>thay bằng token {{MEDIA:...}}
    BE->>Disk: Đọc file ảnh/audio tham chiếu
    BE-->>FE: Trả về file .zip (manifest.json + media/)
    FE-->>Admin: Tải file .zip về máy

    Admin->>FE: Bấm "Nhập", chọn file .zip
    FE->>BE: POST .../import (multipart)
    BE->>BE: Đọc manifest.json,<br/>kiểm tra trùng theo tên trong danh mục đích
    BE->>Disk: Ghi lại file media (UUID mới)
    BE->>BE: Thay token bằng URL mới,<br/>gọi QuestionService.createQuestion()
    BE-->>FE: Trả ImportSummaryDto<br/>(số tạo mới/tái dùng/bỏ qua)
```

---

## Ghi chú

- Mọi tên package/class/route/bảng dữ liệu ở trên đối chiếu trực tiếp mã nguồn tại thời điểm viết — nếu code thay đổi sau này, cần cập nhật lại sơ đồ.
- Phần đánh dấu 🔜 **chưa tồn tại trong mã nguồn** — là thiết kế đề xuất, có thể đổi khi vào Phase 10 (chốt schema).
- Bản dành cho BA/phi kỹ thuật (luồng trải nghiệm người dùng, không có thuật ngữ code): [So_do_Tong_Quat_Nghiep_Vu.md](./So_do_Tong_Quat_Nghiep_Vu.md).

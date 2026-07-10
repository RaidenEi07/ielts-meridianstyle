# Sơ đồ tổng thể toàn dự án — Anh ngữ Meridian

*Bao quát **toàn bộ hệ thống**: nền tảng hiện có (Phase 1–9, đã hoàn thành, đang chạy production) + hướng mở rộng Trẻ em/Tiểu học (Phase 10–20, đang lên kế hoạch). Sơ đồ riêng chỉ về phần mở rộng xem [So_do_Luong_Du_an_Mo_rong_Tre_em_Tieu_hoc.md](./So_do_Luong_Du_an_Mo_rong_Tre_em_Tieu_hoc.md). Danh sách route/package dưới đây đối chiếu trực tiếp với mã nguồn hiện tại (không phải nhớ lại) — chính xác tại thời điểm viết. Cú pháp [Mermaid](https://mermaid.js.org/) — hiện trực tiếp trên GitHub/VS Code/Obsidian; nếu không, dán vào [mermaid.live](https://mermaid.live).*

---

## 1. Bức tranh toàn cảnh

```mermaid
flowchart TB
    subgraph DONE["✅ Nền tảng hiện có — Phase 1–9 (production)"]
        D1["Auth + RBAC<br/>(context-based, kế thừa quyền)"]
        D2["Catalog: Danh mục →<br/>Khóa học → Section → Ghi danh"]
        D3["Ngân hàng câu hỏi<br/>8 loại + Passage + Tag"]
        D4["Quiz Engine: Page,<br/>Attempt, chấm điểm, anti-cheat"]
        D5["Gradebook + Report<br/>(admin/giáo viên/học sinh)"]
        D6["Admin Tools: Config,<br/>Announcement, Notification"]
        D7["Public Portal:<br/>trang chủ, giáo viên, liên hệ"]
        D8["Roster: giáo viên ↔<br/>học sinh được gán"]
        D9["Xuất/Nhập ngân hàng<br/>câu hỏi theo danh mục"]
    end

    subgraph PLANNED["🔜 Mở rộng Trẻ em & Tiểu học — Phase 10–20 (kế hoạch)"]
        P1["MVP tháng 7:<br/>điều hướng + video cơ bản + luyện tập"]
        P2["v2: Phụ huynh + hồ sơ con"]
        P3["v2: Ghi âm + chấm điểm<br/>phát âm (API bên thứ 3)"]
        P4["v2: Lồng tiếng (Trẻ em) /<br/>Game hóa (Tiểu học)"]
    end

    D1 -.nền tảng dùng chung.-> P1
    D2 -.tái dùng Category/Course/Section.-> P1
    D3 -.tái dùng MATCHING/DRAG_DROP_TEXT.-> P1
    D8 -.mẫu hình cho parent_child_profiles.-> P2
```

**Ý nghĩa:** phần "Đã có" chạy độc lập, không đổi hành vi khi mở rộng. Phần "Kế hoạch" xây thêm bên cạnh, tái dùng tối đa 4 khối đã đánh dấu mũi tên chấm.

---

## 2. Sitemap Frontend đầy đủ (đối chiếu trực tiếp mã nguồn)

```mermaid
flowchart TD
    Root["Anh ngữ Meridian"] --> Public
    Root --> Student
    Root --> Teacher
    Root --> Admin
    Root --> Future["🔜 Mở rộng (kế hoạch)"]

    subgraph Public["Công khai"]
        PU1["/ — trang chủ marketing"]
        PU2["/courses, /courses/[id]"]
        PU3["/login"]
    end

    subgraph Student["Học sinh (đăng nhập)"]
        ST1["/dashboard"]
        ST2["/quiz/[attemptId] — làm bài"]
        ST3["/grades — điểm số"]
    end

    subgraph Teacher["Giáo viên"]
        TE1["/teacher/questions (+new, [id])"]
        TE2["/teacher/students, [id]"]
    end

    subgraph Admin["Admin"]
        AD1["/admin/courses, [id]"]
        AD2["/admin/quizzes/[id]"]
        AD3["/admin/users"]
        AD4["/admin/students, [id]"]
        AD5["/admin/settings"]
    end

    subgraph Future["🔜 Kế hoạch"]
        FU1["/parent/* — đăng ký, hồ sơ con"]
        FU2["/vao-hoc/* — điều hướng 3 cấp"]
        FU3["/lesson/[id] — buổi học"]
        FU4["/games/* — riêng Tiểu học"]
    end
```

---

## 3. Kiến trúc Backend đầy đủ (14 package hiện có + 4 package kế hoạch)

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

## 4. Mô hình dữ liệu tổng thể (nhóm theo module, 16 migration hiện có + kế hoạch)

```mermaid
flowchart TB
    subgraph M1["V1–V2 — RBAC"]
        T1["users, roles, capabilities,<br/>role_capabilities, role_assignments,<br/>contexts"]
    end
    subgraph M2["V3–V4 — Catalog"]
        T2["course_categories, courses,<br/>course_sections, enrollments,<br/>exam_templates"]
    end
    subgraph M3["V5 — Ngân hàng câu hỏi"]
        T3["question_categories, questions,<br/>question_options, question_matching_pairs,<br/>question_cloze_subanswers, question_dragdrop_*,<br/>question_tags, passages"]
    end
    subgraph M4["V6 — Quiz Engine"]
        T4["quizzes, quiz_pages, quiz_questions,<br/>quiz_attempts, quiz_attempt_answers,<br/>quiz_attempt_logs"]
    end
    subgraph M5["V7 — Gradebook"]
        T5["grade_history"]
    end
    subgraph M6["V8 — Admin Tools"]
        T6["web_configurations,<br/>system_announcements, notifications"]
    end
    subgraph M7["V9 — Public Portal"]
        T7["teacher_profiles,<br/>contact_inquiries"]
    end
    subgraph M8["V14 — Roster"]
        T8["teacher_student_assignments"]
    end
    subgraph M9["🔜 Kế hoạch — Family/Lesson/Gamification"]
        T9["parent_child_profiles,<br/>lessons, lesson_progress,<br/>points_ledger, badges"]
    end

    T1 --> T2
    T1 --> T3
    T2 --> T4
    T3 --> T4
    T4 --> T5
    T1 --> T8
    T1 -.mẫu hình.-> T9
    T2 -.tái dùng.-> T9
```

*V10–V13, V15–V16 là các migration chỉnh sửa nhỏ (đổi sang đăng nhập bằng username, thêm sort order, thêm trường giải thích câu hỏi, thêm cấu hình trang chủ) — không tạo module dữ liệu mới nên không tách riêng ở đây.*

---

## 5. Luồng theo vai trò (4 lane — 3 hiện có + 1 kế hoạch)

```mermaid
flowchart LR
    subgraph HS["Học sinh"]
        HS1[Đăng ký/Đăng nhập] --> HS2[Ghi danh khóa học]
        HS2 --> HS3[Làm quiz: Reading/<br/>Listening/Writing]
        HS3 --> HS4[Xem điểm + giải thích]
    end

    subgraph GV["Giáo viên"]
        GV1[Soạn câu hỏi<br/>8 loại] --> GV2[Tạo quiz,<br/>import câu hỏi]
        GV2 --> GV3[Theo dõi học sinh<br/>được gán]
        GV3 --> GV4[Chấm tay Essay]
    end

    subgraph AD["Admin"]
        AD1[Quản lý khóa học<br/>+ danh mục] --> AD2[Quản lý tài khoản<br/>+ phân quyền]
        AD2 --> AD3[Cấu hình hệ thống<br/>+ thông báo]
        AD3 --> AD4[Xem phân tích<br/>toàn hệ thống]
    end

    subgraph PH["🔜 Phụ huynh (kế hoạch)"]
        PH1[Đăng ký] --> PH2[Tạo hồ sơ con]
        PH2 --> PH3[Chọn khóa cho con]
        PH3 --> PH4[Xem dashboard<br/>tiến độ con]
    end
```

---

## 6. Lịch sử & lộ trình phát triển

```mermaid
timeline
    title Anh ngữ Meridian — từ Phase 1 tới Phase 20
    section Đã hoàn thành (production)
        Phase 1–3 : Auth/RBAC : Catalog : Ngân hàng câu hỏi
        Phase 4–6 : Quiz Engine : Gradebook/Report : Admin Tools
        Phase 7–9 : Public Portal : IELTS exam UI + Listening : Test + Deploy
    section Sau ra mắt (tính năng bổ sung)
        Vừa xong : Xuất/Nhập ngân hàng câu hỏi theo danh mục
    section Kế hoạch mở rộng
        Phase 10 : Chốt yêu cầu + schema
        MVP tháng 7 : Điều hướng + Video cơ bản + Luyện tập
        Phase 11–15 : Phụ huynh : Điều hướng đầy đủ : Video đầy đủ : Ghi âm
        Phase 16–19 : Lồng tiếng : Chấm điểm phát âm : Dashboard PH : Game hóa
        Phase 20 : Kiểm thử + Ra mắt đầy đủ
```

---

## Ghi chú

- Route/package/bảng ở mục 2–4 đối chiếu trực tiếp với mã nguồn tại thời điểm viết (không phải liệt kê từ trí nhớ) — nếu có thay đổi sau này, cần cập nhật lại sơ đồ.
- Phần "🔜 Kế hoạch" trong mọi sơ đồ trên **chưa tồn tại trong mã nguồn** — là thiết kế đề xuất, có thể đổi khi vào Phase 10 (chốt schema).
- Chi tiết luồng riêng cho mở rộng Trẻ em/Tiểu học (MVP, v2, chấm điểm phát âm, timeline): xem [So_do_Luong_Du_an_Mo_rong_Tre_em_Tieu_hoc.md](./So_do_Luong_Du_an_Mo_rong_Tre_em_Tieu_hoc.md).
- Chi tiết kế hoạch/giá/deadline: [Ke_hoach_Mo_rong_Tre_em_va_Tieu_hoc_V1.md](./Ke_hoach_Mo_rong_Tre_em_va_Tieu_hoc_V1.md), [Tom_tat_Chi_phi_va_Deadline_Mo_rong_Tre_em_Tieu_hoc.md](./Tom_tat_Chi_phi_va_Deadline_Mo_rong_Tre_em_Tieu_hoc.md).

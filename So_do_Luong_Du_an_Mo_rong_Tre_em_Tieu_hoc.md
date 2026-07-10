# Sơ đồ luồng chi tiết: Mở rộng Trẻ em & Tiểu học

*Trực quan hóa [Ke_hoach_Mo_rong_Tre_em_va_Tieu_hoc_V1.md](./Ke_hoach_Mo_rong_Tre_em_va_Tieu_hoc_V1.md) — chỉ riêng phần mở rộng. Muốn xem sơ đồ **toàn bộ dự án** (cả nền tảng hiện có + phần mở rộng) xem [So_do_Tong_The_Toan_Du_an.md](./So_do_Tong_The_Toan_Du_an.md). Toàn bộ sơ đồ dùng cú pháp [Mermaid](https://mermaid.js.org/) — hiện đúng trên GitHub, VS Code (extension "Markdown Preview Mermaid Support"), Obsidian, GitLab. Nếu trình xem không hỗ trợ, dán khối code vào [mermaid.live](https://mermaid.live) để xem hình.*

---

## 1. Luồng người dùng tổng thể (phạm vi đầy đủ — v2)

Từ lúc phụ huynh vào web tới lúc xem báo cáo tiến độ — bao gồm cả 2 nhánh đặc thù riêng nhóm (lồng tiếng cho Trẻ em, game hóa cho Tiểu học).

```mermaid
flowchart TD
    A[Phụ huynh vào web] --> B[Đăng ký / Đăng nhập phụ huynh]
    B --> C["Tạo hồ sơ con<br/>(tên, ảnh, nhóm tuổi)"]
    C --> D[Chọn hồ sơ con đang hoạt động]
    D --> E["Cấp 1: Trẻ em / Tiểu học / IELTS"]
    E --> F["Cấp 2: Danh sách khóa<br/>(vd. Seed 1, Movers...)"]
    F --> G["Cấp 3: Trang chi tiết khóa<br/>(banner, % hoàn thành, danh sách buổi)"]
    G --> H{Buổi học đã mở khóa?}
    H -- Chưa, phải học buổi trước --> G
    H -- Rồi --> I["Xem video mẫu<br/>(phụ đề + tua theo đoạn)"]
    I --> J[Luyện từ vựng: ghép tranh]
    I --> K[Luyện cấu trúc câu: sắp xếp từ]
    J --> L{Buổi này có<br/>phần ghi âm?}
    K --> L
    L -- Có --> M[Ghi âm đọc theo câu mẫu]
    M --> N["Gửi chấm điểm phát âm<br/>(API bên thứ 3)"]
    N --> O[Xem điểm + phản hồi ngay]
    L -- Không --> P[Hoàn thành buổi học]
    O --> P
    P --> Q[Mở khóa buổi tiếp theo]
    Q --> R{Nhóm Trẻ em?}
    R -- Có --> S["Lồng tiếng nhân vật<br/>(tắt thoại gốc, ghi đè giọng con)"]
    S --> S2[Xuất file video + audio hoàn chỉnh]
    R -- Không --> T{Nhóm Tiểu học?}
    T -- Có --> U[Khu vực Game: chọn chế độ chơi]
    U --> V["Ghi điểm thưởng<br/>lên bảng xếp hạng"]
    V --> V2["Đổi điểm lấy vật phẩm<br/>avatar / huy hiệu"]
    S2 --> W[Phụ huynh xem Dashboard tiến độ]
    V2 --> W
    T -- Không --> W
```

---

## 2. Luồng MVP tháng 7 (phạm vi rút gọn, ra mắt thật đầu tiên)

Đối chiếu với sơ đồ 1 — cắt hẳn nhánh phụ huynh/hồ sơ con, ghi âm, lồng tiếng, chấm điểm phát âm, game hóa. Chi tiết phạm vi xem [Tom_tat_Chi_phi_va_Deadline_Mo_rong_Tre_em_Tieu_hoc.md](./Tom_tat_Chi_phi_va_Deadline_Mo_rong_Tre_em_Tieu_hoc.md) mục 0.

```mermaid
flowchart TD
    A2["Học sinh vào web<br/>(dùng tài khoản có sẵn — chưa có tầng phụ huynh)"] --> B2["Cấp 1: Trẻ em / Tiểu học"]
    B2 --> C2[Cấp 2: Danh sách khóa]
    C2 --> D2["Cấp 3: Danh sách bài<br/>(không banner/tìm kiếm/%/mở khóa tuần tự)"]
    D2 --> E2[Chọn 1 bài bất kỳ]
    E2 --> F2["Xem video cơ bản<br/>(không phụ đề/tua đoạn)"]
    F2 --> G2[Luyện từ vựng: ghép tranh]
    F2 --> H2[Luyện cấu trúc câu: sắp xếp từ]
    G2 --> I2[Hoàn thành bài — kết thúc]
    H2 --> I2

    classDef cut fill:none,stroke-dasharray: 5 5
```

**Phần bị cắt so với v2** (không xuất hiện trong sơ đồ trên): tạo hồ sơ con, mở khóa tuần tự, phụ đề/tua video, ghi âm, chấm điểm phát âm, lồng tiếng, game hóa, dashboard phụ huynh — toàn bộ dời sang v2.

---

## 3. Điều hướng "Vào học" 3 cấp — chi tiết đầy đủ tên khóa

```mermaid
flowchart LR
    Start["Vào học"] --> N1["Trẻ em<br/>3–6 tuổi"]
    Start --> N2["Tiểu học<br/>7–11 tuổi"]
    Start --> N3[IELTS]

    N1 --> S1[Seed 1]
    N1 --> S2[Seed 2]

    N2 --> T1[Pre-Starter]
    N2 --> T2[Starters 1]
    N2 --> T3[Starters 2]
    N2 --> T4[Starters Intensive]
    N2 --> T5[Movers]
    N2 --> T6[Movers Intensive]
    N2 --> T7[Flyers]

    N3 --> I1["Khóa IELTS hiện có<br/>(danh sách cụ thể trong điều hướng mới — cần chốt, mục 2 kế hoạch chính)"]

    S1 --> D["Trang chi tiết khóa<br/>(Cấp 3 — xem sơ đồ 1)"]
    T5 --> D
    I1 --> D
```

---

## 4. Kiến trúc hệ thống — thành phần có sẵn (tái dùng) vs xây mới

```mermaid
flowchart TB
    subgraph FE["Frontend — Next.js"]
        FE1["Trang phụ huynh<br/>(MỚI)"]
        FE2["Trang Vào học 3 cấp<br/>(MỚI)"]
        FE3["Trang buổi học: video +<br/>luyện tập + ghi âm (MỚI)"]
        FE4["Trang game<br/>(MỚI — riêng Tiểu học)"]
        FE5["Trang quản trị câu hỏi<br/>trẻ em (MỚI)"]
    end

    subgraph BE["Backend — Spring Boot"]
        BE1["AuthService / RBAC<br/>(có sẵn — thêm role parent)"]
        BE2["FamilyService<br/>(MỚI)"]
        BE3["CatalogService<br/>(có sẵn — tái dùng nguyên)"]
        BE4["LessonService<br/>(MỚI)"]
        BE5["QuestionService /<br/>GradingService (có sẵn —<br/>mở rộng audience + ảnh)"]
        BE6["MediaService<br/>(có sẵn — thêm video)"]
        BE7["PronunciationService<br/>(MỚI)"]
        BE8["GamificationService<br/>(MỚI)"]
        BE9["ReportService<br/>(có sẵn — mở rộng phụ huynh)"]
    end

    subgraph EXT["Bên ngoài"]
        EXT1["API chấm điểm phát âm<br/>(Azure / SpeechAce / SoapBox...)"]
    end

    subgraph DB["PostgreSQL"]
        DB1["users, roles,<br/>role_assignments"]
        DB2["parent_child_profiles<br/>(MỚI)"]
        DB3["question_categories,<br/>questions (+audience)"]
        DB4["lessons, lesson_progress<br/>(MỚI)"]
        DB5["points_ledger, badges<br/>(MỚI)"]
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

    classDef moi fill:#00000000,stroke-width:2px
    class FE1,FE2,FE3,FE4,FE5,BE2,BE4,BE7,BE8,DB2,DB4,DB5 moi
```

*Khối viền đậm = xây mới (MỚI); khối viền thường = tái dùng hệ thống hiện có. Toàn bộ nhóm IELTS/học sinh-sinh viên hiện tại chạy qua đúng các khối "có sẵn" này, không đổi hành vi.*

---

## 5. Luồng chi tiết: Chấm điểm phát âm (Phase 17) — vì đây là nơi phát sinh chi phí thật

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
        Note over BE,API: Xem bảng giá/lượt tại Tom_tat_Chi_phi_va_Deadline mục 3
    end
```

---

## 6. Dòng thời gian: MVP tháng 7 + v2 (kịch bản chạy song song)

Dùng đúng ngày trung tâm đã tính trong [Tom_tat_Chi_phi_va_Deadline_Mo_rong_Tre_em_Tieu_hoc.md](./Tom_tat_Chi_phi_va_Deadline_Mo_rong_Tre_em_Tieu_hoc.md) — bắt đầu minh họa 13/07/2026, cần thay bằng ngày bắt đầu thực tế.

```mermaid
gantt
    title MVP tháng 7 + v2 (song song sau Phase 15)
    dateFormat YYYY-MM-DD
    excludes weekends

    section MVP (ra mắt ~29/07)
    Điều hướng tối giản           :mvp1, 2026-07-13, 3d
    Video cơ bản                  :mvp2, after mvp1, 2d
    Luyện tập (từ vựng + câu)     :mvp3, after mvp2, 5d
    Kiểm thử + triển khai         :mvp4, after mvp3, 2d

    section v2 — nền tảng đầy đủ
    Phase 11 Phụ huynh            :p11, after mvp4, 5d
    Phase 12 Hoàn thiện điều hướng :p12, after p11, 9d
    Phase 13 Hoàn thiện video     :p13, after p12, 6d
    Phase 14 Hoàn thiện luyện tập :p14, after p13, 8d
    Phase 15 Ghi âm               :p15, after p14, 5d

    section v2 — song song sau Phase 15
    Phase 16 Lồng tiếng (Trẻ em)  :p16, after p15, 13d
    Phase 17 Chấm điểm phát âm    :p17, after p15, 7d
    Phase 18 Dashboard phụ huynh  :p18, after p14, 5d
    Phase 19 Game hóa (Tiểu học)  :p19, after p15, 20d

    section Ra mắt v2
    Phase 20 Kiểm thử + ra mắt    :p20, after p19, 7d
```

**Đọc nhanh:** Phase 16/17/19 chạy cùng lúc (song song) sau khi Phase 15 xong; Phase 18 chèn vào ngay sau Phase 14, không nằm trên đường găng. Phase 20 chỉ bắt đầu khi cả 4 giai đoạn song song đều xong — bị giới hạn bởi Phase 19 (dài nhất).

---

## Ghi chú

- Tất cả sơ đồ trên phản ánh **điểm ước tính trung tâm** (không phải khoảng thấp–cao) — xem [Tom_tat_Chi_phi_va_Deadline_Mo_rong_Tre_em_Tieu_hoc.md](./Tom_tat_Chi_phi_va_Deadline_Mo_rong_Tre_em_Tieu_hoc.md) mục 4 về độ tin cậy của các con số thời gian.
- Sơ đồ 4 (kiến trúc hệ thống) là **đề xuất thiết kế**, chưa phải quyết định cuối — cần chốt cùng lúc với Phase 10 (thiết kế schema).
- Muốn xem hình trực quan ngay trong lúc trao đổi (không cần mở file): đã hiển thị 2 sơ đồ tóm tắt (điều hướng 3 cấp + kiến trúc hệ thống) ở phần trả lời trong chat.

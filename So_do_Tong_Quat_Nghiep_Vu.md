# Sơ đồ tổng quát nghiệp vụ — Anh ngữ Meridian

*Dành cho BA/phía sản phẩm: mô tả **luồng hoạt động, trải nghiệm người dùng, phạm vi chức năng** — không có tên package/class/route/bảng dữ liệu. Bản kỹ thuật (kiến trúc backend, ERD, sequence diagram) xem [So_do_Ky_thuat.md](./So_do_Ky_thuat.md). Bao quát cả nền tảng hiện có (đang chạy) và phần mở rộng đang lên kế hoạch (đánh dấu 🔜). Cú pháp [Mermaid](https://mermaid.js.org/) — hiện trực tiếp trên GitHub; nếu không, dán vào [mermaid.live](https://mermaid.live).*

---

## 1. Bức tranh toàn cảnh — các nhóm chức năng

```mermaid
flowchart TB
    subgraph DONE["✅ Đang hoạt động (dành cho học sinh/sinh viên luyện IELTS)"]
        D1["Đăng nhập & phân quyền<br/>(học sinh / giáo viên / admin)"]
        D2["Danh mục & khóa học"]
        D3["Ngân hàng câu hỏi<br/>(8 dạng bài tập)"]
        D4["Làm bài thi<br/>(Reading/Listening/Writing)"]
        D5["Bảng điểm & báo cáo"]
        D6["Công cụ quản trị<br/>(cấu hình, thông báo)"]
        D7["Trang giới thiệu công khai"]
        D8["Giáo viên theo dõi<br/>học sinh được gán"]
        D9["Xuất/nhập câu hỏi<br/>giữa các môi trường"]
    end

    subgraph PLANNED["🔜 Đang lên kế hoạch (dành cho Trẻ em & Tiểu học)"]
        P1["MVP tháng 7:<br/>chọn khóa, xem video, luyện tập"]
        P2["Tài khoản phụ huynh<br/>quản lý nhiều con"]
        P3["Ghi âm + chấm điểm<br/>phát âm tự động"]
        P4["Lồng tiếng nhân vật (Trẻ em) /<br/>Chơi game kiếm thưởng (Tiểu học)"]
    end

    D2 -.dùng lại cách tổ chức khóa học.-> P1
    D3 -.dùng lại cách chấm bài tập.-> P1
    D8 -.dùng lại cách 1 người quản lý nhiều người.-> P2
```

**Ý nghĩa:** phần "Đang hoạt động" không đổi gì khi triển khai phần mở rộng — 2 nhóm chạy song song, chỉ 3 chỗ có mũi tên chấm là tận dụng lại cách làm đã có.

---

## 2. Các màn hình chính người dùng thấy (theo vai trò)

```mermaid
flowchart TD
    Root["Anh ngữ Meridian"] --> Public
    Root --> Student
    Root --> Teacher
    Root --> Admin
    Root --> Future["🔜 Mở rộng"]

    subgraph Public["Ai cũng xem được"]
        PU1["Trang chủ giới thiệu"]
        PU2["Danh sách & chi tiết khóa học"]
        PU3["Đăng nhập"]
    end

    subgraph Student["Học sinh"]
        ST1["Trang cá nhân sau đăng nhập"]
        ST2["Màn hình làm bài thi"]
        ST3["Bảng điểm của tôi"]
    end

    subgraph Teacher["Giáo viên"]
        TE1["Soạn & quản lý câu hỏi"]
        TE2["Danh sách học sinh được gán"]
    end

    subgraph Admin["Admin"]
        AD1["Quản lý khóa học"]
        AD2["Quản lý 1 kỳ thi/bài kiểm tra"]
        AD3["Quản lý tài khoản"]
        AD4["Theo dõi toàn bộ học sinh"]
        AD5["Cấu hình hệ thống"]
    end

    subgraph Future["🔜 Mở rộng"]
        FU1["Khu vực phụ huynh"]
        FU2["Trang Vào học — chọn nhóm/khóa"]
        FU3["Màn hình 1 buổi học"]
        FU4["Khu vực trò chơi"]
    end
```

---

## 3. Luồng theo vai trò (3 vai trò hiện có + 1 vai trò kế hoạch)

```mermaid
flowchart LR
    subgraph HS["Học sinh"]
        HS1[Đăng ký/Đăng nhập] --> HS2[Ghi danh khóa học]
        HS2 --> HS3[Làm bài thi]
        HS3 --> HS4[Xem điểm + giải thích]
    end

    subgraph GV["Giáo viên"]
        GV1[Soạn câu hỏi] --> GV2[Tạo đề thi,<br/>chọn câu hỏi có sẵn]
        GV2 --> GV3[Theo dõi học sinh<br/>được gán]
        GV3 --> GV4[Chấm tay phần viết]
    end

    subgraph AD["Admin"]
        AD1[Quản lý khóa học<br/>+ danh mục] --> AD2[Quản lý tài khoản<br/>+ phân quyền]
        AD2 --> AD3[Cấu hình hệ thống<br/>+ thông báo]
        AD3 --> AD4[Xem báo cáo<br/>toàn hệ thống]
    end

    subgraph PH["🔜 Phụ huynh (kế hoạch)"]
        PH1[Đăng ký] --> PH2[Tạo hồ sơ con]
        PH2 --> PH3[Chọn khóa cho con]
        PH3 --> PH4[Xem tiến độ học của con]
    end
```

---

## 4. Luồng trải nghiệm đầy đủ — Trẻ em & Tiểu học (🔜 v2)

```mermaid
flowchart TD
    A[Phụ huynh vào web] --> B[Đăng ký / Đăng nhập]
    B --> C["Tạo hồ sơ con<br/>(tên, ảnh, nhóm tuổi)"]
    C --> D[Chọn hồ sơ con đang hoạt động]
    D --> E["Chọn nhóm: Trẻ em / Tiểu học / IELTS"]
    E --> F["Chọn khóa học cụ thể"]
    F --> G["Xem thông tin khóa + tiến độ đã học"]
    G --> H{Buổi học đã mở khóa?}
    H -- Chưa, phải học buổi trước --> G
    H -- Rồi --> I["Xem video mẫu"]
    I --> J[Luyện từ vựng: ghép tranh]
    I --> K[Luyện cấu trúc câu: sắp xếp từ]
    J --> L{Buổi này có<br/>phần luyện nói?}
    K --> L
    L -- Có --> M[Ghi âm đọc theo câu mẫu]
    M --> N[Hệ thống chấm điểm phát âm]
    N --> O[Xem điểm + phản hồi ngay]
    L -- Không --> P[Hoàn thành buổi học]
    O --> P
    P --> Q[Mở khóa buổi tiếp theo]
    Q --> R{Nhóm Trẻ em?}
    R -- Có --> S["Lồng tiếng nhân vật<br/>trong video"]
    S --> S2[Tải về file video có giọng của con]
    R -- Không --> T{Nhóm Tiểu học?}
    T -- Có --> U[Vào khu vực trò chơi]
    U --> V[Ghi điểm thưởng<br/>lên bảng xếp hạng]
    V --> V2[Đổi điểm lấy vật phẩm/huy hiệu]
    S2 --> W[Phụ huynh xem tiến độ]
    V2 --> W
    T -- Không --> W
```

---

## 5. Luồng trải nghiệm MVP tháng 7 (phạm vi ra mắt thật đầu tiên)

```mermaid
flowchart TD
    A2["Học sinh vào web<br/>(dùng tài khoản có sẵn)"] --> B2["Chọn nhóm: Trẻ em / Tiểu học"]
    B2 --> C2[Chọn khóa học]
    C2 --> D2["Xem danh sách bài học<br/>(đơn giản, chưa có tiến độ/tìm kiếm)"]
    D2 --> E2[Chọn 1 bài bất kỳ]
    E2 --> F2["Xem video mẫu<br/>(bản cơ bản)"]
    F2 --> G2[Luyện từ vựng: ghép tranh]
    F2 --> H2[Luyện cấu trúc câu: sắp xếp từ]
    G2 --> I2[Hoàn thành bài — kết thúc]
    H2 --> I2
```

**Phần chưa có ở MVP** (so với luồng đầy đủ ở mục 4): hồ sơ phụ huynh/con, mở khóa tuần tự theo tiến độ, phụ đề/tua video, luyện nói + chấm điểm phát âm, lồng tiếng, trò chơi, xem tiến độ cho phụ huynh — tất cả dời sang giai đoạn sau khi ra mắt.

---

## 6. Điều hướng "Vào học" — 3 bước chọn khóa

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

    N3 --> I1["Khóa IELTS hiện có<br/>(danh sách trong điều hướng mới cần chốt)"]

    S1 --> D["Trang chi tiết khóa học"]
    T5 --> D
    I1 --> D
```

---

## 7. Lộ trình phát triển (mốc thời gian, không đi vào chi tiết kỹ thuật)

```mermaid
gantt
    title MVP tháng 7 + phần mở rộng đầy đủ (kịch bản làm song song)
    dateFormat YYYY-MM-DD
    excludes weekends

    section MVP (ra mắt ~29/07)
    Chọn khóa, xem video, luyện tập cơ bản :mvp1, 2026-07-13, 12d

    section Sau ra mắt — nền tảng đầy đủ
    Tài khoản phụ huynh                :p11, after mvp1, 5d
    Hoàn thiện trải nghiệm chọn khóa   :p12, after p11, 9d
    Hoàn thiện video (phụ đề, tua đoạn) :p13, after p12, 6d
    Hoàn thiện luyện tập               :p14, after p13, 8d
    Luyện nói (ghi âm)                 :p15, after p14, 5d

    section Sau ra mắt — song song
    Lồng tiếng (riêng Trẻ em)          :p16, after p15, 13d
    Chấm điểm phát âm tự động          :p17, after p15, 7d
    Xem tiến độ cho phụ huynh          :p18, after p14, 5d
    Trò chơi + điểm thưởng (Tiểu học)  :p19, after p15, 20d

    section Ra mắt đầy đủ
    Kiểm thử + ra mắt                  :p20, after p19, 7d
```

*Chi tiết số ngày/deadline theo từng mốc: xem [Tom_tat_Chi_phi_va_Deadline_Mo_rong_Tre_em_Tieu_hoc.md](./Tom_tat_Chi_phi_va_Deadline_Mo_rong_Tre_em_Tieu_hoc.md).*

---

## Ghi chú

- Sơ đồ trên mô tả **trải nghiệm và luồng nghiệp vụ**, không phải cách hệ thống được xây (không có tên package/class/route/bảng dữ liệu) — dùng để trao đổi với các bên không rành kỹ thuật.
- Phần đánh dấu 🔜 là thiết kế đề xuất, chưa triển khai.
- Bản kỹ thuật tương ứng (kiến trúc, dữ liệu, luồng API): [So_do_Ky_thuat.md](./So_do_Ky_thuat.md).
- Kế hoạch/giá/deadline chi tiết: [Ke_hoach_Mo_rong_Tre_em_va_Tieu_hoc_V1.md](./Ke_hoach_Mo_rong_Tre_em_va_Tieu_hoc_V1.md), [Tom_tat_Kha_thi_Mo_rong_Tre_em_Tieu_hoc.md](./Tom_tat_Kha_thi_Mo_rong_Tre_em_Tieu_hoc.md).

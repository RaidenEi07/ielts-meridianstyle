# Handoff: Hệ thống Website Anh ngữ Meridian

## Tổng quan
Hệ thống website đầy đủ cho trung tâm luyện thi Anh ngữ / IELTS gồm 5 khu vực:
- **Trang công khai** — marketing, danh sách & chi tiết khóa học, đăng nhập/đăng ký  
- **Student Portal** — dashboard học viên, quản lý khóa học, xem điểm số  
- **Giao diện thi IELTS** — mô phỏng đúng chuẩn CDT (Reading split-pane, Listening, Writing)  
- **Teacher Portal** — ngân hàng câu hỏi, cấu hình quiz, quản lý lượt làm bài  
- **Admin Dashboard** — tổng quan hệ thống, quản lý user, RBAC, cấu hình  

Tên trung tâm **"Anh ngữ Meridian"** và toàn bộ nội dung là **placeholder** — cần thay bằng nội dung thật.

---

## Về file thiết kế

File `design_reference.html` là **bản mock hi-fidelity** tạo bằng HTML — dùng để tham chiếu giao diện, màu sắc, layout, typography và luồng tương tác. **Không copy trực tiếp vào production.** Nhiệm vụ của lập trình viên là **tái hiện các màn này trong codebase thực** (React / Next.js khuyến nghị) dùng component library và pattern đã có sẵn.

Mở file `design_reference.html` trong trình duyệt, dùng thanh 2 cấp ở đầu trang để chuyển qua lại giữa 19 màn.

---

## Mức độ hi-fidelity

**High-fidelity** — màu sắc, typography, khoảng cách, shadow, border-radius đều là giá trị cuối cùng. Lập trình viên cần tái hiện pixel-close dựa trên design tokens bên dưới.

---

## Design Tokens

### Màu sắc — Light Mode

| Token | Hex | Dùng cho |
|---|---|---|
| `--bg` | `#FBF8F3` | Nền trang (ấm, giấy) |
| `--surface` | `#FFFFFF` | Card, panel, input |
| `--card` | `#FBF8F3` | Card nội dung |
| `--soft` | `#F4EEE4` | Nền phụ, section xen kẽ |
| `--border` | `#ECE4D8` | Đường kẻ, viền |
| `--text` | `#26211B` | Văn bản chính |
| `--muted` | `#6b6155` | Văn bản phụ, label |
| `--faint` | `#a8997f` | Placeholder, icon nhạt |
| `--primary` | `#1E3A5F` | Navy — màu chủ đạo (CTA, active, header) |
| `--primary-soft` | `#E7EDF4` | Nền active nhạt |
| `--accent` | `#C2691D` | Cam đất — nhấn, badge, giá |
| `--accent-soft` | `#FBEFE2` | Nền accent nhạt |
| `--green` | `#1E6F43` | Thành công, hoàn thành |
| `--green-soft` | `#E2EEE4` | Nền success nhạt |
| `--red` | `#9B2C2C` | IELTS badge, lỗi, deadline |
| `--red-soft` | `#F6E3E0` | Nền error nhạt |
| `--info` | `#0E7490` | Thông tin trung tính |

### Màu sắc — Dark Mode

| Token | Hex |
|---|---|
| `--bg` | `#16130F` |
| `--surface` | `#1E1A15` |
| `--card` | `#211C16` |
| `--soft` | `#262019` |
| `--border` | `#352D24` |
| `--text` | `#ECE4D8` |
| `--muted` | `#a89a86` |
| `--faint` | `#6b6155` |
| `--primary` | `#5B8FD6` |
| `--primary-soft` | `#22304a` |
| `--accent` | `#E8923A` |
| `--accent-soft` | `#3a2b18` |
| `--green` | `#5BBE86` |
| `--green-soft` | `#1c3326` |
| `--red` | `#E08585` |
| `--red-soft` | `#3a2220` |

### Typography

| Vai trò | Font | Weight | Size (gợi ý) |
|---|---|---|---|
| Display / heading | Source Serif 4 | 600–700 | 54px hero, 34px h2, 22px h3 |
| Body / UI | Be Vietnam Pro | 400–600 | 16px body, 14px label, 12px meta |
| Monospace (điểm, đồng hồ) | ui-monospace / Menlo | 400 | Tùy context |

Font import (Google Fonts):
```
Be Vietnam Pro: 300, 400, 500, 600, 700, 800
Source Serif 4: 400, 500, 600, 700 (opsz 8..60)
```

### Spacing & Shape

| Giá trị | Dùng cho |
|---|---|
| 4px, 8px, 12px, 14px, 16px, 20px, 24px, 28px, 32px, 36px, 40px | Padding / Gap theo bội số 4 |
| `border-radius: 8px` | Button, input nhỏ |
| `border-radius: 10–12px` | Card, panel vừa |
| `border-radius: 14–18px` | Card lớn, dialog |
| `border-radius: 999px` | Pill button, badge |
| `border-radius: 50%` | Avatar |
| `box-shadow: 0 12px 36px -14px rgba(38,33,27,.13)` | Card nổi |
| `box-shadow: 0 16px 40px -10px rgba(38,33,27,.22)` | Floating panel |

---

## Danh sách màn hình (19 màn)

### 🌐 Trang công khai

#### 1. Trang chủ (Home)
- **Layout:** Navbar cố định (logo + nav links + CTA) → Hero 2 cột (text trái, ảnh phải) → Stats strip 4 cột → Khóa nổi bật 3 cột → Giáo viên 4 cột → Testimonial + Form tư vấn → Footer
- **Hero:** H1 Source Serif 4 54px/1.08, italic accent "mơ ước" màu `--accent`. 2 CTA: pill primary + underline accent
- **Floating cards trên ảnh hero:** badge "92%" (trái dưới) + badge "CDT" (phải trên)
- **Stats strip:** 4 cột với border chia, số dùng serif 32px
- **Course cards:** border-radius 18px, ảnh bìa height 150px, giá serif 19px
- **Footer:** nền `#14110D`, 4 cột, text `#cbbfa9`

#### 2. Danh sách khóa học (Courses)
- **Layout:** 2 cột — sidebar filter 264px (sticky) + grid khóa 3 cột
- **Sidebar:** search input + checkbox categories + radio trình độ + price range slider
- **Grid:** badge danh mục (pill tròn), thẻ có ảnh + sim badge cam + giá + số học viên
- **Phân trang:** "Tải thêm" centered pill button

#### 3. Chi tiết khóa học (Course Detail)
- **Layout:** Banner ảnh 300px (gradient overlay + title) → 2 cột: nội dung + sidebar sticky 340px
- **Tabs:** Tổng quan / Đề cương / Giáo viên / Đánh giá (border-bottom accent khi active)
- **Sidebar:** giá gạch ngang + % discount + 2 CTA (accent fill + outline) + metadata list
- **Đề cương:** accordion sections với lock icon

#### 4. Đăng nhập / Đăng ký (Auth)
- **Layout:** 2 cột toàn màn — ảnh tối (gradient overlay + stats) | Form trắng
- **Form:** tabs Đăng nhập / Đăng ký (pill switcher) → email + password (toggle show/hide) → remember → primary CTA → Google OAuth

---

### 🎓 Student Portal

> Sidebar trái 244px nền `--surface`, logo + menu vertical, avatar + tên ở footer sidebar

#### 5. Tổng quan học viên (Student Dashboard)
- **Header bar:** breadcrumb + search + notification bell (badge đỏ) + avatar
- **4 stat cards:** grid 4 cột, mỗi card có icon colored, số serif 28px, trend text
- **"Tiếp tục học":** card nằm ngang (ảnh 160px + progress bar + nút "Tiếp tục")
- **Lịch sắp tới:** 3 items với date block + colored vertical bar + tag pill
- **Thông báo:** panel scrollable với icon + title + time

#### 6. Khóa học của tôi (My Courses)
- **Filter tabs:** Tất cả / Đang học / Hoàn thành (pill active = primary fill)
- **Grid 3 cột:** mỗi card có status badge (Đang học / Hoàn thành), progress bar màu theo trạng thái, CTA button

#### 7. Vào học (Course Learning)
- **Layout:** 2 panel — tree-view 320px (bên trái, border-right) + nội dung bài học
- **Tree:** section header bold → items với status icon (✓ xanh / ◷ cam / empty xám) + loại (▶ video / ◈ quiz / ✎ assignment)
- **Nội dung:** tag badge loại + tiêu đề serif + video placeholder + nội dung text + download card + nav prev/next

#### 8. Điểm số (Grades)
- **2 panel trên:** biểu đồ SVG band progress (polyline + dots, trục Y 5.0–8.0) + card band tổng primary fill + 4 kỹ năng grid 2x2
- **Gradebook table:** 5 cột (Bài / Kỹ năng / Ngày / Trạng thái / Điểm), điểm dùng serif 16px, status badge pill

---

### 📝 Giao diện thi IELTS (Exam)

> Full-screen, **không có sidebar portal**. Đây là giao diện mô phỏng phòng thi máy (CDT).

#### 9. Reading — Split-pane
- **Header:** nền `#262019` (tối), tên bài thi + lock badge + đồng hồ đếm ngược serif + nút "Nộp bài" accent
- **Part header bar:** nền `#F1EADF`, tên Part + hướng dẫn
- **Split pane:** passage (54%) | divider handle (8px, cursor col-resize) | questions (flex:1)
- **Passage:** Source Serif 4 15.5px/1.85, highlight màu vàng/xanh, floating highlight toolbar (`#262019` dark pill)
- **Questions:** Multiple Choice (radio tròn), True/False/NG (3 pill buttons), đánh số câu có border active
- **Flag câu:** icon ⚑ cam floating bên phải
- **Bottom navigator:** pill số câu — màu: xanh lá (đã làm) / navy border (hiện tại) / cam (đã flag) / trắng (chưa làm)

#### 10. Listening
- **Audio bar:** nút play tròn xanh + waveform bars (40 bars, bars đã phát = xanh lá) + timestamp
- **Transfer time banner:** nền `--accent-soft`, text cảnh báo
- **Questions:** Note completion — blank underline 2px `--primary` khi đã điền, xám khi trống
- **Anti-cheat toast:** bottom-right, nền `#3a2220`, warning icon + text log lần vi phạm

#### 11. Writing
- **Task switcher:** pill dark trong header (Task 1 active = trắng fill)
- **Split:** prompt + chart SVG (trái 46%) | text editor (phải)
- **Chart:** SVG line chart với 4 đường màu (London `#9B2C2C`, Paris `#1E3A5F`, Berlin `#1E6F43`, Madrid `#C2691D`)
- **Editor:** Source Serif 4 15.5px/1.9, cursor blinking
- **Footer editor:** word count (bold mono) + target + "Lưu nháp" + "Sang Task 2 →"

---

### 👨‍🏫 Teacher Portal

> Sidebar trái 236px nền `#262019` (tối), text `#cbbfa9`, active item `rgba(255,255,255,.1)`

#### 12. Tổng quan giáo viên (Teacher Dashboard)
- **3 stat cards:** khóa đang dạy / bài cần chấm (accent) / học viên hoạt động
- **Danh sách cần xử lý:** bảng với icon badge màu + tag pill + link "Xử lý →"

#### 13. Ngân hàng câu hỏi (Question Bank)
- **Layout:** tree danh mục (240px, border-right) + bảng câu hỏi
- **Tree:** node active = `--primary-soft`, indent con
- **Bảng:** 5 cột (Tên / Loại+icon / Tag pill / Ngày / ⋯ menu)

#### 14. Cấu hình Quiz
- **Layout:** config panel (340px, border-right) + danh sách câu hỏi attached
- **Config:** dropdown thời gian + số lần làm + toggle Ngẫu nhiên/Cố định + Anti-cheat toggle (on/off switch) + Exam Template dropdown
- **Anti-cheat config:** panel border accent, dropdown số lần cho phép
- **Danh sách câu:** drag handle ⠿ + số + tên + loại + input điểm + menu

#### 15. Lượt làm bài (Attempts)
- **4 mini stats:** tổng lượt / đang làm / điểm TB / có vi phạm (red bg)
- **Bảng:** 6 cột (Học viên+avatar / Thời gian / Điểm serif / Trạng thái pill / Vi phạm colored / Thao tác)
- **Vi phạm:** text màu đỏ nếu > 0, cam nếu 1 lần, faint nếu không

---

### ⚙️ Admin Dashboard

> Sidebar trái 236px nền `--primary` (navy), text `#cdd9e8`, active item `rgba(255,255,255,.16)`

#### 16. Tổng quan Admin
- **4 stat cards:** học viên / doanh thu / khóa / phiên thi
- **Biểu đồ doanh thu:** bar chart SVG 6 tháng, 2 cột mỗi nhóm (navy = doanh thu, cam = ghi danh)
- **System health:** 3 progress bars + 3 status items (dot màu + text)

#### 17. Quản lý người dùng (Users)
- **Tab filter:** Tất cả / Học viên / Giáo viên / Admin (count hiển thị)
- **Bảng:** checkbox cột đầu, avatar + name + email, role pill màu theo loại, status dot + text, ngày join

#### 18. Phân quyền (RBAC Matrix)
- **Ma trận:** rows = quyền hạn (7 quyền), cols = vai trò (4 cột: Học viên / Giáo viên / Trợ giảng / Admin)
- **Cell:** ✓ xanh (có quyền) / ◐ cam (partial) / viền xám (không có)

#### 19. Cấu hình hệ thống (Settings)
- **Layout:** tabs dọc (220px) + nội dung cấu hình
- **Branding:** upload logo (drag-drop) + tên hiển thị input + màu chủ đạo swatches (4 lựa chọn) + màu nhấn swatches + chế độ giao diện (Sáng / Tối / Theo hệ thống)

---

## Tương tác & Hành vi

### Navigation
- Toàn bộ routing client-side (SPA), không reload trang
- Sidebar portal: active item highlight `--primary-soft` / `rgba(255,255,255,.1)` tùy theme sidebar
- Transition: `background .15s ease`, `color .15s ease` khi hover/active

### Theme Light/Dark
- CSS custom properties trên `:root` / `.dark` class trên `<body>` hoặc root element
- Persist vào `localStorage('theme')`
- Đọc lại khi load (ưu tiên saved, fallback `prefers-color-scheme`)

### Exam — Anti-cheat
- Event `visibilitychange` + `blur` để detect rời tab
- Log lần vi phạm vào state + gửi API
- Sau N lần (config được, default 3): tự động submit bài
- Disable `contextmenu`, `copy`, `paste` trong vùng câu hỏi

### Exam — Timer
- `setInterval` 1s countdown, persist vào `sessionStorage` để reload không mất
- Hết giờ: auto-submit + redirect kết quả

### Exam — Reading Split-pane
- Divider draggable (mousedown → mousemove → mouseup), clamp [30%, 70%]
- Highlight text: `mouseup` → check `window.getSelection()` → show toolbar → apply `<mark>` với màu chọn
- Page navigator: click pill → scroll câu hỏi tương ứng vào view

### Exam — Listening Audio
- `<audio>` tag, `controls={false}` (custom control)
- Không cho seek (disable `timeupdate` seek hoặc dùng `audio.currentTime` guard)
- Transfer time: sau `audio.ended`, start 10-minute countdown riêng

### Quiz/Course Completion
- Mark lesson done: PATCH `/api/enrollments/:id/lessons/:lessonId`
- Re-fetch progress → update progress bar

---

## Quản lý trạng thái (State)

### Auth state
```
{ user: { id, name, email, role: 'student'|'teacher'|'admin' }, token }
```

### Exam state
```
{
  examId, attemptId,
  timeLeft: number,          // seconds
  answers: { [questionId]: any },
  flagged: Set<questionId>,
  violations: number,
  status: 'in-progress'|'submitted'|'time-up'
}
```

### Course progress
```
{ enrollmentId, completedLessons: Set<lessonId>, progressPct: number }
```

---

## API cần thiết (tham khảo từ tài liệu gốc)

| Endpoint | Method | Mô tả |
|---|---|---|
| `/api/auth/login` | POST | Đăng nhập |
| `/api/auth/register` | POST | Đăng ký |
| `/api/courses` | GET | Danh sách khóa (filter, sort, page) |
| `/api/courses/:id` | GET | Chi tiết khóa |
| `/api/enrollments` | POST | Ghi danh khóa học |
| `/api/enrollments/:id/progress` | GET/PATCH | Tiến độ học |
| `/api/exams/:id/attempts` | POST | Tạo lượt thi |
| `/api/attempts/:id/submit` | POST | Nộp bài |
| `/api/attempts/:id/answers` | PATCH | Lưu đáp án realtime |
| `/api/questions` | GET/POST | Ngân hàng câu hỏi |
| `/api/users` | GET | Danh sách user (admin) |
| `/api/roles` | GET/PATCH | Phân quyền RBAC |

---

## Assets cần có

| Asset | Dùng ở đâu | Ghi chú |
|---|---|---|
| Logo trung tâm | Navbar, sidebar, footer | SVG khuyến nghị |
| Ảnh hero | Home page | Ảnh học viên/lớp học |
| Ảnh bìa khóa học | Course cards | 1 ảnh / khóa, ratio 16:9 |
| Ảnh avatar giáo viên | Teacher section, sidebar | 96×96px tối thiểu |
| Favicon | Browser tab | 32×32 + 16×16 |

Hiện tại tất cả ảnh đều là **placeholder** (hatch pattern). Thay bằng ảnh thật trước khi ra production.

---

## Tech Stack gợi ý

| Layer | Lựa chọn |
|---|---|
| Frontend | Next.js 14+ (App Router) |
| UI library | Radix UI + Tailwind CSS (map tokens → Tailwind config) |
| State | Zustand (exam state) + React Query (server state) |
| Auth | NextAuth.js / Clerk |
| Database | PostgreSQL + Prisma |
| File storage | S3-compatible (ảnh, video bài giảng) |
| Realtime (exam) | WebSocket hoặc SSE (timer sync, anti-cheat log) |

---

## File trong gói này

| File | Mô tả |
|---|---|
| `design_reference.html` | Bản mock hi-fi 19 màn, mở trong trình duyệt, dùng toolbar 2 cấp để duyệt |
| `README.md` | Tài liệu handoff này |

---

*Tạo bởi Claude · Anh ngữ Meridian Design System · Nội dung placeholder, thay bằng dữ liệu thật trước production.*

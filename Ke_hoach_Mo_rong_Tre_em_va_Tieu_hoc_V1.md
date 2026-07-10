# Kế hoạch mở rộng: Nền tảng học tiếng Anh qua video cho Trẻ em & Tiểu học

**Dựa trên:** tài liệu "YÊU CẦU SẢN PHẨM — Nền tảng học tiếng Anh qua video, nhóm Trẻ em & Tiểu học" (`Mo ta web.docx`).
**Bối cảnh:** đây là hướng mở rộng tiếp theo của dự án **Anh ngữ Meridian**, cộng thêm vào (không thay thế) nền tảng IELTS/học sinh-sinh viên hiện có (Phase 1–9 đã hoàn thành). Đánh số giai đoạn trong tài liệu này tiếp nối từ Phase 9 hiện tại.
**Tài liệu liên quan:** [Tom_tat_Kha_thi_Mo_rong_Tre_em_Tieu_hoc.md](./Tom_tat_Kha_thi_Mo_rong_Tre_em_Tieu_hoc.md) (bản rút gọn cho đội khác) · [Tom_tat_Chi_phi_va_Deadline_Mo_rong_Tre_em_Tieu_hoc.md](./Tom_tat_Chi_phi_va_Deadline_Mo_rong_Tre_em_Tieu_hoc.md) (giá thành + deadline dự tính) · [So_do_Tong_Quat_Nghiep_Vu.md](./So_do_Tong_Quat_Nghiep_Vu.md) (sơ đồ luồng cho BA/phi kỹ thuật) · [So_do_Ky_thuat.md](./So_do_Ky_thuat.md) (sơ đồ kiến trúc/dữ liệu cho đội kỹ thuật) · [Khung_Noi_dung_Phat_am_va_Game.md](./Khung_Noi_dung_Phat_am_va_Game.md) (khung chuẩn bị nội dung cho Phase 15/17/19, dùng song song với lúc code) · [Ghi_chu_Cai_tien_IELTS_theo_Dang_bai.md](./Ghi_chu_Cai_tien_IELTS_theo_Dang_bai.md) (ghi chú riêng, chưa ưu tiên).

---

## TÓM TẮT

Dự án hiện tại phục vụ **1 nhóm khách hàng**: học sinh/sinh viên luyện thi IELTS, với nền tảng RBAC (phân quyền), catalog khóa học, ngân hàng câu hỏi (8 loại), quiz engine, và trang quản trị đã hoàn thiện qua 9 giai đoạn trước.

Tài liệu yêu cầu mới bổ sung **2 nhóm khách hàng tiếp theo** — Trẻ em (3–6 tuổi) và Tiểu học (7–11 tuổi) — với mô hình học hoàn toàn khác: xem video mẫu → luyện tập tương tác (ghép hình, sắp xếp câu, ghi âm) → chấm điểm tự động, có tài khoản phụ huynh quản lý hồ sơ con, và nhóm Tiểu học có thêm game hóa (leaderboard, điểm thưởng).

**Cách tiếp cận đề xuất:** xây dựng như một sản phẩm cộng thêm trên cùng nền tảng kỹ thuật hiện có, tái sử dụng tối đa những gì đã có (RBAC, catalog Category→Course→Section, ngân hàng câu hỏi MATCHING/DRAG_DROP, cơ chế upload media, ReportService/Gradebook) — chỉ xây mới phần thực sự chưa tồn tại: hồ sơ phụ huynh-con, video player có tua theo đoạn, ghi âm/lồng tiếng, chấm điểm phát âm (bên thứ 3), và toàn bộ hệ thống game hóa. **Ngân hàng câu hỏi cho trẻ em được tách bạch rõ với IELTS** (nhãn phân loại + trang quản trị riêng — xem mục 1) để tránh nhầm lẫn nội dung, dù vẫn dùng chung hạ tầng loại câu hỏi/chấm điểm phía dưới.

**11 giai đoạn đề xuất (Phase 10–20)**, tổng thời gian ước tính **69–103 ngày làm việc** (~3,5–5 tháng nếu làm tuần tự 1 mạch — có thể rút ngắn nếu chạy song song 1 số giai đoạn độc lập, xem mục "Ghi chú tổng thời gian"). Giai đoạn rủi ro kỹ thuật cao nhất: **Phase 16** (lồng tiếng nhân vật + xuất file video) và **Phase 19** (game hóa) — cả hai nên khoanh phạm vi MVP hẹp trước khi cam kết lịch.

**5 điểm còn treo trong tài liệu gốc cần chốt trước khi bắt đầu code** (xem mục 2) — đây là rủi ro lịch trình lớn nhất, không phải rủi ro kỹ thuật.

**Cập nhật deadline:** do cần ra mắt thật vào **cuối tháng 7/2026**, đợt đầu tiên đã được cắt xuống thành 1 bản MVP hẹp (điều hướng tối giản + video cơ bản + luyện từ vựng/câu, ~12 ngày làm việc) — **không** đủ toàn bộ 11 giai đoạn dưới đây. Toàn bộ nội dung Phase 10–20 trong tài liệu này vẫn đúng và cần thiết, nhưng nay đóng vai trò **lộ trình v2** (làm ngay sau khi MVP ra mắt), không phải lộ trình cho lần ra mắt đầu tiên. Chi tiết phạm vi MVP + deadline cụ thể xem mục 0 trong [Tom_tat_Chi_phi_va_Deadline_Mo_rong_Tre_em_Tieu_hoc.md](./Tom_tat_Chi_phi_va_Deadline_Mo_rong_Tre_em_Tieu_hoc.md).

---

## 1. Nguyên tắc thiết kế xuyên suốt: 2 nhóm khách hàng

| Nhóm | Đối tượng | Vai trò trong kế hoạch này |
|---|---|---|
| **Học sinh/sinh viên (hiện tại)** | Người dùng IELTS, đã có đầy đủ tính năng (Phase 1–9) | **Không bị ảnh hưởng.** Nền tảng kỹ thuật (RBAC, catalog, ngân hàng câu hỏi, quiz engine) được tái sử dụng làm xương sống cho nhóm mới — không sửa đổi hành vi hiện có, chỉ mở rộng thêm nhánh song song. |
| **Trẻ em (3–6 tuổi)** | Seed 1, Seed 2 — chưa đọc thông thạo | Phục vụ bởi Phase 11 (hồ sơ con qua phụ huynh) + Phase 12–15 (nền video-luyện tập dùng chung) + **Phase 16 riêng nhóm này** (lồng tiếng nhân vật). UI cần icon lớn, giọng nói dẫn dắt, thao tác chạm/kéo-thả — hạn chế gõ phím. |
| **Tiểu học (7–11 tuổi)** | 7 khóa (Pre-Starter → Flyers) | Phục vụ bởi Phase 11–15 (nền dùng chung) + **Phase 19 riêng nhóm này** (game hóa: leaderboard, điểm thưởng, huy hiệu). |

Vì 2 nhóm mới dùng chung phần lớn nền tảng (mục 3 trong tài liệu gốc), các giai đoạn 11–15 xây **một lần** cho cả 2 nhóm; chỉ Phase 16 và Phase 19 là tính năng đặc thù riêng từng nhóm.

### Tách bạch ngân hàng câu hỏi Trẻ em ↔ IELTS

Phase 14 tái dùng trực tiếp hạ tầng câu hỏi hiện có (loại `MATCHING`, `DRAG_DROP_TEXT`...) để tiết kiệm công sức — nhưng nếu không tách bạch, câu hỏi trẻ em ("ghép hình con mèo") có thể lẫn chung danh sách/bộ lọc với câu hỏi học thuật IELTS ("ghép đoạn văn với ý chính"), gây nhầm lẫn khi biên tập nội dung và rủi ro gán nhầm câu hỏi sai đối tượng vào khóa học. Đề xuất tách theo 2 lớp, **không nhân đôi schema/backend** (giữ nguyên lợi ích tái sử dụng):

1. **Lớp dữ liệu:** thêm 1 trường phân loại "nhóm sản phẩm" (`audience`: `IELTS` | `KIDS`) vào `Question`/`QuestionCategory` — enforce mọi câu hỏi trẻ em phải nằm dưới 1 nhánh danh mục riêng ngay từ lúc tạo, không cho phép trộn nhánh.
2. **Lớp giao diện quản trị:** xây trang quản lý ngân hàng câu hỏi **riêng** cho nhóm trẻ em (không dùng chung `/teacher/questions` hiện tại — trang đó mặc định hiển thị mọi câu hỏi, không lọc theo audience) — trang mới mặc định lọc `audience=KIDS`, danh sách/bộ chọn câu hỏi không bao giờ hiện câu hỏi IELTS.

Vẫn tái dùng chung 100%: loại câu hỏi, `GradingService`, cơ chế lưu trữ (`Question`, `QuestionOption`...). Quyết định trường `audience` và vị trí đặt (cột mới trên `Question` hay chỉ enforce ở tầng `QuestionCategory`) nên chốt trong Phase 10 cùng lúc thiết kế schema, tránh phát sinh migration giữa chừng Phase 14.

---

## 2. Các điểm cần chốt trước khi triển khai

Tài liệu gốc tự đánh dấu các mục này là "cần chốt trong buổi họp" — đây là rủi ro lịch trình lớn nhất của kế hoạch, nên giải quyết song song với Phase 10 (không chặn hoàn toàn việc bắt đầu code, nhưng chặn việc cam kết lịch chính xác cho các phase liên quan):

1. **Thời lượng video mẫu** (mục 3.1) — ảnh hưởng thiết kế player + dung lượng lưu trữ (Phase 13).
2. **Danh sách khóa học nhóm IELTS trong điều hướng "Vào học"** (mục 7) — nhóm này đã tồn tại trong hệ thống hiện có, chỉ cần xác nhận cách gắn vào điều hướng 3 cấp mới, không phải xây mới.
3. **Nội dung cụ thể trang chi tiết khóa học** (mô tả, số buổi, mục tiêu — mục 8) — cần trước khi nhập liệu thật, không chặn xây dựng khung kỹ thuật.
4. **Nhà cung cấp dịch vụ chấm điểm phát âm bên thứ 3** (mục 3.4, 4) — ảnh hưởng trực tiếp chi phí vận hành và Phase 17; nên khảo sát 2–3 nhà cung cấp (ví dụ nhóm dịch vụ Speech-to-Text/Pronunciation Assessment của các nền tảng cloud lớn, hoặc dịch vụ chuyên biệt cho học phát âm) và POC nhanh trước khi tích hợp chính thức.
5. **Chính sách lưu trữ dữ liệu giọng nói trẻ em** (mục 3.4) — đây là **yêu cầu pháp lý**, không chỉ kỹ thuật. Việt Nam có quy định riêng nghiêm ngặt hơn cho dữ liệu cá nhân trẻ em (cần sự đồng ý của phụ huynh, giới hạn mục đích sử dụng, quyền yêu cầu xóa). Khuyến nghị có ý kiến pháp lý trước khi Phase 15/16 lên production, không chỉ trước khi ra mắt.

---

## 3. Bảng tổng quan các giai đoạn

| Giai đoạn | Tên | Nhóm phục vụ | Tính khả thi | Thời gian ước tính | Công nghệ chính |
|---|---|---|---|---|---|
| Phase 10 | Chốt yêu cầu & thiết kế schema | Cả 2 | Cao | 3–5 ngày | Tài liệu + ERD, không code |
| Phase 11 | Vai trò Phụ huynh & hồ sơ trẻ em | Cả 2 | Cao | 4–6 ngày | Spring Boot/JPA, Flyway, Next.js/Zustand |
| Phase 12 | Điều hướng 3 cấp + trang chi tiết khóa học | Cả 2 | Trung bình–Cao | 7–10 ngày | Spring Boot, Next.js |
| Phase 13 | Video player: phụ đề + tua theo đoạn | Cả 2 | Trung bình | 5–7 ngày | HTML5 `<video>`+WebVTT, Spring Range-request |
| Phase 14 | Luyện từ vựng + cấu trúc câu (+ trang quản trị riêng, tách bạch IELTS) | Cả 2 | Cao | 7–9 ngày | Tái dùng GradingService/QuestionService |
| Phase 15 | Ghi âm & nghe lại (MVP) | Cả 2 | Cao | 4–5 ngày | MediaRecorder API, MediaService hiện có |
| Phase 16 | Lồng tiếng nhân vật + xuất file | **Trẻ em riêng** | **Thấp–Trung bình** | 10–15 ngày | ffmpeg.wasm hoặc ffmpeg server + queue |
| Phase 17 | Chấm điểm phát âm tự động | Cả 2 | Trung bình | 5–8 ngày | API bên thứ 3 (cần chọn) |
| Phase 18 | Dashboard tiến độ cho phụ huynh | Cả 2 | Cao | 4–5 ngày | Tái dùng ReportService |
| Phase 19 | Game hóa: game + leaderboard + điểm thưởng | **Tiểu học riêng** | Trung bình | 15–25 ngày | React+Canvas (hoặc Phaser), bảng mới kiểu grade_history |
| Phase 20 | Kiểm thử, tối ưu di động, ra mắt | Cả 2 | Cao | 5–8 ngày | Kiểm thử đa thiết bị |

**Tổng: 69–103 ngày làm việc.** Xem ghi chú calibration ở cuối tài liệu về ý nghĩa con số này.

---

## 4. Chi tiết từng giai đoạn

### Phase 10 — Chốt yêu cầu & thiết kế schema mở rộng
**Mục tiêu:** giải quyết mục 2 (5 điểm còn treo), thiết kế ERD cho các bảng mới (parent-child, lesson/session, gamification), **và chốt cơ chế tách bạch ngân hàng câu hỏi Trẻ em ↔ IELTS** (trường `audience`, đặt ở `Question` hay `QuestionCategory` — xem mục 1) trước khi viết migration đầu tiên.
**Tính khả thi:** Cao — không có rủi ro kỹ thuật, chỉ cần thời gian ra quyết định.
**Thời gian:** 3–5 ngày (phụ thuộc tốc độ họp/quyết định của phía sản phẩm, không phụ thuộc kỹ thuật).
**Công nghệ:** không code — tài liệu thiết kế + sơ đồ ERD.
**Rủi ro:** đây là giai đoạn duy nhất mà chậm trễ không đến từ kỹ thuật — nên bắt đầu song song với các phase khác nếu có thể.

**Task cụ thể:**
1. Họp chốt lần lượt 5 điểm ở mục 2 (thời lượng video, danh sách khóa IELTS trong điều hướng mới, nội dung trang chi tiết khóa, nhà cung cấp chấm điểm phát âm, chính sách dữ liệu giọng nói trẻ em) — có thể tách thành 2 buổi nếu điểm 4–5 cần thêm thời gian khảo sát/tư vấn pháp lý.
2. Chốt quyết định "hồ sơ con có phải tài khoản đăng nhập độc lập hay không" (ảnh hưởng trực tiếp Phase 11, xem task #4 của Phase 11).
3. Chốt vị trí đặt trường `audience` (`Question` hay chỉ `QuestionCategory` — xem mục 1) trước khi viết migration Phase 14.
4. Vẽ ERD tổng cho các bảng mới: `parent_child_profiles` (Phase 11), `lesson`/`lesson_progress` (Phase 12), `points_ledger`/`badges` (Phase 19) — review với người sẽ code trực tiếp trước khi chốt, tránh phải sửa migration giữa chừng.
5. Gửi ERD + quyết định cho đội kỹ thuật xác nhận không có xung đột với schema hiện có trước khi đóng giai đoạn này.

### Phase 11 — Vai trò Phụ huynh & hồ sơ trẻ em
**Mục tiêu:** tài khoản phụ huynh, quản lý nhiều hồ sơ con, modal xác nhận cho hành động nhạy cảm (mục 2 tài liệu gốc: mua gói, cài đặt, thoát ứng dụng).
**Phạm vi:**
- Mở rộng RBAC hiện có: role `parent` mới; hồ sơ con có thể tái dùng role `student` hiện có (không cần tài khoản đăng nhập độc lập cho trẻ dưới 6 tuổi — phụ huynh thao tác thay).
- Entity mới `parent_child_profiles` — **mô hình gần như giống hệt** `teacher_student_assignments` đã xây ở giai đoạn trước (bảng phẳng, `parent_id`/`child_id`, unique constraint) — tái dùng nguyên pattern, không thiết kế lại từ đầu.
- Trang đăng ký/đăng nhập phụ huynh, tạo/chuyển đổi giữa nhiều hồ sơ con.
- Tái dùng `useConfirm()` (đã có sẵn trong `frontend/src/store/confirm.ts`) cho các hành động nhạy cảm.
**Tính khả thi:** Cao — có tiền lệ kiến trúc gần như y hệt trong chính dự án này.
**Thời gian:** 4–6 ngày.
**Công nghệ:** Spring Boot/JPA (migration Flyway mới), Next.js/Zustand (mở rộng `store/auth.ts`), PostgreSQL.

**Task cụ thể:**
1. Migration mới: thêm role `parent` vào bảng `roles` (theo đúng pattern seed RBAC hiện có); thêm bảng `parent_child_profiles` (mô phỏng `teacher_student_assignments`: `id`, `parent_id` UUID FK `users`, `child_id` UUID FK `users`, `created_at`, `UNIQUE(parent_id, child_id)`).
2. Entity `ParentChildProfile` + repository (`findByParentId`, `existsByParentIdAndChildId`) — package mới `com.meridian.family` hoặc mở rộng `com.meridian.roster` nếu hợp lý hơn.
3. Service mới (`FamilyService` hoặc mở rộng `RosterService`): `createChildProfile(parentId, fullName, avatarUrl?, ageGroup)`, `listChildren(parentId)`, chọn hồ sơ đang hoạt động.
4. **Cần chốt ở Phase 10:** hồ sơ con có phải tài khoản đăng nhập độc lập, hay chỉ là "hồ sơ" phụ huynh chọn thay (không cần mật khẩu riêng cho trẻ dưới 6 tuổi)? Quyết định này ảnh hưởng trực tiếp thiết kế entity ở bước 1-2.
5. Controller mới: `POST /api/family/children`, `GET /api/family/children`, endpoint chuyển hồ sơ hoạt động.
6. Cổng đăng ký/đăng nhập phụ huynh — tái dùng `AuthService.register()` hiện có, chỉ đổi role mặc định thành `parent` khi đăng ký qua route riêng (không dùng chung `/register` học sinh/giáo viên hiện tại).
7. Frontend: trang `parent/register`, `parent/login` (hoặc thêm tab "Phụ huynh" vào `/login` hiện có).
8. Frontend: trang `parent/children` — danh sách hồ sơ con + form "+ Thêm hồ sơ" (tên, ảnh đại diện, nhóm tuổi).
9. Frontend: component chọn hồ sơ con đang hoạt động; mở rộng `useAuthStore` lưu thêm `activeChildId`.
10. Áp `useConfirm()` cho: xóa hồ sơ con, vào cài đặt, thoát ứng dụng đang học.
11. JUnit cho service mới (tạo/xóa hồ sơ, phụ huynh A không thấy được hồ sơ con của phụ huynh B).
12. Test trình duyệt: đăng ký phụ huynh → tạo 2 hồ sơ con → chuyển đổi qua lại → xác nhận dữ liệu tách biệt đúng.

### Phase 12 — Điều hướng "Vào học" 3 cấp + trang chi tiết khóa học
**Mục tiêu:** mục 7–8 tài liệu gốc — Cấp 1 (3 nhóm: Trẻ em/Tiểu học/IELTS) → Cấp 2 (danh sách khóa theo nhóm) → Cấp 3 (trang chi tiết khóa: banner, mô tả, tìm kiếm, % hoàn thành, mở khóa tuần tự, danh sách buổi học với mark "Đã hoàn thành").
**Phạm vi:**
- Tái dùng cấu trúc catalog hiện có (`Category` → `Course` → `CourseSection`) cho khung khóa học — không cần model mới ở tầng này.
- **Cần entity mới:** "Buổi học" (Lesson/Session) — khác `Quiz` hiện tại (vốn thiết kế cho thi/kiểm tra có chấm điểm+thời gian), vì buổi học là đơn vị video+luyện tập tuần tự có khóa/mở khóa. Khuyến nghị: entity `Lesson` riêng dưới `CourseSection`, có bảng theo dõi tiến độ mới (`lesson_progress`, mô phỏng cách `quiz_attempts` đã theo dõi lượt làm bài) để lưu trạng thái hoàn thành + thực thi logic "phải hoàn thành buổi N-1 mới vào buổi N" — **logic mở khóa tuần tự này hoàn toàn mới**, hệ thống hiện tại chỉ có gate ghi danh (enrollment), chưa có gate theo thứ tự bài học.
- Trang chi tiết khóa học: banner, mô tả, thanh tìm kiếm buổi học, thanh % hoàn thành, danh sách buổi học có icon khóa/mở khóa + mark hoàn thành.
**Tính khả thi:** Trung bình–Cao — tái dùng được nhiều nhưng logic mở khóa tuần tự là mới hoàn toàn.
**Thời gian:** 7–10 ngày.
**Công nghệ:** Spring Boot (entity+service+API mới), Next.js (trang mới, component progress bar/search/khóa).

### Phase 13 — Video player: phụ đề + tua theo đoạn
**Mục tiêu:** mục 3.1 — video ngắn có phụ đề, tua lại theo từng đoạn/từ (không chỉ tua nguyên video).
**Phạm vi:**
- Mở rộng `MediaService` hiện tại (đang hỗ trợ ảnh/audio) để nhận file video.
- **Quan trọng:** phục vụ file tĩnh hiện tại (dùng cho audio) chưa hỗ trợ HTTP Range request — cần thiết cho video để tua mượt trên di động (nếu không, trình duyệt phải tải lại toàn bộ file mỗi lần tua). Cần thêm controller/`ResourceHttpRequestHandler` hỗ trợ Range.
- Player component: `<video>` HTML5 + `<track>` phụ đề định dạng WebVTT, đánh dấu mốc thời gian theo đoạn/từ để tua nhanh.
**Tính khả thi:** Trung bình — công nghệ chuẩn, không rủi ro lớn, nhưng phần Range-request là code mới hoàn toàn (audio hiện tại chưa cần vì file ngắn).
**Thời gian:** 5–7 ngày.
**Công nghệ:** Spring `ResourceHttpRequestHandler` hoặc controller Range tùy chỉnh, HTML5 `<video>`+WebVTT, React player component.

### Phase 14 — Luyện từ vựng + luyện cấu trúc câu
**Mục tiêu:** mục 3.2–3.3 — chọn tranh đúng/ghép từ-hình (từ vựng), sắp xếp từ/chọn từ hoàn thành câu (cấu trúc câu), chấm đúng/sai tự động + phản hồi ngay.
**Phạm vi:**
- **Tái dùng trực tiếp** 2 loại câu hỏi đã có: `MATCHING` (ghép từ-hình) và `DRAG_DROP_TEXT` (sắp xếp từ/chọn từ hoàn thành câu) — cấu trúc dữ liệu và `GradingService` đã tồn tại, không cần thiết kế loại câu hỏi mới.
- **Cần mở rộng:** `QuestionOption` hiện chỉ có `content` dạng text — "chọn tranh đúng" cần option dạng ảnh. Mở rộng nhẹ (thêm trường ảnh tùy chọn), không phải thiết kế lại.
- **Tách bạch với IELTS** (xem mục 1): mọi câu hỏi tạo ở Phase này phải gắn `audience=KIDS` và nằm dưới nhánh danh mục trẻ em riêng; trang biên tập câu hỏi cho giai đoạn này là trang quản trị **mới** (không phải `/teacher/questions` hiện tại), mặc định lọc theo audience — người biên tập nội dung trẻ em không bao giờ thấy/chọn nhầm câu hỏi IELTS và ngược lại.
- UI mới: giao diện trẻ-em-hóa (icon lớn, hiệu ứng khích lệ âm thanh/hình ảnh khi đúng/sai) — đây là phần việc chính của giai đoạn này, không phải backend.
**Tính khả thi:** Cao — phần lõi chấm điểm đã có sẵn và đã qua kiểm thử kỹ (24/24 test hiện tại), chỉ cần UI mới + mở rộng nhẹ.
**Thời gian:** 7–9 ngày (tăng nhẹ so với ước tính ban đầu do bổ sung trang quản trị riêng cho tách bạch audience).
**Công nghệ:** tái dùng `QuestionService`/`GradingService` backend, React (component UI, animation, trang quản trị mới).

**Task cụ thể:**
1. Migration: thêm cột `audience` (enum `IELTS`/`KIDS`, mặc định `IELTS` để không phá dữ liệu cũ) vào `question_categories` — câu hỏi kế thừa audience theo nhánh danh mục cha, không cần thêm cột trên từng câu hỏi riêng lẻ.
2. `QuestionCategory` entity + `QuestionCategoryDto` thêm field `audience`; `QuestionTaxonomyService.listCategories()` thêm tham số lọc `audience` tùy chọn.
3. Mở rộng bảng con `QuestionOption` (hoặc tương đương): thêm cột `imageUrl` tùy chọn để hỗ trợ "chọn tranh đúng".
4. `QuestionBankController`: thêm tham số `audience` cho `GET .../categories` và `GET .../questions`.
5. Frontend: trang quản trị **mới** `teacher/kids-questions` (không dùng chung `/teacher/questions`) — copy khung từ trang hiện có, mặc định gọi API với `audience=KIDS`, ẩn hoàn toàn nội dung IELTS.
6. Frontend: component chọn ảnh cho option (tái dùng `ImageUploadField` đã có).
7. Frontend: component hiển thị MATCHING dạng "ghép tranh" (icon lớn, chạm/kéo-thả) và DRAG_DROP_TEXT dạng "sắp xếp từ thành câu" — viết component hiển thị riêng cho trẻ em (không tái dùng nguyên `QuestionRenderer` của IELTS), nhưng dùng chung data model/API.
8. Hiệu ứng phản hồi đúng/sai: âm thanh + animation (theo pattern CSS keyframes đã có trong `globals.css`).
9. JUnit: xác nhận `GradingService` chấm đúng cho MATCHING/DRAG_DROP_TEXT không đổi hành vi sau khi thêm `audience`/`imageUrl` (không phá 24 test hiện có).
10. Test trình duyệt: tạo danh mục KIDS + 2 câu hỏi (ghép tranh, sắp xếp câu) qua trang quản trị mới, xác nhận không xuất hiện ở `/teacher/questions` (IELTS) và ngược lại.

### Phase 15 — Ghi âm & nghe lại (MVP)
**Mục tiêu:** mục 3.4 (phần cơ bản) — trẻ ghi âm giọng đè lên audio mẫu, nghe lại ngay sau khi ghi.
**Phạm vi:**
- Ghi âm qua `MediaRecorder` API của trình duyệt (chuẩn web, không cần thư viện ngoài).
- Upload file ghi âm qua pattern upload audio đã có (`MediaService`/`mediaApi.uploadAudio` — đã hoạt động ổn định trong dự án).
- Phát lại ngay bằng `<audio>` chuẩn.
- **Quan trọng:** cần kiểm tra kỹ quyền truy cập micro trên các loại tablet phổ thông (tài liệu gốc đã lưu ý) — hành vi xin quyền khác nhau giữa iOS Safari/Android Chrome, nên test sớm trong giai đoạn này thay vì để đến Phase 20.
**Tính khả thi:** Cao — có tiền lệ upload audio hoạt động tốt trong dự án (đã dùng cho Listening quiz).
**Thời gian:** 4–5 ngày.
**Công nghệ:** `MediaRecorder` Web API, `MediaService` hiện có (mở rộng nhẹ).

**Task cụ thể:**
1. Kiểm tra `MediaService.ALLOWED_AUDIO_TYPES` hiện tại (mp3/wav/ogg/m4a/aac) — **cần bổ sung `audio/webm`** nếu trình duyệt xuất bản ghi ở định dạng này (phổ biến với `MediaRecorder` mặc định trên Chrome/Android).
2. Quyết định (chốt cùng Phase 10/12): bản ghi gắn với đối tượng nào — câu hỏi ngân hàng hay buổi học (`lesson_progress` từ Phase 12)? Ảnh hưởng chỗ lưu tham chiếu file ghi âm.
3. Frontend: hook `useAudioRecorder()` — bọc `MediaRecorder` API (bắt đầu/dừng ghi, xử lý từ chối quyền micro).
4. Frontend: component ghi âm phù hợp trẻ 3–6 tuổi (nút to, tap-to-toggle hoặc hold-to-record), hiển thị animation/waveform khi đang ghi (tái dùng ý tưởng waveform đã làm cho Listening quiz).
5. Phát lại ngay bằng `<audio>` sau khi dừng ghi.
6. Upload bản ghi qua `mediaApi.uploadAudio` hiện có — tái dùng nguyên, không viết API client mới nếu định dạng đã khớp allowlist.
7. Test tay bắt buộc trên **1 thiết bị Android thật + 1 iOS Safari thật** (không chỉ desktop) — hành vi xin quyền micro khác nhau đáng kể giữa 2 nền tảng.
8. Xác nhận file ghi âm phát lại đúng sau khi tải lại trang (không chỉ trong phiên ghi).

### Phase 16 — Lồng tiếng nhân vật + xuất file (riêng nhóm Trẻ em)
**Mục tiêu:** mục 11.1 — bật/tắt thoại từng nhân vật trong video, ghi đè giọng trẻ lên đoạn đã tắt, xuất 1 file hoàn chỉnh (video gốc + lồng tiếng của trẻ).
**Phạm vi:** đây là **giai đoạn rủi ro kỹ thuật cao nhất** trong toàn kế hoạch — cần xử lý đồng bộ timeline theo từng nhân vật, và ghép (mux) audio mới vào video gốc.
**Khuyến nghị bắt buộc:** làm 1 spike kỹ thuật 2–3 ngày trước khi cam kết lịch chính thức, để chọn giữa 2 hướng. Cả hai đều dùng `ffmpeg` (phần mềm mã nguồn mở, **miễn phí bản quyền** — không có "giá license" như Phase 17) nên chi phí thực tế nằm ở **hạ tầng vận hành**, không phải phí thuê bao:

| Hướng | Ưu điểm | Nhược điểm | Chi phí thực tế |
|---|---|---|---|
| **Client-side (`ffmpeg.wasm`)** | Không cần server/queue mới — triển khai nhanh nhất; không tốn chi phí compute phía server dù có bao nhiêu lượt xuất file. | Chạy bằng WebAssembly ngay trên thiết bị người dùng — **rủi ro cao nhất trên đúng nhóm thiết bị mục tiêu** (tablet Android giá rẻ, RAM thấp, đúng đối tượng Phase 16): có thể chậm, treo, hoặc hết bộ nhớ với video dài; Safari/iOS có thêm giới hạn riêng với WebAssembly+SharedArrayBuffer cần kiểm tra kỹ. | $0 hạ tầng, nhưng rủi ro trải nghiệm người dùng kém trên thiết bị yếu — chi phí "ẩn" là công sức tối ưu/fallback khi thiết bị không đủ mạnh. |
| **Server-side (`ffmpeg` + hàng đợi)** | Ổn định, không phụ thuộc thiết bị người dùng; kiểm soát được thời gian xử lý; dễ theo dõi lỗi tập trung. | Cần dựng thêm hạ tầng chưa có (worker xử lý nền + hàng đợi — ví dụ 1 tiến trình riêng đọc job từ bảng/queue rồi gọi `ffmpeg` CLI) — tăng độ phức tạp vận hành so với kiến trúc hiện tại (chỉ có backend + frontend + Postgres). | Không phí "license", nhưng cần **thêm compute** (CPU cho xử lý video là tác vụ nặng) — nên ước tính theo lượt xuất file thực tế dự kiến/tháng trước khi chọn hướng này, chưa có số liệu cụ thể tại thời điểm lập kế hoạch. |

**Khuyến nghị:** ưu tiên thử **client-side (`ffmpeg.wasm`)** trước trong spike (đơn giản hạ tầng hơn, đúng tinh thần MVP) — nếu kiểm thử thực tế trên tablet giá rẻ cho kết quả chấp nhận được (thời gian xử lý + tỷ lệ treo/lỗi), giữ hướng này; nếu không đạt, chuyển sang server-side và tính toán lại chi phí compute dựa trên số liệu lượt dùng thực tế sau khi có Phase 11–15.

**Tính khả thi:** Thấp–Trung bình.
**Thời gian:** 10–15 ngày (bao gồm spike kỹ thuật; có thể kéo dài hơn nếu chọn hướng server-side và cần dựng hạ tầng queue mới).
**Công nghệ:** `ffmpeg.wasm` hoặc `ffmpeg` server-side + job queue (tùy kết quả spike).

### Phase 17 — Chấm điểm phát âm tự động
**Mục tiêu:** mục 3.4/4 (Should have) — dùng dịch vụ speech-recognition bên thứ 3 để so khớp phát âm.
**Phạm vi:** tích hợp API đã chọn ở Phase 10 (mục 2, điểm 4), lưu điểm vào hồ sơ học viên (mục 5 tài liệu gốc).
**Tính khả thi:** Trung bình — phụ thuộc hoàn toàn vào nhà cung cấp được chọn (độ chính xác với giọng trẻ em, độ trễ, chi phí theo lượt gọi, hỗ trợ tiếng Anh trẻ em cụ thể — không phải mọi API pronunciation-scoring đều tối ưu cho giọng trẻ nhỏ).
**Thời gian:** 5–8 ngày (sau khi đã chọn và POC nhà cung cấp ở Phase 10).
**Công nghệ:** REST API bên thứ 3 (khảo sát/POC trước khi tích hợp chính thức).

**So sánh nhà cung cấp (khảo sát tháng 7/2026 — giá có thể thay đổi, cần kiểm tra lại trước khi ký hợp đồng):**

| Nhà cung cấp | Ưu điểm | Nhược điểm | Giá tại thời điểm khảo sát |
|---|---|---|---|
| **Azure AI Speech** (Pronunciation Assessment) | Sản phẩm lớn, tài liệu đầy đủ, chấm điểm ở mức âm vị (phoneme), sẵn hệ sinh thái Azure nếu sau này cần thêm dịch vụ AI khác. | Huấn luyện chủ yếu trên giọng người lớn — chưa có cam kết riêng về độ chính xác cho giọng trẻ 3–11 tuổi; tính phí theo giờ audio, có thể khó dự toán khi có rất nhiều bản ghi ngắn từ trẻ em. | ~$1,32/giờ audio (Speech-to-Text Standard) + $0,30/giờ phụ phí Pronunciation Assessment ở chế độ real-time (miễn phí phụ phí này nếu dùng chế độ batch). Giảm còn ~$0,66/giờ phần vượt khi > 2.000 giờ/tháng. |
| **Google Cloud Speech-to-Text** | Giá minh bạch, có 60 phút miễn phí/tháng, hạ tầng ổn định. | **Không có tính năng "chấm điểm phát âm" đóng gói sẵn như Azure** — chỉ là dịch vụ nhận dạng giọng nói (STT) chung, muốn chấm phát âm phải tự xây thêm logic so khớp âm vị; cần thêm cả hệ sinh thái GCP (Storage, Cloud Functions...) nên chi phí thực tế thường cao hơn giá niêm yết. | Gói chuẩn ~$0,006/15 giây (~$0,024/phút); gói enhanced ~$0,009/15 giây. Miễn phí 60 phút/tháng. |
| **SpeechAce** | Chuyên biệt cho chấm điểm phát âm/độ trôi chảy (không phải STT chung), tài liệu xác nhận **dùng được cho trẻ em từ tuổi mẫu giáo trở lên**, chấm ở mức âm tiết/âm vị, có mã mẫu API sẵn (GitHub). | Không công bố giá công khai. | Có bản dùng thử miễn phí; giá chính thức theo gói khối lượng/gói năm — **cần liên hệ sales để lấy báo giá cụ thể**. |
| **SoapBox Labs** | **Xây riêng cho giọng trẻ em 2–12 tuổi** — khớp nhất với 2 nhóm tuổi trong yêu cầu (3–6 và 7–11); thiết kế "privacy-by-design" cho dữ liệu giọng nói trẻ em, **giải quyết trực tiếp mối lo pháp lý đã nêu ở mục 2, điểm 5**. | Không công bố giá công khai; mức độ trưởng thành sản phẩm/hỗ trợ dài hạn cần khảo sát thêm qua trao đổi trực tiếp. | Miễn phí 3 tháng đầu cho nhà phát triển (thời điểm khảo sát); giá sau đó — **liên hệ hello@soapboxlabs.com**. |
| **ELSA Speak API** | Độ chính xác công bố cao (95%+), hỗ trợ 100+ giọng vùng miền, có sẵn tính năng dự đoán điểm IELTS/TOEFL (có thể tái dùng sau này cho nhóm IELTS). | Mức giá tìm thấy có vẻ dành cho ứng dụng học viên cuối (Team/Business), **chưa rõ có mô hình giá theo API/lượt gọi phù hợp để nhúng vào sản phẩm riêng hay không** — cần làm rõ với sales trước khi so sánh ngang hàng. | ~$18,2/người dùng/tháng (gói Team); gói Business giá riêng theo thỏa thuận. |

**Khuyến nghị:** thử **SoapBox Labs** trước tiên (khớp nhất về nhóm tuổi mục tiêu + đã có sẵn hướng giải quyết vấn đề pháp lý dữ liệu giọng nói trẻ em), song song POC **Azure** (nếu cần độ trưởng thành/hỗ trợ doanh nghiệp lớn hơn) làm phương án dự phòng, trong Phase 10 trước khi cam kết chính thức. SpeechAce là lựa chọn thứ 3 nếu 2 nhà cung cấp trên không đáp ứng yêu cầu chấm điểm chi tiết.

*Nguồn tham khảo: [Azure Speech pricing](https://azure.microsoft.com/en-us/pricing/details/speech/), [Azure Pronunciation Assessment Q&A](https://learn.microsoft.com/en-us/answers/questions/5608069/pricing-and-usage-of-pronunciation-assessment-feat), [Google Speech-to-Text pricing](https://cloud.google.com/speech-to-text/pricing), [SpeechAce API plans](https://www.speechace.com/api-plans/), [SpeechAce – Voice AI for kids](https://www.speechace.com/using-the-speechace-api-as-voice-ai-for-kids/), [SoapBox Labs](https://www.soapboxlabs.com/), [SoapBox Labs free-access API announcement](https://www.soapboxlabs.com/blog/developer-of-voice-tech-for-children-launches-free-access-api-for-education-entertainment-app-developers/), [ELSA API](https://elsaspeak.com/en/elsa-api/), [ELSA Speak pricing (G2)](https://www.g2.com/products/elsa-speak/pricing).*

### Phase 18 — Dashboard tiến độ cho phụ huynh
**Mục tiêu:** mục 2 (phụ huynh xem tiến độ) + mục 4 (Should have: bài đã học, điểm luyện tập theo tuần).
**Phạm vi:** gần như tái dùng nguyên mẫu `ReportService`/gradebook đã xây cho giáo viên-học sinh (đã có sẵn biểu đồ SVG cho Admin Analytics) — chỉ đổi góc nhìn sang phụ huynh-con, dùng lại `parent_child_profiles` từ Phase 11 để giới hạn quyền xem đúng con của phụ huynh đó.
**Tính khả thi:** Cao — mức tái sử dụng cao nhất trong toàn kế hoạch.
**Thời gian:** 4–5 ngày.
**Công nghệ:** tái dùng `ReportService` pattern, biểu đồ SVG có sẵn.

**Task cụ thể:**
1. `ReportService`: thêm method `gradebookForChild(UUID parentId, UUID childId, ...)` — kiểm tra `parent_child_profiles` (Phase 11) trước khi cho xem, theo đúng pattern đã tách lớp kiểm quyền khỏi lớp lấy dữ liệu (xem `gradebookForUser`/`adminStudentGradebook` hiện có trong `ReportService.java`).
2. Endpoint mới `GET /api/family/children/{childId}/progress` — trả về số buổi học hoàn thành theo tuần, điểm luyện tập trung bình, điểm phát âm (nếu Phase 17 đã xong).
3. Không cần bảng mới — dữ liệu lấy từ `lesson_progress` (Phase 12) + pattern `grade_history` hiện tại.
4. Frontend: trang `parent/dashboard` — tái dùng chính component biểu đồ SVG đã dùng cho Admin Analytics, danh sách buổi học gần đây + trạng thái hoàn thành.
5. Frontend: chọn xem theo từng con (dùng lại component chọn hồ sơ từ Phase 11).
6. JUnit: phụ huynh A không xem được tiến độ con thuộc phụ huynh B (403).
7. Test trình duyệt: hoàn thành vài buổi học bằng tài khoản test, xác nhận dashboard phụ huynh hiển thị đúng số liệu thật.

### Phase 19 — Game hóa (riêng nhóm Tiểu học)
**Mục tiêu:** mục 11.2 — 6 chế độ game gợi ý (ghép hình theo thời gian, lật thẻ ghi nhớ, đua trả lời nhanh, bắn/rơi từ đúng, vòng quay thưởng, đố vui 1-chọi-1 không đồng bộ), leaderboard, điểm thưởng đổi vật phẩm/huy hiệu.
**Phạm vi:** đây là **khối lượng công việc lớn nhất** trong toàn kế hoạch do có nhiều mini-game độc lập.
**Khuyến nghị:** không làm cả 6 mode cùng lúc — chốt phạm vi MVP 2–3 mode trước (ví dụ lật thẻ ghi nhớ + đua trả lời nhanh, vì đều tái dùng trực tiếp ngân hàng từ vựng/hình ảnh sẵn có, độ phức tạp UI thấp nhất), rồi mở rộng dần theo phản hồi thực tế. Khung dữ liệu câu hỏi cho từng chế độ game (để đội nội dung chuẩn bị song song, không cần đợi code xong) xem [Khung_Noi_dung_Phat_am_va_Game.md](./Khung_Noi_dung_Phat_am_va_Game.md).
**Phạm vi kỹ thuật:**
- Bảng mới: `points_ledger` (lịch sử tích/tiêu điểm — theo đúng khuôn mẫu `grade_history` đã có), `badges`, bảng tổng hợp leaderboard.
- Frontend: React + Canvas hoặc DOM animation cho game đơn giản; cân nhắc thư viện game nhẹ (ví dụ Phaser) nếu cần vật lý/animation phức tạp hơn 2–3 mode MVP đầu.

**Ghi chú công cụ (Phaser — mã nguồn mở, miễn phí):** không phát sinh chi phí license (giấy phép MIT). Đánh đổi là **kích thước bundle** (Phaser đầy đủ ~1MB+ nén, ảnh hưởng tốc độ tải trang trên mạng di động — cần cân nhắc lazy-load riêng cho trang game, không load chung với toàn bộ ứng dụng) đổi lấy hệ thống vật lý/va chạm/animation dựng sẵn giúp code nhanh hơn cho các mode phức tạp (bắn/rơi từ đúng). Với 2 mode MVP đề xuất (lật thẻ ghi nhớ, đua trả lời nhanh) — cả hai **không cần vật lý thực**, nên có thể làm bằng React + CSS animation thuần trước, chỉ thêm Phaser khi thực sự làm tới mode "bắn/rơi từ đúng" ở đợt mở rộng sau.

**Tính khả thi:** Trung bình.
**Thời gian:** 15–25 ngày (tùy số lượng mode làm đợt đầu — **nên chốt phạm vi MVP trước khi ước tính chính xác hơn**).
**Công nghệ:** React + Canvas/DOM animation (hoặc Phaser), bảng mới theo khuôn mẫu `grade_history`.

### Phase 20 — Kiểm thử, tối ưu di động, ra mắt
**Mục tiêu:** đảm bảo chạy mượt trên điện thoại (yêu cầu nền tảng, mục 1), kiểm thử quyền micro trên thiết bị phổ thông, rà soát pháp lý dữ liệu trẻ em trước khi ra mắt chính thức.
**Tính khả thi:** Cao (quy trình chuẩn) nhưng thời gian phụ thuộc số lượng lỗi phát sinh từ các giai đoạn trước.
**Thời gian:** 5–8 ngày.
**Công nghệ:** kiểm thử thủ công đa thiết bị (điện thoại + tablet phổ thông), không cần công nghệ mới.

**Task cụ thể:**
1. Lập ma trận thiết bị kiểm thử tối thiểu: 1 điện thoại Android tầm trung + 1 iPhone (Safari) + 1 tablet Android giá rẻ (đối tượng thực tế của Phase 15/16) — không kiểm thử chỉ trên desktop.
2. Kiểm thử lại quyền micro trên đúng ma trận thiết bị trên (đã test sơ bộ ở Phase 15, nay kiểm thử toàn diện hơn với build gần hoàn chỉnh).
3. Đo thời gian tải trang/video trên mạng di động giả lập (3G/4G chậm) — đặc biệt trang chi tiết khóa học (Phase 12) và video player (Phase 13).
4. Rà soát checklist pháp lý dữ liệu giọng nói trẻ em (mục 2, điểm 5) với người phụ trách pháp lý — xác nhận đã có cơ chế đồng ý của phụ huynh + quyền xóa dữ liệu hoạt động đúng trước khi mở đăng ký thật.
5. Kiểm thử hồi quy nhanh nhóm IELTS hiện tại (không phải trọng tâm nhưng bắt buộc — xác nhận không có tính năng nào ở Phase 10–19 vô tình phá vỡ hành vi cũ, đặc biệt phần dùng chung: RBAC, `QuestionService`, `MediaService`).
6. Diễn tập kịch bản lỗi: mất kết nối giữa lúc ghi âm, hết quyền micro giữa chừng, video không tải được — xác nhận có thông báo lỗi thân thiện với trẻ em/phụ huynh, không phải lỗi kỹ thuật thô.
7. Thu thập phản hồi từ 1 nhóm nhỏ người dùng thật (phụ huynh + trẻ) trước khi ra mắt rộng, nếu điều kiện cho phép.

---

## 5. Ghi chú tổng thời gian & khả năng chạy song song

Tổng **69–103 ngày làm việc** giả định làm tuần tự 1 mạch theo đúng thứ tự Phase 10→20. Trên thực tế có thể rút ngắn lịch tổng thể (không rút ngắn tổng công sức) nếu có nhiều hơn 1 người/luồng làm việc song song, vì một số giai đoạn không phụ thuộc lẫn nhau:

- **Phase 17** (chấm điểm phát âm, phụ thuộc nhà cung cấp bên thứ 3) có thể làm song song với **Phase 19** (game hóa) — hai hệ thống hoàn toàn độc lập.
- **Phase 16** (lồng tiếng nhân vật, riêng nhóm Trẻ em) có thể làm song song với **Phase 19** (game hóa, riêng nhóm Tiểu học) — không đụng chạm nhau.
- **Phase 18** (dashboard phụ huynh) có thể bắt đầu ngay sau Phase 11+14, không cần đợi Phase 15–17 xong.

**Về ý nghĩa con số "ngày làm việc":** các ước tính trên hiệu chỉnh theo tốc độ đã quan sát được trong chính dự án này (Phase 1–9 hiện tại được xây dựng qua các phiên làm việc có hỗ trợ AI, tốc độ nhanh hơn đáng kể so với quy trình phát triển truyền thống). Nếu đội ngũ triển khai Phase 10–20 theo cách tương tự (làm việc trực tiếp với AI-assisted development trên chính codebase này), thời gian thực tế có khả năng ngắn hơn con số trên; nếu chuyển giao cho đội phát triển truyền thống chưa quen thuộc với codebase, nên nhân hệ số an toàn 1,5–2 lần.

---

## 6. Đề xuất bước tiếp theo

1. Xác nhận lại toàn bộ kế hoạch này (thứ tự giai đoạn, phạm vi từng giai đoạn) trước khi bắt đầu.
2. Bắt đầu Phase 10 ngay (không tốn công sức kỹ thuật, chỉ cần quyết định) song song với việc khảo sát nhà cung cấp dịch vụ chấm điểm phát âm (mục 2, điểm 4).
3. Sau khi chốt Phase 10, triển khai Phase 11–15 theo đúng thứ tự (nền tảng dùng chung cho cả 2 nhóm) trước khi rẽ nhánh sang Phase 16 (Trẻ em) và Phase 19 (Tiểu học).

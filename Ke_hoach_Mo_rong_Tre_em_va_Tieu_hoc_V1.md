# Kế hoạch mở rộng: Nền tảng học tiếng Anh qua video cho Trẻ em & Tiểu học

**Dựa trên:** tài liệu "YÊU CẦU SẢN PHẨM — Nền tảng học tiếng Anh qua video, nhóm Trẻ em & Tiểu học" (`Mo ta web.docx`).
**Bối cảnh:** hướng mở rộng tiếp theo của **Anh ngữ Meridian**, cộng thêm vào nền tảng IELTS hiện có (Phase 1–9, đã xong) — không thay thế. Đánh số giai đoạn tiếp nối từ Phase 9.
**Tài liệu liên quan:** [Tom_tat_Kha_thi_Mo_rong_Tre_em_Tieu_hoc.md](./Tom_tat_Kha_thi_Mo_rong_Tre_em_Tieu_hoc.md) (bản rút gọn cho đội khác) · [Tom_tat_Chi_phi_va_Deadline_Mo_rong_Tre_em_Tieu_hoc.md](./Tom_tat_Chi_phi_va_Deadline_Mo_rong_Tre_em_Tieu_hoc.md) (giá thành + deadline dự tính) · [So_do_Tong_Quat_Nghiep_Vu.md](./So_do_Tong_Quat_Nghiep_Vu.md) (sơ đồ luồng cho BA/phi kỹ thuật) · [So_do_Ky_thuat.md](./So_do_Ky_thuat.md) (sơ đồ kiến trúc/dữ liệu cho đội kỹ thuật) · [Khung_Noi_dung_Phat_am_va_Game.md](./Khung_Noi_dung_Phat_am_va_Game.md) (khung chuẩn bị nội dung cho Phase 15/17/19, dùng song song với lúc code) · [Ghi_chu_Cai_tien_IELTS_theo_Dang_bai.md](./Ghi_chu_Cai_tien_IELTS_theo_Dang_bai.md) (ghi chú riêng, chưa ưu tiên).

---

## TÓM TẮT

Hiện dự án chỉ phục vụ **1 nhóm khách hàng**: học sinh/sinh viên luyện IELTS. Nền tảng đã có: phân quyền (RBAC), catalog khóa học, ngân hàng câu hỏi (8 loại), quiz engine, trang quản trị — hoàn thành qua 9 giai đoạn trước.

Yêu cầu mới: thêm **2 nhóm khách hàng** — Trẻ em (3–6 tuổi) và Tiểu học (7–11 tuổi). Mô hình học khác hẳn IELTS: xem video mẫu → luyện tập tương tác (ghép hình, sắp xếp câu, ghi âm) → chấm điểm tự động. Có tài khoản phụ huynh quản lý hồ sơ con. Riêng Tiểu học có thêm game hóa (leaderboard, điểm thưởng).

**Cách tiếp cận:** xây thêm trên nền tảng hiện có, không xây lại từ đầu.
- **Tái dùng:** RBAC, catalog Category→Course→Section, ngân hàng câu hỏi MATCHING/DRAG_DROP, upload media, ReportService/Gradebook.
- **Xây mới:** hồ sơ phụ huynh-con, video player tua theo đoạn, ghi âm/lồng tiếng, chấm điểm phát âm (bên thứ 3), hệ thống game hóa.
- **Câu hỏi trẻ em tách bạch với IELTS** bằng nhãn phân loại + trang quản trị riêng (chi tiết ở mục 1), nhưng vẫn dùng chung hạ tầng chấm điểm.

**12 giai đoạn (Phase 10–21), tổng 71–106 ngày làm việc** (~3,5–5,5 tháng nếu làm tuần tự; rút ngắn được nếu chạy song song — xem mục 5). Phase 21 bổ sung ngày 2026-07-15 sau khi phân tích dữ liệu nội dung thật. Rủi ro kỹ thuật cao nhất: **Phase 16** (lồng tiếng + xuất video) và **Phase 19** (game hóa) — nên chốt phạm vi MVP hẹp trước khi cam kết lịch.

**4/5 điểm còn treo trong tài liệu gốc đã được chốt** (thời lượng video, danh sách khóa IELTS trong nav, chính sách dữ liệu giọng nói trẻ em, và các quyết định kỹ thuật kèm theo — xem mục 2). Còn 2 việc chưa xong: **nhà cung cấp chấm điểm phát âm** (vẫn cần POC) và **nội dung trang chi tiết khóa học** (việc chuẩn bị nội dung, không phải quyết định).

**Cập nhật deadline:** ra mắt thật vào **cuối tháng 7/2026** → đợt đầu chỉ làm 1 bản MVP hẹp (~12 ngày làm việc: điều hướng tối giản + video cơ bản + luyện từ vựng/câu), **chưa đủ** 11 giai đoạn dưới đây. Toàn bộ nội dung Phase 10–20 trong tài liệu này vẫn đúng và cần thiết, nhưng nay là **lộ trình v2** (làm ngay sau khi MVP ra mắt), không phải lộ trình cho lần ra mắt đầu tiên. Chi tiết phạm vi MVP + deadline cụ thể xem mục 0 trong [Tom_tat_Chi_phi_va_Deadline_Mo_rong_Tre_em_Tieu_hoc.md](./Tom_tat_Chi_phi_va_Deadline_Mo_rong_Tre_em_Tieu_hoc.md).

---

## 1. Nguyên tắc thiết kế xuyên suốt: 2 nhóm khách hàng

| Nhóm | Đối tượng | Vai trò trong kế hoạch này |
|---|---|---|
| **Học sinh/sinh viên (hiện tại)** | Người dùng IELTS, đã có đầy đủ tính năng (Phase 1–9) | **Không bị ảnh hưởng.** Nền tảng kỹ thuật (RBAC, catalog, ngân hàng câu hỏi, quiz engine) được tái sử dụng làm xương sống cho nhóm mới — không sửa hành vi hiện có, chỉ mở rộng thêm nhánh song song. |
| **Trẻ em (3–6 tuổi)** | Seed 1, Seed 2 — chưa đọc thông thạo | Phục vụ bởi Phase 11 (hồ sơ con qua phụ huynh) + Phase 12–15 (nền video-luyện tập dùng chung) + **Phase 16 riêng nhóm này** (lồng tiếng nhân vật). UI cần icon lớn, giọng nói dẫn dắt, thao tác chạm/kéo-thả — hạn chế gõ phím. |
| **Tiểu học (7–11 tuổi)** | 7 khóa (Pre-Starter → Flyers) | Phục vụ bởi Phase 11–15 (nền dùng chung) + **Phase 19 riêng nhóm này** (game hóa: leaderboard, điểm thưởng, huy hiệu). |

Vì 2 nhóm mới dùng chung phần lớn nền tảng (mục 3 trong tài liệu gốc), các giai đoạn 11–15 xây **một lần** cho cả 2 nhóm; chỉ Phase 16 và Phase 19 là tính năng đặc thù riêng từng nhóm.

### Tách bạch ngân hàng câu hỏi Trẻ em ↔ IELTS

Phase 14 tái dùng hạ tầng câu hỏi có sẵn (loại `MATCHING`, `DRAG_DROP_TEXT`...). Nhưng nếu không tách bạch, câu hỏi trẻ em ("ghép hình con mèo") dễ lẫn với câu hỏi IELTS ("ghép đoạn văn với ý chính") — gây nhầm khi biên tập nội dung và rủi ro gán sai đối tượng vào khóa học. Giải pháp: tách theo 2 lớp, **không nhân đôi schema/backend**:

1. **Lớp dữ liệu:** thêm trường phân loại "nhóm sản phẩm" (`audience`: `IELTS` | `KIDS`) vào `Question`/`QuestionCategory` — mọi câu hỏi trẻ em bắt buộc nằm dưới 1 nhánh danh mục riêng ngay từ lúc tạo, không trộn nhánh.
2. **Lớp giao diện quản trị:** xây trang quản lý ngân hàng câu hỏi **riêng** cho nhóm trẻ em, không dùng chung `/teacher/questions` hiện tại (trang đó mặc định hiển thị mọi câu hỏi, không lọc theo audience) — trang mới mặc định lọc `audience=KIDS`, danh sách/bộ chọn câu hỏi không bao giờ hiện câu hỏi IELTS.

Vẫn tái dùng chung 100%: loại câu hỏi, `GradingService`, cơ chế lưu trữ (`Question`, `QuestionOption`...). **Đã chốt:** trường `audience` chỉ đặt ở tầng `QuestionCategory` (không thêm cột trên từng `Question`) — áp dụng khi thiết kế schema Phase 10 và viết migration Phase 14.

---

## 2. Các điểm cần chốt trước khi triển khai

Tài liệu gốc đánh dấu các mục này là "cần chốt trong buổi họp". 4/5 điểm đã được quyết định (ghi dưới đây); còn 1 điểm (nội dung trang chi tiết khóa học) là việc chuẩn bị nội dung, không phải quyết định chiến lược.

1. ✅ **Thời lượng video mẫu** (mục 3.1) — **đã chốt: 6–10 phút.** Ảnh hưởng thiết kế player + dung lượng lưu trữ (Phase 13).
2. ✅ **Danh sách khóa học nhóm IELTS trong điều hướng "Vào học"** (mục 7) — **đã chốt: ưu tiên hiển thị các khóa mà học viên đang đăng ký**, thay vì liệt kê toàn bộ khóa IELTS hiện có. Nhóm này đã tồn tại trong hệ thống, chỉ cần lọc theo tiêu chí trên khi gắn vào điều hướng 3 cấp mới.
3. **Nội dung cụ thể trang chi tiết khóa học** (mô tả, số buổi, mục tiêu — mục 8) — còn treo, đây là việc chuẩn bị nội dung (không phải quyết định có/không), cần đội nội dung làm trước khi nhập liệu thật; không chặn xây dựng khung kỹ thuật.
4. ⚠️ **Nhà cung cấp dịch vụ chấm điểm phát âm bên thứ 3** (mục 3.4, 4) — **vẫn còn treo theo đúng kế hoạch gốc**: chưa chọn, cần khảo sát 2–3 nhà cung cấp (xem bảng so sánh ở Phase 17) và POC nhanh trước khi tích hợp chính thức. Ảnh hưởng trực tiếp chi phí vận hành và Phase 17.
5. ⚠️ **Chính sách lưu trữ dữ liệu giọng nói trẻ em** (mục 3.4) — **đã chốt: xử lý gần lúc ra mắt**, không xin ý kiến pháp lý sớm trước Phase 15/16 như khuyến nghị ban đầu. Đây là **yêu cầu pháp lý**, không chỉ kỹ thuật — Việt Nam có quy định riêng nghiêm ngặt hơn cho dữ liệu cá nhân trẻ em (cần sự đồng ý của phụ huynh, giới hạn mục đích sử dụng, quyền yêu cầu xóa). **Rủi ro của lựa chọn này:** nếu ý kiến pháp lý muộn yêu cầu thay đổi cơ chế lưu trữ/xóa dữ liệu, có thể phải sửa lại phần kỹ thuật đã xây ở Phase 15/16 — nên cân nhắc lại thời điểm này nếu có thể.

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
| Phase 21 *(bổ sung)* | Tài liệu bài tập về nhà (nhiều audio/video mỗi buổi) | **Tiểu học riêng** (Starters→Flyers) | Cao | 3–4 ngày | Bảng con mới, mirror `lesson_recordings` (Phase 15) |

**Tổng: 69–103 ngày làm việc.** Xem ghi chú calibration ở mục 5 về ý nghĩa con số này.

---

## 4. Chi tiết từng giai đoạn

### Phase 10 — Chốt yêu cầu & thiết kế schema mở rộng
**Mục tiêu:** chốt 5 điểm treo ở mục 2, thiết kế ERD cho bảng mới (parent-child, lesson/session, gamification), và chốt cơ chế tách bạch ngân hàng câu hỏi Trẻ em ↔ IELTS (trường `audience` — xem mục 1) trước khi viết migration đầu tiên.
**Tính khả thi:** Cao — không có rủi ro kỹ thuật, chỉ cần thời gian ra quyết định.
**Thời gian:** 3–5 ngày (phụ thuộc tốc độ họp/quyết định của phía sản phẩm, không phụ thuộc kỹ thuật).
**Công nghệ:** không code — tài liệu thiết kế + sơ đồ ERD.
**Rủi ro:** đây là giai đoạn duy nhất mà chậm trễ không đến từ kỹ thuật — nên bắt đầu song song với các phase khác nếu có thể.

**Task cụ thể:**
1. ✅ 4/5 điểm ở mục 2 đã chốt (thời lượng video, danh sách khóa IELTS trong điều hướng mới, nhà cung cấp chấm điểm phát âm vẫn còn treo — cần POC, chính sách dữ liệu giọng nói trẻ em). Còn lại: nội dung trang chi tiết khóa học (việc chuẩn bị nội dung, làm song song không chặn code).
2. ✅ **Đã chốt:** hồ sơ con là tài khoản đăng nhập độc lập (mỗi trẻ có tài khoản riêng) — ảnh hưởng trực tiếp thiết kế entity Phase 11 (xem task #4 của Phase 11).
3. ✅ **Đã chốt:** trường `audience` đặt ở `QuestionCategory` (không đặt trên từng `Question`) — áp dụng khi viết migration Phase 14.
4. ✅ **Đã vẽ:** ERD chi tiết cho `parent_child_profiles` (Phase 11), `points_ledger`/`badges`/`user_badges` (Phase 19) và `lesson_progress` (Phase 12) — xem [So_do_Ky_thuat.md](./So_do_Ky_thuat.md) mục 3.1. **Quyết định kèm theo:** không tạo bảng `lesson` riêng — MVP tháng 7 đã dùng `CourseSection` làm đơn vị bài học (có sẵn `video_url`), v2 tiếp tục dùng nguyên, chỉ thêm `lesson_progress` để lưu trạng thái hoàn thành + tính mở khóa tuần tự.
5. ✅ **Đã đối chiếu:** không xung đột với 17 migration hiện có (tên bảng mới không trùng, các FK `user_id`/`parent_id`/`child_id` đều tham chiếu đúng kiểu `users.id` UUID) — chi tiết xem ghi chú cuối mục 3.1 trong So_do_Ky_thuat.md.

### Phase 11 — Vai trò Phụ huynh & hồ sơ trẻ em
**Mục tiêu:** tài khoản phụ huynh, quản lý nhiều hồ sơ con, modal xác nhận cho hành động nhạy cảm (mua gói, cài đặt, thoát ứng dụng — mục 2 tài liệu gốc).
**Phạm vi:**
- Role `parent` mới trong RBAC; hồ sơ con tái dùng role `student` có sẵn. **Đã chốt: mỗi trẻ có tài khoản đăng nhập độc lập** (kể cả nhóm 3–6 tuổi) — không dùng phương án "hồ sơ không cần mật khẩu" như cân nhắc ban đầu. Với trẻ chưa tự thao tác được, phụ huynh vẫn đăng nhập hộ bằng tài khoản của trẻ (không phải tài khoản chung).
- Entity mới `parent_child_profiles` — **gần giống hệt** `teacher_student_assignments` đã xây ở giai đoạn trước (bảng phẳng, `parent_id`/`child_id`, unique constraint) — tái dùng nguyên pattern, không thiết kế lại từ đầu.
- Trang đăng ký/đăng nhập phụ huynh, tạo/chuyển đổi giữa nhiều hồ sơ con.
- Tái dùng `useConfirm()` (đã có sẵn trong `frontend/src/store/confirm.ts`) cho các hành động nhạy cảm.
**Tính khả thi:** Cao — có tiền lệ kiến trúc gần như y hệt trong chính dự án này.
**Thời gian:** 4–6 ngày.
**Công nghệ:** Spring Boot/JPA (migration Flyway mới), Next.js/Zustand (mở rộng `store/auth.ts`), PostgreSQL.

**Task cụ thể:**
1. Migration mới: thêm role `parent` vào bảng `roles` (theo đúng pattern seed RBAC hiện có); thêm bảng `parent_child_profiles` (mô phỏng `teacher_student_assignments`: `id`, `parent_id` UUID FK `users`, `child_id` UUID FK `users`, `created_at`, `UNIQUE(parent_id, child_id)`).
2. Entity `ParentChildProfile` + repository (`findByParentId`, `existsByParentIdAndChildId`) — package mới `com.meridian.family` hoặc mở rộng `com.meridian.roster` nếu hợp lý hơn.
3. Service mới (`FamilyService` hoặc mở rộng `RosterService`): `createChildProfile(parentId, fullName, avatarUrl?, ageGroup)`, `listChildren(parentId)`, chọn hồ sơ đang hoạt động.
4. ✅ **Đã chốt ở Phase 10:** hồ sơ con là tài khoản đăng nhập độc lập (không phải "hồ sơ" không cần mật khẩu) — entity ở bước 1-2 thiết kế theo hướng này, mỗi hồ sơ con có username/password riêng như tài khoản `student` thông thường.
5. Controller mới: `POST /api/family/children`, `GET /api/family/children`, endpoint chuyển hồ sơ hoạt động.
6. Cổng đăng ký/đăng nhập phụ huynh — tái dùng `AuthService.register()` hiện có, chỉ đổi role mặc định thành `parent` khi đăng ký qua route riêng (không dùng chung `/register` học sinh/giáo viên hiện tại).
7. Frontend: trang `parent/register`, `parent/login` (hoặc thêm tab "Phụ huynh" vào `/login` hiện có).
8. Frontend: trang `parent/children` — danh sách hồ sơ con + form "+ Thêm hồ sơ" (tên, ảnh đại diện, nhóm tuổi).
9. Frontend: component chọn hồ sơ con đang hoạt động; mở rộng `useAuthStore` lưu thêm `activeChildId`.
10. Áp `useConfirm()` cho: xóa hồ sơ con, vào cài đặt, thoát ứng dụng đang học.
11. JUnit cho service mới (tạo/xóa hồ sơ, phụ huynh A không thấy được hồ sơ con của phụ huynh B).
12. Test trình duyệt: đăng ký phụ huynh → tạo 2 hồ sơ con → chuyển đổi qua lại → xác nhận dữ liệu tách biệt đúng.

### Phase 12 — Điều hướng "Vào học" 3 cấp + trang chi tiết khóa học
**Mục tiêu:** Cấp 1 (Trẻ em/Tiểu học/IELTS) → Cấp 2 (danh sách khóa theo nhóm) → Cấp 3 (trang chi tiết khóa: banner, mô tả, tìm kiếm, % hoàn thành, mở khóa tuần tự, danh sách buổi học có mark "Đã hoàn thành") — mục 7–8 tài liệu gốc. **MVP tháng 7 đã làm phần rút gọn của Phase này** (Cấp 1–3 tối giản, không banner/tìm kiếm/%/mở khóa tuần tự) — Phase 12 giờ chỉ còn phần "hoàn thiện" thêm.
**Phạm vi:**
- Tái dùng catalog có sẵn (`Category` → `Course` → `CourseSection`) — không cần model mới ở tầng này.
- **Đã chốt (cập nhật sau khi có ERD ở Phase 10, xem [So_do_Ky_thuat.md](./So_do_Ky_thuat.md) mục 3.1): không tạo entity `Lesson` mới.** MVP đã dùng thẳng `CourseSection` làm đơn vị "buổi học" (đã có cột `video_url`) — v2 tiếp tục dùng nguyên, chỉ thêm bảng `lesson_progress` (mô phỏng `quiz_attempts`) lưu trạng thái hoàn thành và thực thi "phải xong buổi N-1 mới vào buổi N" — **logic mở khóa tuần tự này hoàn toàn mới**, hệ thống hiện chỉ có gate ghi danh, chưa có gate theo thứ tự bài học.
- Trang chi tiết khóa: banner, mô tả, tìm kiếm buổi học, thanh % hoàn thành, danh sách buổi học có icon khóa/mở khóa + mark hoàn thành.
- **Đã chốt:** nhánh IELTS trong điều hướng "Vào học" 3 cấp ưu tiên hiển thị các khóa mà học viên đang đăng ký (không liệt kê toàn bộ khóa IELTS hiện có) — cần thêm điều kiện lọc theo `enrollment` khi build danh sách khóa cho nhánh này.
**Tính khả thi:** Trung bình–Cao — tái dùng được nhiều (kể cả `CourseSection` làm buổi học, đã chạy thật ở MVP), nhưng logic mở khóa tuần tự hoàn toàn mới.
**Thời gian:** 7–10 ngày (trừ phần MVP đã làm — thời gian còn lại ngắn hơn con số này).
**Công nghệ:** Spring Boot (bảng `lesson_progress` + service/API mới), Next.js (nâng cấp trang `/vao-hoc` đã có ở MVP, thêm component progress bar/search/khóa).

### Phase 13 — Video player: phụ đề + tua theo đoạn
**Mục tiêu:** video có phụ đề, tua theo từng đoạn/từ, không chỉ tua nguyên video (mục 3.1). **Đã chốt: thời lượng video mẫu 6–10 phút.**
**Phạm vi:**
- Mở rộng `MediaService` (đang hỗ trợ ảnh/audio) để nhận file video.
- **Quan trọng:** file tĩnh hiện tại chưa hỗ trợ HTTP Range request — cần cho video để tua mượt trên di động (nếu không, trình duyệt phải tải lại toàn bộ file mỗi lần tua). Với thời lượng 6–10 phút đã chốt (dài hơn audio hiện có), phần Range request càng bắt buộc, không thể bỏ qua như một tối ưu phụ. Cần thêm controller/`ResourceHttpRequestHandler` hỗ trợ Range.
- Player: `<video>` HTML5 + `<track>` phụ đề WebVTT, đánh dấu mốc thời gian theo đoạn/từ để tua nhanh.
**Tính khả thi:** Trung bình — công nghệ chuẩn, nhưng Range-request là code mới hoàn toàn (audio hiện tại chưa cần vì file ngắn).
**Thời gian:** 5–7 ngày.
**Công nghệ:** Spring `ResourceHttpRequestHandler` hoặc controller Range tùy chỉnh, HTML5 `<video>`+WebVTT, React player.

### Phase 14 — Luyện từ vựng + luyện cấu trúc câu
**Mục tiêu:** chọn tranh đúng/ghép từ-hình (từ vựng), sắp xếp từ/chọn từ hoàn thành câu (cấu trúc câu), chấm đúng/sai tự động + phản hồi ngay (mục 3.2–3.3).
**Phạm vi:**
- **Tái dùng** 2 loại câu hỏi có sẵn: `MATCHING` (ghép từ-hình) và `DRAG_DROP_TEXT` (sắp xếp từ) — dữ liệu và `GradingService` đã có, không cần loại câu hỏi mới.
- **Mở rộng nhẹ:** `QuestionOption` hiện chỉ có `content` dạng text — cần thêm trường ảnh tùy chọn cho "chọn tranh đúng".
- **Tách bạch với IELTS** (xem mục 1): câu hỏi ở Phase này gắn `audience=KIDS`, nằm dưới nhánh danh mục trẻ em riêng. Trang biên tập là trang quản trị **mới** (không phải `/teacher/questions`), mặc định lọc theo audience — không ai thấy nhầm câu hỏi của nhóm kia.
- UI mới trẻ-em-hóa (icon lớn, hiệu ứng âm thanh/hình ảnh khi đúng/sai) — đây là phần việc chính của giai đoạn này, không phải backend.
**Tính khả thi:** Cao — lõi chấm điểm đã có và đã qua kiểm thử kỹ (24/24 test hiện tại), chỉ cần UI mới + mở rộng nhẹ.
**Thời gian:** 7–9 ngày (tăng nhẹ so với ước tính ban đầu vì thêm trang quản trị riêng cho tách bạch audience).
**Công nghệ:** tái dùng `QuestionService`/`GradingService`, React (UI, animation, trang quản trị mới).

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
**Mục tiêu:** trẻ ghi âm giọng đè lên audio mẫu, nghe lại ngay sau khi ghi (mục 3.4, phần cơ bản).
**Phạm vi:**
- Ghi âm qua `MediaRecorder` API của trình duyệt (chuẩn web, không cần thư viện ngoài).
- Upload qua pattern audio có sẵn (`MediaService`/`mediaApi.uploadAudio` — đã chạy ổn định trong dự án).
- Phát lại ngay bằng `<audio>` chuẩn.
- **Quan trọng:** cần kiểm tra kỹ quyền truy cập micro trên tablet phổ thông (tài liệu gốc đã lưu ý) — hành vi xin quyền khác nhau giữa iOS Safari/Android Chrome, nên test sớm ở giai đoạn này, không để đến Phase 20.
**Tính khả thi:** Cao — có tiền lệ upload audio hoạt động tốt (đã dùng cho Listening quiz).
**Thời gian:** 4–5 ngày.
**Công nghệ:** `MediaRecorder` Web API, `MediaService` có sẵn (mở rộng nhẹ).

**Task cụ thể:**
1. Kiểm tra `MediaService.ALLOWED_AUDIO_TYPES` hiện tại (mp3/wav/ogg/m4a/aac) — **cần bổ sung `audio/webm`** nếu trình duyệt xuất bản ghi ở định dạng này (phổ biến với `MediaRecorder` mặc định trên Chrome/Android).
2. ✅ **Đã chốt:** bản ghi âm gắn với buổi học (`lesson_progress` từ Phase 12), không gắn với câu hỏi ngân hàng — tham chiếu file ghi âm lưu trên bản ghi `lesson_progress` tương ứng.
3. Frontend: hook `useAudioRecorder()` — bọc `MediaRecorder` API (bắt đầu/dừng ghi, xử lý từ chối quyền micro).
4. Frontend: component ghi âm phù hợp trẻ 3–6 tuổi (nút to, tap-to-toggle hoặc hold-to-record), hiển thị animation/waveform khi đang ghi (tái dùng ý tưởng waveform đã làm cho Listening quiz).
5. Phát lại ngay bằng `<audio>` sau khi dừng ghi.
6. Upload bản ghi qua `mediaApi.uploadAudio` hiện có — tái dùng nguyên, không viết API client mới nếu định dạng đã khớp allowlist.
7. Test tay bắt buộc trên **1 thiết bị Android thật + 1 iOS Safari thật** (không chỉ desktop) — hành vi xin quyền micro khác nhau đáng kể giữa 2 nền tảng.
8. Xác nhận file ghi âm phát lại đúng sau khi tải lại trang (không chỉ trong phiên ghi).

### Phase 16 — Lồng tiếng nhân vật + xuất file (riêng nhóm Trẻ em)
**Mục tiêu:** bật/tắt thoại từng nhân vật trong video, ghi đè giọng trẻ lên đoạn đã tắt, xuất 1 file hoàn chỉnh — video gốc + lồng tiếng của trẻ (mục 11.1).
**Phạm vi:** **giai đoạn rủi ro kỹ thuật cao nhất** toàn kế hoạch — cần đồng bộ timeline theo từng nhân vật và ghép (mux) audio mới vào video gốc.
**Bắt buộc:** làm spike kỹ thuật 2–3 ngày trước khi cam kết lịch, để chọn giữa 2 hướng dưới đây. Cả hai đều dùng `ffmpeg` (mã nguồn mở, miễn phí bản quyền — không có phí license như Phase 17), nên chi phí thực tế nằm ở **hạ tầng vận hành**, không phải phí thuê bao:

| Hướng | Ưu điểm | Nhược điểm | Chi phí thực tế |
|---|---|---|---|
| **Client-side (`ffmpeg.wasm`)** | Không cần server/queue mới — triển khai nhanh nhất; không tốn chi phí compute phía server dù có bao nhiêu lượt xuất file. | Chạy bằng WebAssembly ngay trên thiết bị người dùng — **rủi ro cao nhất trên đúng nhóm thiết bị mục tiêu** (tablet Android giá rẻ, RAM thấp, đúng đối tượng Phase 16): có thể chậm, treo, hoặc hết bộ nhớ với video dài; Safari/iOS có thêm giới hạn riêng với WebAssembly+SharedArrayBuffer cần kiểm tra kỹ. | $0 hạ tầng, nhưng rủi ro trải nghiệm người dùng kém trên thiết bị yếu — chi phí "ẩn" là công sức tối ưu/fallback khi thiết bị không đủ mạnh. |
| **Server-side (`ffmpeg` + hàng đợi)** | Ổn định, không phụ thuộc thiết bị người dùng; kiểm soát được thời gian xử lý; dễ theo dõi lỗi tập trung. | Cần dựng thêm hạ tầng chưa có (worker xử lý nền + hàng đợi — ví dụ 1 tiến trình riêng đọc job từ bảng/queue rồi gọi `ffmpeg` CLI) — tăng độ phức tạp vận hành so với kiến trúc hiện tại (chỉ có backend + frontend + Postgres). | Không phí "license", nhưng cần **thêm compute** (CPU cho xử lý video là tác vụ nặng) — nên ước tính theo lượt xuất file thực tế dự kiến/tháng trước khi chọn hướng này, chưa có số liệu cụ thể tại thời điểm lập kế hoạch. |

**Đã chốt:** thử **client-side (`ffmpeg.wasm`)** trước (đơn giản hạ tầng hơn, đúng tinh thần MVP). Nếu kiểm thử trên tablet giá rẻ cho kết quả chấp nhận được (thời gian xử lý + tỷ lệ treo/lỗi), giữ hướng này; nếu không, chuyển sang server-side và tính lại chi phí compute dựa trên số liệu dùng thực tế sau Phase 11–15.

**Kết quả spike trên thiết bị thật (2026-07-16) — QUYẾT ĐỊNH: GO, giữ hướng client-side (`ffmpeg.wasm`).** Kiểm thử trên tablet Android thật (Chrome), đo qua trang `/dev/ffmpeg-spike`: tải core WASM 429ms, sinh video mẫu 793ms, cắt audio 125ms, mux 63ms — **tổng 1410ms** cho video mẫu 5 giây (nhanh hơn cả lần đo trên desktop, 3218ms — do lần đo desktop là lần tải nguội, chưa có cache). Không treo máy, không crash qua nhiều lần chạy lại, kết quả video/audio phát lại đúng. Đáp ứng đúng tiêu chí đã đặt ra ở trên — sẵn sàng triển khai Phase 16 đầy đủ theo hướng client-side, không cần chuyển sang server-side + queue.

**Tính khả thi:** Thấp–Trung bình → **đã xác nhận khả thi qua spike thật.**
**Thời gian:** 10–15 ngày (bao gồm spike kỹ thuật — đã hoàn thành; còn lại là xây UI bật/tắt thoại + ghi đè giọng + xuất file).
**Công nghệ:** `ffmpeg.wasm` (đã chốt, không cần server-side + job queue).

### Phase 17 — Chấm điểm phát âm tự động
**Mục tiêu:** dùng dịch vụ speech-recognition bên thứ 3 để so khớp phát âm (mục 3.4/4, Should have).
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
**Mục tiêu:** phụ huynh xem tiến độ (mục 2) + bài đã học, điểm luyện tập theo tuần (mục 4, Should have).
**Phạm vi:** tái dùng gần như nguyên `ReportService`/gradebook đã xây cho giáo viên-học sinh (đã có biểu đồ SVG cho Admin Analytics) — chỉ đổi góc nhìn sang phụ huynh-con, dùng `parent_child_profiles` (Phase 11) để giới hạn quyền xem đúng con của phụ huynh đó.
**Tính khả thi:** Cao — mức tái sử dụng cao nhất toàn kế hoạch.
**Thời gian:** 4–5 ngày.
**Công nghệ:** tái dùng `ReportService`, biểu đồ SVG có sẵn.

**Task cụ thể:**
1. `ReportService`: thêm method `gradebookForChild(UUID parentId, UUID childId, ...)` — kiểm tra `parent_child_profiles` (Phase 11) trước khi cho xem, theo đúng pattern đã tách lớp kiểm quyền khỏi lớp lấy dữ liệu (xem `gradebookForUser`/`adminStudentGradebook` hiện có trong `ReportService.java`).
2. Endpoint mới `GET /api/family/children/{childId}/progress` — trả về số buổi học hoàn thành theo tuần, điểm luyện tập trung bình, điểm phát âm (nếu Phase 17 đã xong).
3. Không cần bảng mới — dữ liệu lấy từ `lesson_progress` (Phase 12) + pattern `grade_history` hiện tại.
4. Frontend: trang `parent/dashboard` — tái dùng chính component biểu đồ SVG đã dùng cho Admin Analytics, danh sách buổi học gần đây + trạng thái hoàn thành.
5. Frontend: chọn xem theo từng con (dùng lại component chọn hồ sơ từ Phase 11).
6. JUnit: phụ huynh A không xem được tiến độ con thuộc phụ huynh B (403).
7. Test trình duyệt: hoàn thành vài buổi học bằng tài khoản test, xác nhận dashboard phụ huynh hiển thị đúng số liệu thật.

### Phase 19 — Game hóa (riêng nhóm Tiểu học)
**Mục tiêu:** 6 chế độ game gợi ý (ghép hình theo thời gian, lật thẻ ghi nhớ, đua trả lời nhanh, bắn/rơi từ đúng, vòng quay thưởng, đố vui 1-chọi-1 không đồng bộ), leaderboard, điểm thưởng đổi vật phẩm/huy hiệu (mục 11.2).
**Phạm vi:** **khối lượng công việc lớn nhất** toàn kế hoạch — nhiều mini-game độc lập.
**Đã chốt:** không làm cả 6 mode cùng lúc. **MVP = 2 mode: lật thẻ ghi nhớ + đua trả lời nhanh** — tái dùng trực tiếp ngân hàng từ vựng/hình ảnh có sẵn và UI đơn giản nhất — rồi mở rộng dần theo phản hồi thực tế. Khung dữ liệu câu hỏi cho từng mode (để đội nội dung chuẩn bị song song, không đợi code xong) xem [Khung_Noi_dung_Phat_am_va_Game.md](./Khung_Noi_dung_Phat_am_va_Game.md).
**Phạm vi kỹ thuật:**
- Bảng mới: `points_ledger` (lịch sử tích/tiêu điểm, theo khuôn mẫu `grade_history`), `badges`, bảng tổng hợp leaderboard.
- Frontend: React + Canvas/DOM animation cho game đơn giản; cân nhắc thư viện game nhẹ (ví dụ Phaser) nếu mode sau cần vật lý/animation phức tạp hơn.

**Về Phaser (mã nguồn mở, miễn phí):** không tốn phí license, nhưng đổi lấy **kích thước bundle lớn** (~1MB+ nén, ảnh hưởng tốc độ tải trên mạng di động — nên lazy-load riêng cho trang game). Đổi lại là hệ thống vật lý/va chạm/animation dựng sẵn, code nhanh hơn cho mode phức tạp (bắn/rơi từ đúng). 2 mode MVP đề xuất (lật thẻ, đua trả lời nhanh) **không cần vật lý thực** — làm bằng React + CSS animation thuần trước, chỉ thêm Phaser khi tới mode "bắn/rơi từ đúng" ở đợt mở rộng sau.

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
5. Kiểm thử hồi quy nhanh nhóm IELTS hiện tại (bắt buộc dù không phải trọng tâm) — xác nhận không có tính năng nào ở Phase 10–19 vô tình phá vỡ hành vi cũ, đặc biệt phần dùng chung: RBAC, `QuestionService`, `MediaService`.
6. Diễn tập kịch bản lỗi: mất kết nối giữa lúc ghi âm, hết quyền micro giữa chừng, video không tải được — xác nhận có thông báo lỗi thân thiện với trẻ em/phụ huynh, không phải lỗi kỹ thuật thô.
7. Thu thập phản hồi từ 1 nhóm nhỏ người dùng thật (phụ huynh + trẻ) trước khi ra mắt rộng, nếu điều kiện cho phép.

---

### Phase 21 — Tài liệu bài tập về nhà (Homework material) *(bổ sung 2026-07-15, dựa trên dữ liệu nội dung thật)*

**Bối cảnh:** phân tích file nội dung thật `Courses Info & Data - Starters 1.csv` (72 buổi học, khóa Starters 1) cho thấy nhiều buổi học có kèm **tài liệu nghe** (đôi khi có video) riêng cho bài tập về nhà — khác với video bài giảng chính (Phase 13) và khác với bài luyện tập tự chấm (Quiz, Phase 4). Yêu cầu áp dụng cho các khóa **Starters → Flyers** (toàn bộ nhánh Tiểu học), **không phải buổi nào cũng có** — tùy nội dung từng buổi.

**Đã chốt qua trao đổi (2026-07-15):**
- Tự tải file lên lưu trên server Meridian (nhập liệu thủ công qua UI admin), **không** nhúng trực tiếp link Google Drive.
- Cột `Materials` (PPT, Keynote, Class handout) trong file nguồn là tài liệu giáo viên dùng khi dạy trực tiếp — **không** đưa lên nền tảng học sinh, ngoài phạm vi Phase 21.
- **1 buổi học có thể cần nhiều hơn 1 file audio/video bài tập về nhà** — thiết kế đổi từ "2 cột đơn trên `course_sections`" (bản nháp đầu) sang **bảng riêng cho phép nhiều dòng mỗi buổi** (xem bên dưới).

**Mục tiêu:** cho phép admin gắn nhiều tài liệu (audio/video) "bài tập về nhà" vào từng buổi học, hiển thị cho học sinh ở khu vực riêng biệt với video bài giảng chính.

**Phạm vi:** **thấp–trung bình** — bảng mới nhỏ + endpoint CRUD, theo đúng khuôn mẫu `lesson_recordings` (Phase 15, cũng là bảng con nhiều-dòng-mỗi-buổi) thay vì pattern cột-đơn của `subtitle_url`.
- Migration — bảng mới `lesson_homework_materials`:
  ```sql
  CREATE TABLE lesson_homework_materials (
      id         BIGINT       GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
      section_id BIGINT       NOT NULL REFERENCES course_sections (id) ON DELETE CASCADE,
      media_type VARCHAR(10)  NOT NULL CHECK (media_type IN ('AUDIO','VIDEO')),
      url        VARCHAR(500) NOT NULL,
      label      VARCHAR(200),
      sort_order INTEGER      NOT NULL DEFAULT 0,
      created_at TIMESTAMPTZ  NOT NULL DEFAULT now()
  );
  CREATE INDEX ix_lesson_homework_materials_section ON lesson_homework_materials (section_id);
  ```
  (`label` tùy chọn — vd. "Audio 1 - Từ vựng" khi 1 buổi có nhiều file cần phân biệt; `sort_order` để admin sắp xếp thứ tự hiển thị.)
- Backend: package mới (mirror `com.meridian.recording`) — entity, repository (`findBySection_IdOrderBySortOrderAsc`), service + controller admin CRUD (thêm/xóa/sắp xếp tài liệu theo buổi) — tái dùng nguyên `MediaService.storeAudio()`/`storeVideo()`, không cần logic upload mới. `SectionDto` (đọc, học sinh) mở rộng thêm `List<HomeworkMaterialDto>`.
- Frontend: `admin/courses/[id]` (`SectionCard`) thêm khối quản lý danh sách tài liệu (thêm/xóa từng file, giống UI danh sách câu hỏi trong quiz); trang buổi học (`vao-hoc/.../[sectionId]`) thêm khối "Tài liệu bài tập về nhà" liệt kê tất cả audio/video của buổi đó, chỉ hiện khi có dữ liệu.

**Việc CHƯA làm / còn treo:**
1. **Cột thứ 3 trong file CSV** (header ghi "26", giá trị 1/2/trống) — chưa rõ ý nghĩa, chưa ảnh hưởng tới thiết kế Phase 21, cần hỏi lại nguồn dữ liệu nếu sau này cần dùng.
2. **Nhập liệu nội dung thật cho 72 buổi** (từ vựng, cấu trúc câu, video, homework) vào database — việc chuẩn bị nội dung, không phải quyết định kỹ thuật, tách riêng khỏi Phase 21 (Phase 21 chỉ xây *khung* để chứa dữ liệu, chưa nhập dữ liệu thật — bao gồm cả việc mở từng thư mục Google Drive để biết chính xác có bao nhiêu file mỗi buổi).

**Tính khả thi:** Cao (bảng con nhỏ, mirror pattern `lesson_recordings` đã kiểm chứng ở Phase 15).
**Thời gian:** 3–4 ngày code (không tính thời gian nhập liệu nội dung thật cho các khóa).

**Ghi chú giá trị phụ:** phần `Content - NỘI DUNG BÀI HỌC` trong file (từ vựng kèm phiên âm IPA + cấu trúc câu) là nguồn dữ liệu tốt để nạp cho Phase 14 (luyện từ vựng) và Phase 19 (game) khi tới lúc nhập nội dung thật — không phải việc làm ngay, chỉ ghi nhận.

---

## 5. Ghi chú tổng thời gian & khả năng chạy song song

Tổng **69–103 ngày làm việc** giả định làm tuần tự theo đúng thứ tự Phase 10→20. Nếu có nhiều hơn 1 người/luồng làm song song, lịch tổng thể có thể rút ngắn (tổng công sức không đổi), vì một số giai đoạn không phụ thuộc nhau:

- **Phase 17** (chấm điểm phát âm) và **Phase 19** (game hóa) — 2 hệ thống độc lập, làm song song được.
- **Phase 16** (lồng tiếng, riêng Trẻ em) và **Phase 19** (game hóa, riêng Tiểu học) — không đụng nhau, làm song song được.
- **Phase 18** (dashboard phụ huynh) có thể bắt đầu ngay sau Phase 11+14, không cần đợi Phase 15–17 xong.

**Về con số "ngày làm việc":** các ước tính này hiệu chỉnh theo tốc độ đã quan sát trong chính dự án (Phase 1–9 được xây qua các phiên làm việc có hỗ trợ AI, nhanh hơn đáng kể so với quy trình truyền thống). Nếu Phase 10–20 cũng làm theo cách này, thời gian thực tế có thể ngắn hơn; nếu chuyển cho đội truyền thống chưa quen codebase, nên nhân hệ số an toàn 1,5–2 lần.

---

## 6. Đề xuất bước tiếp theo

1. ✅ MVP tháng 7 đã code, kiểm thử và **triển khai lên production** (điều hướng tối giản + video cơ bản + luyện từ vựng/câu) — xem [Tom_tat_Chi_phi_va_Deadline_Mo_rong_Tre_em_Tieu_hoc.md](./Tom_tat_Chi_phi_va_Deadline_Mo_rong_Tre_em_Tieu_hoc.md) mục 0.
2. ✅ Phase 10 hoàn tất (5/5 task: quyết định + ERD + đối chiếu schema) — xem mục 4 ở trên.
3. **Tiếp theo:** triển khai phần "hoàn thiện" còn lại của Phase 12 (mở khóa tuần tự + `lesson_progress`) và Phase 11 (tài khoản phụ huynh, dùng ERD `parent_child_profiles` đã có) theo đúng thứ tự, trước khi rẽ nhánh sang Phase 16 (Trẻ em) và Phase 19 (Tiểu học).

# Tóm tắt: Giá thành, Tính khả thi & Deadline dự tính

*Gộp 3 chiều thông tin quan trọng nhất từ [Ke_hoach_Mo_rong_Tre_em_va_Tieu_hoc_V1.md](./Ke_hoach_Mo_rong_Tre_em_va_Tieu_hoc_V1.md) vào 1 file — chi tiết lý do/kỹ thuật từng khoản xem file gốc. Bản tóm tắt theo chức năng (không có giá/deadline) xem [Tom_tat_Kha_thi_Mo_rong_Tre_em_Tieu_hoc.md](./Tom_tat_Kha_thi_Mo_rong_Tre_em_Tieu_hoc.md).*

---

## 0. MVP tháng 7 (mốc ra mắt thật đầu tiên)

**Vấn đề:** phạm vi đầy đủ 11 giai đoạn (mục 1–2 dưới đây) cần tối thiểu ~63 ngày làm việc kể cả khi chạy song song nhiều luồng — không thể "ra mắt" trọn vẹn vào cuối tháng 7/2026 (chỉ còn ~15 ngày làm việc kể từ 13/07/2026). Để có 1 bản **ra mắt thật** (không phải demo) đúng hạn, cần cắt phạm vi mạnh — mọi thứ ngoài danh sách dưới đây dời sang **v2** (bắt đầu ngay sau MVP, theo đúng thứ tự Phase 10–20 ở mục 1–2).

### Có trong MVP (ra mắt cuối tháng 7)

| Hạng mục | Rút gọn từ | Thời gian |
|---|---|---|
| Điều hướng "Vào học" tối giản: Cấp 1 (chọn nhóm) → Cấp 2 (chọn khóa) → Cấp 3 (danh sách bài, không banner/tìm kiếm/% hoàn thành/mở khóa tuần tự) | Phase 12 (rút gọn mạnh) | 3 ngày |
| Video mẫu dạng cơ bản: thẻ `<video>` chuẩn phát trực tiếp file đã tải lên, dùng luôn `MediaService` hiện có (chỉ thêm mimetype video) — **không có** tua theo đoạn/phụ đề/tối ưu Range-request | Phase 13 (rút gọn mạnh) | 2 ngày |
| Luyện từ vựng + sắp xếp câu, tái dùng `MATCHING`/`DRAG_DROP_TEXT`, có gắn nhãn `audience=KIDS` ngay từ đầu — **chưa có** trang quản trị riêng (đội nội dung dùng tạm trang hiện có, tự kỷ luật chọn đúng danh mục KIDS) | Phase 14 (rút gọn: bỏ trang quản trị riêng + option ảnh) | 5 ngày |
| Kiểm thử nhanh + triển khai lên production | Phase 20 (rút gọn còn kiểm thử tối thiểu) | 2 ngày |
| **Tổng** | | **12 ngày làm việc** |

**Deadline dự tính:** bắt đầu 13/07/2026 → xong khoảng **29/07/2026**, còn dư 2–3 ngày làm việc trước khi hết tháng 7 để xử lý phát sinh. Nếu bắt đầu trễ hơn 13/07, trừ thẳng số ngày trễ vào phần dư này trước.

### Không có trong MVP (dời sang v2, làm ngay sau khi ra mắt)

- **Tài khoản phụ huynh + hồ sơ nhiều con** (Phase 11 gốc) — MVP dùng thẳng tài khoản học sinh có sẵn trong hệ thống, chưa có tầng phụ huynh quản lý.
- **Video nâng cao**: phụ đề, tua theo đoạn, tối ưu Range-request cho di động (phần còn lại của Phase 13 gốc).
- **Trang chi tiết khóa học đầy đủ**: banner, tìm kiếm, % hoàn thành, mở khóa tuần tự (phần còn lại của Phase 12 gốc).
- **Trang quản trị riêng cho câu hỏi trẻ em** (phần còn lại của Phase 14 gốc) — cho tới khi có UI riêng, đội nội dung thao tác thủ công cẩn thận trên trang hiện có.
- Ghi âm & nghe lại (Phase 15), lồng tiếng nhân vật (Phase 16), chấm điểm phát âm tự động (Phase 17), dashboard phụ huynh (Phase 18), game hóa (Phase 19).

**Đánh đổi cần biết trước khi chốt:** bản MVP này **chưa có** phần ghi âm/chấm điểm phát âm — tức là chưa chạm tới mục 3.4 (được đánh dấu "Must have" trong tài liệu yêu cầu gốc) và chưa có tài khoản phụ huynh (mục 2 tài liệu gốc). Đây là đánh đổi bắt buộc để kịp deadline cuối tháng 7 — nếu 2 phần này thực sự không thể thiếu ở lần ra mắt đầu tiên, deadline cần dời lại (xem Kịch bản A/B ở mục 2 dưới, cho phạm vi đầy đủ hơn).

---

## 1. Bảng tổng hợp theo giai đoạn (phạm vi đầy đủ — v2 trở đi)

| Giai đoạn | Tính khả thi | Thời gian (ngày làm việc) | Chi phí bên ngoài |
|---|---|---|---|
| Phase 10 — Chốt yêu cầu & thiết kế schema | Cao | 3–5 | Không |
| Phase 11 — Vai trò Phụ huynh & hồ sơ trẻ em | Cao | 4–6 | Không |
| Phase 12 — Điều hướng 3 cấp + trang chi tiết khóa học | Trung bình–Cao | 7–10 | Không |
| Phase 13 — Video player: phụ đề + tua theo đoạn | Trung bình | 5–7 | Không |
| Phase 14 — Luyện từ vựng + cấu trúc câu | Cao | 7–9 | Không |
| Phase 15 — Ghi âm & nghe lại (MVP) | Cao | 4–5 | Không |
| Phase 16 — Lồng tiếng nhân vật + xuất file (riêng Trẻ em) | Thấp–Trung bình | 10–15 | $0 license (mã nguồn mở) + chi phí compute nếu chọn xử lý server-side (chưa có số liệu để ước tính cụ thể) |
| Phase 17 — Chấm điểm phát âm tự động | Trung bình | 5–8 | **Có — xem mục 3** (dịch vụ bên thứ 3, chi phí theo lượt dùng thực tế) |
| Phase 18 — Dashboard tiến độ cho phụ huynh | Cao | 4–5 | Không |
| Phase 19 — Game hóa (riêng Tiểu học) | Trung bình | 15–25 | $0 (thư viện mã nguồn mở nếu dùng Phaser) |
| Phase 20 — Kiểm thử, tối ưu di động, ra mắt | Cao | 5–8 | Không |
| **Tổng** | — | **69–103** | Xem mục 3 |

---

## 2. Deadline dự tính cho phạm vi đầy đủ (sau MVP)

**Áp dụng cho v2 trở đi** (mọi hạng mục ở danh sách "Không có trong MVP" ở mục 0) — không phải deadline ra mắt cuối tháng 7. Các mốc dưới đây tính từ 13/07/2026 cho **toàn bộ phạm vi đầy đủ** (không trừ phần đã làm ở MVP) — nếu MVP đã hoàn thành các bản rút gọn của Phase 12/13/14, phần việc "hoàn thiện" thêm ở v2 sẽ ngắn hơn số ngày gốc trong bảng mục 1, nhưng chưa tách riêng con số đó ở đây. Phase 10 (chốt yêu cầu, không code) nên làm **song song** với lúc code MVP, để v2 có thể bắt đầu code ngay sau khi MVP ra mắt (~29/07/2026) thay vì cộng dồn thêm 3–5 ngày Phase 10 phía sau.

**Giả định minh họa:** bắt đầu Phase 10 vào **thứ Hai 13/07/2026**, tuần làm việc 5 ngày, chưa trừ ngày lễ. Mỗi mốc dưới đây căn theo **cửa sổ 1–2 tuần** quanh 1 ngày trung tâm (thay vì cộng dồn toàn bộ khoảng thời gian thấp–cao của từng giai đoạn, vốn sẽ cho ra khoảng cách nhiều tuần ở các mốc xa) — nếu ngày bắt đầu thực tế khác 13/07/2026, dời toàn bộ mốc theo đúng số ngày lệch.

### Kịch bản A — 1 luồng làm việc duy nhất (tuần tự Phase 10 → 20)

| Mốc | Deadline dự tính |
|---|---|
| Xong Phase 10 (chốt yêu cầu) | 14/07 – 24/07/2026 |
| Xong Phase 15 (nền tảng dùng chung hoàn tất — video + luyện tập + ghi âm) | 25/08 – 08/09/2026 |
| **Ra mắt (xong Phase 20)** | **03/11 – 17/11/2026** |

### Kịch bản B — Nhiều luồng song song sau khi xong nền tảng chung (khuyến nghị nếu có ≥ 2 người)

Theo đúng gợi ý đã có ở mục 5 file kế hoạch chính: Phase 16 (Trẻ em), Phase 17 (chấm điểm phát âm), Phase 19 (game hóa) là 3 hệ thống độc lập, có thể làm cùng lúc sau khi Phase 10–15 xong; Phase 18 (dashboard phụ huynh) chèn vào giữa, không nằm trên đường găng.

| Mốc | Deadline dự tính |
|---|---|
| Xong nền tảng dùng chung (Phase 10–15) | 25/08 – 08/09/2026 |
| Xong Phase 16 + 17 + 18 + 19 (chạy song song, giới hạn bởi Phase 19 — hạng mục dài nhất) | 22/09 – 06/10/2026 |
| **Ra mắt (xong Phase 20)** | **01/10 – 15/10/2026** |

**Chênh lệch giữa 2 kịch bản: khoảng 4–5 tuần** — đây là lý do chính đáng để cân nhắc tách 2–3 người làm song song ngay khi Phase 15 xong, thay vì 1 người làm tuần tự hết toàn bộ.

**Cách đọc các mốc trên:** mỗi ô là 1 điểm ước tính trung tâm (trung bình cộng khoảng thời gian thấp–cao ở bảng mục 1, cộng dồn qua các giai đoạn trước đó) ± khoảng 1 tuần mỗi phía. Đây là mức độ chắc chắn phù hợp để lên lịch/thông báo tiến độ; rủi ro kéo dài thêm nằm chủ yếu ở Phase 16 và Phase 19 (xem cột "Tính khả thi" ở mục 1) — nếu 1 trong 2 giai đoạn này phát sinh vấn đề ngoài dự kiến, mốc "Ra mắt" có thể lùi quá cửa sổ trên, không chỉ riêng 1–2 tuần.

---

## 3. Chi tiết chi phí bên ngoài (chỉ 3 hạng mục có phát sinh)

### Phase 17 — Chấm điểm phát âm tự động (chi phí thật, định kỳ)

**Quy về 1 đơn vị chung: giá cho 1 lượt chấm điểm 1 đoạn audio ≤15 giây** (đơn vị nhỏ nhất, khớp đúng cách dùng thật — mỗi lần học sinh đọc 1 từ/câu là 1 lượt). Chỉ 2/5 nhà cung cấp công bố giá đủ chi tiết để quy đổi; 3 nhà còn lại không có giá công khai nên không tính được, ghi rõ "chưa đủ dữ liệu" thay vì đoán:

| Nhà cung cấp | Giá / 1 lượt ≤15 giây (quy đổi) | Ghi chú |
|---|---|---|
| **Azure** (chế độ batch, không phụ phí) | **$0,0055 (~143 VND)** | Rẻ nhất trong nhóm tính được, nhưng chế độ batch có thể có độ trễ (không chấm ngay tức thời) — cần xác nhận có phù hợp trải nghiệm trẻ em (muốn thấy kết quả ngay) hay không. |
| **Azure** (chế độ real-time, có phụ phí) | **$0,0067 (~176 VND)** | Chấm ngay lập tức, phù hợp trải nghiệm hơn, đắt hơn batch ~22%. |
| Google Cloud STT (chuẩn) | $0,0060 (~156 VND) | **Chỉ để tham khảo mức giá STT thô — không dùng được** vì không có tính năng chấm phát âm. |
| SpeechAce | Chưa đủ dữ liệu | Không công bố giá theo lượt — cần liên hệ sales để quy đổi. |
| SoapBox Labs | Chưa đủ dữ liệu | Tương tự — cần liên hệ trực tiếp. |
| ELSA Speak API | Không áp dụng được đơn vị này | Tính phí theo thuê bao/người dùng/tháng (~$18,2/user/tháng gói Team), không phải theo lượt — không quy đổi trực tiếp sang "giá/lượt" được vì không biết trước 1 user dùng bao nhiêu lượt/tháng. |

*Tỷ giá quy đổi VND chỉ mang tính minh họa (~26.000 VND/USD) — cần đối chiếu tỷ giá thực tế tại thời điểm sử dụng, không dùng số VND trên để báo giá chính thức.*

### Ví dụ cụ thể: 1 bài học = 10 từ vựng + 5 câu chấm phát âm (mỗi câu ≤15 giây)

10 từ vựng (luyện ghép hình — Phase 14) **không** đi qua dịch vụ bên thứ 3, nên **$0** cho phần này bất kể làm bao nhiêu lần. Chỉ 5 câu đọc để chấm phát âm (Phase 17) mới phát sinh phí, và phí này **cộng dồn theo đúng số lượt học sinh thực sự gửi đi chấm** — càng đọc lại nhiều lần, phí càng tăng tuyến tính (không phải trả 1 lần cố định cho cả bài):

| Số lần thử mỗi câu | Tổng số lượt chấm (5 câu) | Chi phí — Azure batch | Chi phí — Azure real-time |
|---|---|---|---|
| 1 lần/câu (đọc đúng ngay hoặc không cho thử lại) | 5 lượt | $0,0275 (~715 VND) | $0,0338 (~878 VND) |
| 3 lần/câu (theo `so_lan_thu_lai` gợi ý trong khung nội dung) | 15 lượt | $0,0825 (~2.145 VND) | $0,1013 (~2.633 VND) |
| 5 lần/câu (trẻ đọc đi đọc lại nhiều lần) | 25 lượt | $0,1375 (~3.575 VND) | $0,1688 (~4.388 VND) |

**Trả lời câu hỏi "thu nhiều lần thì có tốn hơn không":** **Có, với Azure/Google (và khả năng cao với SpeechAce/SoapBox vì cùng mô hình giá theo API-lượt-gọi)** — mỗi lần bấm "chấm điểm" là 1 lượt gọi API mới, tính phí độc lập, không có "gói trọn combo 1 bài". Đây là lý do trường `so_lan_thu_lai` (giới hạn số lần thử lại) trong [Khung_Noi_dung_Phat_am_va_Game.md](./Khung_Noi_dung_Phat_am_va_Game.md) **không chỉ là quyết định UX** mà còn trực tiếp **khống chế chi phí vận hành** — nên chốt con số này sớm (ở Phase 10) thay vì để mặc định "không giới hạn". **Riêng ELSA** (nếu chọn) sẽ không tăng phí theo số lượt thử trong cùng 1 thuê bao (miễn không vượt hạn mức gói) — nhưng cần xác nhận rõ hạn mức thực tế với sales trước khi coi đây là lợi thế chắc chắn.

**Ước tính quy mô lớn hơn (minh họa, dùng Azure batch làm mốc rẻ nhất):** 100 học sinh, mỗi em học 1 bài/ngày, mỗi bài 5 câu, trung bình 2 lần thử/câu → 100 × 5 × 2 = 1.000 lượt/ngày × $0,0055 ≈ **$5,5/ngày (~143.000 VND/ngày)**, tương đương **~$165/tháng (~4,3 triệu VND/tháng)** cho riêng chi phí chấm điểm phát âm ở quy mô này. Đây là ví dụ minh họa để hình dung độ lớn, không phải dự toán chính thức — cần thay bằng số học sinh/tần suất thực tế khi có dữ liệu.

Chi tiết ưu/nhược từng nhà cung cấp + nguồn tham khảo: xem Phase 17 trong file kế hoạch chính.

### Phase 16 — Lồng tiếng nhân vật + xuất file (chi phí hạ tầng, không phải phí license)

`ffmpeg` (công cụ xử lý audio/video) **miễn phí bản quyền** ở cả 2 hướng triển khai:
- **Client-side (`ffmpeg.wasm`):** $0 hạ tầng — chạy trên thiết bị người dùng, không tốn chi phí server.
- **Server-side (`ffmpeg` + hàng đợi xử lý nền):** không có phí license, nhưng cần **thêm chi phí compute** (server xử lý video là tác vụ nặng CPU) — chưa có số liệu lượt dùng thực tế để ước tính cụ thể, cần tính lại sau khi có dữ liệu sử dụng thật từ Phase 11–15.

### Phase 19 — Game hóa

Nếu dùng thư viện Phaser (chỉ cần cho 1 vài mode phức tạp như "bắn/rơi từ đúng"): **miễn phí, giấy phép mã nguồn mở (MIT)**. 2 mode MVP đề xuất (lật thẻ ghi nhớ, đua trả lời nhanh) không cần thư viện này, làm bằng React thuần.

**Tổng kết chi phí bên ngoài:** hạng mục duy nhất chắc chắn phát sinh phí định kỳ là **Phase 17** (dịch vụ chấm điểm phát âm) — mức phí phụ thuộc hoàn toàn vào số lượt học sinh luyện phát âm thực tế mỗi tháng, chưa thể chốt số cụ thể trước khi có ước tính quy mô người dùng. Phase 16/19 không có phí license nhưng Phase 16 có thể phát sinh chi phí hạ tầng tùy hướng kỹ thuật chọn.

---

## 4. Lưu ý về độ tin cậy của các con số

- **Thời gian:** hiệu chỉnh theo tốc độ đã quan sát trong chính dự án này (phát triển có hỗ trợ AI) — có thể ngắn hơn nếu tiếp tục làm theo cách này, nên nhân hệ số an toàn 1,5–2 lần nếu chuyển giao cho đội truyền thống chưa quen codebase.
- **Deadline:** tính từ ngày bắt đầu minh họa 13/07/2026, dùng điểm giữa của mỗi giai đoạn (không cộng dồn toàn bộ khoảng thấp–cao) + cửa sổ ±1 tuần — mục đích là ra 1 con số đủ gọn để lên lịch, không phải cam kết chính xác tuyệt đối. Cần thay ngày bắt đầu minh họa bằng ngày bắt đầu thực tế, và theo dõi sát Phase 16/19 vì đây là 2 nơi có khả năng lệch ra ngoài cửa sổ 1–2 tuần này nhất.
- **Giá thành:** chỉ bao gồm chi phí công cụ/dịch vụ bên ngoài (không bao gồm chi phí nhân sự/thời gian phát triển — không có đủ thông tin về quy mô đội/mức lương để tính khoản này). Giá dịch vụ bên thứ 3 có thể thay đổi — cần xác nhận lại trước khi ký hợp đồng chính thức, đặc biệt với các nhà cung cấp yêu cầu liên hệ sales riêng (SpeechAce, SoapBox Labs).
- **5 điểm còn treo** trong file kế hoạch chính (mục 2) vẫn là rủi ro lớn nhất với độ chính xác của cả 3 cột trên — càng chốt sớm, các con số càng đáng tin cậy.

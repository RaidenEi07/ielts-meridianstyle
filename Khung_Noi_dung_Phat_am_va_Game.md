# Khung chuẩn bị nội dung: Bài luyện phát âm & Câu hỏi cho Game

*Dùng cho đội nội dung/biên tập chuẩn bị dữ liệu song song với lúc đội kỹ thuật xây Phase 17 (chấm điểm phát âm) và Phase 19 (game hóa) trong [Ke_hoach_Mo_rong_Tre_em_va_Tieu_hoc_V1.md](./Ke_hoach_Mo_rong_Tre_em_va_Tieu_hoc_V1.md). Có thể dùng trực tiếp làm cột tiêu đề cho 1 bảng tính (Excel/Google Sheet) để nhập liệu.*

---

## 1. Khung nội dung: Bài luyện phát âm (Phase 17)

Mỗi dòng trong bảng nội dung = 1 bài luyện phát âm.

| Cột | Bắt buộc? | Mô tả | Ví dụ |
|---|---|---|---|
| `ma_bai` | Bắt buộc | Mã định danh duy nhất | `PRON-SEED1-U01-001` |
| `nhom_tuoi` | Bắt buộc | `Tre_em` (3–6) hoặc `Tieu_hoc` (7–11) | `Tre_em` |
| `khoa_hoc` | Bắt buộc | Khóa học gắn với (Seed 1, Movers...) | `Seed 1` |
| `buoi_hoc` | Bắt buộc | Buổi học cụ thể gắn với | `Buổi 3 — Con vật` |
| `noi_dung_muc_tieu` | Bắt buộc | Từ/cụm từ/câu cần phát âm (tiếng Anh) | `cat` |
| `phien_am_ipa` | Nên có | Phiên âm IPA — hỗ trợ đối chiếu khi kiểm tra kết quả chấm điểm | `/kæt/` |
| `file_audio_mau` | Bắt buộc | Tên/đường dẫn file audio giọng chuẩn (native speaker) | `audio/pron/cat_us.mp3` |
| `giong_muc_tieu` | Bắt buộc | Giọng vùng miền mục tiêu (ảnh hưởng chọn nhà cung cấp chấm điểm — mục Phase 17) | `US` |
| `do_kho` | Bắt buộc | 1 (dễ) – 5 (khó) | `1` |
| `nguong_diem_dat` | Bắt buộc | % điểm tối thiểu để coi là "đạt" (cần thống nhất với nhà cung cấp đã chọn — thang điểm khác nhau giữa các API) | `70` |
| `so_lan_thu_lai` | Nên có | Số lần cho phép thử lại trước khi chuyển bài | `3` |
| `loai_bai` | Bắt buộc | `Tu_don` / `Cum_tu` / `Cau` / `Doan_ke_chuyen_ngan` | `Tu_don` |
| `chu_de` | Nên có | Chủ đề từ vựng (dùng để liên kết với ngân hàng từ vựng Phase 14) | `Động vật` |
| `ghi_chu` | Tùy chọn | Ghi chú thêm cho đội kỹ thuật/kiểm duyệt | — |

**Lưu ý khi chuẩn bị:** `nguong_diem_dat` và thang điểm cụ thể phụ thuộc nhà cung cấp được chọn ở Phase 17 (mỗi API có thang điểm/cách tính riêng — xem bảng so sánh trong Phase 17) — nên để trống cột này cho đến khi Phase 10 chốt nhà cung cấp, tránh phải nhập lại toàn bộ.

---

## 2. Khung nội dung: Câu hỏi cho Game (Phase 19)

### 2.1 Trường dữ liệu chung (áp dụng mọi chế độ game)

| Cột | Bắt buộc? | Mô tả | Ví dụ |
|---|---|---|---|
| `ma_cau_hoi` | Bắt buộc | Mã định danh duy nhất | `GAME-Q-000123` |
| `che_do_game` | Bắt buộc | 1 trong 6 chế độ ở mục 2.2 | `Lat_the_ghi_nho` |
| `chu_de` | Bắt buộc | Chủ đề/danh mục từ vựng (tái dùng ngân hàng đã tách bạch ở Phase 14) | `Trái cây` |
| `do_kho` | Bắt buộc | 1 (dễ) – 5 (khó) | `2` |
| `diem_thuong` | Bắt buộc | Điểm cộng khi trả lời đúng | `10` |
| `thoi_gian_gioi_han_giay` | Chỉ cần nếu mode có tính giờ | Số giây cho phép trả lời | `15` |
| `noi_dung_cau_hoi` | Bắt buộc | Từ/câu hỏi hiển thị | `apple` |
| `dap_an_dung` | Bắt buộc | Đáp án đúng | `🍎 (ảnh táo)` |
| `dap_an_nhieu` | Tùy mode | Danh sách đáp án sai (số lượng tùy mode, xem 2.2) | `banana, grape, orange` |
| `anh_minh_hoa` | Tùy mode | Ảnh đính kèm nếu mode dùng hình ảnh | `img/fruit/apple.png` |
| `audio_phat_am` | Tùy chọn | Audio phát âm mẫu nếu mode có phần nghe | `audio/fruit/apple.mp3` |

### 2.2 Trường dữ liệu riêng theo từng chế độ game

| Chế độ game | Trường bổ sung cần chuẩn bị |
|---|---|
| **Ghép hình theo thời gian** | Số cặp ảnh cần ghép trong 1 lượt chơi; tốc độ xuất hiện theo độ khó. |
| **Lật thẻ ghi nhớ** | Danh sách cặp thẻ (mỗi cặp = 1 từ + 1 hình tương ứng); số cặp mỗi lượt chơi. |
| **Đua trả lời nhanh** | Bộ câu hỏi trắc nghiệm nhanh (1 câu + nhiều lựa chọn — dùng đúng khung dữ liệu loại `MULTIPLE_CHOICE` đã có trong ngân hàng câu hỏi). |
| **Bắn/rơi từ đúng** | Danh sách từ đúng + từ sai rơi ngẫu nhiên; tốc độ rơi theo độ khó. |
| **Vòng quay thưởng** | Không cần nội dung câu hỏi — chỉ cần danh sách phần thưởng + xác suất trúng mỗi ô (tổng xác suất = 100%). |
| **Đố vui 1-chọi-1 không đồng bộ** | Bộ câu hỏi dùng chung cho cả 2 người chơi (đối chiếu điểm sau khi cả 2 hoàn thành — không cần thêm trường riêng ngoài trường chung ở mục 2.1). |

**Lưu ý khi chuẩn bị:** nội dung game nên **ưu tiên tái dùng trực tiếp** ảnh/từ vựng đã có sẵn trong ngân hàng câu hỏi trẻ em (Phase 14) thay vì chuẩn bị bộ nội dung hoàn toàn mới — giảm đáng kể khối lượng biên tập. Theo khuyến nghị ở Phase 19, nên chuẩn bị nội dung cho 2–3 chế độ MVP trước (Lật thẻ ghi nhớ + Đua trả lời nhanh — vì tái dùng trực tiếp được, không cần trường dữ liệu phức tạp), các chế độ còn lại chuẩn bị sau khi MVP có phản hồi thực tế.

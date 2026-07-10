# Tóm tắt nhanh: Mở rộng nền tảng cho Trẻ em & Tiểu học

*Bản rút gọn dành cho đội khác tham khảo nhanh — bản đầy đủ xem tại [Ke_hoach_Mo_rong_Tre_em_va_Tieu_hoc_V1.md](./Ke_hoach_Mo_rong_Tre_em_va_Tieu_hoc_V1.md) (nay đã có task cụ thể cho từng giai đoạn "Cao" + bảng so sánh nhà cung cấp chấm điểm phát âm với giá tham khảo). Bản có giá thành + deadline dự tính xem [Tom_tat_Chi_phi_va_Deadline_Mo_rong_Tre_em_Tieu_hoc.md](./Tom_tat_Chi_phi_va_Deadline_Mo_rong_Tre_em_Tieu_hoc.md). Sơ đồ luồng trực quan cho BA xem [So_do_Tong_Quat_Nghiep_Vu.md](./So_do_Tong_Quat_Nghiep_Vu.md) (bản kỹ thuật cho đội dev: [So_do_Ky_thuat.md](./So_do_Ky_thuat.md)). Khung chuẩn bị nội dung (bài phát âm + câu hỏi game) xem [Khung_Noi_dung_Phat_am_va_Game.md](./Khung_Noi_dung_Phat_am_va_Game.md). Ghi chú riêng về cải tiến IELTS (chưa ưu tiên) xem [Ghi_chu_Cai_tien_IELTS_theo_Dang_bai.md](./Ghi_chu_Cai_tien_IELTS_theo_Dang_bai.md).*

## Bối cảnh trong 3 câu

Dự án hiện tại (Anh ngữ Meridian) đang phục vụ học sinh/sinh viên luyện IELTS. Yêu cầu mới bổ sung 2 nhóm khách hàng tiếp theo — Trẻ em (3–6 tuổi) và Tiểu học (7–11 tuổi) — với mô hình học video + luyện tập tương tác + game hóa, có tài khoản phụ huynh quản lý. Đây là sản phẩm **cộng thêm**, không thay thế hay ảnh hưởng đến nhóm IELTS hiện tại.

## Tính khả thi theo từng chức năng

| Chức năng | Phục vụ nhóm | Tính khả thi | Vì sao |
|---|---|---|---|
| Tài khoản phụ huynh + hồ sơ nhiều con | Cả 2 | **Cao** | Đã có sẵn mô hình gần giống hệt (roster giáo viên–học sinh) trong hệ thống, chỉ cần lắp lại. |
| Điều hướng "Vào học" 3 cấp + trang chi tiết khóa | Cả 2 | **Trung bình – Cao** | Khung khóa học đã có sẵn; phần mới là logic "mở khóa buổi học tuần tự" — chưa từng làm trong hệ thống. |
| Video mẫu có phụ đề + tua theo đoạn | Cả 2 | **Trung bình** | Công nghệ chuẩn, không rủi ro lớn, nhưng cần viết mới phần phục vụ video mượt trên di động (chưa có sẵn). |
| Luyện từ vựng (ghép hình) | Cả 2 | **Cao** | Tái dùng gần như nguyên vẹn cơ chế chấm điểm đã có và đã kiểm thử kỹ. |
| Luyện cấu trúc câu (sắp xếp từ) | Cả 2 | **Cao** | Tương tự trên — tái dùng cơ chế có sẵn. |
| **Tách bạch ngân hàng câu hỏi trẻ em ↔ IELTS** | Cả 2 | **Cao** | Chỉ cần thêm 1 nhãn phân loại + 1 trang quản trị riêng, không phải xây lại từ đầu. |
| Ghi âm & nghe lại (cơ bản) | Cả 2 | **Cao** | Đã có tiền lệ upload/ghi âm hoạt động ổn định trong hệ thống hiện tại. |
| Dashboard tiến độ cho phụ huynh | Cả 2 | **Cao** | Tái dùng gần như nguyên khuôn mẫu báo cáo/gradebook đã có cho giáo viên. |
| Chấm điểm phát âm tự động | Cả 2 | **Trung bình** | Phụ thuộc hoàn toàn vào việc chọn nhà cung cấp dịch vụ bên thứ 3 (chưa chốt) — cần khảo sát/thử nghiệm trước. |
| **Lồng tiếng nhân vật + xuất file video** (riêng Trẻ em) | Trẻ em | **Thấp – Trung bình** | Hạng mục rủi ro kỹ thuật cao nhất toàn kế hoạch — cần xử lý ghép audio/video theo từng nhân vật. Cần thử nghiệm kỹ thuật trước khi cam kết lịch. |
| **Game hóa: mini-game + leaderboard + điểm thưởng** (riêng Tiểu học) | Tiểu học | **Trung bình** | Khối lượng công việc lớn nhất (nhiều game độc lập) nhưng không có rủi ro công nghệ lớn — khuyến nghị làm 2–3 game trước, không làm cả 6 cùng lúc. |

## 3 điều quan trọng nhất cần biết

1. **Nhóm IELTS hiện tại không bị ảnh hưởng gì** — toàn bộ là xây thêm song song trên cùng nền tảng.
2. **2 hạng mục rủi ro nhất** là lồng tiếng nhân vật (Trẻ em) và game hóa (Tiểu học) — cả hai nên thu hẹp phạm vi MVP trước khi cam kết lịch chính thức.
3. **Còn 5 điểm chưa chốt** từ phía sản phẩm (thời lượng video, nội dung khóa học, nhà cung cấp chấm điểm phát âm, chính sách dữ liệu giọng nói trẻ em...) — đây là rủi ro tiến độ lớn hơn cả rủi ro kỹ thuật, nên giải quyết sớm song song với lúc bắt đầu code.
4. **IELTS chưa nằm trong phạm vi kế hoạch này** — có 1 yêu cầu riêng đã ghi nhận (xây lại ngân hàng câu hỏi IELTS theo đúng "dạng bài" thi thật thay vì loại kỹ thuật chung hiện tại), nhưng **chưa lên lịch/chưa khảo sát tính khả thi** — xem ghi chú riêng.
5. **Ra mắt thật đầu tiên là 1 bản MVP hẹp, cuối tháng 7/2026** — chỉ điều hướng tối giản + video cơ bản + luyện từ vựng/câu (~12 ngày làm việc), **chưa có** phụ huynh/ghi âm/chấm điểm phát âm/game hóa. Toàn bộ bảng trên vẫn là lộ trình đúng, nhưng nay là **lộ trình v2** (làm sau MVP) — chi tiết phạm vi MVP xem [Tom_tat_Chi_phi_va_Deadline_Mo_rong_Tre_em_Tieu_hoc.md](./Tom_tat_Chi_phi_va_Deadline_Mo_rong_Tre_em_Tieu_hoc.md) mục 0.

**Tổng thời gian ước tính cho phạm vi đầy đủ (v2 trở đi): 69–103 ngày làm việc** (chi tiết từng giai đoạn xem bản đầy đủ).

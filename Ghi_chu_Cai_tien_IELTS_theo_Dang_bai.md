# Ghi chú: Xây dựng lại ngân hàng câu hỏi IELTS theo hướng "dạng bài"

**Trạng thái: chưa ưu tiên, chưa lên lịch.** Tài liệu này chỉ ghi nhận lại yêu cầu và phân tích khoảng cách hiện tại, để không bị quên — **không phải một phase trong [Ke_hoach_Mo_rong_Tre_em_va_Tieu_hoc_V1.md](./Ke_hoach_Mo_rong_Tre_em_va_Tieu_hoc_V1.md)**, vốn tập trung vào mở rộng Trẻ em & Tiểu học. Khi nào việc này trở thành ưu tiên, cần làm lại bước khảo sát tính khả thi/thời gian/công nghệ đầy đủ như đã làm cho kế hoạch Trẻ em & Tiểu học.

---

## Vấn đề

Hệ thống hiện tại tổ chức câu hỏi theo **8 loại kỹ thuật chung** (`QuestionType`): `MULTIPLE_CHOICE`, `TRUE_FALSE_NOT_GIVEN`, `MATCHING`, `SHORT_ANSWER`, `ESSAY`, `DRAG_DROP_TEXT`, `DRAG_DROP_MARKER`, `CLOZE`. Đây là cách phân loại theo **cơ chế nhập liệu/chấm điểm** (tiện cho kỹ thuật), không phải theo **"dạng bài" chính thức của đề thi IELTS thật** (tiện cho người ra đề và đúng với trải nghiệm thi thật của học viên).

Hệ quả: một số dạng bài thật trong đề IELTS đang phải "gán tạm" vào loại kỹ thuật gần giống nhất, dẫn đến giao diện nhập câu hỏi lẫn giao diện làm bài không khớp đúng quy ước trình bày của đề thi thật. Ví dụ cụ thể đã gặp trong dữ liệu hiện có:

- **Matching Headings** (chọn tiêu đề i, ii, iii... cho từng đoạn văn — đề thật hiển thị *toàn bộ danh sách tiêu đề 1 lần ở đầu*, sau đó 1 ô chọn cho mỗi đoạn) hiện không có dạng riêng — phải dùng `MATCHING` (cặp trái-phải tự do) hoặc `DRAG_DROP_TEXT` (dropdown theo từng chỗ trống), cả hai đều không hiển thị đúng bố cục "danh sách tiêu đề dùng chung" như đề thật.
- **Matching Features** (ghép nhiều nhận định với một danh sách CỐ ĐỊNH ngắn — ví dụ ghép phát hiện khoa học với tên nhà khoa học, A–E) — dữ liệu thực tế trong hệ thống ("Questions 10-13... Match each statement with the correct person, A-E") đang dùng `DRAG_DROP_TEXT` (dropdown mỗi câu), khác hẳn quy ước thật.
- **Table/Flow-chart Completion** (điền vào bảng có đường kẻ ô thật, hoặc sơ đồ luồng có hình mũi tên) — hiện dùng chung `CLOZE` như completion dạng văn xuôi, chưa có bố cục bảng/sơ đồ trực quan.
- **Identifying Writer's Views/Claims** (Yes/No/Not Given — nhận định của tác giả) về bản chất là dạng bài khác **Identifying Information** (True/False/Not Given — sự kiện khách quan), dù cấu trúc 3 lựa chọn giống nhau — đang dùng chung 1 loại `TRUE_FALSE_NOT_GIVEN`, có thể gây nhầm hướng dẫn cho học viên khi làm bài (2 dạng có câu dẫn/hướng dẫn khác nhau trên đề thật).

## Hướng đề xuất (khi được ưu tiên)

Tổ chức lại ngân hàng câu hỏi IELTS theo đúng danh sách "dạng bài" chính thức thay vì 8 loại kỹ thuật chung, mỗi dạng bài có **1 form nhập liệu riêng** (cho giáo viên soạn đề) và **1 component hiển thị riêng** (cho học viên làm bài) khớp đúng quy ước trình bày của đề thi thật — trong khi vẫn có thể **dùng chung phía dưới** cơ chế chấm điểm/lưu trữ hiện có nếu bản chất dữ liệu giống nhau (ví dụ Matching Headings và Matching Features vẫn có thể lưu dạng cặp key-value như `MATCHING` hiện tại, chỉ khác ở form nhập + giao diện hiển thị).

Danh sách dạng bài Reading chính thức cần cân nhắc: Multiple Choice, Identifying Information (T/F/NG), Identifying Writer's Views (Y/N/NG), Matching Information, Matching Headings, Matching Features, Matching Sentence Endings, Sentence Completion, Summary/Note/Table/Flow-chart Completion (4 biến thể trình bày khác nhau), Diagram Label Completion, Short-answer Questions. Danh sách Listening có tập hợp tương tự với vài khác biệt (Form/Note/Table/Flow-chart/Summary Completion, Plan/Map/Diagram Labelling).

## Việc cần làm trước khi lên lịch chính thức

1. Kiểm kê lại toàn bộ câu hỏi IELTS hiện có trong hệ thống, phân loại xem đang "gán tạm" theo dạng bài thật nào — ước lượng khối lượng dữ liệu cần chuyển đổi.
2. Quyết định: xây dạng bài mới hoàn toàn song song (không đụng dữ liệu cũ), hay viết migration chuyển đổi dữ liệu hiện có sang cấu trúc mới.
3. Áp dụng đúng quy trình đã dùng cho kế hoạch Trẻ em & Tiểu học: khảo sát tính khả thi/thời gian/công nghệ theo từng dạng bài cụ thể trước khi cam kết lịch.

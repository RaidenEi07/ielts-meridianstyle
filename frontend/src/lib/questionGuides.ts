export interface QuestionGuide {
  title: string;
  purpose: string;
  steps: string[];
  example?: string;
}

export const QUESTION_GUIDES: Record<string, QuestionGuide> = {
  MULTIPLE_CHOICE: {
    title: "Trắc nghiệm",
    purpose: "Học viên chọn 1 hoặc nhiều đáp án đúng trong danh sách lựa chọn.",
    steps: [
      "Nhập câu hỏi ở ô \"Nội dung câu hỏi\".",
      "Thêm các lựa chọn bên dưới.",
      "Tick vào ô bên trái lựa chọn đúng (có thể tick nhiều ô nếu cho phép nhiều đáp án đúng).",
    ],
    example: "\"Thủ đô của Việt Nam là gì?\" → Hà Nội (✓), TP.HCM, Đà Nẵng.",
  },
  TRUE_FALSE_NOT_GIVEN: {
    title: "Đúng/Sai/NG",
    purpose:
      "Học viên xác định 1 câu khẳng định là Đúng, Sai, hay Không được đề cập trong đoạn văn.",
    steps: [
      "Nhập 1 câu khẳng định (statement) ở ô nội dung.",
      "Nên gắn kèm 1 Passage để học viên có ngữ cảnh trả lời.",
      "Bộ 3 lựa chọn True/False/Not Given đã điền sẵn — đổi sang Yes/No/Not Given nếu câu hỏi về quan điểm người viết, rồi chọn đúng 1 ô tròn là đáp án đúng.",
    ],
  },
  MATCHING: {
    title: "Nối",
    purpose: "Học viên ghép mỗi mục ở vế trái với đáp án đúng tương ứng ở vế phải.",
    steps: [
      "Tạo các cặp: vế trái (mục cần nối) — vế phải (đáp án đúng).",
      "Học viên sẽ thấy vế phải bị xáo trộn để tự ghép.",
    ],
    example: "Nhật Bản ↔ Trà xanh, Anh ↔ Trà đen.",
  },
  SHORT_ANSWER: {
    title: "Trả lời ngắn",
    purpose: "Học viên gõ tự do một câu trả lời ngắn.",
    steps: [
      "Nhập câu hỏi ở ô nội dung.",
      "Liệt kê mọi cách viết đúng ở \"Đáp án chấp nhận\", cách nhau bởi dấu phẩy.",
      "Bật \"phân biệt hoa/thường\" nếu cần khớp tuyệt đối.",
    ],
    example: "\"nước, Nước\" đều được chấp nhận nếu không tick phân biệt hoa/thường.",
  },
  ESSAY: {
    title: "Tự luận",
    purpose: "Dùng cho bài viết luận (Writing Task) — luôn cần giáo viên chấm tay.",
    steps: [
      "Nhập đề bài ở ô nội dung.",
      "Có thể đặt giới hạn số từ.",
      "Thêm tiêu chí chấm (rubric) để tham khảo khi chấm — không dùng để tự động chấm điểm.",
    ],
  },
  DRAG_DROP_TEXT: {
    title: "Kéo thả văn bản",
    purpose: "Học viên chọn từ/cụm từ điền vào chỗ trống trong câu.",
    steps: [
      "Viết câu với chỗ trống đánh dấu [[1]], [[2]]... trong ô \"Mẫu câu\".",
      "Thêm các mục kéo-thả, ô \"Vị trí đúng\" ghi đúng số khớp với dấu ngoặc.",
    ],
    example: "\"The [[1]] orbits the [[2]].\" → Earth=1, Sun=2.",
  },
  DRAG_DROP_MARKER: {
    title: "Kéo thả ảnh",
    purpose:
      "Học viên gán mỗi mục vào đúng vị trí/vùng trên một hình ảnh (bản đồ, sơ đồ...).",
    steps: [
      "Nhập URL ảnh nền.",
      "Vẽ các vùng bằng tọa độ (x, y, rộng, cao) và đặt nhãn (A, B...).",
      "Thêm mục kéo-thả, ô \"Nhãn vùng đúng\" ghi đúng nhãn đó.",
    ],
  },
  CLOZE: {
    title: "Điền khuyết",
    purpose: "Học viên điền vào nhiều chỗ trống ngay trong đoạn văn.",
    steps: [
      "Đặt con trỏ vào vị trí muốn tạo ô trống, bấm \"Chèn ô trống\" ở thanh công cụ.",
      "Nhập đáp án chấp nhận ngay trong ô vừa hiện ra — chọn \"Nhập chữ\" (gõ tự do) hoặc \"Chọn từ danh sách\" (cho sẵn lựa chọn). Bấm lại vào ô trống bất kỳ lúc nào để sửa đáp án.",
    ],
    example: "Gõ \"Thủ đô Pháp là \", bấm Chèn ô trống, nhập đáp án \"Paris\".",
  },
  GRID_MATCHING: {
    title: "Trắc nghiệm dạng lưới",
    purpose:
      "Học viên chọn 1 cột đúng cho mỗi hàng trong bảng — dùng cho Matching Features hoặc dán nhãn sơ đồ kiểu bảng.",
    steps: [
      "Khai báo các cột dùng chung (vd: A, B, C).",
      "Thêm từng hàng và chọn đúng 1 cột là đáp án cho hàng đó.",
      "Học viên sẽ thấy bảng thật với 1 ô chọn (radio) mỗi hàng × cột.",
    ],
    example: "Cột: Nhật Bản / Anh. Hàng: \"Trà xanh\" → đúng cột Nhật Bản.",
  },
};

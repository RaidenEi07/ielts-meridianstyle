const TFNG_SIGNATURES = new Set(["YES|NO|NOT GIVEN", "TRUE|FALSE|NOT GIVEN"]);

/** Nội dung Moodle di chuyển lưu Yes/No/Not-Given hay True/False/Not-Given
 * dưới dạng MULTIPLE_CHOICE thường (không có bản ghi TRUE_FALSE_NOT_GIVEN
 * thật) — nhận diện đúng bộ 3 đáp án chuẩn này để luôn hiện riêng từng câu,
 * dạng radio 1-chọn-1, không gộp thành bảng lưới như cụm Matching Features. */
export function isTfngOptionSet(optionContents: string[]): boolean {
  if (optionContents.length !== 3) return false;
  const signature = optionContents.map((c) => c.trim().toUpperCase()).join("|");
  return TFNG_SIGNATURES.has(signature);
}

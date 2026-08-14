import { generateHTML } from "@tiptap/core";
import type { Extensions, JSONContent } from "@tiptap/core";
import type { ClozeBlankAttrs } from "@/components/richtext/ClozeBlankExtension";
import { clozeBlankHtml } from "@/components/richtext/ClozeBlankExtension";
import type { QuestionClozeSubAnswer } from "@/lib/types";

/**
 * Nạp lại câu hỏi Cloze cũ (marker `{n}` trong `stem`, đáp án nằm ở
 * `clozeSubAnswers` khớp theo `subIndex`) thành HTML chứa chip tương tác —
 * chạy 1 lần khi khởi tạo state `stem` (lazy initializer), TRƯỚC khi
 * RichTextEditor dựng editor, để TipTap tự parse ra node `clozeBlank` qua
 * `parseHTML` của ClozeBlankExtension. Marker không khớp được với đáp án nào
 * (dữ liệu cũ bị lệch) vẫn tạo chip — chỉ là rỗng đáp án (hiện cảnh báo trong
 * ClozeBlankView) — không được bỏ qua/xóa âm thầm.
 */
export function preprocessClozeStemForEditing(
  stemHtml: string,
  clozeSubAnswers: QuestionClozeSubAnswer[],
): string {
  return stemHtml.replace(/\{(\d+)\}/g, (_match, numStr: string) => {
    const subIndex = Number(numStr);
    const found = clozeSubAnswers.find((c) => c.subIndex === subIndex);
    const attrs: ClozeBlankAttrs = {
      answers: Array.isArray(found?.acceptedAnswers) ? found.acceptedAnswers : [],
      caseSensitive: Boolean(found?.caseSensitive),
      subType: found?.subType === "SELECT" ? "SELECT" : "TEXT",
      options: Array.isArray(found?.options) ? found.options : null,
    };
    return clozeBlankHtml(attrs);
  });
}

/**
 * Lúc lưu: duyệt toàn bộ cây JSON của editor (kể cả trong bảng/danh sách),
 * mỗi node `clozeBlank` gặp theo đúng thứ tự tài liệu được gán `subIndex`
 * tăng dần và thay bằng text `{n}` — rồi chuyển cây đã thay về HTML bằng
 * schema gốc (không có ClozeBlankExtension, vì lúc này không còn node đó
 * nữa). Kết quả `stem`/`clozeSubAnswers` giữ đúng hình dạng cũ, chấm điểm
 * (GradingService.gradeCloze) không cần đổi gì.
 */
export function serializeClozeEditorState(
  doc: JSONContent,
  extensions: Extensions,
): { stem: string; clozeSubAnswers: QuestionClozeSubAnswer[] } {
  const clozeSubAnswers: QuestionClozeSubAnswer[] = [];
  let counter = 0;

  function walk(node: JSONContent): JSONContent {
    if (node.type === "clozeBlank") {
      counter += 1;
      const subIndex = counter;
      const attrs = (node.attrs ?? {}) as Partial<ClozeBlankAttrs>;
      clozeSubAnswers.push({
        id: null,
        subIndex,
        subType: attrs.subType ?? "TEXT",
        acceptedAnswers: attrs.answers ?? [],
        options: attrs.options ?? null,
        sortOrder: subIndex - 1,
        caseSensitive: Boolean(attrs.caseSensitive),
      });
      return { type: "text", text: `{${subIndex}}` };
    }
    if (node.content) {
      return { ...node, content: node.content.map(walk) };
    }
    return node;
  }

  const transformed = walk(doc);
  const stem = generateHTML(transformed, extensions);
  return { stem, clozeSubAnswers };
}

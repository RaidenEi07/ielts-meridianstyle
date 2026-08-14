import { mergeAttributes, Node } from "@tiptap/core";
import { ReactNodeViewRenderer } from "@tiptap/react";
import { ClozeBlankView } from "./ClozeBlankView";

export interface ClozeBlankAttrs {
  answers: string[];
  caseSensitive: boolean;
  subType: "TEXT" | "SELECT";
  options: string[] | null;
}

function encodeAttr(value: unknown): string {
  return encodeURIComponent(JSON.stringify(value));
}

function decodeAttr<T>(raw: string | null, fallback: T): T {
  if (!raw) return fallback;
  try {
    return JSON.parse(decodeURIComponent(raw)) as T;
  } catch {
    return fallback;
  }
}

/**
 * Ô trống Cloze soạn nội tuyến — thay cho giáo viên tự gõ `{n}` rồi khớp tay
 * với 1 bảng đáp án tách biệt. Node atomic; `selectable: false` để Backspace
 * xóa được ngay lần đầu (không cần 2 lần); `marks: ""` để tránh phải xử lý
 * định dạng chữ (đậm/nghiêng) khi chuyển ngược sang text `{n}` lúc lưu.
 * Chỉ dùng để soạn — lúc lưu, mỗi node này bị thay bằng text `{n}` thật
 * (xem `serializeClozeEditorState` trong `@/lib/clozeStemTransform`), nên
 * `parseHTML`/`renderHTML` ở đây chỉ cần đủ để soạn/nạp lại trong editor,
 * không phải định dạng cuối cùng gửi lên server.
 */
export const ClozeBlankExtension = Node.create({
  name: "clozeBlank",
  group: "inline",
  inline: true,
  atom: true,
  selectable: false,
  marks: "",

  addAttributes() {
    return {
      answers: {
        default: [] as string[],
        parseHTML: (el) => decodeAttr<string[]>(el.getAttribute("data-answers"), []),
        renderHTML: (attrs) => ({ "data-answers": encodeAttr(attrs.answers) }),
      },
      caseSensitive: {
        default: false,
        parseHTML: (el) => el.getAttribute("data-case-sensitive") === "true",
        renderHTML: (attrs) => ({ "data-case-sensitive": String(Boolean(attrs.caseSensitive)) }),
      },
      subType: {
        default: "TEXT",
        parseHTML: (el) => (el.getAttribute("data-sub-type") === "SELECT" ? "SELECT" : "TEXT"),
        renderHTML: (attrs) => ({ "data-sub-type": attrs.subType }),
      },
      options: {
        default: null as string[] | null,
        parseHTML: (el) => decodeAttr<string[] | null>(el.getAttribute("data-options"), null),
        renderHTML: (attrs) =>
          attrs.options ? { "data-options": encodeAttr(attrs.options) } : {},
      },
    };
  },

  parseHTML() {
    return [{ tag: "span[data-cloze-blank]" }];
  },

  renderHTML({ HTMLAttributes }) {
    return ["span", mergeAttributes(HTMLAttributes, { "data-cloze-blank": "true" })];
  },

  addNodeView() {
    return ReactNodeViewRenderer(ClozeBlankView);
  },
});

/** Dựng đúng chuỗi HTML mà `parseHTML` ở trên nhận diện được — dùng khi nạp
 * lại câu hỏi Cloze cũ (marker `{n}` trong `stem`) thành chip tương tác. */
export function clozeBlankHtml(attrs: ClozeBlankAttrs): string {
  const parts = [
    `data-cloze-blank="true"`,
    `data-answers="${encodeAttr(attrs.answers)}"`,
    `data-case-sensitive="${String(attrs.caseSensitive)}"`,
    `data-sub-type="${attrs.subType}"`,
  ];
  if (attrs.options) parts.push(`data-options="${encodeAttr(attrs.options)}"`);
  return `<span ${parts.join(" ")}></span>`;
}

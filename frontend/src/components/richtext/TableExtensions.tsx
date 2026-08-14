import { Table, TableCell, TableHeader, TableRow } from "@tiptap/extension-table";

/** Ô bảng (td/th) mở rộng thêm border-width/style/color + căn giữa theo
 * chiều dọc — lưu ra HTML là style inline ngay trên từng ô (không phụ
 * thuộc CSS global của trang nào) nên hiển thị đúng y hệt ở mọi nơi render
 * lại HTML thô sau này (đề bài xem lại, xem trước ở admin...), không chỉ
 * trong lúc soạn. Căn ngang (trái/giữa/phải) dùng chung TextAlign extension
 * (xem RichTextEditor.tsx — "tableCell"/"tableHeader" đã có trong types),
 * không cần thêm gì riêng ở đây.
 *
 * Mỗi attribute tự trả renderHTML rỗng ({}) — cách TipTap chuẩn để 1 node
 * gộp NHIỀU attribute rời rạc vào 1 thuộc tính "style" DUY NHẤT (nếu mỗi
 * attribute tự set "style" riêng thì cái sau sẽ ghi đè cái trước) — build
 * gộp lại 1 lần ở renderHTML cấp NODE bên dưới.
 */
function borderAttrs() {
  return {
    borderWidth: {
      default: null as number | null,
      parseHTML: (el: HTMLElement) => {
        const w = el.style.borderWidth ? parseInt(el.style.borderWidth, 10) : null;
        return Number.isFinite(w) ? w : null;
      },
      renderHTML: () => ({}),
    },
    borderStyle: {
      default: null as string | null,
      parseHTML: (el: HTMLElement) => el.style.borderStyle || null,
      renderHTML: () => ({}),
    },
    borderColor: {
      default: null as string | null,
      parseHTML: (el: HTMLElement) => el.style.borderColor || null,
      renderHTML: () => ({}),
    },
    verticalAlign: {
      default: null as string | null,
      parseHTML: (el: HTMLElement) => el.style.verticalAlign || null,
      renderHTML: () => ({}),
    },
  };
}

function extraCellStyle(attrs: {
  borderWidth?: number | null;
  borderStyle?: string | null;
  borderColor?: string | null;
  verticalAlign?: string | null;
}): string {
  const parts: string[] = [];
  if (attrs.borderWidth != null && attrs.borderStyle) {
    parts.push(`border: ${attrs.borderWidth}px ${attrs.borderStyle} ${attrs.borderColor ?? "#000000"}`);
  }
  if (attrs.verticalAlign) parts.push(`vertical-align: ${attrs.verticalAlign}`);
  return parts.join("; ");
}

export const CustomTableCell = TableCell.extend({
  addAttributes() {
    return { ...this.parent?.(), ...borderAttrs() };
  },
  renderHTML({ HTMLAttributes, node }) {
    const extra = extraCellStyle(node.attrs);
    if (!extra) return ["td", HTMLAttributes, 0];
    const style = HTMLAttributes.style ? `${HTMLAttributes.style}; ${extra}` : extra;
    return ["td", { ...HTMLAttributes, style }, 0];
  },
});

export const CustomTableHeader = TableHeader.extend({
  addAttributes() {
    return { ...this.parent?.(), ...borderAttrs() };
  },
  renderHTML({ HTMLAttributes, node }) {
    const extra = extraCellStyle(node.attrs);
    if (!extra) return ["th", HTMLAttributes, 0];
    const style = HTMLAttributes.style ? `${HTMLAttributes.style}; ${extra}` : extra;
    return ["th", { ...HTMLAttributes, style }, 0];
  },
});

export const CustomTable = Table.configure({ resizable: true });
export const CustomTableRow = TableRow;

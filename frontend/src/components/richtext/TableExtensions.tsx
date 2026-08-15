import { Table, TableCell, TableHeader, TableRow, TableView } from "@tiptap/extension-table";
import type { Node as ProseMirrorNode } from "@tiptap/pm/model";

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

/** Bảng bật resizable (kéo giãn cột) dùng NodeView riêng của thư viện
 * (TableView) — NodeView đó tự dựng thẻ <table> bằng document.createElement
 * và chỉ áp style 1 LẦN lúc khởi tạo; hàm update(node) của nó (chạy mỗi khi
 * đổi attribute mà KHÔNG dựng lại node — đúng trường hợp bấm nút căn giữa
 * sau khi bảng đã có sẵn) chỉ gọi updateColumns cho độ rộng cột, bỏ qua mọi
 * attribute khác. Vì vậy attribute "align" set qua renderHTML KHÔNG BAO GIỜ
 * lên lại DOM khi đổi live — phải kế thừa TableView, ghi đè update() để tự
 * đồng bộ margin theo align mỗi lần. Set trực tiếp style.marginLeft/Right
 * (không dùng cssText) để không đè mất width/minWidth mà updateColumns vừa
 * set trong super.update(). */
class AlignAwareTableView extends TableView {
  update(node: ProseMirrorNode): boolean {
    const ok = super.update(node);
    if (ok) {
      const align = (node.attrs as { align?: string | null }).align;
      if (align === "center") {
        this.table.style.marginLeft = "auto";
        this.table.style.marginRight = "auto";
      } else if (align === "right") {
        this.table.style.marginLeft = "auto";
        this.table.style.marginRight = "0";
      } else {
        this.table.style.marginLeft = "";
        this.table.style.marginRight = "";
      }
    }
    return ok;
  }
}

/** Căn CẢ KHỐI bảng trong khung soạn (trái/giữa/phải) — khác với căn CHỮ
 * trong từng ô (TextAlign, xem RichTextEditor.tsx). Bảng là phần tử block
 * nên margin auto mới canh giữa được (text-align chỉ canh nội dung INLINE
 * bên trong 1 khối, không tự di chuyển được cả khối). */
export const CustomTable = Table.extend({
  addOptions() {
    return {
      ...this.parent!(),
      View: AlignAwareTableView,
    };
  },
  addAttributes() {
    return {
      ...this.parent?.(),
      align: {
        default: null as string | null,
        parseHTML: (el: HTMLElement) => {
          if (el.style.marginLeft === "auto" && el.style.marginRight === "auto") return "center";
          if (el.style.marginLeft === "auto") return "right";
          return null;
        },
        renderHTML: (attrs: { align: string | null }) => {
          if (attrs.align === "center") return { style: "margin-left: auto; margin-right: auto;" };
          if (attrs.align === "right") return { style: "margin-left: auto; margin-right: 0;" };
          return {};
        },
      },
    };
  },
}).configure({ resizable: true });
export const CustomTableRow = TableRow;

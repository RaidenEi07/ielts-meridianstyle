import Image from "@tiptap/extension-image";
import { ReactNodeViewRenderer } from "@tiptap/react";
import { ResizableImageView } from "./ResizableImageView";

/** Mở rộng ảnh chuẩn của TipTap thêm attr `width` (px) + node view kéo-thả
 * để chỉnh kích thước ngay trong lúc soạn — xem ResizableImageView.tsx. HTML
 * lưu ra vẫn chỉ là <img style="width:...">, không cần đổi gì phía backend/
 * chỗ hiển thị lại (stripInlineTextColors và các nơi render HTML thô khác
 * đã xử lý style inline sẵn). */
export const ResizableImage = Image.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      width: {
        default: null,
        parseHTML: (el: HTMLElement) => {
          const styleWidth = el.style.width ? parseInt(el.style.width, 10) : null;
          if (styleWidth) return styleWidth;
          const attrWidth = el.getAttribute("width");
          return attrWidth ? parseInt(attrWidth, 10) : null;
        },
        renderHTML: (attrs: { width: number | null }) =>
          attrs.width ? { style: `width: ${attrs.width}px` } : {},
      },
    };
  },
  addNodeView() {
    return ReactNodeViewRenderer(ResizableImageView);
  },
});

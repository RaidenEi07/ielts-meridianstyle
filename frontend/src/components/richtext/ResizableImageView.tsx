"use client";

import { NodeViewWrapper } from "@tiptap/react";
import type { ReactNodeViewProps } from "@tiptap/react";
import { useCallback, useRef, useState } from "react";

/** Ảnh chèn trong nội dung câu hỏi/đoạn văn — kéo núm ở góc dưới-phải để
 * chỉnh kích thước (lưu vào node attr `width`, tính bằng px). Giữ tỉ lệ gốc
 * (chỉ set width, height tự theo do ảnh có aspect-ratio riêng) — khớp cách
 * hầu hết trình soạn thảo tài liệu xử lý resize ảnh. */
export function ResizableImageView({ node, updateAttributes, selected }: ReactNodeViewProps) {
  const imgRef = useRef<HTMLImageElement>(null);
  const [resizing, setResizing] = useState(false);
  const width = node.attrs.width as number | null;

  const onHandleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      const img = imgRef.current;
      if (!img) return;
      const startX = e.clientX;
      const startWidth = img.getBoundingClientRect().width;
      setResizing(true);

      function onMouseMove(ev: MouseEvent) {
        const next = Math.round(Math.max(40, startWidth + (ev.clientX - startX)));
        updateAttributes({ width: next });
      }
      function onMouseUp() {
        setResizing(false);
        window.removeEventListener("mousemove", onMouseMove);
        window.removeEventListener("mouseup", onMouseUp);
      }
      window.addEventListener("mousemove", onMouseMove);
      window.addEventListener("mouseup", onMouseUp);
    },
    [updateAttributes],
  );

  return (
    <NodeViewWrapper as="span" className="relative inline-block align-bottom" style={{ lineHeight: 0 }}>
      <img
        ref={imgRef}
        src={node.attrs.src}
        alt={node.attrs.alt ?? ""}
        title={node.attrs.title ?? undefined}
        style={{ width: width ? `${width}px` : undefined, maxWidth: "100%", height: "auto" }}
        className={`rounded ${selected ? "outline outline-2 outline-primary" : ""}`}
        draggable={false}
      />
      {selected && (
        <span
          onMouseDown={onHandleMouseDown}
          role="presentation"
          className={`absolute bottom-0 right-0 h-3.5 w-3.5 translate-x-1/2 translate-y-1/2 cursor-se-resize rounded-full border-2 border-white bg-primary shadow ${
            resizing ? "opacity-100" : "opacity-80 hover:opacity-100"
          }`}
        />
      )}
    </NodeViewWrapper>
  );
}

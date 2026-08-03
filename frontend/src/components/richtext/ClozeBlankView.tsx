"use client";

import { NodeViewWrapper } from "@tiptap/react";
import type { ReactNodeViewProps } from "@tiptap/react";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import type { ClozeBlankAttrs } from "./ClozeBlankExtension";

function splitCsv(s: string): string[] {
  return s
    .split(",")
    .map((x) => x.trim())
    .filter(Boolean);
}

/** Chip đại diện 1 ô trống Cloze trong lúc soạn — bấm vào mở popover (qua
 * cổng vào document.body, position: fixed) để nhập/sửa đáp án chấp nhận tại
 * chỗ, không cần cuộn tới bảng riêng. Rỗng đáp án thì tô cảnh báo rõ ràng —
 * tránh lặp lại đúng lỗi "ô trống không ai chấm đúng được" mà cơ chế này
 * sinh ra để giải quyết. */
export function ClozeBlankView({ node, updateAttributes, deleteNode }: ReactNodeViewProps) {
  const attrs = node.attrs as ClozeBlankAttrs;
  const [open, setOpen] = useState(attrs.answers.length === 0);
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);
  const chipRef = useRef<HTMLButtonElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);

  const [answersText, setAnswersText] = useState(attrs.answers.join(", "));
  const [optionsText, setOptionsText] = useState((attrs.options ?? []).join(", "));

  function reposition() {
    const el = chipRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    setPos({ top: r.bottom + 6, left: Math.min(r.left, window.innerWidth - 320) });
  }

  useEffect(() => {
    if (!open) return;
    reposition();
    const onScroll = () => reposition();
    const onResize = () => reposition();
    window.addEventListener("scroll", onScroll, true);
    window.addEventListener("resize", onResize);
    return () => {
      window.removeEventListener("scroll", onScroll, true);
      window.removeEventListener("resize", onResize);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    function onMouseDown(e: MouseEvent) {
      const target = e.target as Node;
      if (chipRef.current?.contains(target)) return;
      if (popoverRef.current?.contains(target)) return;
      setOpen(false);
    }
    document.addEventListener("mousedown", onMouseDown);
    return () => document.removeEventListener("mousedown", onMouseDown);
  }, [open]);

  const hasAnswers = attrs.answers.length > 0;

  return (
    <NodeViewWrapper as="span" className="relative inline-block" contentEditable={false}>
      <button
        ref={chipRef}
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={`mx-0.5 inline-flex items-center rounded-full border px-2 py-0.5 align-middle text-sm font-medium ${
          hasAnswers
            ? "border-primary bg-primary-soft text-primary"
            : "border-red bg-red-soft text-red"
        }`}
      >
        {hasAnswers ? attrs.answers.join(", ") : "(chưa có đáp án)"}
      </button>

      {open &&
        pos &&
        createPortal(
          <div
            ref={popoverRef}
            style={{ position: "fixed", top: pos.top, left: pos.left, zIndex: 1000 }}
            className="w-80 space-y-2 rounded-lg border border-border bg-surface p-3 shadow-lg"
          >
            <label className="block">
              <span className="mb-1 block text-xs font-medium text-muted">
                Đáp án chấp nhận, cách nhau bởi dấu phẩy
              </span>
              <input
                autoFocus
                value={answersText}
                onChange={(e) => {
                  setAnswersText(e.target.value);
                  updateAttributes({ answers: splitCsv(e.target.value) });
                }}
                placeholder="Paris, paris"
                className="input text-sm"
              />
            </label>

            <label className="block">
              <span className="mb-1 block text-xs font-medium text-muted">Loại</span>
              <select
                value={attrs.subType}
                onChange={(e) => updateAttributes({ subType: e.target.value })}
                className="input text-sm"
              >
                <option value="TEXT">Nhập chữ</option>
                <option value="SELECT">Chọn từ danh sách</option>
              </select>
            </label>

            {attrs.subType === "SELECT" && (
              <label className="block">
                <span className="mb-1 block text-xs font-medium text-muted">
                  Các lựa chọn hiển thị, cách nhau bởi dấu phẩy
                </span>
                <input
                  value={optionsText}
                  onChange={(e) => {
                    setOptionsText(e.target.value);
                    updateAttributes({ options: splitCsv(e.target.value) });
                  }}
                  placeholder="Paris, London, Tokyo"
                  className="input text-sm"
                />
              </label>
            )}

            <label className="flex items-center gap-2 text-xs text-muted">
              <input
                type="checkbox"
                checked={attrs.caseSensitive}
                onChange={(e) => updateAttributes({ caseSensitive: e.target.checked })}
              />
              Phân biệt hoa/thường
            </label>

            <div className="flex items-center justify-between border-t border-border pt-2">
              <button
                type="button"
                onClick={() => deleteNode()}
                className="text-xs font-semibold text-red"
              >
                Xóa ô trống
              </button>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="text-xs font-semibold text-accent"
              >
                Xong
              </button>
            </div>
          </div>,
          document.body,
        )}
    </NodeViewWrapper>
  );
}

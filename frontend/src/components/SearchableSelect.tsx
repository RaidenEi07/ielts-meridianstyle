"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

export interface SearchableSelectOption {
  value: number;
  label: string;
}

/** Dropdown luôn hiện qua cổng vào document.body (position: fixed, toạ độ tự
 * tính từ getBoundingClientRect() của ô input) — nếu để position: absolute
 * bình thường, dropdown dài (nhiều lựa chọn) sẽ đè lên nội dung nằm ngay dưới
 * nó trong luồng trang (vd ô "Passage" đè lên nhãn/ô soạn "Nội dung câu hỏi"
 * ngay dưới, trông như 2 phần bị lẫn vào nhau) — không chỉ trong modal cuộn,
 * mà ngay cả ở trang thường vì dropdown vốn nằm ngoài luồng layout (absolute)
 * nhưng vẫn vẽ đè lên (z-20) bất kể phía dưới có gì. */
export function SearchableSelect({
  options,
  value,
  onChange,
  placeholder = "— Chọn —",
  allowClear,
  clearLabel = "— Không chọn —",
}: {
  options: SearchableSelectOption[];
  value: number | "";
  onChange: (value: number | "") => void;
  placeholder?: string;
  allowClear?: boolean;
  clearLabel?: string;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [pos, setPos] = useState<{ top: number; left: number; width: number } | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLUListElement>(null);

  const selected = options.find((o) => o.value === value);
  const filtered = query
    ? options.filter((o) => o.label.toLowerCase().includes(query.toLowerCase()))
    : options;

  function reposition() {
    const el = containerRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    setPos({ top: r.bottom + 4, left: r.left, width: r.width });
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
    function onClickOutside(e: MouseEvent) {
      const target = e.target as Node;
      if (containerRef.current?.contains(target)) return;
      if (dropdownRef.current?.contains(target)) return;
      setOpen(false);
      setQuery("");
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  return (
    <div ref={containerRef} className="relative">
      <input
        value={open ? query : (selected?.label ?? "")}
        onChange={(e) => setQuery(e.target.value)}
        onFocus={() => {
          setOpen(true);
          setQuery("");
        }}
        placeholder={placeholder}
        className="input"
        autoComplete="off"
      />
      {open &&
        pos &&
        createPortal(
          <ul
            ref={dropdownRef}
            style={{ position: "fixed", top: pos.top, left: pos.left, width: pos.width }}
            className="z-[200] max-h-60 overflow-y-auto rounded-lg border border-border bg-surface shadow-lg"
          >
            {allowClear && (
              <li>
                <button
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => {
                    onChange("");
                    setOpen(false);
                    setQuery("");
                  }}
                  className="block w-full px-3 py-2 text-left text-sm text-muted hover:bg-soft"
                >
                  {clearLabel}
                </button>
              </li>
            )}
            {filtered.length === 0 && (
              <li className="px-3 py-2 text-sm text-muted">Không tìm thấy</li>
            )}
            {filtered.map((o) => (
              <li key={o.value}>
                <button
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => {
                    onChange(o.value);
                    setOpen(false);
                    setQuery("");
                  }}
                  className={`block w-full px-3 py-2 text-left text-sm hover:bg-soft ${
                    o.value === value ? "bg-primary-soft text-primary" : ""
                  }`}
                >
                  {o.label}
                </button>
              </li>
            ))}
          </ul>,
          document.body,
        )}
    </div>
  );
}

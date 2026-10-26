"use client";

// Tải về 1 bảng dạng CSV (mở bằng Excel): có BOM UTF-8 để tiếng Việt không lỗi font.
// Tách riêng khỏi lib/export.ts vì file đó kéo theo thư viện tạo PDF (nặng) mà các trang chỉ cần CSV.

function triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function csvCell(value: string | number | null | undefined): string {
  const s = value == null ? "" : String(value);
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function downloadCsvTable(
  filename: string,
  header: string[],
  rows: (string | number | null | undefined)[][],
) {
  const lines = [header, ...rows].map((r) => r.map(csvCell).join(","));
  triggerDownload(
    new Blob(["﻿" + lines.join("\r\n")], { type: "text/csv;charset=utf-8" }),
    filename,
  );
}

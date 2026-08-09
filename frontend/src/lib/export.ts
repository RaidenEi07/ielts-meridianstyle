"use client";

import jsPDF from "jspdf";
import { TYPE_META } from "@/lib/questionTypes";
import type { AnswerGradingDto, GradebookRow } from "@/lib/types";

/** Chỉ dùng ở admin/giáo viên (GradebookTable đã tự giới hạn hiển thị nút này
 * theo `token`) — không phơi cho học sinh xuất điểm người khác. */

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
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

function fmtDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("vi-VN");
}

function safeFilePart(s: string): string {
  return s.trim().replace(/\s+/g, "-").replace(/[^\w-]/g, "");
}

/** Xuất toàn bộ sổ điểm (danh sách bài + điểm cao nhất + từng lượt làm) ra CSV
 * — mở trực tiếp bằng Excel. Thêm BOM UTF-8 để tiếng Việt không bị lỗi font. */
export function downloadGradebookCsv(rows: GradebookRow[], studentName: string) {
  const header = [
    "Bài",
    "Khóa học",
    "Lượt làm",
    "Trạng thái",
    "Điểm cao nhất",
    "Điểm tối đa",
    "Band",
    "Lượt",
    "Ngày nộp",
    "Số lần chuyển tab",
  ];
  const lines = [header.map(csvCell).join(",")];
  for (const r of rows) {
    if (r.attemptList.length === 0) {
      lines.push(
        [r.quizTitle, r.courseName, "", r.status, r.bestScore, r.maxScore, r.bandScore, "", "", ""]
          .map(csvCell)
          .join(","),
      );
      continue;
    }
    for (const a of r.attemptList) {
      lines.push(
        [
          r.quizTitle,
          r.courseName,
          a.attemptNumber,
          a.status,
          a.rawScore,
          a.maxScore,
          a.bandScore,
          a.attemptNumber,
          fmtDate(a.submittedAt),
          a.violations,
        ]
          .map(csvCell)
          .join(","),
      );
    }
  }
  const csv = "﻿" + lines.join("\r\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  triggerDownload(blob, `so-diem-${safeFilePart(studentName)}.csv`);
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** jsPDF's built-in fonts only cover WinAnsi (no Vietnamese diacritics) — text
 * like "kết quả" renders as garbled "k¿t qu£". Rather than embed a custom TTF,
 * render the report as real HTML (browser's own font stack handles Vietnamese
 * correctly) and rasterize it into the PDF page-by-page via html2canvas. */
async function htmlToPdf(html: string, widthPx: number, filename: string) {
  const { default: html2canvas } = await import("html2canvas");
  const container = document.createElement("div");
  container.style.position = "fixed";
  container.style.left = "-99999px";
  container.style.top = "0";
  container.style.width = `${widthPx}px`;
  container.style.background = "#ffffff";
  container.style.fontFamily = "Arial, 'Segoe UI', sans-serif";
  container.innerHTML = html;
  document.body.appendChild(container);

  try {
    const canvas = await html2canvas(container, { scale: 2, backgroundColor: "#ffffff", useCORS: true });

    const pageWidthMm = 210;
    const pageHeightMm = 297;
    const marginMm = 10;
    const usableWidthMm = pageWidthMm - marginMm * 2;
    const usableHeightMm = pageHeightMm - marginMm * 2;
    const pxPerMm = canvas.width / usableWidthMm;
    const pageHeightPx = Math.floor(usableHeightMm * pxPerMm);

    const doc = new jsPDF({ unit: "mm", format: "a4" });
    let renderedPx = 0;
    let first = true;
    while (renderedPx < canvas.height) {
      const sliceHeightPx = Math.min(pageHeightPx, canvas.height - renderedPx);
      const slice = document.createElement("canvas");
      slice.width = canvas.width;
      slice.height = sliceHeightPx;
      const ctx = slice.getContext("2d");
      if (!ctx) break;
      ctx.drawImage(canvas, 0, renderedPx, canvas.width, sliceHeightPx, 0, 0, canvas.width, sliceHeightPx);
      // JPEG, not PNG: this is a flat text/table report (large plain-white
      // areas) where PNG's lossless encoding bloats the file 5-10x over a
      // high-quality JPEG for no visible benefit.
      const imgData = slice.toDataURL("image/jpeg", 0.92);
      if (!first) doc.addPage();
      doc.addImage(imgData, "JPEG", marginMm, marginMm, usableWidthMm, sliceHeightPx / pxPerMm);
      renderedPx += sliceHeightPx;
      first = false;
    }
    doc.save(filename);
  } finally {
    document.body.removeChild(container);
  }
}

/** Xuất bài làm chi tiết của 1 lượt làm ra PDF — nội dung khớp với những gì
 * AttemptDetailModal đã hiển thị (không tự suy diễn thêm đáp án chi tiết). */
export async function downloadAttemptPdf(params: {
  studentName: string;
  quizTitle: string;
  attemptNumber: number;
  submittedAt: string | null;
  rawScore: number | null;
  maxScore: number | null;
  bandScore: number | null;
  violations: number;
  answers: AnswerGradingDto[];
}) {
  const { studentName, quizTitle, attemptNumber, submittedAt, rawScore, maxScore, bandScore, violations, answers } =
    params;

  const rowsHtml = answers
    .map((a, i) => {
      const status = !a.answered
        ? "Chưa trả lời"
        : a.correct === true
          ? "Đúng"
          : a.correct === false
            ? "Sai"
            : "Chưa chấm";
      const statusColor =
        !a.answered ? "#6b7280" : a.correct === true ? "#16a34a" : a.correct === false ? "#dc2626" : "#6b7280";
      const typeLabel = a.type ? (TYPE_META[a.type]?.label ?? a.type) : "—";
      const bg = i % 2 === 0 ? "#ffffff" : "#f8fafc";
      return `<tr style="background:${bg}">
        <td style="padding:6px 8px;border:1px solid #e2e8f0;text-align:center">${i + 1}</td>
        <td style="padding:6px 8px;border:1px solid #e2e8f0">${escapeHtml(a.name ?? "—")}</td>
        <td style="padding:6px 8px;border:1px solid #e2e8f0">${escapeHtml(typeLabel)}</td>
        <td style="padding:6px 8px;border:1px solid #e2e8f0;color:${statusColor};font-weight:600">${status}</td>
        <td style="padding:6px 8px;border:1px solid #e2e8f0;text-align:right">${a.awardedMark ?? "—"}/${a.mark ?? "—"}</td>
      </tr>`;
    })
    .join("");

  const html = `
    <div style="padding:24px;color:#111827">
      <h1 style="font-size:22px;margin:0 0 16px">Báo cáo kết quả bài làm</h1>
      <div style="font-size:14px;line-height:1.9;margin-bottom:16px">
        <div><strong>Học viên:</strong> ${escapeHtml(studentName)}</div>
        <div><strong>Bài:</strong> ${escapeHtml(quizTitle)} (lượt ${attemptNumber})</div>
        <div><strong>Ngày nộp:</strong> ${escapeHtml(fmtDate(submittedAt))}</div>
        <div><strong>Điểm:</strong> ${rawScore ?? "—"}/${maxScore ?? "—"}${bandScore != null ? `  ·  Band ${bandScore}` : ""}</div>
        <div><strong>Số lần chuyển tab:</strong> ${violations}</div>
      </div>
      <table style="width:100%;border-collapse:collapse;font-size:13px">
        <thead>
          <tr style="background:#1e293b;color:#ffffff">
            <th style="padding:6px 8px;border:1px solid #1e293b;width:36px">#</th>
            <th style="padding:6px 8px;border:1px solid #1e293b;text-align:left">Câu hỏi</th>
            <th style="padding:6px 8px;border:1px solid #1e293b;text-align:left;width:110px">Dạng</th>
            <th style="padding:6px 8px;border:1px solid #1e293b;text-align:left;width:100px">Kết quả</th>
            <th style="padding:6px 8px;border:1px solid #1e293b;text-align:right;width:70px">Điểm</th>
          </tr>
        </thead>
        <tbody>${rowsHtml}</tbody>
      </table>
    </div>`;

  await htmlToPdf(html, 900, `bai-lam-${safeFilePart(studentName)}-${safeFilePart(quizTitle)}-lot${attemptNumber}.pdf`);
}

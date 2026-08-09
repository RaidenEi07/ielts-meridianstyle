"use client";

import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
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

/** Xuất bài làm chi tiết của 1 lượt làm ra PDF — nội dung khớp với những gì
 * AttemptDetailModal đã hiển thị (không tự suy diễn thêm đáp án chi tiết). */
export function downloadAttemptPdf(params: {
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
  const doc = new jsPDF();

  doc.setFontSize(16);
  doc.text("Báo cáo kết quả bài làm", 14, 18);

  doc.setFontSize(11);
  const infoLines = [
    `Học viên: ${studentName}`,
    `Bài: ${quizTitle} (lượt ${attemptNumber})`,
    `Ngày nộp: ${fmtDate(submittedAt)}`,
    `Điểm: ${rawScore ?? "—"}/${maxScore ?? "—"}${bandScore != null ? `  ·  Band ${bandScore}` : ""}`,
    `Số lần chuyển tab: ${violations}`,
  ];
  let y = 28;
  for (const line of infoLines) {
    doc.text(line, 14, y);
    y += 6;
  }

  const body = answers.map((a, i) => {
    const status = !a.answered
      ? "Chưa trả lời"
      : a.correct === true
        ? "Đúng"
        : a.correct === false
          ? "Sai"
          : "Chưa chấm";
    const typeLabel = a.type ? (TYPE_META[a.type]?.label ?? a.type) : "—";
    return [
      String(i + 1),
      a.name ?? "—",
      typeLabel,
      status,
      `${a.awardedMark ?? "—"}/${a.mark ?? "—"}`,
    ];
  });

  autoTable(doc, {
    startY: y + 4,
    head: [["#", "Câu hỏi", "Dạng", "Kết quả", "Điểm"]],
    body,
    styles: { fontSize: 9, cellPadding: 2 },
    headStyles: { fillColor: [30, 41, 59] },
    columnStyles: { 0: { cellWidth: 10 }, 2: { cellWidth: 28 }, 3: { cellWidth: 26 }, 4: { cellWidth: 20 } },
  });

  doc.save(`bai-lam-${safeFilePart(studentName)}-${safeFilePart(quizTitle)}-lot${attemptNumber}.pdf`);
}

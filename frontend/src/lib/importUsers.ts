import type { ImportRow } from "@/lib/types";

/** Số dòng backend nhận mỗi lần gọi (xem UserImportService.MAX_ROWS) — file lớn hơn được cắt thành nhiều lượt. */
export const IMPORT_CHUNK_SIZE = 200;

export interface ParsedImport {
  rows: ImportRow[];
  /** Có nhận ra dòng tiêu đề (Họ tên / Email / …) ở dòng đầu của file hay không. */
  headerDetected: boolean;
}

/** Bỏ dấu tiếng Việt + chữ thường để so khớp tên cột không phụ thuộc cách gõ. */
function norm(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "d")
    .toLowerCase()
    .trim();
}

function cellText(v: unknown): string {
  if (v == null) return "";
  if (v instanceof Date) return v.toISOString();
  return String(v).trim();
}

/** Đọc CSV (tự nhận dấu phân cách , ; hoặc tab; hỗ trợ ô đặt trong ngoặc kép; bỏ BOM). */
export function parseCsvText(text: string): string[][] {
  const src = text.replace(/^﻿/, "");
  const firstLine = src.split(/\r?\n/, 1)[0] ?? "";
  const counts: [string, number][] = [
    [",", firstLine.split(",").length],
    [";", firstLine.split(";").length],
    ["\t", firstLine.split("\t").length],
  ];
  const delimiter = counts.sort((a, b) => b[1] - a[1])[0][0];

  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let inQuotes = false;
  for (let i = 0; i < src.length; i++) {
    const ch = src[i];
    if (inQuotes) {
      if (ch === '"' && src[i + 1] === '"') {
        cell += '"';
        i++;
      } else if (ch === '"') {
        inQuotes = false;
      } else {
        cell += ch;
      }
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === delimiter) {
      row.push(cell);
      cell = "";
    } else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && src[i + 1] === "\n") i++;
      row.push(cell);
      rows.push(row);
      row = [];
      cell = "";
    } else {
      cell += ch;
    }
  }
  if (cell !== "" || row.length > 0) {
    row.push(cell);
    rows.push(row);
  }
  return rows;
}

/**
 * Chuyển bảng thô (mảng các dòng) thành danh sách dòng nhập. Nếu dòng đầu là tiêu đề thì dò cột theo tên
 * (Họ tên / Email / Tên đăng nhập, không phân biệt dấu); không có tiêu đề thì hiểu theo thứ tự cột
 * Họ tên, Email, Tên đăng nhập — và tự đảo nếu thấy cột đầu là email còn cột hai thì không.
 * Throw Error (tiếng Việt) nếu có tiêu đề nhưng thiếu cột bắt buộc.
 */
export function parseImportTable(table: unknown[][]): ParsedImport {
  const lines = table
    .map((r) => r.map(cellText))
    .filter((r) => r.some((c) => c !== ""));
  if (lines.length === 0) return { rows: [], headerDetected: false };

  const head = lines[0].map(norm);
  const findCol = (pred: (h: string) => boolean) => head.findIndex(pred);
  const emailCol = findCol((h) => h.includes("email") || h === "mail" || h.includes("e-mail"));
  const nameCol = findCol(
    (h) =>
      h.includes("ho ten") ||
      h.includes("ho va ten") ||
      h.includes("fullname") ||
      h.includes("full name") ||
      h.includes("ten hoc vien") ||
      h === "ten" ||
      h === "name",
  );
  const userCol = findCol(
    (h) => h.includes("dang nhap") || h.includes("username") || h.includes("tai khoan"),
  );

  // Dòng đầu là tiêu đề khi nhận ra cột email/họ tên VÀ dòng đó không chứa địa chỉ email thật.
  const headerDetected = (emailCol >= 0 || nameCol >= 0) && !lines[0].some((c) => c.includes("@"));

  if (headerDetected) {
    if (emailCol < 0) throw new Error("Không tìm thấy cột Email trong dòng tiêu đề của file");
    if (nameCol < 0) throw new Error("Không tìm thấy cột Họ tên trong dòng tiêu đề của file");
    return {
      headerDetected,
      rows: lines.slice(1).map((r) => ({
        fullName: r[nameCol] ?? "",
        email: r[emailCol] ?? "",
        username: userCol >= 0 ? r[userCol] || undefined : undefined,
      })),
    };
  }

  return {
    headerDetected,
    rows: lines.map((r) => {
      const swap = (r[0] ?? "").includes("@") && !(r[1] ?? "").includes("@");
      const name = swap ? r[1] : r[0];
      const email = swap ? r[0] : r[1];
      return { fullName: name ?? "", email: email ?? "", username: r[2] || undefined };
    }),
  };
}

/** Đọc file .xlsx hoặc .csv/.txt do người dùng chọn. */
export async function readImportFile(file: File): Promise<ParsedImport> {
  const name = file.name.toLowerCase();
  if (name.endsWith(".xlsx")) {
    // Dùng bản không tạo Web Worker để chạy được trong mọi cấu hình đóng gói của Next.js.
    const { readSheet } = await import("read-excel-file/web-worker");
    const table = (await readSheet(file)) as unknown[][];
    return parseImportTable(table);
  }
  if (name.endsWith(".csv") || name.endsWith(".txt")) {
    return parseImportTable(parseCsvText(await file.text()));
  }
  throw new Error("Chỉ nhận file .xlsx hoặc .csv. File .xls cũ hãy mở bằng Excel rồi lưu lại thành .xlsx.");
}

export const IMPORT_TEMPLATE_HEADER = ["Họ tên", "Email", "Tên đăng nhập (không bắt buộc)"];
export const IMPORT_TEMPLATE_ROWS = [
  ["Nguyễn Văn An", "an.nguyen@example.com", ""],
  ["Trần Thị Bình", "binh.tran@example.com", "binhtran"],
];

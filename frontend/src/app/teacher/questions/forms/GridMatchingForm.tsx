"use client";

import type { QuestionGridColumn, QuestionGridRow } from "@/lib/types";

export function GridMatchingForm({
  columns,
  onColumnsChange,
  rows,
  onRowsChange,
}: {
  columns: QuestionGridColumn[];
  onColumnsChange: (v: QuestionGridColumn[]) => void;
  rows: QuestionGridRow[];
  onRowsChange: (v: QuestionGridRow[]) => void;
}) {
  const columnLabels = columns.map((c) => c.label).filter(Boolean);

  function updateColumn(i: number, label: string) {
    onColumnsChange(columns.map((c, idx) => (idx === i ? { ...c, label } : c)));
  }
  function addColumn() {
    onColumnsChange([...columns, { id: null, label: "", sortOrder: columns.length }]);
  }
  function removeColumn(i: number) {
    onColumnsChange(columns.filter((_, idx) => idx !== i));
  }

  function updateRow(i: number, patch: Partial<QuestionGridRow>) {
    onRowsChange(rows.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));
  }
  function addRow() {
    onRowsChange([
      ...rows,
      { id: null, rowText: "", correctColumnLabel: columnLabels[0] ?? "", sortOrder: rows.length },
    ]);
  }
  function removeRow(i: number) {
    onRowsChange(rows.filter((_, idx) => idx !== i));
  }

  return (
    <div className="space-y-4">
      <div>
        <span className="mb-1 block text-xs font-medium text-muted">
          Các cột dùng chung (vd: A, B, C…)
        </span>
        {columns.map((c, i) => (
          <div key={i} className="mb-1 flex items-center gap-2">
            <input
              value={c.label}
              onChange={(e) => updateColumn(i, e.target.value)}
              placeholder={`Cột ${i + 1}`}
              className="input flex-1 text-sm"
            />
            <button type="button" onClick={() => removeColumn(i)} className="text-xs text-red">
              Xóa
            </button>
          </div>
        ))}
        <button type="button" onClick={addColumn} className="text-sm font-semibold text-accent">
          + Thêm cột
        </button>
      </div>

      <div>
        <span className="mb-1 block text-xs font-medium text-muted">
          Các hàng — chọn đúng 1 cột cho mỗi hàng
        </span>
        {rows.map((r, i) => (
          <div key={i} className="mb-1 flex items-center gap-2">
            <input
              value={r.rowText}
              onChange={(e) => updateRow(i, { rowText: e.target.value })}
              placeholder={`Hàng ${i + 1}`}
              className="input flex-1 text-sm"
            />
            <select
              value={r.correctColumnLabel}
              onChange={(e) => updateRow(i, { correctColumnLabel: e.target.value })}
              className="input w-48 text-sm"
            >
              <option value="">— Chọn cột đúng —</option>
              {columnLabels.map((label) => (
                <option key={label} value={label}>
                  {label}
                </option>
              ))}
              {r.correctColumnLabel && !columnLabels.includes(r.correctColumnLabel) && (
                <option value={r.correctColumnLabel}>
                  {r.correctColumnLabel} (không còn trong danh sách cột)
                </option>
              )}
            </select>
            <button type="button" onClick={() => removeRow(i)} className="text-xs text-red">
              Xóa
            </button>
          </div>
        ))}
        <button type="button" onClick={addRow} className="text-sm font-semibold text-accent">
          + Thêm hàng
        </button>
      </div>
    </div>
  );
}

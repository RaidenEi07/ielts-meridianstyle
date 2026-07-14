"use client";

import { useState } from "react";
import { SearchableSelect } from "@/components/SearchableSelect";
import { ApiError, questionBankApi } from "@/lib/api";
import type { Audience, QuestionCategoryNode } from "@/lib/types";

export function CategoryForm({
  token,
  categories,
  onSaved,
  onCancel,
  lockAudience,
}: {
  token: string;
  categories: QuestionCategoryNode[];
  onSaved: (c: QuestionCategoryNode) => void;
  onCancel: () => void;
  lockAudience?: Audience;
}) {
  const [name, setName] = useState("");
  const [parentId, setParentId] = useState<number | "">("");
  const [description, setDescription] = useState("");
  const [audience, setAudience] = useState<Audience>(lockAudience ?? "IELTS");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save() {
    setSaving(true);
    setError(null);
    try {
      const saved = await questionBankApi.createCategory(token, {
        name,
        parentId: parentId ? Number(parentId) : undefined,
        description: description || undefined,
        audience,
      });
      onSaved(saved);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Tạo danh mục thất bại");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-3 rounded-lg border border-border p-4">
      <label className="block">
        <span className="mb-1 block text-xs font-medium text-muted">Tên danh mục</span>
        <input value={name} onChange={(e) => setName(e.target.value)} className="input" required />
      </label>
      <label className="block">
        <span className="mb-1 block text-xs font-medium text-muted">Danh mục cha (tùy chọn)</span>
        <SearchableSelect
          value={parentId}
          onChange={setParentId}
          allowClear
          clearLabel="— Không có danh mục cha —"
          placeholder="Tìm danh mục cha…"
          options={categories.map((c) => ({ value: c.id, label: c.name }))}
        />
      </label>
      <label className="block">
        <span className="mb-1 block text-xs font-medium text-muted">Mô tả (tùy chọn)</span>
        <input value={description} onChange={(e) => setDescription(e.target.value)} className="input" />
      </label>
      {!lockAudience && (
        <label className="block">
          <span className="mb-1 block text-xs font-medium text-muted">Nhóm đối tượng</span>
          <select
            value={audience}
            onChange={(e) => setAudience(e.target.value as Audience)}
            className="input"
          >
            <option value="IELTS">IELTS</option>
            <option value="KIDS">Trẻ em / Tiểu học (KIDS)</option>
          </select>
        </label>
      )}
      {error && <p className="text-sm text-red">{error}</p>}
      <div className="flex gap-2">
        <button
          type="button"
          onClick={save}
          disabled={saving}
          className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
        >
          {saving ? "Đang lưu…" : "Tạo danh mục"}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="rounded-lg border border-border px-4 py-2 text-sm text-muted"
        >
          Hủy
        </button>
      </div>
    </div>
  );
}

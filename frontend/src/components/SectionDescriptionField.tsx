"use client";

import { useState } from "react";
import { ApiError, catalogAdminApi } from "@/lib/api";

export function SectionDescriptionField({
  sectionId,
  token,
  value,
  onChanged,
}: {
  sectionId: number;
  token: string;
  value: string | null;
  onChanged: () => void;
}) {
  const [draft, setDraft] = useState(value ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save() {
    setSaving(true);
    setError(null);
    try {
      await catalogAdminApi.updateSection(token, sectionId, { shortDescription: draft });
      onChanged();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Cập nhật mô tả buổi học thất bại");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <span className="mb-1 block text-xs font-medium text-muted">Mô tả ngắn buổi học</span>
      <div className="flex gap-2">
        <textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          rows={2}
          placeholder="Vd: Học từ vựng về các con vật nuôi trong nhà"
          className="input flex-1 text-sm"
        />
        <button
          type="button"
          onClick={save}
          disabled={saving}
          className="self-start rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-muted hover:text-text disabled:opacity-60"
        >
          {saving ? "Đang lưu…" : "Lưu"}
        </button>
      </div>
      {error && <p className="mt-1 text-xs text-red">{error}</p>}
    </div>
  );
}

"use client";

import { useState } from "react";
import { AudioUploadField } from "@/components/AudioUploadField";
import { RichTextEditor } from "@/components/RichTextEditor";
import { ApiError, questionBankApi } from "@/lib/api";
import type { PassageSummary } from "@/lib/types";

export function PassageForm({
  token,
  initial,
  onSaved,
  onCancel,
}: {
  token: string;
  initial?: PassageSummary;
  onSaved: (p: PassageSummary) => void;
  onCancel: () => void;
}) {
  const [title, setTitle] = useState(initial?.title ?? "");
  const [kind, setKind] = useState(initial?.kind ?? "READING");
  const [content, setContent] = useState(initial?.content ?? "");
  const [audioUrl, setAudioUrl] = useState(initial?.audioUrl ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const req = {
        title,
        kind,
        content: kind !== "LISTENING" ? content : undefined,
        audioUrl: kind === "LISTENING" ? audioUrl : undefined,
      };
      const saved = initial
        ? await questionBankApi.updatePassage(token, initial.id, req)
        : await questionBankApi.createPassage(token, req);
      onSaved(saved);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Lưu passage thất bại");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={save} className="space-y-3 rounded-lg border border-border p-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block">
          <span className="mb-1 block text-xs font-medium text-muted">Tiêu đề</span>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="input"
            required
          />
        </label>
        <label className="block">
          <span className="mb-1 block text-xs font-medium text-muted">Loại</span>
          <select value={kind} onChange={(e) => setKind(e.target.value)} className="input">
            <option value="READING">Reading (đoạn văn)</option>
            <option value="LISTENING">Listening (audio)</option>
            <option value="GENERIC">Khác</option>
          </select>
        </label>
      </div>

      {kind === "LISTENING" ? (
        <AudioUploadField token={token} value={audioUrl} onChange={(url) => setAudioUrl(url ?? "")} />
      ) : (
        <label className="block">
          <span className="mb-1 block text-xs font-medium text-muted">Nội dung đoạn văn</span>
          <RichTextEditor value={content} onChange={setContent} token={token} />
        </label>
      )}

      {error && <p className="text-sm text-red">{error}</p>}
      <div className="flex gap-2">
        <button
          type="submit"
          disabled={saving}
          className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
        >
          {saving ? "Đang lưu…" : initial ? "Lưu thay đổi" : "Tạo passage"}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="rounded-lg border border-border px-4 py-2 text-sm text-muted"
        >
          Hủy
        </button>
      </div>
    </form>
  );
}

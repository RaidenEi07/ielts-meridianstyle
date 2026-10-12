"use client";

import Link from "next/link";
import { useState } from "react";
import { ApiError, configApi } from "@/lib/api";
import { LEGAL_TEXT_MAX } from "@/lib/siteConfig";
import { useToast } from "@/store/toast";

/** Khóa do phần này quản lý: trang cha không gửi kèm khi bấm "Lưu thay đổi" của lưới chung. */
export const LEGAL_TEXT_KEYS = ["LEGAL_TERMS_TEXT", "LEGAL_PRIVACY_TEXT"] as const;

type Draft = Record<(typeof LEGAL_TEXT_KEYS)[number], string>;

const draftFromConfig = (config: Record<string, string>): Draft => ({
  LEGAL_TERMS_TEXT: config.LEGAL_TERMS_TEXT ?? "",
  LEGAL_PRIVACY_TEXT: config.LEGAL_PRIVACY_TEXT ?? "",
});

const FIELDS: { key: keyof Draft; label: string; href: string; placeholder: string }[] = [
  {
    key: "LEGAL_TERMS_TEXT",
    label: "Điều khoản sử dụng",
    href: "/terms",
    placeholder: "## Tài khoản\nBạn chịu trách nhiệm bảo mật thông tin đăng nhập...\n\n## Học phí\n...",
  },
  {
    key: "LEGAL_PRIVACY_TEXT",
    label: "Chính sách bảo mật",
    href: "/privacy",
    placeholder: "## Thông tin chúng tôi thu thập\n...\n\n## Cách chúng tôi sử dụng thông tin\n...",
  },
];

/**
 * Nội dung hai trang Điều khoản và Chính sách bảo mật. Để trống thì trang hiện bản mẫu có sẵn (kèm ghi chú "bản
 * mẫu"); nhập nội dung của trung tâm thì trang hiện đúng nội dung đó, không còn ghi chú. Lưu riêng bằng nút của
 * phần này; trang cha đặt `key` theo giá trị đã lưu nên sau khi lưu thành phần dựng lại với bản nháp sạch.
 */
export function LegalPagesSection({
  token,
  config,
  onSaved,
}: {
  token: string;
  config: Record<string, string>;
  /** Nhận cấu hình đầy đủ máy chủ trả về sau khi lưu. */
  onSaved: (updated: Record<string, string>) => void;
}) {
  const [draft, setDraft] = useState<Draft>(() => draftFromConfig(config));
  const [saving, setSaving] = useState(false);
  const toast = useToast();

  const saved = draftFromConfig(config);
  const dirty = LEGAL_TEXT_KEYS.some((k) => draft[k].trim() !== saved[k].trim());

  async function save() {
    setSaving(true);
    try {
      const updated = await configApi.update(token, {
        LEGAL_TERMS_TEXT: draft.LEGAL_TERMS_TEXT.trim(),
        LEGAL_PRIVACY_TEXT: draft.LEGAL_PRIVACY_TEXT.trim(),
      });
      onSaved(updated);
      toast.success("Đã lưu nội dung Điều khoản và Chính sách");
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Lưu nội dung Điều khoản và Chính sách thất bại");
    } finally {
      setSaving(false);
    }
  }

  return (
    <section data-testid="LegalPagesSection" className="rounded-lg border border-border bg-surface p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">Điều khoản & Chính sách bảo mật</h2>
          <p className="text-sm text-muted">
            Dán nội dung do trung tâm soạn. Để trống thì trang dùng bản mẫu có sẵn và ghi rõ đó là bản mẫu. Các
            đoạn cách nhau bằng một dòng trống; dòng bắt đầu bằng <code>## </code> là tiêu đề mục.
          </p>
        </div>
        <button
          type="button"
          onClick={save}
          disabled={!dirty || saving}
          data-testid="legal-pages-save"
          className="rounded-lg bg-primary-fill px-5 py-2 text-sm font-semibold text-white disabled:opacity-50"
        >
          {saving ? "Đang lưu…" : "Lưu thay đổi"}
        </button>
      </div>

      <div className="mt-4 grid gap-5">
        {FIELDS.map((f) => (
          <label key={f.key} className="block">
            <span className="mb-1.5 flex items-center justify-between text-sm font-medium text-muted">
              <span>{f.label}</span>
              <Link href={f.href} target="_blank" className="text-xs font-semibold text-accent hover:underline">
                Xem trang →
              </Link>
            </span>
            <textarea
              value={draft[f.key]}
              onChange={(e) => setDraft((d) => ({ ...d, [f.key]: e.target.value }))}
              maxLength={LEGAL_TEXT_MAX}
              rows={10}
              placeholder={f.placeholder}
              data-testid={`legal-text-${f.key === "LEGAL_TERMS_TEXT" ? "terms" : "privacy"}`}
              className="input font-mono text-sm"
            />
            <span className="mt-1 block text-right text-xs text-faint">
              {draft[f.key].length}/{LEGAL_TEXT_MAX}
            </span>
          </label>
        ))}
      </div>
    </section>
  );
}

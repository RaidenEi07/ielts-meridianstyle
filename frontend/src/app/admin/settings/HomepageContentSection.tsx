"use client";

import { Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { ApiError, configApi } from "@/lib/api";
import {
  HOMEPAGE_LIMITS,
  serializeTestimonials,
  siteConfigFromPublic,
  type Testimonial,
} from "@/lib/siteConfig";
import { useToast } from "@/store/toast";

/** Khóa cấu hình do phần này quản lý: trang cha không gửi kèm khi bấm "Lưu thay đổi" của lưới chung. */
export const HOMEPAGE_CONTENT_KEYS = [
  "HOMEPAGE_HIGHLIGHT_VALUE",
  "HOMEPAGE_HIGHLIGHT_LABEL",
  "HOMEPAGE_TEACHERS_LABEL",
  "HOMEPAGE_TESTIMONIALS",
] as const;

interface Draft {
  highlightValue: string;
  highlightLabel: string;
  teachersLabel: string;
  testimonials: Testimonial[];
}

function draftFromConfig(config: Record<string, string>): Draft {
  const site = siteConfigFromPublic(config);
  return {
    highlightValue: site.highlightValue,
    highlightLabel: site.highlightLabel,
    teachersLabel: site.teachersLabel,
    testimonials: site.testimonials,
  };
}

const payloadOf = (draft: Draft): Record<(typeof HOMEPAGE_CONTENT_KEYS)[number], string> => ({
  HOMEPAGE_HIGHLIGHT_VALUE: draft.highlightValue.trim(),
  HOMEPAGE_HIGHLIGHT_LABEL: draft.highlightLabel.trim(),
  HOMEPAGE_TEACHERS_LABEL: draft.teachersLabel.trim(),
  HOMEPAGE_TESTIMONIALS: serializeTestimonials(draft.testimonials),
});

/**
 * Nội dung trang chủ trước đây là chữ mẫu ghi cứng: con số nổi bật (nhãn trên ảnh, dải số liệu, trang đăng
 * nhập), nhãn số giáo viên và các lời chứng thực. Lưu riêng bằng nút của phần này. Trang cha đặt `key` theo giá
 * trị đã lưu nên sau khi lưu thành phần dựng lại với bản nháp sạch.
 */
export function HomepageContentSection({
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

  const payload = payloadOf(draft);
  const dirty = JSON.stringify(payload) !== JSON.stringify(payloadOf(draftFromConfig(config)));
  const emptyRows = draft.testimonials.filter((t) => t.text.trim() === "").length;

  const update = (patch: Partial<Draft>) => setDraft((d) => ({ ...d, ...patch }));
  const updateTestimonial = (index: number, patch: Partial<Testimonial>) =>
    setDraft((d) => ({
      ...d,
      testimonials: d.testimonials.map((t, i) => (i === index ? { ...t, ...patch } : t)),
    }));

  async function save() {
    setSaving(true);
    try {
      const updated = await configApi.update(token, payload);
      onSaved(updated);
      toast.success("Đã lưu số liệu và lời chứng thực");
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Lưu số liệu và lời chứng thực thất bại");
    } finally {
      setSaving(false);
    }
  }

  return (
    <section
      data-testid="HomepageContentSection"
      className="rounded-lg border border-border bg-surface p-6"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">Số liệu & lời chứng thực trên trang chủ</h2>
          <p className="text-sm text-muted">
            Chỉ nhập số liệu và lời chứng thực có thật. Bỏ trống ô số, hoặc xóa hết lời chứng thực, để ẩn mục
            đó khỏi trang chủ.
          </p>
        </div>
        <button
          type="button"
          onClick={save}
          disabled={!dirty || saving}
          data-testid="homepage-content-save"
          className="rounded-lg bg-primary px-5 py-2 text-sm font-semibold text-white disabled:opacity-50"
        >
          {saving ? "Đang lưu…" : "Lưu thay đổi"}
        </button>
      </div>

      <h3 className="mt-5 text-sm font-semibold">Con số nổi bật</h3>
      <p className="text-xs text-muted">
        Hiện ở nhãn trên ảnh trang chủ, dải số liệu và trang đăng nhập. Ví dụ: 92% — Đạt mục tiêu.
      </p>
      <div className="mt-2 grid gap-4 sm:grid-cols-2">
        <label className="block">
          <span className="mb-1.5 block text-sm font-medium text-muted">Con số</span>
          <input
            type="text"
            value={draft.highlightValue}
            onChange={(e) => update({ highlightValue: e.target.value })}
            maxLength={HOMEPAGE_LIMITS.highlightValue}
            placeholder="92%"
            data-testid="highlight-value"
            className="input"
          />
        </label>
        <label className="block">
          <span className="mb-1.5 block text-sm font-medium text-muted">Chữ bên dưới con số</span>
          <input
            type="text"
            value={draft.highlightLabel}
            onChange={(e) => update({ highlightLabel: e.target.value })}
            maxLength={HOMEPAGE_LIMITS.highlightLabel}
            placeholder="Đạt mục tiêu"
            data-testid="highlight-label"
            className="input"
          />
        </label>
      </div>
      {draft.highlightValue.trim() === "" && (
        <p data-testid="highlight-hidden-note" className="mt-2 text-xs text-muted">
          Đang ẩn con số nổi bật: trang chủ chỉ còn 3 số lấy tự động từ hệ thống và trang đăng nhập không hiện
          con số này.
        </p>
      )}

      <label className="mt-4 block">
        <span className="mb-1.5 block text-sm font-medium text-muted">Chữ dưới số giáo viên (dải số liệu)</span>
        <input
          type="text"
          value={draft.teachersLabel}
          onChange={(e) => update({ teachersLabel: e.target.value })}
          maxLength={HOMEPAGE_LIMITS.teachersLabel}
          placeholder="Giáo viên"
          data-testid="teachers-label"
          className="input"
        />
        <span className="mt-1 block text-xs text-muted">
          Số giáo viên lấy tự động từ hệ thống; ô này chỉ đổi chữ ghi bên dưới. Để trống sẽ dùng &quot;Giáo
          viên&quot;.
        </span>
      </label>

      <h3 className="mt-6 text-sm font-semibold">
        Lời chứng thực học viên ({draft.testimonials.length}/{HOMEPAGE_LIMITS.testimonials})
      </h3>
      <p className="text-xs text-muted">
        Hiện ở mục &quot;Học viên nói gì&quot;. Band để trống thì không hiện huy hiệu band. Dòng chưa có nội dung
        sẽ bị bỏ khi lưu.
      </p>

      <div className="mt-2 space-y-3">
        {draft.testimonials.length === 0 && (
          <p data-testid="testimonials-empty-note" className="rounded-lg border border-dashed border-border p-3 text-sm text-muted">
            Chưa có lời chứng thực nào: trang chủ sẽ ẩn mục &quot;Học viên nói gì&quot; và chỉ còn form đăng ký tư vấn.
          </p>
        )}
        {draft.testimonials.map((t, i) => (
          <div
            key={i}
            data-testid={`testimonial-row-${i}`}
            className="space-y-2 rounded-lg border border-border p-3"
          >
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={t.name}
                onChange={(e) => updateTestimonial(i, { name: e.target.value })}
                maxLength={HOMEPAGE_LIMITS.testimonialName}
                placeholder="Tên học viên"
                aria-label={`Tên học viên ${i + 1}`}
                data-testid={`testimonial-name-${i}`}
                className="input flex-1"
              />
              <input
                type="text"
                value={t.band}
                onChange={(e) => updateTestimonial(i, { band: e.target.value })}
                maxLength={HOMEPAGE_LIMITS.testimonialBand}
                placeholder="Band, vd. 7.5"
                aria-label={`Band của học viên ${i + 1}`}
                data-testid={`testimonial-band-${i}`}
                className="input w-32"
              />
              <button
                type="button"
                onClick={() =>
                  setDraft((d) => ({ ...d, testimonials: d.testimonials.filter((_, idx) => idx !== i) }))
                }
                aria-label={`Xóa lời chứng thực ${i + 1}`}
                title="Xóa lời chứng thực này"
                data-testid={`testimonial-remove-${i}`}
                className="rounded-lg border border-border p-2 text-red"
              >
                <Trash2 className="h-4 w-4" aria-hidden />
              </button>
            </div>
            <textarea
              value={t.text}
              onChange={(e) => updateTestimonial(i, { text: e.target.value })}
              maxLength={HOMEPAGE_LIMITS.testimonialText}
              rows={3}
              placeholder="Nội dung lời chứng thực"
              aria-label={`Nội dung lời chứng thực ${i + 1}`}
              data-testid={`testimonial-text-${i}`}
              className="input text-sm"
            />
          </div>
        ))}
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={() =>
            setDraft((d) => ({ ...d, testimonials: [...d.testimonials, { name: "", band: "", text: "" }] }))
          }
          disabled={draft.testimonials.length >= HOMEPAGE_LIMITS.testimonials}
          data-testid="testimonial-add"
          className="inline-flex items-center gap-2 rounded-lg border border-border px-4 py-2 text-sm font-medium disabled:opacity-50"
        >
          <Plus className="h-4 w-4" aria-hidden />
          Thêm lời chứng thực
        </button>
        {emptyRows > 0 && (
          <span className="text-xs text-muted">
            {emptyRows} dòng chưa có nội dung sẽ không được lưu.
          </span>
        )}
      </div>
    </section>
  );
}

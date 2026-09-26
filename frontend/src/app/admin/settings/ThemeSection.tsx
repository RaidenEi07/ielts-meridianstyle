"use client";

import { useEffect, useState } from "react";
import { ApiError, configApi } from "@/lib/api";
import { BRAND_DEFAULTS, type BrandColors, brandThemeCss, deriveBrandTheme } from "@/lib/brandTheme";
import { parseColorInput } from "@/lib/color";
import { useToast } from "@/store/toast";

/** Khóa cấu hình của 3 màu — trang Cấu hình lưu chúng riêng, ngoài lưới cấu hình chung. */
export const THEME_CONFIG_KEYS = ["PRIMARY_COLOR", "ACCENT_COLOR", "BACKGROUND_COLOR"] as const;

const FIELDS = [
  {
    field: "primary",
    configKey: "PRIMARY_COLOR",
    name: "Màu chủ đạo",
    hint: "Nút chính, logo, ô đang chọn, viền khi nhập liệu và chân trang.",
  },
  {
    field: "accent",
    configKey: "ACCENT_COLOR",
    name: "Màu nhấn",
    hint: "Liên kết, nút phụ, huy hiệu và điểm nhấn trong nội dung.",
  },
  {
    field: "background",
    configKey: "BACKGROUND_COLOR",
    name: "Màu nền",
    hint: "Chọn một màu, khung, viền và chữ tự chỉnh theo. Chế độ tối đi theo tông màu này.",
  },
] as const;

const PRESETS: { name: string; colors: BrandColors }[] = [
  { name: "Meridian (mặc định)", colors: { ...BRAND_DEFAULTS } },
  { name: "Nắng sớm", colors: { primary: "#B45309", accent: "#0F766E", background: "#FFF8E6" } },
  { name: "Rừng", colors: { primary: "#1F5F4A", accent: "#C98A1B", background: "#F3F7F1" } },
  { name: "Đại dương", colors: { primary: "#0B4F8A", accent: "#E07A2F", background: "#EEF5FB" } },
  { name: "Mận", colors: { primary: "#6B2C5E", accent: "#D9822B", background: "#FAF5F8" } },
  { name: "Nền tối", colors: { primary: "#38BDF8", accent: "#F59E0B", background: "#0F172A" } },
];

const sameColors = (a: BrandColors, b: BrandColors) =>
  a.primary === b.primary && a.accent === b.accent && a.background === b.background;

/** Cập nhật <style id="brand-theme"> do layout.tsx render, để chuyển trang không quay về màu cũ. */
function setSavedThemeStyle(css: string) {
  const existing = document.getElementById("brand-theme");
  if (existing) {
    existing.textContent = css;
    return;
  }
  const style = document.createElement("style");
  style.id = "brand-theme";
  style.textContent = css;
  document.head.prepend(style);
}

/**
 * Chỉnh màu chủ đạo / nhấn / nền. Màu đang gõ được áp thử ngay lên chính trang này (thẻ <style
 * id="brand-preview"> ghi đè bản đã lưu) và chỉ có hiệu lực với mọi người sau khi bấm Lưu.
 * Trang cha đặt `key` theo màu đã lưu nên sau khi lưu thành phần này dựng lại với bản nháp sạch.
 */
export function ThemeSection({
  token,
  saved,
  onSaved,
}: {
  token: string;
  saved: BrandColors;
  onSaved: (config: Record<(typeof THEME_CONFIG_KEYS)[number], string>) => void;
}) {
  const [draft, setDraft] = useState<BrandColors>(saved);
  const [saving, setSaving] = useState(false);
  const toast = useToast();

  // Ô đang gõ dở (chưa hợp lệ) giữ màu hợp lệ gần nhất để trang không nháy về mặc định giữa chừng.
  const parsed = {
    primary: parseColorInput(draft.primary),
    accent: parseColorInput(draft.accent),
    background: parseColorInput(draft.background),
  };
  const hasInvalid = FIELDS.some(({ field }) => parsed[field] === null);
  const effective: BrandColors = {
    primary: parsed.primary ?? saved.primary,
    accent: parsed.accent ?? saved.accent,
    background: parsed.background ?? saved.background,
  };
  const dirty = !sameColors(effective, saved) || hasInvalid;
  const isDefault = sameColors(effective, BRAND_DEFAULTS) && !hasInvalid;
  const theme = deriveBrandTheme(effective);
  const previewCss = dirty ? brandThemeCss(effective, { reset: true }) : "";

  useEffect(() => {
    if (!previewCss) return;
    const style = document.createElement("style");
    style.id = "brand-preview";
    style.textContent = previewCss;
    document.head.appendChild(style);
    return () => style.remove();
  }, [previewCss]);

  async function save() {
    if (hasInvalid) {
      toast.error("Còn ô màu chưa hợp lệ, cần dạng #1E3A5F");
      return;
    }
    setSaving(true);
    try {
      const updated = await configApi.update(token, {
        PRIMARY_COLOR: effective.primary,
        ACCENT_COLOR: effective.accent,
        BACKGROUND_COLOR: effective.background,
      });
      setSavedThemeStyle(brandThemeCss(effective));
      onSaved({
        PRIMARY_COLOR: updated.PRIMARY_COLOR ?? effective.primary,
        ACCENT_COLOR: updated.ACCENT_COLOR ?? effective.accent,
        BACKGROUND_COLOR: updated.BACKGROUND_COLOR ?? effective.background,
      });
      toast.success("Đã lưu màu sắc giao diện");
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Lưu màu sắc thất bại");
    } finally {
      setSaving(false);
    }
  }

  return (
    <section data-testid="ThemeSection" className="rounded-lg border border-border bg-surface p-6">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">Màu sắc giao diện</h2>
          <p className="text-sm text-muted">
            Chỉnh màu là thấy ngay trên chính trang này. Màu chỉ áp cho mọi người dùng sau khi bạn
            bấm Lưu màu sắc.
          </p>
        </div>
        <button
          type="button"
          onClick={save}
          disabled={!dirty || hasInvalid || saving}
          data-testid="theme-save"
          className="rounded-lg bg-primary px-5 py-2 text-sm font-semibold text-white disabled:opacity-50"
        >
          {saving ? "Đang lưu…" : "Lưu màu sắc"}
        </button>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {FIELDS.map(({ field, configKey, name, hint }) => (
          <ColorField
            key={configKey}
            name={name}
            configKey={configKey}
            hint={hint}
            value={draft[field]}
            onChange={(v) => setDraft((d) => ({ ...d, [field]: v }))}
          />
        ))}
      </div>

      <div className="mt-5">
        <p className="mb-2 text-sm font-medium text-muted">Bộ màu mẫu</p>
        <div className="flex flex-wrap gap-2" data-testid="theme-presets">
          {PRESETS.map(({ name, colors }) => {
            const active = sameColors(effective, colors) && !hasInvalid;
            return (
              <button
                key={name}
                type="button"
                onClick={() => setDraft(colors)}
                aria-pressed={active}
                className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm ${
                  active ? "border-primary bg-primary-soft text-primary" : "border-border bg-surface hover:bg-soft"
                }`}
              >
                <span className="flex" aria-hidden="true">
                  {[colors.primary, colors.accent, colors.background].map((c, i) => (
                    <i
                      key={`${i}-${c}`}
                      className="-ml-1 h-3.5 w-3.5 rounded-full border border-black/20 first:ml-0"
                      style={{ background: c }}
                    />
                  ))}
                </span>
                {name}
              </button>
            );
          })}
        </div>
      </div>

      <div className="mt-5">
        <p className="mb-2 text-sm font-medium text-muted">Xem nhanh</p>
        <div
          aria-hidden="true"
          data-testid="theme-sample"
          className="flex flex-wrap items-center gap-3 rounded-lg border border-border bg-card p-4 text-sm"
        >
          <span className="rounded-full bg-primary px-4 py-1.5 font-semibold text-white">Nút chính</span>
          <span className="rounded-full bg-accent px-4 py-1.5 font-semibold text-white">Nút nhấn</span>
          <span className="font-semibold text-accent underline underline-offset-4">Liên kết</span>
          <span className="rounded-full bg-primary-soft px-3 py-1 font-semibold text-primary">Đang học</span>
          <span className="rounded-full bg-accent-soft px-3 py-1 font-semibold text-accent">Chờ duyệt</span>
          <span className="text-muted">Chữ phụ</span>
        </div>
      </div>

      <div aria-live="polite" data-testid="theme-notes" className="mt-4 space-y-1.5 text-sm">
        {dirty && (
          <p className="font-medium">
            Đang xem thử, chưa lưu. Bấm Hoàn tác để quay lại màu đã lưu.
          </p>
        )}
        {theme?.notes.map((note) => (
          <p key={note} className="text-muted">
            {note}
          </p>
        ))}
        {theme && theme.notes.length === 0 && (
          <p className="text-muted">Các màu đã chọn đủ độ tương phản để chữ đọc rõ.</p>
        )}
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => setDraft(saved)}
          disabled={!dirty}
          data-testid="theme-undo"
          className="rounded-lg border border-border px-4 py-2 text-sm font-medium disabled:opacity-50"
        >
          Hoàn tác
        </button>
        <button
          type="button"
          onClick={() => setDraft({ ...BRAND_DEFAULTS })}
          disabled={isDefault}
          data-testid="theme-reset"
          className="rounded-lg border border-border px-4 py-2 text-sm font-medium disabled:opacity-50"
        >
          Đặt lại mặc định
        </button>
      </div>

      <p className="mt-4 text-xs text-muted">
        Không đổi theo màu: màn làm bài thi (trắng đen theo chuẩn phòng thi), màu xanh/đỏ báo đúng
        sai, ảnh chia sẻ khi gửi liên kết và file PDF/CSV xuất ra.
      </p>
    </section>
  );
}

// Ô chọn màu + ô nhập mã màu (dán được từ bên ngoài). `value` giữ nguyên chuỗi đang gõ,
// hợp lệ hay không do parseColorInput quyết định; ThemeSection chặn lưu nếu còn mã sai.
function ColorField({
  name,
  configKey,
  hint,
  value,
  onChange,
}: {
  name: string;
  configKey: string;
  hint?: string;
  value: string;
  onChange: (v: string) => void;
}) {
  const inputId = `config-color-${configKey}`;
  const parsed = parseColorInput(value ?? "");
  const invalid = parsed === null;

  return (
    <div data-testid={`ColorField-${configKey}`}>
      <label htmlFor={inputId} className="mb-1.5 block text-sm font-medium text-muted">
        {name}
      </label>
      <div className="flex items-center gap-2">
        <input
          type="color"
          value={(parsed ?? "#000000").toLowerCase()}
          onChange={(e) => onChange(e.target.value.toUpperCase())}
          aria-label={`${name} — chọn màu`}
          data-testid={`color-picker-${configKey}`}
          className="h-9 w-12 shrink-0 cursor-pointer rounded border border-border"
        />
        <input
          id={inputId}
          type="text"
          value={value ?? ""}
          onChange={(e) => onChange(e.target.value)}
          onBlur={() => {
            if (parsed && parsed !== value) onChange(parsed);
          }}
          onPaste={(e) => {
            const pasted = parseColorInput(e.clipboardData.getData("text"));
            if (pasted) {
              e.preventDefault();
              onChange(pasted);
            }
          }}
          placeholder="#1E3A5F"
          maxLength={32}
          spellCheck={false}
          autoComplete="off"
          aria-invalid={invalid}
          aria-describedby={invalid ? `${inputId}-error` : undefined}
          data-testid={`color-hex-${configKey}`}
          className={`input w-40 font-mono ${invalid ? "border-red!" : ""}`}
        />
      </div>
      {invalid && (
        <p id={`${inputId}-error`} className="mt-1 text-xs text-red">
          Mã màu không hợp lệ — dùng dạng #1E3A5F, #1E3 hoặc rgb(30, 58, 95).
        </p>
      )}
      {hint && <p className="mt-1.5 text-xs text-muted">{hint}</p>}
    </div>
  );
}

"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import {
  adminUserApi,
  announcementApi,
  configApi,
  notificationApi,
} from "@/lib/api";
import type { Announcement } from "@/lib/types";
import { useAuthStore } from "@/store/auth";
import { useConfirm } from "@/store/confirm";

const LABELS: Record<string, string> = {
  SITE_NAME: "Tên hiển thị",
  SITE_TAGLINE: "Khẩu hiệu",
  SITE_LANGUAGE: "Ngôn ngữ",
  SITE_THEME_MODE: "Chế độ giao diện",
  PRIMARY_COLOR: "Màu chủ đạo",
  ACCENT_COLOR: "Màu nhấn",
  SUPPORT_EMAIL: "Email hỗ trợ",
  CACHE_TTL: "Cache TTL (giây)",
  SSL_FORCE_HTTPS: "Bắt buộc HTTPS",
  REGISTRATION_OPEN: "Mở đăng ký",
};

// Khóa này có UI chỉnh sửa riêng (HomepageInfoCardsSection) — không hiển thị
// trong lưới cấu hình chung vì giá trị là JSON, không phải text đơn giản.
const HOMEPAGE_INFO_CARDS_KEY = "HOMEPAGE_INFO_CARDS";

interface HomepageInfoCard {
  icon: string;
  title: string;
  description: string;
}

export default function AdminSettingsPage() {
  const router = useRouter();
  const { accessToken, hydrated, loadMe } = useAuthStore();
  const [ready, setReady] = useState(false);
  const [allowed, setAllowed] = useState(false);
  const token = accessToken ?? "";

  const [config, setConfig] = useState<Record<string, string>>({});
  const [savedMsg, setSavedMsg] = useState<string | null>(null);
  const [anns, setAnns] = useState<Announcement[]>([]);

  useEffect(() => {
    if (!hydrated) return;
    if (!accessToken) {
      router.replace("/login");
      return;
    }
    loadMe()
      .then(() =>
        setAllowed(useAuthStore.getState().systemCapabilities.includes("system:manage")),
      )
      .finally(() => setReady(true));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hydrated, accessToken]);

  useEffect(() => {
    if (!allowed) return;
    configApi.getAll(token).then(setConfig).catch(() => {});
    announcementApi.adminList(token).then(setAnns).catch(() => {});
  }, [allowed, token]);

  async function saveConfig() {
    const updated = await configApi.update(token, config);
    setConfig(updated);
    setSavedMsg("Đã lưu cấu hình");
    setTimeout(() => setSavedMsg(null), 2500);
  }

  if (!hydrated || !ready) {
    return <div className="grid min-h-screen place-items-center text-muted">Đang tải…</div>;
  }
  if (!allowed) {
    return (
      <div className="grid min-h-screen place-items-center px-6 text-center">
        <div>
          <p className="text-lg font-semibold">Không có quyền truy cập</p>
          <p className="mt-1 text-sm text-muted">
            Trang này cần quyền <code>system:manage</code>.
          </p>
          <Link href="/dashboard" className="mt-4 inline-block text-accent">
            ← Về bảng điều khiển
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-bg">
      <PageHeader
        title="Cấu hình hệ thống"
        backHref="/dashboard"
        backLabel="Bảng điều khiển"
        maxWidthClass="max-w-4xl"
      />

      <main className="mx-auto max-w-4xl space-y-6 px-6 py-8">
        {/* Branding / config */}
        <section className="rounded-lg border border-border bg-surface p-6">
          <div className="mb-4 flex items-center justify-between">
            <h1 className="text-xl font-bold">Thương hiệu & Cấu hình</h1>
            <button
              type="button"
              onClick={saveConfig}
              className="rounded-lg bg-primary px-5 py-2 text-sm font-semibold text-white"
            >
              Lưu thay đổi
            </button>
          </div>
          {savedMsg && <p className="mb-3 text-sm text-green">{savedMsg}</p>}
          <div className="grid gap-4 sm:grid-cols-2">
            {Object.keys(config)
              .filter((key) => key !== HOMEPAGE_INFO_CARDS_KEY)
              .map((key) => (
                <ConfigField
                  key={key}
                  name={LABELS[key] ?? key}
                  configKey={key}
                  value={config[key]}
                  onChange={(v) => setConfig((c) => ({ ...c, [key]: v }))}
                />
              ))}
          </div>
        </section>

        {/* 4 thẻ thông tin trang chủ */}
        <HomepageInfoCardsSection
          token={token}
          rawValue={config[HOMEPAGE_INFO_CARDS_KEY]}
          onSaved={(v) => setConfig((c) => ({ ...c, [HOMEPAGE_INFO_CARDS_KEY]: v }))}
        />

        {/* Thông báo hệ thống */}
        <AnnouncementSection token={token} anns={anns} setAnns={setAnns} />

        {/* Gửi thông báo */}
        <BroadcastSection token={token} />

        {/* Import user hàng loạt */}
        <BulkImportSection token={token} />
      </main>
    </div>
  );
}

function ConfigField({
  name,
  configKey,
  value,
  onChange,
}: {
  name: string;
  configKey: string;
  value: string;
  onChange: (v: string) => void;
}) {
  const isColor = configKey.endsWith("COLOR");
  const isBool = value === "true" || value === "false";
  const isTheme = configKey === "SITE_THEME_MODE";

  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-medium text-muted">{name}</span>
      {isColor ? (
        <div className="flex items-center gap-2">
          <input
            type="color"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className="h-9 w-12 rounded border border-border"
          />
          <span className="font-mono text-sm">{value}</span>
        </div>
      ) : isTheme ? (
        <select value={value} onChange={(e) => onChange(e.target.value)} className="input">
          <option value="light">Sáng</option>
          <option value="dark">Tối</option>
          <option value="system">Theo hệ thống</option>
        </select>
      ) : isBool ? (
        <select value={value} onChange={(e) => onChange(e.target.value)} className="input">
          <option value="true">Bật</option>
          <option value="false">Tắt</option>
        </select>
      ) : (
        <input
          type="text"
          value={value ?? ""}
          onChange={(e) => onChange(e.target.value)}
          className="input"
        />
      )}
    </label>
  );
}

const DEFAULT_INFO_CARDS: HomepageInfoCard[] = [
  { icon: "🎓", title: "", description: "" },
  { icon: "🧑‍🏫", title: "", description: "" },
  { icon: "⭐", title: "", description: "" },
  { icon: "🏆", title: "", description: "" },
];

function HomepageInfoCardsSection({
  token,
  rawValue,
  onSaved,
}: {
  token: string;
  rawValue: string | undefined;
  onSaved: (rawValue: string) => void;
}) {
  const [cards, setCards] = useState<HomepageInfoCard[]>(DEFAULT_INFO_CARDS);
  const [loaded, setLoaded] = useState(false);
  const [savedMsg, setSavedMsg] = useState<string | null>(null);

  useEffect(() => {
    if (loaded || rawValue === undefined) return;
    try {
      const parsed = JSON.parse(rawValue) as HomepageInfoCard[];
      if (Array.isArray(parsed) && parsed.length > 0) setCards(parsed);
    } catch {
      /* giữ giá trị mặc định nếu JSON hỏng */
    }
    setLoaded(true);
  }, [rawValue, loaded]);

  function updateCard(i: number, patch: Partial<HomepageInfoCard>) {
    setCards((prev) => prev.map((c, idx) => (idx === i ? { ...c, ...patch } : c)));
  }

  async function save() {
    const value = JSON.stringify(cards);
    await configApi.update(token, { HOMEPAGE_INFO_CARDS: value });
    onSaved(value);
    setSavedMsg("Đã lưu");
    setTimeout(() => setSavedMsg(null), 2500);
  }

  return (
    <section className="rounded-lg border border-border bg-surface p-6">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">4 thẻ thông tin trang chủ</h2>
          <p className="text-sm text-muted">
            Hiển thị ở section bên dưới &quot;Khóa học nổi bật&quot; trên trang chủ.
          </p>
        </div>
        <button
          type="button"
          onClick={save}
          className="rounded-lg bg-primary px-5 py-2 text-sm font-semibold text-white"
        >
          Lưu thay đổi
        </button>
      </div>
      {savedMsg && <p className="mb-3 text-sm text-green">{savedMsg}</p>}
      <div className="grid gap-4 sm:grid-cols-2">
        {cards.map((card, i) => (
          <div key={i} className="space-y-2 rounded-lg border border-border p-3">
            <div className="flex items-center gap-2">
              <input
                value={card.icon}
                onChange={(e) => updateCard(i, { icon: e.target.value })}
                className="input w-16 text-center"
                aria-label={`Icon thẻ ${i + 1}`}
              />
              <input
                value={card.title}
                onChange={(e) => updateCard(i, { title: e.target.value })}
                placeholder="Tiêu đề"
                className="input flex-1"
              />
            </div>
            <textarea
              value={card.description}
              onChange={(e) => updateCard(i, { description: e.target.value })}
              placeholder="Mô tả ngắn"
              rows={2}
              className="input text-sm"
            />
          </div>
        ))}
      </div>
    </section>
  );
}

function AnnouncementSection({
  token,
  anns,
  setAnns,
}: {
  token: string;
  anns: Announcement[];
  setAnns: (a: Announcement[]) => void;
}) {
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [level, setLevel] = useState("INFO");
  const confirm = useConfirm();

  async function create() {
    if (!title.trim()) return;
    const a = await announcementApi.create(token, { title, body, level, active: true });
    setAnns([a, ...anns]);
    setTitle("");
    setBody("");
  }
  async function remove(id: number) {
    if (!(await confirm("Xóa thông báo này?"))) return;
    await announcementApi.remove(token, id);
    setAnns(anns.filter((a) => a.id !== id));
  }

  return (
    <section className="rounded-lg border border-border bg-surface p-6">
      <h2 className="mb-3 text-lg font-semibold">Thông báo hệ thống</h2>
      <div className="flex flex-wrap gap-2">
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Tiêu đề thông báo"
          className="input flex-1"
        />
        <select value={level} onChange={(e) => setLevel(e.target.value)} className="input w-36">
          <option value="INFO">Thông tin</option>
          <option value="WARNING">Cảnh báo</option>
          <option value="CRITICAL">Khẩn cấp</option>
        </select>
        <button type="button" onClick={create} className="rounded-lg bg-accent px-5 py-2 text-sm font-semibold text-white">
          Đăng
        </button>
      </div>
      <input
        value={body}
        onChange={(e) => setBody(e.target.value)}
        placeholder="Nội dung (tùy chọn)"
        className="input mt-2"
      />
      <ul className="mt-4 space-y-2">
        {anns.map((a) => (
          <li key={a.id} className="flex items-center gap-3 rounded-lg border border-border px-3 py-2 text-sm">
            <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
              a.level === "CRITICAL" ? "bg-red-soft text-red"
                : a.level === "WARNING" ? "bg-accent-soft text-accent"
                : "bg-primary-soft text-primary"}`}>
              {a.level}
            </span>
            <span className="flex-1">{a.title}</span>
            {a.active && <span className="text-xs text-green">● Đang hiện</span>}
            <button type="button" onClick={() => remove(a.id)} className="text-xs text-red">
              Xóa
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}

function BroadcastSection({ token }: { token: string }) {
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [msg, setMsg] = useState<string | null>(null);

  async function send() {
    if (!title.trim()) return;
    const r = await notificationApi.broadcast(token, { title, body });
    setMsg(`Đã gửi tới ${r.recipients} người dùng`);
    setTitle("");
    setBody("");
    setTimeout(() => setMsg(null), 3000);
  }

  return (
    <section className="rounded-lg border border-border bg-surface p-6">
      <h2 className="mb-3 text-lg font-semibold">Gửi thông báo tới tất cả</h2>
      <div className="flex flex-wrap gap-2">
        <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Tiêu đề" className="input flex-1" />
        <button type="button" onClick={send} className="rounded-lg bg-primary px-5 py-2 text-sm font-semibold text-white">
          Gửi
        </button>
      </div>
      <input value={body} onChange={(e) => setBody(e.target.value)} placeholder="Nội dung" className="input mt-2" />
      {msg && <p className="mt-2 text-sm text-green">{msg}</p>}
    </section>
  );
}

function BulkImportSection({ token }: { token: string }) {
  const [text, setText] = useState("");
  const [result, setResult] = useState<string | null>(null);

  async function importUsers() {
    const users = text
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => {
        const [email, ...name] = line.split(",");
        return { email: email.trim(), fullName: name.join(",").trim() };
      });
    if (users.length === 0) return;
    const r = await adminUserApi.bulk(token, users);
    setResult(`Tạo ${r.created}, bỏ qua ${r.skipped}${r.errors.length ? `, lỗi ${r.errors.length}` : ""}`);
  }

  return (
    <section className="rounded-lg border border-border bg-surface p-6">
      <h2 className="mb-1 text-lg font-semibold">Import học viên hàng loạt</h2>
      <p className="mb-3 text-sm text-muted">
        Mỗi dòng: <code>email,Họ tên</code> (mật khẩu mặc định <code>Meridian@123</code>).
      </p>
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={4}
        placeholder={"a@example.com,Nguyễn Văn A\nb@example.com,Trần Thị B"}
        className="input font-mono text-sm"
      />
      <div className="mt-2 flex items-center gap-3">
        <button type="button" onClick={importUsers} className="rounded-lg bg-primary px-5 py-2 text-sm font-semibold text-white">
          Import
        </button>
        {result && <span className="text-sm text-green">{result}</span>}
      </div>
    </section>
  );
}

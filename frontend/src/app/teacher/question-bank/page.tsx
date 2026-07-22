"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import { useAuthStore } from "@/store/auth";

const BANKS = [
  { href: "/teacher/questions", emoji: "🎓", title: "Academic", subtitle: "Ngân hàng câu hỏi IELTS" },
  { href: "/teacher/kids-questions", emoji: "🧸", title: "Kids", subtitle: "Ngân hàng câu hỏi Trẻ em" },
];

/** Điểm vào chung — chọn giữa 2 ngân hàng câu hỏi tách biệt (IELTS/Trẻ em). */
export default function QuestionBankHubPage() {
  const router = useRouter();
  const { accessToken, hydrated, loadMe } = useAuthStore();

  const [ready, setReady] = useState(false);
  const [allowed, setAllowed] = useState(false);

  useEffect(() => {
    if (!hydrated) return;
    if (!accessToken) {
      router.replace("/login");
      return;
    }
    loadMe()
      .then(() => setAllowed(useAuthStore.getState().systemCapabilities.includes("question:manage")))
      .catch(() => {})
      .finally(() => setReady(true));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hydrated, accessToken]);

  if (!hydrated || !ready) {
    return <div className="grid min-h-screen place-items-center text-muted">Đang tải…</div>;
  }

  if (!allowed) {
    return (
      <div className="grid min-h-screen place-items-center px-6 text-center">
        <div>
          <p className="text-lg font-semibold">Không có quyền truy cập</p>
          <p className="mt-1 text-sm text-muted">
            Trang này cần quyền <code>question:manage</code>.
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
      <PageHeader title="Ngân hàng câu hỏi" backHref="/dashboard" backLabel="Bảng điều khiển" />

      <div className="mx-auto max-w-3xl px-6 py-12 text-center">
        <p className="text-muted">Chọn ngân hàng câu hỏi muốn quản lý.</p>

        <div className="mt-8 grid gap-6 sm:grid-cols-2">
          {BANKS.map((b) => (
            <Link
              key={b.href}
              href={b.href}
              className="group flex flex-col items-center gap-3 rounded-[18px] border border-border bg-surface p-8 transition-shadow hover:shadow-[0_12px_36px_-14px_rgba(38,33,27,.13)]"
            >
              <span className="text-5xl">{b.emoji}</span>
              <span className="text-xl font-semibold group-hover:text-primary">{b.title}</span>
              <span className="text-sm text-muted">{b.subtitle}</span>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}

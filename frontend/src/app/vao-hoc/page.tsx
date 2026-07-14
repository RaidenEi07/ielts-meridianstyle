"use client";

import Link from "next/link";
import { SiteHeader } from "@/components/SiteHeader";

const GROUPS: {
  key: "tre-em" | "tieu-hoc";
  title: string;
  subtitle: string;
  emoji: string;
}[] = [
  { key: "tre-em", title: "Trẻ em", subtitle: "3–6 tuổi", emoji: "🧸" },
  { key: "tieu-hoc", title: "Tiểu học", subtitle: "7–11 tuổi", emoji: "🎒" },
];

export default function VaoHocPage() {
  return (
    <div className="min-h-screen">
      <SiteHeader />

      <div className="mx-auto max-w-4xl px-6 py-12 text-center">
        <h1 className="text-3xl font-bold">Vào học</h1>
        <p className="mt-2 text-muted">Chọn nhóm phù hợp để bắt đầu học.</p>

        <div className="mt-10 grid gap-6 sm:grid-cols-3">
          {GROUPS.map((g) => (
            <Link
              key={g.key}
              href={`/vao-hoc/${g.key}`}
              className="group flex flex-col items-center gap-3 rounded-[18px] border border-border bg-surface p-8 transition-shadow hover:shadow-[0_12px_36px_-14px_rgba(38,33,27,.13)]"
            >
              <span className="text-5xl">{g.emoji}</span>
              <span className="text-xl font-semibold group-hover:text-primary">{g.title}</span>
              <span className="text-sm text-muted">{g.subtitle}</span>
            </Link>
          ))}

          <Link
            href="/vao-hoc/ielts"
            className="group flex flex-col items-center gap-3 rounded-[18px] border border-border bg-surface p-8 transition-shadow hover:shadow-[0_12px_36px_-14px_rgba(38,33,27,.13)]"
          >
            <span className="text-5xl">🎓</span>
            <span className="text-xl font-semibold group-hover:text-primary">IELTS</span>
            <span className="text-sm text-muted">Luyện thi IELTS</span>
          </Link>
        </div>
      </div>
    </div>
  );
}

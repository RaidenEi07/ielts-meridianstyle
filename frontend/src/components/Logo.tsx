"use client";

import { useEffect } from "react";
import { useConfigStore } from "@/store/config";

export function Logo({ className = "" }: { className?: string }) {
  const siteName = useConfigStore((s) => s.siteName);
  const load = useConfigStore((s) => s.load);

  useEffect(() => {
    load();
  }, [load]);

  // Chữ cái đầu của TỪ CUỐI (vd. "Anh ngữ Meridian" → "M") — giữ đúng huy hiệu
  // hiện tại thay vì lấy chữ cái đầu toàn bộ tên (sẽ ra "A", sai ý đồ thiết kế).
  const monogram = siteName.trim().split(/\s+/).pop()?.charAt(0).toUpperCase() ?? "M";

  return (
    <span className={`inline-flex items-center gap-2 ${className}`}>
      <span
        aria-hidden
        className="grid h-9 w-9 place-items-center rounded-[10px] bg-primary text-white"
        style={{ fontFamily: "var(--font-serif)" }}
      >
        {monogram}
      </span>
      <span
        className="text-lg font-semibold tracking-tight"
        style={{ fontFamily: "var(--font-serif)" }}
      >
        {siteName}
      </span>
    </span>
  );
}

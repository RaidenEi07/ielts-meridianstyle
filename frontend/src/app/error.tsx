"use client";

import Link from "next/link";
import { useEffect } from "react";
import { Logo } from "@/components/Logo";

export default function Error({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string };
  unstable_retry: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 px-6 text-center">
      <Link href="/">
        <Logo />
      </Link>
      <div>
        <p className="text-lg font-semibold">Đã có lỗi xảy ra</p>
        <p className="mt-1 text-muted">
          Rất tiếc, đã xảy ra lỗi không mong muốn. Vui lòng thử lại.
        </p>
      </div>
      <div className="flex gap-3">
        <button
          type="button"
          onClick={() => unstable_retry()}
          className="rounded-full border border-border px-6 py-3 font-semibold transition-colors hover:bg-soft"
        >
          Thử lại
        </button>
        <Link
          href="/"
          className="rounded-full bg-primary px-6 py-3 font-semibold text-white transition-opacity hover:opacity-90"
        >
          Về trang chủ
        </Link>
      </div>
    </div>
  );
}

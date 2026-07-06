export function Logo({ className = "" }: { className?: string }) {
  return (
    <span className={`inline-flex items-center gap-2 ${className}`}>
      <span
        aria-hidden
        className="grid h-9 w-9 place-items-center rounded-[10px] bg-primary text-white"
        style={{ fontFamily: "var(--font-serif)" }}
      >
        M
      </span>
      <span
        className="text-lg font-semibold tracking-tight"
        style={{ fontFamily: "var(--font-serif)" }}
      >
        Anh ngữ Meridian
      </span>
    </span>
  );
}

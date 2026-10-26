import Link from "next/link";
import { Lock } from "lucide-react";

/**
 * Thông báo cho người chưa được ghi danh. Học viên không tự ghi danh được — giáo viên hoặc
 * quản trị viên ghi danh cho họ (trang Quản lý tài khoản, Lớp học, hoặc Học viên & điểm số của khóa).
 */
export function NotEnrolledNotice({
  loggedIn,
  className = "",
}: {
  loggedIn: boolean;
  className?: string;
}) {
  return (
    <div
      data-testid="NotEnrolledNotice"
      className={`flex items-start gap-3 rounded-lg border border-border bg-soft px-4 py-3 text-sm text-muted ${className}`}
    >
      <Lock className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
      {loggedIn ? (
        <p>
          Bạn chưa được ghi danh vào khóa học này. Liên hệ giáo viên hoặc quản trị viên để được ghi
          danh và xem nội dung bài học.
        </p>
      ) : (
        <p>
          <Link href="/login" className="font-semibold text-accent hover:underline">
            Đăng nhập
          </Link>{" "}
          để vào học. Học viên được giáo viên hoặc quản trị viên ghi danh vào khóa học.
        </p>
      )}
    </div>
  );
}

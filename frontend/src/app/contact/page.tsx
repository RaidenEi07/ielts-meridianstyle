import type { Metadata } from "next";
import Link from "next/link";
import { StaticPageShell } from "@/components/StaticPageShell";
import { getSiteConfig } from "@/lib/publicConfigServer";

export const metadata: Metadata = {
  title: "Liên hệ",
};

export default async function ContactPage() {
  const { siteName, supportEmail, supportPhone, supportAddress } = await getSiteConfig();

  return (
    <StaticPageShell title="Liên hệ">
      <p>
        Có câu hỏi về khóa học, ghi danh hoặc cần hỗ trợ kỹ thuật? Liên hệ với
        chúng tôi qua các kênh dưới đây.
      </p>

      {supportEmail && (
        <>
          <h2>Email</h2>
          <p>{supportEmail}</p>
        </>
      )}

      {supportPhone && (
        <>
          <h2>Điện thoại</h2>
          <p>{supportPhone}</p>
        </>
      )}

      {supportAddress && (
        <>
          <h2>Địa chỉ</h2>
          <p>{supportAddress}</p>
        </>
      )}

      <p className="!mt-10 text-sm">
        Bạn cũng có thể để lại thông tin ở form tư vấn tại{" "}
        <Link href="/" className="text-accent hover:underline">
          trang chủ
        </Link>
        , đội ngũ {siteName} sẽ liên hệ trong 24h.
      </p>
    </StaticPageShell>
  );
}

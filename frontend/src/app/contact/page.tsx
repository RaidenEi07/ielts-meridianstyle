import type { Metadata } from "next";
import Link from "next/link";
import { StaticPageShell } from "@/components/StaticPageShell";
import { getSiteConfig } from "@/lib/publicConfigServer";

export const metadata: Metadata = {
  title: "Liên hệ",
};

export default async function ContactPage() {
  const { siteName, supportEmail } = await getSiteConfig();

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

      <h2>Điện thoại</h2>
      <p className="italic">[Điền số điện thoại liên hệ trước khi công khai]</p>

      <h2>Địa chỉ</h2>
      <p>Hà Nội · TP.HCM</p>
      <p className="italic">[Điền địa chỉ cụ thể từng cơ sở trước khi công khai]</p>

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

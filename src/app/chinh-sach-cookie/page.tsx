import type { Metadata } from "next";
import Link from "next/link";
import { Breadcrumb } from "@/components/Breadcrumb";
import { companyContact } from "@/lib/contact";

const title = "Chính sách cookie";
const description = "Website WOKIN TOOLS Việt Nam không dùng cookie quảng cáo hay cookie theo dõi.";
const canonical = "/chinh-sach-cookie/";

export const metadata: Metadata = {
  title,
  description,
  alternates: { canonical },
  openGraph: { title, description, url: canonical },
};

export default function CookiePolicyPage() {
  return <main className="page-shell">
    <Breadcrumb items={[{ label: title }]} />
    <article className="container-wokin section content-section prose-content">
      <h1 className="page-title">{title}</h1>
      <p>Cookie là tệp nhỏ mà website có thể lưu trên trình duyệt của bạn. Trang này cho biết website WOKIN TOOLS Việt Nam có sử dụng cookie hay không.</p>
      <h2>Website không đặt cookie theo dõi</h2>
      <p>Website hiện không sử dụng cookie quảng cáo, cookie phân tích hành vi hay công cụ theo dõi của bên thứ ba. Phông chữ và hình ảnh được phục vụ trực tiếp từ máy chủ của website.</p>
      <h2>Liên kết đến dịch vụ bên ngoài</h2>
      <p>Khi bạn bấm vào liên kết Zalo, Facebook, YouTube hoặc TikTok, bạn sẽ rời khỏi website và chính sách cookie của các dịch vụ đó sẽ được áp dụng.</p>
      <h2>Thay đổi</h2>
      <p>Nếu sau này website bổ sung công cụ phân tích hoặc cookie không thiết yếu, chúng tôi sẽ cập nhật trang này và xin sự đồng ý của bạn trước khi sử dụng. Xem thêm <Link href="/chinh-sach-bao-mat/">Chính sách bảo mật</Link> hoặc liên hệ hotline <a href={companyContact.hotlineHref}>{companyContact.hotline}</a>.</p>
    </article>
  </main>;
}

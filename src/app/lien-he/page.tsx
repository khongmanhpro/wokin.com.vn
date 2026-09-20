import type { Metadata } from "next";
import Link from "next/link";
import { Breadcrumb } from "@/components/Breadcrumb";
import { ContactForm } from "@/components/ContactForm";
import { StaticHero } from "@/components/StaticHero";
import { getProductsByCategory } from "@/lib/catalog";
import { companyContact } from "@/lib/contact";

const title = "Liên hệ";
const description = "Thông tin liên hệ chính thức của Công ty Cổ phần Thiết bị Công nghiệp Workman tại Việt Nam.";
const canonical = "/lien-he/";

export const metadata: Metadata = {
  title,
  description,
  alternates: { canonical },
  openGraph: { title, description, url: canonical },
};

export default function ContactPage() {
  const hero = getProductsByCategory("mechanics-tools")[0]?.images[0]?.src ?? "/images/logo.png";
  return <main>
    <StaticHero title="LIÊN HỆ WOKIN" image={hero} eyebrow="THÔNG TIN KÊNH HỖ TRỢ" />
    <Breadcrumb items={[{ label: "Liên hệ" }]} />
    <section className="section container-wokin contact-layout">
      <div>
        <span className="eyebrow">KÊNH LIÊN HỆ WOKIN</span>
        <h2 className="contact-title">THÔNG TIN LIÊN HỆ</h2>
        <div className="contact-list contact-details">
          <p><strong>{companyContact.legalName}</strong></p>
          <p><strong>Địa chỉ:</strong> {companyContact.address}</p>
          <p><strong>Hotline/Zalo:</strong> <a href={companyContact.hotlineHref}>{companyContact.hotline}</a></p>
          <p><strong>Mã số thuế:</strong> {companyContact.taxCode}</p>
          <p><a href={companyContact.zaloHref} target="_blank" rel="noreferrer">Nhắn tin qua Zalo</a></p>
        </div>
        <p className="archive-intro">Bạn có thể điền form để Workman nắm đúng nhu cầu trước khi tư vấn. Nếu cần phản hồi ngay, hãy gọi hotline hoặc nhắn Zalo ở bên dưới.</p>
        <div className="contact-actions">
          <Link className="button-primary" href="/san-pham/">Xem danh mục sản phẩm</Link>
          <a className="button-secondary" href={companyContact.zaloHref} target="_blank" rel="noreferrer">Nhắn Zalo</a>
        </div>
      </div>
      <aside className="contact-panel">
        <span className="eyebrow">PHẢN HỒI NHANH</span>
        <h2>GỬI ĐÚNG THÔNG TIN, NHẬN ĐÚNG TƯ VẤN</h2>
        <div className="contact-list"><p>Chỉ hỏi những thông tin cần thiết để đội ngũ xác định sản phẩm hoặc nhu cầu báo giá. Email là tùy chọn; số điện thoại giúp Workman liên hệ lại nhanh hơn.</p></div>
        <p className="contact-response-time"><strong>Thời gian dự kiến:</strong> trong giờ làm việc</p>
      </aside>
    </section>
    <section className="section contact-form-section"><div className="container-wokin"><ContactForm /></div></section>
  </main>;
}

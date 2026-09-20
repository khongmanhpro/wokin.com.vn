import type { Metadata } from "next";
import Link from "next/link";
import { Breadcrumb } from "@/components/Breadcrumb";
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

const distributors = [
  ["ĐẠI LÝ CHÍNH THỨC TẠI Ý", "VIRIDEX SRL.", "VIA GENNARO DEL PRETE 2/4, CAP 04012, CISTERNA DI LATINA (LT), ITALY", "0039 069697152"],
  ["ĐẠI LÝ CHÍNH THỨC TẠI BRAZIL", "BELLKO IMPO & EXPO", "Rodovia Antonio Heil, 1001 – Km 01, Armazem G3 / 93, Itajai, SC CEP 88316-001, Brazil", "+55 51 21091049"],
  ["ĐẠI LÝ CHÍNH THỨC TẠI LIBYA", "شركة ديسان لاستيراد معدات الورش وتجهيزات البناء", "مدينة مصراتة، شارع المجمدات", "00218912164200"],
  ["ĐẠI LÝ CHÍNH THỨC TẠI PHÁP", "COMAI S.A.", "Z.I. DU BARRAOUET 82100 CASTELSARRASIN, FRANCE", "+33563327272"],
  ["ĐẠI LÝ CHÍNH THỨC TẠI ISRAEL", "P.A.I Tools LTD", "10 Arieh Katzenstein St., Haifa, Israel", "+972-4-8400495"],
];

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
        <p className="archive-intro">Form liên hệ trực tuyến chưa được kích hoạt. Bạn có thể liên hệ trực tiếp qua hotline hoặc Zalo ở trên; trang không yêu cầu bạn nhập thông tin hoặc dữ liệu cá nhân qua form.</p>
        <div className="form-grid">
          <Link className="button-primary" href="/san-pham/">Xem danh mục sản phẩm</Link>
          <Link className="button-primary" href="/nha-phan-phoi/">Thông tin nhà phân phối</Link>
        </div>
      </div>
      <aside className="contact-panel">
        <h2>TRẠNG THÁI TIẾP NHẬN</h2>
        <div className="contact-list"><p>Form yêu cầu trực tuyến chưa được kích hoạt. Để được hỗ trợ, vui lòng gọi hotline hoặc nhắn Zalo theo thông tin liên hệ chính thức của Workman.</p></div>
      </aside>
    </section>
    <section className="section distributor-section"><div className="container-wokin"><div className="section-head"><h2 className="section-title">MẠNG LƯỚI PHÂN PHỐI</h2><p className="subtitle">Các đối tác chính thức trên toàn cầu</p></div><div className="distributor-grid">{distributors.map(([distributorTitle, company, address, phone]) => <article className="distributor-card" key={distributorTitle}><h3>{distributorTitle}</h3><strong>{company}</strong><p>{address}</p><p>Điện thoại: {phone}</p></article>)}</div></div></section>
  </main>;
}

import type { Metadata } from "next";
import Link from "next/link";
import { Breadcrumb } from "@/components/Breadcrumb";
import { StaticHero } from "@/components/StaticHero";
import { getProductsByCategory } from "@/lib/catalog";

const title = "Liên hệ";
const description = "Thông tin về trạng thái kênh liên hệ và các nội dung WOKIN TOOLS hiện có tại Việt Nam.";
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
        <h2 className="contact-title">LIÊN HỆ TRỰC TUYẾN CHƯA ĐƯỢC KÍCH HOẠT</h2>
        <p className="archive-intro">Kênh tiếp nhận yêu cầu đang chờ một hệ thống backend được phê duyệt và cấu hình chính thức. Trong thời gian này, trang không yêu cầu bạn nhập thông tin hoặc dữ liệu cá nhân.</p>
        <div className="form-grid">
          <Link className="button-primary" href="/san-pham/">Xem danh mục sản phẩm</Link>
          <Link className="button-primary" href="/nha-phan-phoi/">Thông tin nhà phân phối</Link>
        </div>
      </div>
      <aside className="contact-panel">
        <h2>TRẠNG THÁI TIẾP NHẬN</h2>
        <div className="contact-list"><p>Hiện chưa có form, email hoặc đầu mối trực tuyến chính thức để nhận yêu cầu từ website này. Chúng tôi sẽ cập nhật trang khi kênh liên hệ được xác minh và sẵn sàng vận hành.</p></div>
      </aside>
    </section>
    <section className="section distributor-section"><div className="container-wokin"><div className="section-head"><h2 className="section-title">MẠNG LƯỚI PHÂN PHỐI</h2><p className="subtitle">Các đối tác chính thức trên toàn cầu</p></div><div className="distributor-grid">{distributors.map(([distributorTitle, company, address, phone]) => <article className="distributor-card" key={distributorTitle}><h3>{distributorTitle}</h3><strong>{company}</strong><p>{address}</p><p>Điện thoại: {phone}</p></article>)}</div></div></section>
  </main>;
}

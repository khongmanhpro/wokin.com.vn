import type { Metadata } from "next";
import { Breadcrumb } from "@/components/Breadcrumb";
import { StaticHero } from "@/components/StaticHero";
import { getProductsByCategory, glossary } from "@/lib/catalog";
import { countries } from "@/lib/countries";

export const metadata: Metadata = { title: "Liên hệ", description: "Gửi yêu cầu tư vấn sản phẩm và hợp tác phân phối WOKIN TOOLS.", alternates: { canonical: "/contact" } };

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
    <StaticHero title="LIÊN HỆ WOKIN" image={hero} eyebrow="CHÚNG TÔI LUÔN SẴN SÀNG" />
    <Breadcrumb items={[{ label: "Liên hệ" }]} />
    <section className="section container-wokin contact-layout">
      <div>
        <span className="eyebrow">CONTACT FORM WOKIN</span>
        <h2 className="contact-title">{glossary.ui["Submit a Request"]}</h2>
        <form className="form-grid">
          <label className="field">{glossary.ui["First Name"]}<input className="input" name="firstName" autoComplete="given-name" required /></label>
          <label className="field">{glossary.ui["Last Name"]}<input className="input" name="lastName" autoComplete="family-name" required /></label>
          <label className="field">{glossary.ui.Email}<input className="input" type="email" name="email" autoComplete="email" required /></label>
          <label className="field">{glossary.ui["WhatsApp Number"]}<input className="input" type="tel" name="phone" autoComplete="tel" /></label>
          <label className="field full">{glossary.ui["Country or Region"]}<select className="input" name="country" defaultValue=""><option value="" disabled>{glossary.ui["Select Country or Region"]}</option>{countries.map((country) => <option value={country.code} key={country.code}>{country.name}</option>)}</select></label>
          <label className="field full">{glossary.ui["Company Name"]}<input className="input" name="company" autoComplete="organization" /></label>
          <label className="field full">{glossary.ui.Subject}<input className="input" name="subject" required /></label>
          <label className="field full">{glossary.ui["Your Message"]}<textarea className="input textarea" name="message" required /></label>
          <div className="field full"><button type="button" className="button-primary">{glossary.ui.SUBMIT}</button><small>Biểu mẫu đang ở chế độ giao diện; chức năng gửi sẽ được kết nối sau.</small></div>
        </form>
      </div>
      <aside className="contact-panel">
        <h2>{glossary.ui["Reach Us For Any Question"]}</h2>
        <div className="contact-list"><strong>ZJG WOKIN INDUSTRIAL CO., LTD.</strong><p>350 Yangjin Road, Zhangjiagang,<br />Jiangsu, China 215612</p><p>T: 0086-512-55398656<br />MP / WhatsApp: 0086 18901552950<br />WeChat: jssjj333<br />QQ: 2885167231<br />E: sales@wokintools.com</p></div>
      </aside>
    </section>
    <section className="section distributor-section"><div className="container-wokin"><div className="section-head"><h2 className="section-title">MẠNG LƯỚI PHÂN PHỐI</h2><p className="subtitle">Các đối tác chính thức trên toàn cầu</p></div><div className="distributor-grid">{distributors.map(([title, company, address, phone]) => <article className="distributor-card" key={title}><h3>{title}</h3><strong>{company}</strong><p>{address}</p><p>Điện thoại: {phone}</p></article>)}</div></div></section>
  </main>;
}

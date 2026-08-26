import type { Metadata } from "next";
import { Breadcrumb } from "@/components/Breadcrumb";
import { DistributorCta } from "@/components/DistributorCta";
import { StaticHero } from "@/components/StaticHero";
import { getProductsByCategory } from "@/lib/catalog";

export const metadata: Metadata = { title: "Tuyển đại lý phân phối", description: "Gia nhập mạng lưới đại lý WOKIN TOOLS và khai phá tiềm năng thị trường dụng cụ chuyên nghiệp.", alternates: { canonical: "/distributors" } };

const blocks = [
  ["Gia nhập mạng lưới toàn cầu", "Trở thành nhà phân phối WOKIN để xây dựng quan hệ hợp tác lâu dài và cùng phát triển. Danh mục chuyên nghiệp, nguồn cung ổn định và nhận diện toàn cầu tạo nền tảng để bạn cạnh tranh bền vững tại thị trường của mình."],
  ["Danh mục toàn diện tạo lợi thế cạnh tranh", "Sẵn sàng vươn ra thị trường? Khai thác hệ sản phẩm dụng cụ chất lượng cao và đa dạng để nâng cao năng lực phục vụ khách hàng, mở rộng cơ hội kinh doanh."],
  ["Nâng tầm không gian cửa hàng", "Cải thiện thiết kế trưng bày, thu hút thêm khách hàng và xây dựng trải nghiệm bán lẻ nhất quán. Liên hệ để trở thành đối tác chính thức của chúng tôi."],
];

export default function DistributorsPage() {
  const products = getProductsByCategory("tool-sets");
  return <main>
    <StaticHero title={`TUYỂN ĐẠI LÝ PHÂN PHỐI ${new Date().getFullYear()}`} image={products[0]?.images[0]?.src ?? "/images/logo.png"} eyebrow="WOKIN TOOLS" />
    <Breadcrumb items={[{ label: "Tuyển đại lý" }]} />
    <section className="section container-wokin">
      <div className="section-head"><h2 className="section-title">Gia nhập mạng lưới toàn cầu</h2><p className="subtitle">Hợp tác bền vững, phát triển dài hạn</p></div>
      <div className="partner-feature-grid">{blocks.map(([title, body], index) => <article className="partner-feature" key={title}>
        <div className="partner-image"><img src={products[index]?.images[0]?.src ?? "/images/logo.png"} alt="" /></div>
        <div><span className="feature-number">0{index + 1}</span><h3>{title}</h3><p>{body}</p></div>
      </article>)}</div>
    </section>
    <DistributorCta />
  </main>;
}

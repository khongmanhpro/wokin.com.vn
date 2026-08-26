import type { Metadata } from "next";
import { Breadcrumb } from "@/components/Breadcrumb";
import { DistributorCta } from "@/components/DistributorCta";
import { StaticHero } from "@/components/StaticHero";
import { getProductsByCategory } from "@/lib/catalog";

const title = "Giới thiệu";
const description = "Tìm hiểu WOKIN TOOLS, thương hiệu dụng cụ chuyên nghiệp được tin dùng tại hơn 100 quốc gia.";
const canonical = "/gioi-thieu/";

export const metadata: Metadata = {
  title,
  description,
  alternates: { canonical },
  openGraph: { title, description, url: canonical },
};

export default function AboutPage() {
  const hero = getProductsByCategory("power-tools")[0]?.images[0]?.src ?? "/images/logo.png";
  return <main>
    <StaticHero title="Thương hiệu toàn cầu đáng tin cậy về dụng cụ chuyên nghiệp" image={hero} eyebrow="GIỚI THIỆU WOKIN" />
    <Breadcrumb items={[{ label: "Giới thiệu" }]} />
    <article className="container-wokin section content-section prose-content">
      <p>WOKIN Tools là thương hiệu được công nhận trên toàn cầu, với sản phẩm hiện diện tại hơn 100 quốc gia. Chúng tôi tự hào cung cấp dụng cụ và sản phẩm kim khí chuyên nghiệp, bền bỉ trước những công việc khắc nghiệt nhất. Cam kết mạnh mẽ về chất lượng và hiệu quả giúp chúng tôi giao đúng sản phẩm vào đúng thời điểm khách hàng cần.</p>
      <h2>Thiết kế để tiếp sức cho mọi dự án</h2>
      <p>Danh mục hơn 3.000 mặt hàng sẵn kho bao phủ dụng cụ cầm tay, máy dụng cụ điện và phụ kiện, bộ dụng cụ, máy dụng cụ khí nén, bảo hộ lao động và thiết bị xây dựng. Hệ sản phẩm toàn diện đáp ứng nhu cầu từ xưởng cơ khí đến công trường chuyên nghiệp.</p>
      <h2>Trải nghiệm sức mạnh GP20V</h2>
      <p>Nền tảng pin Li-Ion 20V tiên tiến không ngừng mở rộng, mang lại hiệu năng và sự tiện lợi cho khoan, mài, cắt, làm vườn, chiếu sáng cùng nhiều ứng dụng khác. Được thiết kế chú trọng hiệu suất và độ bền, GP20V giúp bạn làm việc thông minh và chủ động hơn.</p>
      <h2>Phân phối hiệu quả</h2>
      <p>Đây là một năng lực cốt lõi của WOKIN Tools. Kho hàng rộng 20.000 m² gần thành phố Thượng Hải được tối ưu cho quản lý tồn kho và logistics. Nguồn hàng dồi dào cho gần như toàn bộ danh mục giúp đơn hàng được xử lý nhanh, đa dạng và đáng tin cậy.</p>
      <h2>Gia nhập mạng lưới toàn cầu</h2>
      <p>Chúng tôi mời bạn trở thành nhà phân phối, xây dựng quan hệ hợp tác dài hạn và cùng phát triển. Đồng hành với WOKIN Tools giúp đối tác tạo lợi thế cạnh tranh vững vàng tại thị trường của mình và kiến tạo tương lai dựa trên chất lượng, đổi mới.</p>
    </article>
    <DistributorCta />
  </main>;
}

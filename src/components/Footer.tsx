import Image from "next/image";
import Link from "next/link";
import { glossary } from "@/lib/catalog";

export function Footer() {
  return <footer className="footer">
    <div className="container-wokin footer-grid">
      <div>
        <Image src="/images/logo.png" alt="WOKIN TOOLS" width={301} height={52} />
        <p>Dụng cụ chuẩn chỉ cho công việc chuyên nghiệp.</p>
      </div>
      <div className="footer-links">
        <Link href="/san-pham">{glossary.ui.Products}</Link>
        <Link href="/gioi-thieu/">{glossary.ui["About WOKIN"]}</Link>
        <Link href="/lien-he/">{glossary.ui["Contact WOKIN"]}</Link>
        <Link href="/nha-phan-phoi/">{glossary.ui["Seeking Distributors"]}</Link>
      </div>
    </div>
    <div className="footer-bottom container-wokin">© WOKIN TOOLS. {new Date().getFullYear()} · {glossary.ui["Cookie Policy"]} · {glossary.ui["Privacy Statement"]}</div>
  </footer>;
}

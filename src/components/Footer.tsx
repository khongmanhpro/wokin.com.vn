import Image from "next/image";
import Link from "next/link";
import { glossary } from "@/lib/catalog";
import { companyContact } from "@/lib/contact";
import { siteSettings } from "@/lib/site-settings";

export function Footer() {
  return <footer className="footer">
    <div className="container-wokin footer-grid">
      <div>
        <Image src="/images/logo.png" alt="WOKIN TOOLS" width={301} height={52} />
        <p>Dụng cụ chuẩn chỉ cho công việc chuyên nghiệp.</p>
        <div className="footer-contact">
          <strong>{companyContact.legalName}</strong>
          <span>{companyContact.address}</span>
          <a href={companyContact.hotlineHref}>Hotline/Zalo: {companyContact.hotline}</a>
          <span>Mã số thuế: {companyContact.taxCode}</span>
        </div>
      </div>
      <div className="footer-links">
        {siteSettings.navigation.footer.map((item, index) => item.newTab || !item.url.startsWith("/")
          ? <a href={item.url} key={`${item.url}-${index}`} {...(item.newTab ? { target: "_blank", rel: "noreferrer" } : {})}>{item.label}</a>
          : <Link href={item.url} key={`${item.url}-${index}`}>{item.label}</Link>)}
      </div>
    </div>
    <div className="footer-bottom container-wokin">© WOKIN TOOLS. {new Date().getFullYear()} · {glossary.ui["Cookie Policy"]} · {glossary.ui["Privacy Statement"]}</div>
  </footer>;
}

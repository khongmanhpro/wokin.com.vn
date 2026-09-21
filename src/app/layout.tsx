import type { Metadata } from "next";
import { Be_Vietnam_Pro, Saira_Semi_Condensed } from "next/font/google";
import { Footer } from "@/components/Footer";
import { Header } from "@/components/Header";
import { JsonLd } from "@/components/JsonLd";
import { absoluteUrl, SITE_NAME, SITE_URL } from "@/lib/site";
import "./globals.css";

const saira = Saira_Semi_Condensed({ subsets: ["latin", "latin-ext", "vietnamese"], weight: ["600", "700"], variable: "--font-saira", display: "swap" });
const beVietnam = Be_Vietnam_Pro({ subsets: ["vietnamese"], weight: ["400", "500", "600", "700"], variable: "--font-be-vietnam", display: "swap" });

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "WOKIN TOOLS - Dụng cụ chuyên nghiệp",
    template: "%s | WOKIN TOOLS",
  },
  description:
    "Catalog dụng cụ WOKIN tiếng Việt với hơn 1.300 sản phẩm chuyên nghiệp.",
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    locale: "vi_VN",
    siteName: SITE_NAME,
    title: "WOKIN TOOLS - Dụng cụ chuyên nghiệp",
    description: "Catalog dụng cụ WOKIN tiếng Việt với hơn 1.300 sản phẩm chuyên nghiệp.",
    url: "/",
    images: [{ url: "/images/logo.png", alt: "WOKIN TOOLS" }],
  },
  icons: { icon: "/images/favicon-w.svg", shortcut: "/images/favicon-w.svg", apple: "/images/favicon-w.svg" },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="vi" className={`${saira.variable} ${beVietnam.variable}`}>
      <body>
        <JsonLd data={[
          { "@context": "https://schema.org", "@type": "Organization", name: SITE_NAME, url: SITE_URL, logo: absoluteUrl("/images/logo.png") },
          { "@context": "https://schema.org", "@type": "WebSite", name: SITE_NAME, url: SITE_URL, inLanguage: "vi-VN" },
        ]} />
        <Header />
        {children}
        <Footer />
      </body>
    </html>
  );
}

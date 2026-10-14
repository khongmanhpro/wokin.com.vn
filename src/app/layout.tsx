import type { Metadata } from "next";
import { Be_Vietnam_Pro, Saira_Semi_Condensed } from "next/font/google";
import { FloatingActions } from "@/components/FloatingActions";
import { Footer } from "@/components/Footer";
import { Header } from "@/components/Header";
import { JsonLd } from "@/components/JsonLd";
import { organizationJsonLd } from "@/lib/seo";
import { absoluteUrl, HOME_DESCRIPTION, HOME_TITLE, SITE_NAME, SITE_URL } from "@/lib/site";
import "./globals.css";

const saira = Saira_Semi_Condensed({ subsets: ["latin", "latin-ext", "vietnamese"], weight: ["600", "700"], variable: "--font-saira", display: "swap" });
const beVietnam = Be_Vietnam_Pro({ subsets: ["vietnamese"], weight: ["400", "500", "600", "700"], variable: "--font-be-vietnam", display: "swap" });

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: HOME_TITLE,
    template: "%s | WOKIN TOOLS",
  },
  description: HOME_DESCRIPTION,
  openGraph: {
    type: "website",
    locale: "vi_VN",
    siteName: SITE_NAME,
    title: HOME_TITLE,
    description: HOME_DESCRIPTION,
    images: [{ url: "/images/logo.png", alt: "WOKIN TOOLS" }],
  },
  twitter: { card: "summary_large_image", title: HOME_TITLE, description: HOME_DESCRIPTION, images: ["/images/logo.png"] },
  // Raster W mark cut from the logo: SVG favicons cannot load an external <image>, so the old one rendered blank.
  icons: {
    icon: [{ url: "/favicon.ico", sizes: "32x32 48x48" }, { url: "/images/icon-192.png", type: "image/png", sizes: "192x192" }],
    shortcut: "/favicon.ico",
    apple: { url: "/images/apple-touch-icon.png", sizes: "180x180" },
  },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="vi" className={`${saira.variable} ${beVietnam.variable}`}>
      <body>
        <JsonLd data={organizationJsonLd()} />
        <Header />
        {children}
        <Footer />
        <FloatingActions />
      </body>
    </html>
  );
}

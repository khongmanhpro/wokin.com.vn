import { siteSettings } from "@/lib/site-settings";

const { company } = siteSettings;

// Verified details live in src/data/site-settings.json (editable via the admin "Thông tin website").
export const companyContact = {
  legalName: company.legalName,
  address: company.address,
  hotline: company.hotline,
  hotlineHref: `tel:${company.hotline.replace(/[^\d+]/g, "")}`,
  zaloHref: company.zaloUrl,
  taxCode: company.taxCode,
  social: company.social,
} as const;

// The static public site stays deployable without a backend. Set this at build
// time when the Payload admin service is available, for example:
// https://admin.example.com/api/contact-submissions/submit
export const contactApiUrl = process.env.NEXT_PUBLIC_CONTACT_API_URL?.trim() ?? "";

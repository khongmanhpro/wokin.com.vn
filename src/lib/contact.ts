export const companyContact = {
  legalName: "CÔNG TY CỔ PHẦN THIẾT BỊ CÔNG NGHIỆP WORKMAN",
  address: "T2/D3B/31, Đường Bình Chuẩn 62, khu phố Bình Thuận 2, Phường Thuận Giao, Thành Phố Hồ Chí Minh.",
  hotline: "0978.390.339",
  hotlineHref: "tel:0978390339",
  zaloHref: "https://zalo.me/0978390339",
  taxCode: "3702963744",
  social: {
    facebook: "https://www.facebook.com/workmanjsc/",
    youtube: "https://www.youtube.com/@workmanjsc",
    tiktok: "https://www.tiktok.com/@workmanjsc",
  },
} as const;

// The static public site stays deployable without a backend. Set this at build
// time when the Payload admin service is available, for example:
// https://admin.example.com/api/contact-submissions/submit
export const contactApiUrl = process.env.NEXT_PUBLIC_CONTACT_API_URL?.trim() ?? "";

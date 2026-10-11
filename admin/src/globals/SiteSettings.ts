import type { GlobalConfig } from 'payload'

import { activeAuthenticated, requireCapability } from '../access/collectionAccess'

// Mirrors the company details hard-coded in the public site (src/lib/contact.ts) so they can be edited here.
export const SiteSettings: GlobalConfig = {
  slug: 'site-settings',
  label: 'Thông tin website',
  access: { read: activeAuthenticated, update: requireCapability('settings.manage') },
  admin: { group: 'Cài đặt', description: 'Thông tin công ty, kênh liên hệ và SEO mặc định của website.' },
  versions: { max: 20 },
  fields: [
    {
      type: 'tabs',
      tabs: [
        {
          label: 'Công ty',
          fields: [
            { name: 'siteName', label: 'Tên website', type: 'text', required: true, defaultValue: 'WOKIN TOOLS Việt Nam' },
            { name: 'legalName', label: 'Tên pháp lý', type: 'text', required: true, defaultValue: 'CÔNG TY CỔ PHẦN THIẾT BỊ CÔNG NGHIỆP WORKMAN' },
            { name: 'taxCode', label: 'Mã số thuế', type: 'text' },
            { name: 'address', label: 'Địa chỉ', type: 'textarea' },
          ],
        },
        {
          label: 'Liên hệ',
          fields: [
            { name: 'hotline', label: 'Hotline / Zalo', type: 'text' },
            { name: 'email', label: 'Email nhận liên hệ', type: 'email' },
            { name: 'zaloUrl', label: 'Đường dẫn Zalo', type: 'text' },
            {
              name: 'social', label: 'Mạng xã hội', type: 'group',
              fields: [
                { name: 'facebook', label: 'Facebook', type: 'text' },
                { name: 'youtube', label: 'YouTube', type: 'text' },
                { name: 'tiktok', label: 'TikTok', type: 'text' },
              ],
            },
          ],
        },
        {
          label: 'SEO mặc định',
          fields: [
            { name: 'defaultTitle', label: 'Tiêu đề trang chủ', type: 'text' },
            { name: 'defaultDescription', label: 'Mô tả trang chủ', type: 'textarea' },
            { name: 'ogImage', label: 'Ảnh chia sẻ mặc định', type: 'upload', relationTo: 'media' },
          ],
        },
      ],
    },
  ],
}

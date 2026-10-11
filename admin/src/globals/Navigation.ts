import type { Field, GlobalConfig } from 'payload'

import { activeAuthenticated, requireCapability } from '../access/collectionAccess'

const linkFields: Field[] = [
  { name: 'label', label: 'Nhãn', type: 'text', required: true },
  { name: 'url', label: 'Đường dẫn', type: 'text', required: true, admin: { description: 'Ví dụ: /san-pham/ hoặc https://…' } },
  { name: 'newTab', label: 'Mở tab mới', type: 'checkbox', defaultValue: false },
]

export const Navigation: GlobalConfig = {
  slug: 'navigation',
  label: 'Menu',
  access: { read: activeAuthenticated, update: requireCapability('settings.manage') },
  admin: { group: 'Cài đặt', description: 'Menu đầu trang và liên kết chân trang của website (kéo thả để sắp xếp).' },
  versions: { max: 20 },
  fields: [
    {
      name: 'header', label: 'Menu đầu trang', type: 'array',
      labels: { singular: 'Mục menu', plural: 'Mục menu' },
      fields: [
        ...linkFields,
        { name: 'children', label: 'Menu con', type: 'array', labels: { singular: 'Mục con', plural: 'Mục con' }, fields: linkFields },
      ],
    },
    { name: 'footer', label: 'Liên kết chân trang', type: 'array', labels: { singular: 'Liên kết', plural: 'Liên kết' }, fields: linkFields },
  ],
}

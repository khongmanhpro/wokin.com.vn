import { hasCapability, type AdminIdentity } from '../access/hasCapability'

export type NavItem = { label: string; href: string; capability?: Parameters<typeof hasCapability>[1] }

export const NAVIGATION_SECTIONS: Array<{ label: string; items: NavItem[] }> = [
  { label: 'Tổng quan', items: [{ label: 'Tổng quan', href: '/admin' }] },
  { label: 'Danh mục sản phẩm', items: [{ label: 'Sản phẩm', href: '/admin/collections/products' }, { label: 'Danh mục', href: '/admin/category-workspace', capability: 'category.manage' }, { label: 'Hình ảnh', href: '/admin/media-library', capability: 'media.update' }, { label: 'Tệp & thư mục', href: '/admin/collections/media', capability: 'media.upload' }] },
  { label: 'Biên tập', items: [{ label: 'Chờ duyệt', href: '/admin/collections/review-requests/queue', capability: 'product.review' }, { label: 'Cần sửa', href: '/admin/collections/review-requests/queue?view=changes' }, { label: 'Đã hoàn tất', href: '/admin/collections/review-requests/queue?view=completed', capability: 'product.review' }] },
  { label: 'Nội dung', items: [{ label: 'Trang', href: '/admin/collections/pages', capability: 'page.update' }, { label: 'Chuyển hướng', href: '/admin/collections/redirects', capability: 'redirect.manage' }] },
  { label: 'Khách hàng', items: [{ label: 'Yêu cầu liên hệ', href: '/admin/collections/contact-submissions', capability: 'settings.manage' }] },
  { label: 'Phát hành', items: [{ label: 'Trung tâm phát hành', href: '/admin/release-center', capability: 'release.create' }] },
  { label: 'Cài đặt', items: [{ label: 'Thông tin website', href: '/admin/globals/site-settings', capability: 'settings.manage' }, { label: 'Menu', href: '/admin/globals/navigation', capability: 'settings.manage' }] },
  { label: 'Quản trị', items: [{ label: 'Người dùng', href: '/admin/collections/admins', capability: 'user.manage' }, { label: 'Nhật ký hoạt động', href: '/admin/collections/audit-events', capability: 'audit.read' }, { label: 'Cài đặt tài khoản', href: '/admin/account' }] },
]

export function getVisibleNavigationSections(user: AdminIdentity | undefined) {
  return NAVIGATION_SECTIONS.map((section) => ({ ...section, items: section.items.filter((item) => !item.capability || hasCapability(user, item.capability)) })).filter((section) => section.items.length > 0)
}

export function isNavigationItemActive(item: NavItem, pathname: string, search: string): boolean {
  const [itemPath, itemSearch = ''] = item.href.split('?')
  if (itemSearch) return pathname === itemPath && search === `?${itemSearch}`
  if (itemPath === '/admin') return pathname === itemPath
  return pathname === itemPath || pathname.startsWith(`${itemPath}/`)
}

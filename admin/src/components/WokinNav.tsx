'use client'

import { NavWrapper } from '@payloadcms/next/client'
import { useAuth } from '@payloadcms/ui'
import { usePathname, useSearchParams } from 'next/navigation'

import { type Role } from '../access/hasCapability'
import { getVisibleNavigationSections, isNavigationItemActive } from '../lib/navigationState'

type NavUser = { active?: boolean; role?: Role }

const ROLE_LABELS: Record<Role, string> = { owner: 'Chủ sở hữu', admin: 'Quản trị viên', editor: 'Biên tập viên', seo_reviewer: 'Kiểm duyệt SEO', media_manager: 'Quản lý hình ảnh', publisher: 'Xuất bản', readonly: 'Chỉ xem' }

export function WokinNav({ user }: { user?: NavUser }) {
  const { user: authUser } = useAuth<NavUser>()
  const currentUser = user ?? authUser
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const search = searchParams.size ? `?${searchParams.toString()}` : ''

  return <NavWrapper baseClass="nav">
    <nav className="nav__wrap wokin-nav" aria-label="Điều hướng công việc">
      <header className="wokin-nav__header">
        <a className="wokin-nav__brand" href="/admin">WOKIN Admin</a>
        <p className="wokin-nav__identity"><span>Vai trò: {currentUser?.role ? ROLE_LABELS[currentUser.role] : 'Đang xác thực'}</span><a href="/admin/account">Tài khoản</a></p>
      </header>
      {getVisibleNavigationSections(currentUser ?? undefined).map((section) => <section key={section.label} className="wokin-nav__section" aria-label={section.label}>
        <p className="wokin-nav__label">{section.label}</p>
        <ul>{section.items.map((item) => {
          const active = isNavigationItemActive(item, pathname, search)
          return <li key={item.href}><a aria-current={active ? 'page' : undefined} href={item.href}>{item.label}</a></li>
        })}</ul>
      </section>)}
    </nav>
  </NavWrapper>
}

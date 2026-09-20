import type { CollectionBeforeChangeHook, CollectionConfig } from 'payload'

import { auditHooks } from '../access/audit'
import { rejectInactiveLogin, revokeSessionsWhenDeactivated } from '../access/auth'
import { adminsDelete, adminsRead, adminsUpdate, canManageUsers } from '../access/collectionAccess'
import { canManageAdminSecurityFields, isFirstUserBootstrap } from '../access/fieldAccess'
import { ROLES } from '../access/hasCapability'

const audit = auditHooks('admins')
const roleLabels: Record<(typeof ROLES)[number], string> = {
  admin: 'Quản trị hệ thống',
  editor: 'Biên tập viên',
  media_manager: 'Quản lý hình ảnh',
  owner: 'Chủ sở hữu',
  publisher: 'Phụ trách phát hành',
  readonly: 'Chỉ xem',
  seo_reviewer: 'Rà soát SEO',
}

// Payload 3.88's create-first-user form submits to /api/admins/first-register
// with overrideAccess. Keep the role server-owned even if its client form data
// is stale or tampered with; Payload independently permits this endpoint only
// while the collection is empty.
const assignFirstUserOwner: CollectionBeforeChangeHook = ({ data, operation, req }) => {
  if (operation === 'create' && isFirstUserBootstrap(req)) {
    return { ...data, active: true, role: 'owner' }
  }
  return data
}

export const Admins: CollectionConfig = {
  slug: 'admins',
  auth: {
    cookies: { sameSite: 'Strict', secure: process.env.NODE_ENV === 'production' },
    forgotPassword: { expiration: 30 * 60 * 1000 },
    lockTime: 15 * 60 * 1000,
    maxLoginAttempts: 5,
    removeTokenFromResponses: true,
    tokenExpiration: 2 * 60 * 60,
    useAPIKey: false,
    useSessions: true,
  },
  access: { create: canManageUsers, delete: adminsDelete, read: adminsRead, update: adminsUpdate },
  admin: {
    defaultColumns: ['email', 'role', 'active'],
    description: 'Quản lý tài khoản quản trị, vai trò và trạng thái truy cập.',
    group: 'Quản trị',
    listSearchableFields: ['email'],
    pagination: { defaultLimit: 25, limits: [25, 50, 100] },
    useAsTitle: 'email',
  },
  labels: {
    plural: 'Quản trị viên',
    singular: 'Quản trị viên',
  },
  hooks: {
    afterChange: audit.afterChange,
    afterDelete: audit.afterDelete,
    beforeChange: [assignFirstUserOwner, revokeSessionsWhenDeactivated],
    beforeLogin: [rejectInactiveLogin],
  },
  fields: [
    {
      name: 'role',
      type: 'select',
      required: true,
      defaultValue: ({ req }) => (isFirstUserBootstrap(req) ? 'owner' : 'readonly'),
      index: true,
      label: 'Vai trò',
      admin: { description: 'Vai trò quyết định quyền thao tác; mã kỹ thuật được máy chủ kiểm tra riêng.' },
      options: ROLES.map((value) => ({ label: roleLabels[value], value })),
      access: { create: canManageAdminSecurityFields, update: canManageAdminSecurityFields },
    },
    {
      name: 'active',
      type: 'checkbox',
      required: true,
      defaultValue: true,
      index: true,
      access: { create: canManageAdminSecurityFields, update: canManageAdminSecurityFields },
    },
  ],
}

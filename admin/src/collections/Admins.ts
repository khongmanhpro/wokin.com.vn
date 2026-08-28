import type { CollectionConfig } from 'payload'

import { auditHooks } from '../access/audit'
import { rejectInactiveLogin, revokeSessionsWhenDeactivated } from '../access/auth'
import { adminsDelete, adminsRead, adminsUpdate, canManageUsers } from '../access/collectionAccess'
import { canManageAdminSecurityFields } from '../access/fieldAccess'
import { ROLES } from '../access/hasCapability'

const audit = auditHooks('admins')

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
    beforeChange: [revokeSessionsWhenDeactivated],
    beforeLogin: [rejectInactiveLogin],
  },
  fields: [
    {
      name: 'role',
      type: 'select',
      required: true,
      defaultValue: 'readonly',
      index: true,
      options: ROLES.map((value) => ({ label: value, value })),
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

import type { CollectionBeforeChangeHook, CollectionBeforeLoginHook } from 'payload'

export const rejectInactiveLogin: CollectionBeforeLoginHook = ({ user }) => {
  if ((user as { active?: boolean }).active !== true) throw new Error('This admin account is inactive')
  return user
}

export const revokeSessionsWhenDeactivated: CollectionBeforeChangeHook = ({ data, originalDoc }) => {
  if (originalDoc && originalDoc.active === true && data.active === false) data.sessions = []
  return data
}

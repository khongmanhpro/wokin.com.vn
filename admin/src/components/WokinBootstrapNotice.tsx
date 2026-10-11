import type { Payload } from 'payload'

// Registered as `beforeLogin`, which renders on every login screen; only warn while no admin exists yet.
export async function WokinBootstrapNotice({ payload }: { payload?: Payload }) {
  if (!payload) return null
  const { totalDocs } = await payload.count({ collection: 'admins', overrideAccess: true })
  if (totalDocs > 0) return null
  return <aside className="wokin-auth-notice" role="status">Bạn đang tạo tài khoản Owner đầu tiên của hệ thống. Tài khoản này có toàn quyền quản trị; chỉ dùng thông tin được phép.</aside>
}

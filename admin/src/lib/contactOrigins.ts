/**
 * Origins allowed to post the public contact form, shared by the endpoint check and Payload's CORS list
 * (they disagreed before: the endpoint accepted an origin the CORS preflight then blocked).
 * Each configured https origin also allows its www / non-www twin, since the site answers on both hosts.
 */
export function contactAllowedOrigins(env: NodeJS.ProcessEnv = process.env): string[] {
  const configured = (env.CONTACT_ALLOWED_ORIGINS ?? '')
    .split(',')
    .map((origin) => origin.trim().replace(/\/$/u, ''))
    .filter(Boolean)
  const origins = new Set<string>()
  for (const origin of configured) {
    origins.add(origin)
    const match = /^https:\/\/(www\.)?([^/]+)$/u.exec(origin)
    if (match) origins.add(match[1] ? `https://${match[2]}` : `https://www.${match[2]}`)
  }
  if (env.NODE_ENV !== 'production') {
    origins.add('http://localhost:4173')
    origins.add('http://127.0.0.1:4173')
  }
  return [...origins]
}

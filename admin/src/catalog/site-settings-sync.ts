/**
 * Converts between the admin globals ("site-settings", "navigation") and the public site's
 * committed src/data/site-settings.json. The public static build validates the same shape.
 */

export type NavLink = { label: string; url: string; newTab: boolean }
export type HeaderNavItem = NavLink & { children: NavLink[] }

export type PublicSiteSettings = {
  version: 1
  site: { siteName: string; defaultTitle: string; defaultDescription: string }
  company: {
    legalName: string
    address: string
    taxCode: string
    hotline: string
    email: string
    zaloUrl: string
    social: { facebook: string; youtube: string; tiktok: string }
  }
  navigation: { header: HeaderNavItem[]; footer: NavLink[] }
}

type Doc = Record<string, unknown>

const str = (value: unknown): string => (typeof value === 'string' ? value.trim() : '')

/** Same rule as the public parser: site-relative paths or http(s) URLs only. */
export function isSafeHref(value: string): boolean {
  if (value.startsWith('/') && !value.startsWith('//')) return true
  try {
    const url = new URL(value)
    return url.protocol === 'https:' || url.protocol === 'http:'
  } catch {
    return false
  }
}

function link(value: unknown): NavLink {
  const item = (value ?? {}) as Doc
  return { label: str(item.label), url: str(item.url), newTab: item.newTab === true }
}

export function globalsToPublicSettings(settings: Doc, navigation: Doc): PublicSiteSettings {
  const social = (settings.social ?? {}) as Doc
  return {
    version: 1,
    site: { siteName: str(settings.siteName), defaultTitle: str(settings.defaultTitle), defaultDescription: str(settings.defaultDescription) },
    company: {
      legalName: str(settings.legalName),
      address: str(settings.address),
      taxCode: str(settings.taxCode),
      hotline: str(settings.hotline),
      email: str(settings.email),
      zaloUrl: str(settings.zaloUrl),
      social: { facebook: str(social.facebook), youtube: str(social.youtube), tiktok: str(social.tiktok) },
    },
    navigation: {
      header: (Array.isArray(navigation.header) ? navigation.header : []).map((item) => ({
        ...link(item),
        children: (Array.isArray((item as Doc).children) ? ((item as Doc).children as unknown[]) : []).map(link),
      })),
      footer: (Array.isArray(navigation.footer) ? navigation.footer : []).map(link),
    },
  }
}

export function publicSettingsToGlobals(settings: PublicSiteSettings): { siteSettings: Doc; navigation: Doc } {
  return {
    siteSettings: {
      siteName: settings.site.siteName,
      defaultTitle: settings.site.defaultTitle,
      defaultDescription: settings.site.defaultDescription,
      ...settings.company,
    },
    navigation: settings.navigation,
  }
}

/** Returns Vietnamese problems that would make the public build fail; empty means safe to export. */
export function validatePublicSettings(settings: PublicSiteSettings): string[] {
  const problems: string[] = []
  const required: Array<[string, string]> = [
    ['Tên website', settings.site.siteName],
    ['Tiêu đề trang chủ', settings.site.defaultTitle],
    ['Mô tả trang chủ', settings.site.defaultDescription],
    ['Tên pháp lý', settings.company.legalName],
    ['Địa chỉ', settings.company.address],
    ['Mã số thuế', settings.company.taxCode],
    ['Hotline', settings.company.hotline],
    ['Đường dẫn Zalo', settings.company.zaloUrl],
  ]
  for (const [label, value] of required) if (!value) problems.push(`Thiếu "${label}".`)
  const hrefs: Array<[string, string]> = [
    ['Đường dẫn Zalo', settings.company.zaloUrl],
    ...Object.entries(settings.company.social).map(([key, value]): [string, string] => [`Mạng xã hội ${key}`, value]),
  ]
  for (const [label, value] of hrefs) if (value && !isSafeHref(value)) problems.push(`"${label}" phải bắt đầu bằng / hoặc http(s)://.`)
  const links = [
    ...settings.navigation.header.map((item, index) => [`Menu đầu trang #${index + 1}`, item] as const),
    ...settings.navigation.header.flatMap((item, index) => item.children.map((child, childIndex) => [`Menu con #${index + 1}.${childIndex + 1}`, child] as const)),
    ...settings.navigation.footer.map((item, index) => [`Chân trang #${index + 1}`, item] as const),
  ]
  if (settings.navigation.header.length === 0) problems.push('Menu đầu trang đang trống.')
  for (const [label, item] of links) {
    if (!item.label) problems.push(`${label}: thiếu nhãn.`)
    if (!isSafeHref(item.url)) problems.push(`${label}: đường dẫn "${item.url}" phải bắt đầu bằng / hoặc http(s)://.`)
  }
  return problems
}

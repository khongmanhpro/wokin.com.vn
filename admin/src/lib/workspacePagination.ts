export function workspacePage(value: unknown): number {
  const page = typeof value === 'string' && /^\d+$/.test(value) ? Number(value) : value
  return typeof page === 'number' && Number.isSafeInteger(page) && page > 0 ? page : 1
}

/** Payload REST expects bracket-encoded objects, not a JSON string in `where`. */
export function appendQueryObject(params: URLSearchParams, prefix: string, value: unknown): void {
  if (value && typeof value === 'object') {
    for (const [key, item] of Object.entries(value)) appendQueryObject(params, `${prefix}[${key}]`, item)
  } else if (value !== undefined && value !== null) params.set(prefix, String(value))
}

import path from 'node:path'

export function valueAfter(args: string[], flag: string, fallback?: string): string | undefined {
  const index = args.indexOf(flag)
  if (index < 0) return fallback
  const value = args[index + 1]
  if (!value || value.startsWith('--')) throw new Error(`${flag} requires a value`)
  return path.resolve(value)
}

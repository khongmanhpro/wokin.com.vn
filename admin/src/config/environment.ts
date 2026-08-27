const baseVariables = ['DATABASE_URL', 'PAYLOAD_SECRET', 'STORAGE_ADAPTER'] as const
const s3Variables = [
  'S3_BUCKET',
  'S3_REGION',
  'S3_ENDPOINT',
  'S3_ACCESS_KEY_ID',
  'S3_SECRET_ACCESS_KEY',
] as const

const placeholderPattern = /^\[?redacted\]?$/i

export class EnvironmentValidationError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'EnvironmentValidationError'
  }
}

function hasUsableValue(value: string | undefined) {
  return Boolean(value?.trim()) && !placeholderPattern.test(value!.trim())
}

export function validateEnvironment(env: NodeJS.ProcessEnv): string[] {
  const errors: string[] = []
  const missing = baseVariables.filter((name) => !hasUsableValue(env[name]))

  if (missing.length > 0) errors.push(`Missing required environment variables: ${missing.join(', ')}`)

  if (hasUsableValue(env.DATABASE_URL)) {
    try {
      const databaseURL = new URL(env.DATABASE_URL!)
      if (!['postgres:', 'postgresql:'].includes(databaseURL.protocol)) {
        errors.push('DATABASE_URL must use the postgres or postgresql protocol')
      }
    } catch {
      errors.push('DATABASE_URL must be a valid PostgreSQL URL')
    }
  }

  if (hasUsableValue(env.PAYLOAD_SECRET) && env.PAYLOAD_SECRET!.trim().length < 32) {
    errors.push('PAYLOAD_SECRET must contain at least 32 characters')
  }

  if (hasUsableValue(env.STORAGE_ADAPTER) && !['local', 's3'].includes(env.STORAGE_ADAPTER!.trim())) {
    errors.push('STORAGE_ADAPTER must be either local or s3')
  }

  if (env.STORAGE_ADAPTER?.trim() === 's3') {
    const missingS3 = s3Variables.filter((name) => !hasUsableValue(env[name]))
    if (missingS3.length > 0) errors.push(`Missing required S3 environment variables: ${missingS3.join(', ')}`)
  }

  if (env.PAYLOAD_SEPARATION_OF_DUTIES && !['true', 'false'].includes(env.PAYLOAD_SEPARATION_OF_DUTIES)) {
    errors.push('PAYLOAD_SEPARATION_OF_DUTIES must be either true or false')
  }

  if (env.NODE_ENV === 'production') {
    if (!hasUsableValue(env.PAYLOAD_PUBLIC_SERVER_URL)) {
      errors.push('Missing required environment variables: PAYLOAD_PUBLIC_SERVER_URL')
    } else {
      try {
        const publicURL = new URL(env.PAYLOAD_PUBLIC_SERVER_URL!)
        if (publicURL.protocol !== 'https:') errors.push('PAYLOAD_PUBLIC_SERVER_URL must use HTTPS in production')
      } catch {
        errors.push('PAYLOAD_PUBLIC_SERVER_URL must be a valid HTTPS URL in production')
      }
    }
  }

  return errors
}

export function assertEnvironment(env: NodeJS.ProcessEnv): void {
  const errors = validateEnvironment(env)
  if (errors.length > 0) throw new EnvironmentValidationError(errors.join('\n'))
}

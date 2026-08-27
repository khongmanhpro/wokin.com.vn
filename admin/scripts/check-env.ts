import 'dotenv/config'

import { assertEnvironment, EnvironmentValidationError } from '../src/config/environment.js'

try {
  assertEnvironment(process.env)
  console.log('Environment validation passed.')
} catch (error) {
  if (error instanceof EnvironmentValidationError) {
    console.error(`Environment validation failed:\n${error.message}`)
    process.exitCode = 1
  } else {
    console.error('Environment validation failed unexpectedly.')
    process.exitCode = 1
  }
}

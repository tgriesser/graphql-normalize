import { NO_ARGS } from './constants.js'

export class MissingFieldError {
  constructor(path: Array<string | number>) {
    throw new Error(`Missing field for: ${path.filter((p) => p !== NO_ARGS)}`)
  }
}

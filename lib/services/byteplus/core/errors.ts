export class BytePlusAPIError extends Error {
  constructor(
    message: string,
    public status?: number,
    public code?: string,
    public details?: unknown
  ) {
    super(message)
    this.name = 'BytePlusAPIError'
  }
}

export function isBytePlusAPIError(error: unknown): error is BytePlusAPIError {
  return error instanceof BytePlusAPIError || (typeof error === 'object' && !!error && (error as any).name === 'BytePlusAPIError')
}

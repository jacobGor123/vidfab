const CREDIT_BUCKET_FIELD_NAMES = [
  'credits_monthly_balance',
  'credits_other_balance',
  'credits_next_reset_at',
] as const

export function isMissingColumnError(error: unknown, columns = CREDIT_BUCKET_FIELD_NAMES): boolean {
  if (!error || typeof error !== 'object') return false

  const err = error as { code?: string; message?: string }
  if (err.code !== '42703') return false

  const message = err.message || ''
  return columns.some((column) => message.includes(column))
}

export function omitCreditBucketFields<T extends Record<string, unknown>>(value: T): T {
  const next = { ...value }

  for (const field of CREDIT_BUCKET_FIELD_NAMES) {
    delete next[field]
  }

  return next
}


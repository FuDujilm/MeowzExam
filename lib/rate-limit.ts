type Bucket = {
  tokens: number
  resetAt: number
}

const buckets = new Map<string, Bucket>()

export interface RateLimitOptions {
  limit: number
  windowMs: number
}

export interface RateLimitResult {
  success: boolean
  remaining: number
  resetAt: number
}

export function hitRateLimit(key: string, options: RateLimitOptions): RateLimitResult {
  const now = Date.now()
  const existing = buckets.get(key)

  if (!existing || existing.resetAt <= now) {
    const bucket: Bucket = {
      tokens: 1,
      resetAt: now + options.windowMs,
    }
    buckets.set(key, bucket)
    return {
      success: true,
      remaining: options.limit - bucket.tokens,
      resetAt: bucket.resetAt,
    }
  }

  if (existing.tokens >= options.limit) {
    return {
      success: false,
      remaining: 0,
      resetAt: existing.resetAt,
    }
  }

  existing.tokens += 1
  buckets.set(key, existing)

  return {
    success: true,
    remaining: options.limit - existing.tokens,
    resetAt: existing.resetAt,
  }
}

/**
 * Simple in-memory rate limiter.
 * For production with multiple instances, replace with Redis-backed solution.
 */

interface RateLimitEntry {
  count: number
  resetAt: number
}

const buckets = new Map<string, RateLimitEntry>()

// Clean up expired entries every 5 minutes
setInterval(() => {
  const now = Date.now()
  for (const [key, entry] of Array.from(buckets)) {
    if (entry.resetAt <= now) buckets.delete(key)
  }
}, 5 * 60 * 1000)

interface RateLimitOptions {
  /** Maximum requests in the window */
  limit: number
  /** Window size in seconds */
  windowSeconds: number
}

export function rateLimit(
  key: string,
  { limit, windowSeconds }: RateLimitOptions
): { success: boolean; remaining: number; resetAt: number } {
  const now = Date.now()
  const entry = buckets.get(key)

  if (!entry || entry.resetAt <= now) {
    const resetAt = now + windowSeconds * 1000
    buckets.set(key, { count: 1, resetAt })
    return { success: true, remaining: limit - 1, resetAt }
  }

  if (entry.count >= limit) {
    return { success: false, remaining: 0, resetAt: entry.resetAt }
  }

  entry.count++
  return { success: true, remaining: limit - entry.count, resetAt: entry.resetAt }
}

/**
 * Pre-configured rate limiters for common endpoints.
 */
export const RATE_LIMITS = {
  /** Auth: 10 attempts per 60 seconds per IP */
  auth: { limit: 10, windowSeconds: 60 },
  /** API general: 120 requests per 60 seconds per user */
  api: { limit: 120, windowSeconds: 60 },
  /** File upload: 10 uploads per 60 seconds per user */
  upload: { limit: 10, windowSeconds: 60 },
} as const

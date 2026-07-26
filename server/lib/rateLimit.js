// Sliding-window rate limiter.
//
// The tailoring endpoints each cost a call to a metered upstream, so any signed-
// in account could otherwise loop them and drain the NVIDIA allowance. State is
// held in process memory, which is correct for the single-instance deployment
// this runs on. If the backend is ever scaled to more than one node, each node
// would enforce its own allowance and the effective limit would multiply by the
// node count — move to a shared store before that happens.

const buckets = new Map();

// Timestamps outside every window are dead weight; sweep them periodically so a
// long-running process does not accumulate one array per user seen. unref() so
// this timer never keeps the process alive (notably under the test runner).
const SWEEP_INTERVAL_MS = 10 * 60 * 1000;
const sweeper = setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of buckets) {
    if (entry.hits.every(t => now - t >= entry.windowMs)) buckets.delete(key);
  }
}, SWEEP_INTERVAL_MS);
sweeper.unref?.();

/**
 * @param {object}   options
 * @param {number}   options.windowMs  Width of the sliding window.
 * @param {number}   options.max       Requests allowed per window.
 * @param {Function} options.key       req => string identifying the caller.
 * @param {string}   [options.name]    Bucket namespace, so two limiters on one
 *                                     route do not share a counter.
 * @param {string}   [options.message] Body message returned on 429.
 */
export function rateLimit({ windowMs, max, key, name = 'default', message }) {
  return function rateLimitMiddleware(req, res, next) {
    const id = key(req);
    // Nothing to key on (e.g. no authenticated user yet) — let the auth guard
    // decide the outcome rather than silently bucketing every such caller
    // together, which would let one anonymous request exhaust everyone's quota.
    if (id == null || id === '') return next();

    const bucketKey = `${name}:${id}`;
    const now = Date.now();
    const previous = buckets.get(bucketKey)?.hits ?? [];
    const hits = previous.filter(t => now - t < windowMs);

    if (hits.length >= max) {
      buckets.set(bucketKey, { hits, windowMs });
      const retryAfterMs = windowMs - (now - hits[0]);
      const retryAfter = Math.max(1, Math.ceil(retryAfterMs / 1000));
      res.set('Retry-After', String(retryAfter));
      return res.status(429).json({
        error: message ?? 'Too many requests. Please wait a moment and try again.',
        retryAfter,
      });
    }

    hits.push(now);
    buckets.set(bucketKey, { hits, windowMs });
    next();
  };
}

// Test seam — the module-level map would otherwise leak counts between cases.
export function resetRateLimits() {
  buckets.clear();
}

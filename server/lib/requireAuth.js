import { getAuth } from '@clerk/express';

// API-friendly auth guard.
//
// Clerk's built-in requireAuth() responds to unauthenticated requests with a
// 302 redirect to the sign-in URL, which is meant for server-rendered pages.
// For a JSON API consumed by the SPA's axios/fetch calls, a redirect is opaque
// (fetch silently follows it and lands on an HTML page). This guard relies on
// the globally-applied clerkMiddleware() to populate auth, then returns a clean
// 401 JSON response when there is no signed-in user.
//
// Kept as a factory (requireAuth()) so call sites match Clerk's API exactly.
export function requireAuth() {
  return (req, res, next) => {
    const { userId } = getAuth(req);
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized. Please sign in.' });
    }
    next();
  };
}

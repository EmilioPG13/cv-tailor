import express from 'express';
import { requireAuth } from '@clerk/express';
import FirecrawlApp from '@mendable/firecrawl-js';

const router = express.Router();

// Lazy singleton — only instantiated on first request so a missing key doesn't crash startup.
let firecrawl;
function getFirecrawl() {
  if (!firecrawl) firecrawl = new FirecrawlApp({ apiKey: process.env.FIRECRAWL_API_KEY });
  return firecrawl;
}

// POST /api/scrape
// Body: { url: string }
// Returns: { content: string }  — the scraped page as Markdown
router.post('/', requireAuth(), async (req, res) => {
  const { url } = req.body;

  if (!url || typeof url !== 'string' || url.trim() === '') {
    return res.status(400).json({ error: 'url is required.' });
  }

  // Basic URL validity check before sending to Firecrawl.
  let parsedUrl;
  try {
    parsedUrl = new URL(url.trim());
  } catch {
    return res.status(400).json({ error: 'url must be a valid absolute URL.' });
  }

  if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
    return res.status(400).json({ error: 'url must use http or https.' });
  }

  try {
    const result = await getFirecrawl().scrapeUrl(parsedUrl.href, { formats: ['markdown'] });

    if (!result || !result.markdown) {
      return res.status(502).json({ error: 'Firecrawl returned no content for that URL.' });
    }

    res.json({ content: result.markdown });
  } catch (error) {
    console.error('[scrape] Firecrawl error:', error?.message ?? error);

    // Surface Firecrawl-specific status codes when available.
    const status = error?.statusCode ?? 500;
    res.status(status).json({ error: error?.message ?? 'Failed to scrape the URL.' });
  }
});

export default router;

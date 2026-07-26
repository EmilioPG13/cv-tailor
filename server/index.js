import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { clerkMiddleware } from '@clerk/express';
import tailorRoute from './routes/tailor.js';
import historyRoute from './routes/history.js';
import scrapeRoute from './routes/scrape.js';
import analyticsRoute from './routes/analytics.js';
import adminRoute from './routes/admin.js';
import templatesRoute from './routes/templates.js';

const app = express();

// Render (and most Node hosts) terminate TLS at a proxy, so without this every
// request would report the load balancer's address and the IP-keyed rate limit
// on /api/tailor/models would bucket all callers together.
app.set('trust proxy', 1);

app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173'
}));
app.use(express.json({ limit: '2mb' }));
app.use(clerkMiddleware({
  publishableKey: process.env.CLERK_PUBLISHABLE_KEY,
  secretKey: process.env.CLERK_SECRET_KEY,
}));
app.use('/api/tailor', tailorRoute);
app.use('/api/history', historyRoute);
app.use('/api/scrape', scrapeRoute);
app.use('/api/analytics', analyticsRoute);
app.use('/api/admin', adminRoute);
app.use('/api/templates', templatesRoute);

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

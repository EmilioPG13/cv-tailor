import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import tailorRoute from './routes/tailor.js';
import historyRoute from './routes/history.js';

const app = express();

app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173'
}));
app.use(express.json({ limit: '2mb' }));
app.use('/api/tailor', tailorRoute);
app.use('/api/history', historyRoute);

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

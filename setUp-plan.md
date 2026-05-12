# CV Tailor — Project Plan
> AI-powered CV & Cover Letter tailoring tool | English & Spanish | NVIDIA NIM

---

## 🎯 What We're Building

A web app where users paste their CV and a job description, and the AI rewrites their CV bullet points and generates a tailored cover letter for that specific role. Bilingual (EN/ES) from day one.

**Monetization (Phase 2):** Freemium — 3 tailors free, then $9/mo via Stripe.

---

## 🧱 Tech Stack

| Layer | Tech |
|---|---|
| Frontend | React + Vite + Tailwind CSS |
| Backend | Node.js + Express |
| AI | NVIDIA NIM API (OpenAI-compatible) |
| Database | PostgreSQL *(Phase 2 only)* |
| Payments | Stripe *(Phase 2 only)* |
| Auth | Clerk or Supabase Auth *(Phase 2 only)* |

---

## 📁 Folder Structure

```
cv-tailor/
├── client/                    ← React + Vite
│   ├── src/
│   │   ├── components/
│   │   │   ├── TailorForm.jsx
│   │   │   ├── ResultDisplay.jsx
│   │   │   └── LanguageToggle.jsx
│   │   └── App.jsx
│   └── .env                   ← VITE_API_URL=http://localhost:3001
│
└── server/                    ← Node.js + Express
    ├── routes/
    │   └── tailor.js
    ├── .env                   ← NVIDIA_API_KEY, PORT
    └── index.js
```

---

## 🚀 Phase 1 — MVP (No auth, no payments, just core feature)

### Day 1 — Project Setup

**1. Create folder structure**
```bash
mkdir cv-tailor && cd cv-tailor
mkdir client server
```

**2. Set up frontend**
```bash
cd client
npm create vite@latest . -- --template react
npm install
npm install axios react-router-dom
npx tailwindcss init -p
```

**3. Set up backend**
```bash
cd ../server
npm init -y
npm install express cors dotenv openai
npm install -D nodemon
```

**4. Create `server/.env`**
```
NVIDIA_API_KEY=your_key_here
PORT=3001
```
> ⚠️ Add `.env` to `.gitignore` immediately. Never commit your API key.

Get your NVIDIA NIM API key at **build.nvidia.com** → sign in → API Keys. Free credits included.

---

### Days 2–5 — Build the Core

Build in this exact order. Don't move to the next step until the current one works.

#### Step 1 — Backend endpoint

One route: `POST /api/tailor`
- Receives: CV text + job description + language (`en` or `es`)
- Calls NVIDIA NIM
- Returns: tailored CV bullets + cover letter

**`server/index.js`**
```javascript
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import tailorRoute from './routes/tailor.js';

dotenv.config();
const app = express();

app.use(cors());
app.use(express.json());
app.use('/api/tailor', tailorRoute);

app.listen(process.env.PORT, () => {
  console.log(`Server running on port ${process.env.PORT}`);
});
```

**`server/routes/tailor.js`**
```javascript
import express from 'express';
import OpenAI from 'openai';

const router = express.Router();

const client = new OpenAI({
  apiKey: process.env.NVIDIA_API_KEY,
  baseURL: 'https://integrate.api.nvidia.com/v1'
});

const buildPrompt = (cv, jobDescription, language) => {
  if (language === 'es') {
    return {
      system: `Eres un experto en recursos humanos y redacción de CVs profesionales. 
Tu tarea es adaptar el CV del usuario a la descripción de trabajo proporcionada.
Devuelve dos secciones claramente separadas:
1. PUNTOS CV: Los bullet points del CV reescritos para alinearse con el puesto.
2. CARTA DE PRESENTACIÓN: Una carta de presentación profesional y personalizada.
Sé concreto, usa verbos de acción y resalta logros medibles cuando sea posible.`,
      user: `CV ACTUAL:\n${cv}\n\nDESCRIPCIÓN DEL TRABAJO:\n${jobDescription}`
    };
  }
  return {
    system: `You are an expert HR consultant and professional CV writer.
Your task is to tailor the user's CV to the provided job description.
Return two clearly separated sections:
1. CV BULLETS: Rewritten CV bullet points aligned with the role.
2. COVER LETTER: A professional, personalized cover letter.
Be specific, use action verbs, and highlight measurable achievements where possible.`,
    user: `CURRENT CV:\n${cv}\n\nJOB DESCRIPTION:\n${jobDescription}`
  };
};

router.post('/', async (req, res) => {
  const { cv, jobDescription, language = 'en' } = req.body;

  if (!cv || !jobDescription) {
    return res.status(400).json({ error: 'CV and job description are required.' });
  }

  const { system, user } = buildPrompt(cv, jobDescription, language);

  try {
    const response = await client.chat.completions.create({
      model: 'meta/llama-3.3-70b-instruct',
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: user }
      ],
      temperature: 0.6,
      max_tokens: 1024,
    });

    const result = response.choices[0].message.content;
    res.json({ result });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Something went wrong with the AI call.' });
  }
});

export default router;
```

> Test this with **Thunder Client** or **Postman** before touching the frontend.

---

#### Step 2 — Frontend form (functional, no styling yet)

Three elements only:
- Textarea for CV
- Textarea for job description
- Language toggle (EN / ES)
- Submit button

**`client/src/components/TailorForm.jsx`**
```jsx
import { useState } from 'react';
import axios from 'axios';

export default function TailorForm({ onResult }) {
  const [cv, setCv] = useState('');
  const [jobDescription, setJobDescription] = useState('');
  const [language, setLanguage] = useState('en');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    setLoading(true);
    try {
      const { data } = await axios.post(
        `${import.meta.env.VITE_API_URL}/api/tailor`,
        { cv, jobDescription, language }
      );
      onResult(data.result);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <button onClick={() => setLanguage(language === 'en' ? 'es' : 'en')}>
        {language === 'en' ? '🇲🇽 Español' : '🇺🇸 English'}
      </button>
      <textarea placeholder="Paste your CV here" value={cv} onChange={e => setCv(e.target.value)} />
      <textarea placeholder="Paste job description here" value={jobDescription} onChange={e => setJobDescription(e.target.value)} />
      <button onClick={handleSubmit} disabled={loading}>
        {loading ? 'Tailoring...' : 'Tailor my CV'}
      </button>
    </div>
  );
}
```

---

#### Step 3 — Wire them together

When the full loop works — form → Express → NVIDIA NIM → result displayed — you have a working MVP.

#### Step 4 — Style with Tailwind

Only after the core loop works. Clean two-column layout: inputs on the left, result on the right.

---

### ❌ Ignore for Phase 1

- Database — not needed, Claude handles everything stateless
- User auth / accounts
- Stripe / payments
- Deployment

---

## 🔒 Phase 2 — SaaS Features

> Start this after Phase 1 is live and you've tested it with real users.

- [ ] User authentication (Clerk or Supabase Auth)
- [ ] Usage tracking in PostgreSQL (tailors per user)
- [ ] Freemium limit: 3 free tailors, then prompt upgrade
- [ ] Stripe integration for $9/mo subscription
- [ ] Save history of past tailored CVs per user
- [ ] Deploy: frontend on Vercel, backend on Render

---

## 🤖 NVIDIA NIM — Key Info

**Endpoint:** `https://integrate.api.nvidia.com/v1`

**Recommended models for writing tasks:**

| Model | Notes |
|---|---|
| `meta/llama-3.3-70b-instruct` | Best starting point — strong at writing |
| `nvidia/llama-3.1-nemotron-70b-instruct` | NVIDIA fine-tune, great at instructions |
| `mistralai/mistral-large-latest` | Good alternative to benchmark against |

**Free credits** included on signup at build.nvidia.com. Rate limits apply — fine for development.

---

## ✅ Definition of Done — Phase 1

- [ ] User can paste a CV and job description
- [ ] Language toggle works (EN / ES)
- [ ] AI returns tailored CV bullets + cover letter
- [ ] Result is displayed and copyable
- [ ] Works on mobile (responsive layout)
- [ ] No API key exposed on the frontend

---

*Built by Emilio Parra González — github.com/EmilioPG13*

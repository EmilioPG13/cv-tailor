# CV Tailor

**🔗 Live app: [cv-tailor-gold-zeta.vercel.app](https://cv-tailor-gold-zeta.vercel.app/)**

CV Tailor is a bilingual (English / Spanish) web app that rewrites your CV to match a specific job description and generates a matching cover letter. It then renders the tailored CV into a polished, print-ready HTML document that fits exactly one US Letter page, ready to save as a PDF.

You paste (or upload) your existing CV, paste a job description (or scrape it from a URL), pick a visual style, and the app produces three things: a list of rewritten bullet points, a full cover letter, and a designed one-page CV you can download or print.

---

## Table of Contents

- [What it does](#what-it-does)
- [How it works](#how-it-works)
- [Tech stack](#tech-stack)
- [Project structure](#project-structure)
- [Prerequisites](#prerequisites)
- [Environment variables](#environment-variables)
- [Database setup (Supabase)](#database-setup-supabase)
- [Running locally](#running-locally)
- [API reference](#api-reference)
- [CV templates](#cv-templates)
- [The fit-to-page engine](#the-fit-to-page-engine)
- [Admin and analytics](#admin-and-analytics)
- [Deployment](#deployment)

---

## What it does

- **Tailors your CV to a job.** An AI model rewrites your bullet points toward the target role using strong action verbs, while preserving your real name, job titles, dates, and years of experience exactly. It will not invent seniority or experience you do not have.
- **Writes a cover letter** in the same pass, matched to the role.
- **Detects the right tone automatically.** As you type or paste a job description, the app analyzes the company culture and suggests one of three tones: Professional, Conversational, or Enthusiastic. You can accept the suggestion or override it.
- **Works in English and Spanish.** Every prompt, label, and output has a localized version. Accented characters are preserved correctly throughout.
- **Accepts files.** Upload a CV as PDF, DOCX, RTF, HTML, or plain text and the app extracts the text in the browser.
- **Scrapes job postings.** Paste a job posting URL and the app fetches the page content for you (LinkedIn is detected and handled with a manual-paste fallback, since it blocks automated scraping).
- **Designs the final CV.** Choose one of four visual styles (Classic, Modern, Creative, Minimal). The app fills an HTML template with your content and auto-scales it to fill exactly one printable page.
- **Saves your history.** Every tailored CV is stored per user, with a personal analytics view showing usage over the last 30 days and your most-targeted roles.

---

## How it works

A single tailoring run goes through two AI calls and several supporting steps:

1. **You provide inputs** — your CV text and a job description, plus a chosen language, tone, and visual style.
2. **Tailor step** — the backend sends the CV and job description to the language model with a strict prompt. The model returns two clearly labeled sections: `TAILORED CV` and `COVER LETTER` (or the Spanish equivalents). This step runs at a low temperature to limit embellishment.
3. **Parsing** — the frontend splits the response into bullet points, a cover letter, and the raw tailored CV text.
4. **Design step** — the tailored CV text is sent to a second model along with a chosen HTML template. The model acts as a templating engine: it fills `{{PLACEHOLDER}}` markers verbatim without changing any CSS or structure. This step runs at temperature 0 for deterministic, reliable output.
5. **Post-processing** — the server cleans up any double-encoded UTF-8 characters, strips stray markdown fences, and injects a small fit-to-page script.
6. **Display** — the result appears in four tabs (Bullets, Cover Letter, Raw text, and Design). The design tab shows a live preview in a sandboxed iframe with options to download the HTML or print to PDF.
7. **Persistence** — the run is saved to the user's history in the background.

The tailor and design steps run as separate calls so the text result appears quickly while the slower, heavier design render completes in the background.

---

## Tech stack

| Layer | Technology |
|---|---|
| Frontend | React 19, Vite, Tailwind CSS 4, React Router 7 |
| Backend | Node.js, Express 5 |
| AI | NVIDIA NIM API (OpenAI-compatible endpoint), accessed via the OpenAI SDK |
| Database | Supabase (PostgreSQL) |
| Authentication | Clerk |
| Web scraping | Firecrawl |
| File parsing | pdf.js and mammoth.js (loaded in the browser via CDN) |
| Hosting | Vercel (frontend) and a Node host such as Render (backend) |

The AI provider is OpenAI-compatible, so the backend uses the official OpenAI SDK pointed at NVIDIA's base URL. The active models are configurable at runtime (see [Admin and analytics](#admin-and-analytics)).

---

## Project structure

```
cv-tailor/
├── client/                      React + Vite frontend
│   ├── index.html               Loads pdf.js and mammoth.js from CDN
│   ├── src/
│   │   ├── App.jsx              Main app shell, routing, and the Tailor page
│   │   ├── main.jsx            Entry point; wires up Clerk and the router
│   │   ├── context/
│   │   │   └── TailorContext.jsx   Shared tailoring state that survives navigation
│   │   ├── components/
│   │   │   ├── ui.jsx          Design-system primitives and icons
│   │   │   └── AuthGuard.jsx   Wrapper that requires a signed-in user
│   │   ├── pages/
│   │   │   ├── HistoryPage.jsx
│   │   │   ├── TemplatesPage.jsx
│   │   │   ├── AnalyticsPage.jsx
│   │   │   └── AdminPage.jsx
│   │   ├── data/
│   │   │   ├── strings.js      English and Spanish UI strings
│   │   │   ├── sample.js       Sample CV and job description
│   │   │   └── templates.js
│   │   └── utils/
│   │       └── fileParsing.js  Browser-side PDF/DOCX/RTF/HTML text extraction
│   └── vercel.json              SPA rewrite rule for Vercel
│
├── server/                      Node + Express backend
│   ├── index.js                 App entry; mounts routes and Clerk middleware
│   ├── settingsCache.js         In-memory cache for runtime settings
│   ├── routes/
│   │   ├── tailor.js           Tailor, style, tone-detection, and model info
│   │   ├── history.js          Per-user saved CV history (CRUD)
│   │   ├── analytics.js        Per-user usage statistics
│   │   ├── scrape.js           Job-posting URL scraping via Firecrawl
│   │   └── admin.js            Admin stats, template, and settings management
│   └── templates/               16 HTML CV templates (4 styles x 4 variants)
│
├── start.bat                    Start both servers on Windows
├── start.sh                     Start both servers on macOS / Linux
└── setUp-plan.md                Original project plan (historical)
```

---

## Prerequisites

- Node.js 18 or newer
- Accounts and API keys for:
  - **NVIDIA NIM** (`build.nvidia.com`) — free credits on signup
  - **Clerk** (`clerk.com`) — authentication
  - **Supabase** (`supabase.com`) — database
  - **Firecrawl** (`firecrawl.dev`) — optional, only needed for URL scraping

---

## Environment variables

### Server (`server/.env`)

| Variable | Required | Description |
|---|---|---|
| `NVIDIA_API_KEY` | Yes | API key for the NVIDIA NIM endpoint |
| `SUPABASE_URL` | Yes | Your Supabase project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes | Supabase service-role key (server-side only — keep secret) |
| `CLERK_PUBLISHABLE_KEY` | Yes | Clerk publishable key |
| `CLERK_SECRET_KEY` | Yes | Clerk secret key |
| `FIRECRAWL_API_KEY` | No | Needed only for the URL scraping feature |
| `FRONTEND_URL` | No | Allowed CORS origin (defaults to `http://localhost:5173`) |
| `PORT` | No | Server port (defaults to `3001`) |

### Client (`client/.env`)

| Variable | Required | Description |
|---|---|---|
| `VITE_API_URL` | Yes | Base URL of the backend, e.g. `http://localhost:3001` |
| `VITE_CLERK_PUBLISHABLE_KEY` | Yes | Clerk publishable key (same as the server's) |

Never commit your `.env` files. They are already covered by `.gitignore`.

---

## Database setup (Supabase)

The backend expects three tables in your Supabase project:

- **`history`** — saved tailoring runs. Columns include `user_id`, `role`, `company`, `lang`, `fit`, `cv`, `jd`, `tailored_cv`, `cover`, and `created_at`.
- **`templates`** — admin-managed template records, with `name`, `content`, and `created_at`.
- **`app_settings`** — runtime configuration as key/value rows, with `key`, `value`, and `updated_at`. The app reads keys such as `llm_model`, `design_model`, and the tailor/style prompts for each language.

The server accesses Supabase with the service-role key, so it bypasses row-level security. If you keep RLS enabled, that is fine — just ensure the service-role key is used only on the server and never exposed to the browser.

If the `app_settings` table is empty or unreachable, the server falls back to sensible built-in defaults defined in `server/routes/tailor.js`, so the app still runs without any settings rows.

---

## Running locally

1. **Install dependencies** in both folders:

   ```bash
   cd server && npm install
   cd ../client && npm install
   ```

2. **Create the two `.env` files** as described above.

3. **Start both servers at once** from the project root:

   - Windows: run `start.bat`
   - macOS / Linux: run `./start.sh`

   Or start them separately:

   ```bash
   # Terminal 1
   cd server && npm run dev

   # Terminal 2
   cd client && npm run dev
   ```

4. Open the frontend at `http://localhost:5173`. The backend runs on `http://localhost:3001`.

You must be signed in (via Clerk) to tailor a CV — the core endpoints require authentication.

---

## API reference

All endpoints are mounted under `/api`. Every endpoint except the two read-only model endpoints requires a valid Clerk session token in the `Authorization: Bearer <token>` header.

### Tailoring

| Method | Path | Description |
|---|---|---|
| `POST` | `/api/tailor` | Rewrites a CV and writes a cover letter. Body: `cv`, `jobDescription`, `language`, `tone`. Returns `tailoredCv`, `coverLetter`, `truncated`, and the combined `result` text. |
| `POST` | `/api/tailor/style` | Renders the tailored CV into a styled HTML document. Body: `tailoredCv`, `language`, `cvStyle`. Returns `html`. |
| `POST` | `/api/tailor/detect-tone` | Suggests a tone from a job description. Body: `jobDescription`, `language`. Returns `tone`. |
| `GET` | `/api/tailor/info` | Returns the active `llm_model` and `design_model` (no auth). |
| `GET` | `/api/tailor/models` | Lists available models, with a built-in fallback list (no auth). |

`POST /api/tailor` responds with the two sections already split apart, so callers
do not have to scan the prose for headings:

```json
{
  "tailoredCv": "Jane Doe\n• Led migration of the billing service…",
  "coverLetter": "Dear Hiring Manager,…",
  "truncated": false,
  "result": "TAILORED CV\nJane Doe\n…\n\nCOVER LETTER\nDear Hiring Manager,…"
}
```

`result` is the raw two-section text, kept for backward compatibility — prefer
`tailoredCv` and `coverLetter`. `truncated` is `true` when the model hit its
token ceiling mid-generation; in that case `tailoredCv` may end mid-sentence and
`coverLetter` may be empty, so treat the run as a failure rather than a short
answer.

### History

| Method | Path | Description |
|---|---|---|
| `GET` | `/api/history` | Returns the signed-in user's saved runs, newest first. |
| `POST` | `/api/history` | Saves a new run. Body: `role`, `tailoredCv`, and optionally `company`, `lang`, `fit`, `cv`, `jd`, `cover`. |
| `DELETE` | `/api/history/:id` | Deletes one of the user's own runs. |

History rows are returned in camelCase — `createdAt` and `tailoredCv`, not the
underlying `created_at` and `tailored_cv` columns. The older `tailoredCV`
spelling is still accepted in request bodies on `/api/history` and
`/api/tailor/style`, but responses only ever use `tailoredCv`.

### Analytics

| Method | Path | Description |
|---|---|---|
| `GET` | `/api/analytics/me` | Returns the user's total run count, a gapless 30-day daily series, and top targeted roles. |

### Scraping

| Method | Path | Description |
|---|---|---|
| `POST` | `/api/scrape` | Fetches a job posting URL as Markdown via Firecrawl. Body: `url`. |

### Admin (requires admin role + two-factor authentication)

| Method | Path | Description |
|---|---|---|
| `GET` | `/api/admin/stats` | Total CVs, unique users, and template count. |
| `GET` / `POST` / `PUT` / `DELETE` | `/api/admin/templates[/:id]` | Manage stored templates. |
| `GET` | `/api/admin/settings` | Read all runtime settings. |
| `PUT` | `/api/admin/settings/:key` | Update a setting and invalidate the server cache. |

---

## CV templates

There are four visual styles, each with four variants for a total of 16 templates, stored in `server/templates/`:

- **Classic** — clean and ATS-safe
- **Modern** — polished with an accent color
- **Creative** — bold sidebar layout
- **Minimal** — executive whitespace

When you pick a style, the server selects one of that style's variants at random, so repeat runs do not always produce an identical look. Each template is a complete HTML document using `{{PLACEHOLDER}}` markers and HTML comments that describe how to repeat blocks (experience entries, projects, skills, and so on). The design model fills these in without altering the styling.

---

## The fit-to-page engine

After the design model fills a template, the server injects a small client-side script into the HTML. When the document loads, this script:

1. Locks the body to US Letter width so the on-screen and printed measurements match.
2. Measures the rendered height and computes a scale factor using CSS `zoom`, which Chromium honors when printing.
3. Iterates a few times to converge on a scale that makes the content fill exactly one page — growing short CVs modestly and shrinking long ones, within legibility limits.
4. Compensates the minimum height so full-bleed colored sidebars reach the bottom of the page.

The result is a CV that consistently occupies a single, well-balanced page when downloaded or printed to PDF, regardless of how much content it contains.

---

## Admin and analytics

- **Analytics** is available to every signed-in user at `/analytics`, showing their own usage trends and most-targeted roles.
- **Admin** is gated behind a Clerk `publicMetadata.role` of `admin` and additionally requires two-factor authentication to be enabled. Admins can view platform-wide stats, manage stored templates, and edit runtime settings — including which AI models are used and the exact tailor and design prompts for each language. Settings changes take effect immediately because the server's in-memory cache is invalidated on update.

---

## Deployment

- **Frontend** deploys to Vercel. The included `client/vercel.json` rewrites all routes to `index.html` so client-side routing works. Set `VITE_API_URL` and `VITE_CLERK_PUBLISHABLE_KEY` in the Vercel project's environment variables.
- **Backend** deploys to any Node host (such as Render). Set all server environment variables there, and point `FRONTEND_URL` at your deployed frontend so CORS allows it.

---

Built by Emilio Parra González — [github.com/EmilioPG13](https://github.com/EmilioPG13)

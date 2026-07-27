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
- [Fit score](#fit-score)
- [Prompt settings](#prompt-settings)
- [Rate limits](#rate-limits)
- [Tests](#tests)
- [CV templates](#cv-templates)
- [The fit-to-page engine](#the-fit-to-page-engine)
- [Admin and analytics](#admin-and-analytics)
- [Deployment](#deployment)

---

## What it does

- **Tailors your CV to a job.** An AI model rewrites your bullet points toward the target role using strong action verbs, while preserving your real name, job titles, dates, and years of experience exactly. It will not invent seniority or experience you do not have, and it will not add numbers — metrics, percentages, and scale figures only appear if they were already in your CV.
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
| File parsing | pdf.js and mammoth.js (bundled, lazy-loaded on first upload) |
| Hosting | Vercel (frontend) and a Node host such as Render (backend) |

The AI provider is OpenAI-compatible, so the backend uses the official OpenAI SDK pointed at NVIDIA's base URL. The active models are configurable at runtime (see [Admin and analytics](#admin-and-analytics)).

---

## Project structure

```
cv-tailor/
├── client/                      React + Vite frontend
│   ├── index.html               App shell and font preconnects
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
│   ├── lib/
│   │   ├── supabase.js         Shared Supabase client
│   │   ├── requireAuth.js      JSON 401 guard (Clerk's own guard redirects)
│   │   ├── rateLimit.js        Per-caller sliding-window limiter
│   │   ├── fitScore.js         Keyword-coverage scoring
│   │   ├── tailorSections.js   Splits the model's two-section response
│   │   ├── historyEntry.js     Maps history rows from DB to API shape
│   │   └── templateRender.js   Fit-to-page injection and sample rendering
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

Copy `server/.env.example` and `client/.env.example` to `.env` in their
respective folders and fill them in. Never commit the real `.env` files — they
are already covered by `.gitignore`.

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
  "fit": 72,
  "matchedKeywords": ["typescript", "kubernetes", "postgresql"],
  "missingKeywords": ["terraform", "graphql"],
  "result": "TAILORED CV\nJane Doe\n…\n\nCOVER LETTER\nDear Hiring Manager,…"
}
```

`result` is the raw two-section text, kept for backward compatibility — prefer
`tailoredCv` and `coverLetter`. `truncated` is `true` when the model hit its
token ceiling mid-generation; in that case `tailoredCv` may end mid-sentence and
`coverLetter` may be empty, so treat the run as a failure rather than a short
answer. See [Fit score](#fit-score) for what `fit` measures.

### History

| Method | Path | Description |
|---|---|---|
| `GET` | `/api/history` | Returns the signed-in user's saved runs, newest first. `?summary=1` omits the large text columns; `?limit=N` caps the row count (max 50). |
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

## Fit score

The percentage on the gauge is the **share of the job description's most
distinctive terms that appear in your tailored CV**. It is computed locally in
`server/lib/fitScore.js` — no model call, no cost, and the same inputs always
produce the same number.

How it works: the posting is tokenised, accents are stripped, and stopwords and
recruiting boilerplate (`experience`, `team`, `role`, `requirements`, …) are
discarded, since those appear in every posting and every CV and would inflate the
result. The 20 most frequent remaining terms become the keyword set, and each is
looked for in the tailored CV. Both sides are compared on conservative stems, so
a posting asking you to "deploy" matches a CV that says "Deployed", and "APIs"
matches "API". Irregular verbs (build/built) are not matched — a missed match
understates the score, a wrong one inflates it, and understating is the safer
error.

It is a keyword-coverage measure, not a judgement of whether you suit the role.
When a posting yields fewer than five distinctive terms there is not enough
signal for a percentage to mean anything, so the API returns `fit: null` and the
gauge hides itself rather than showing an invented figure.

---

## Prompt settings

The tailoring and design prompts live in two places, and **the database wins**.
`server/routes/tailor.js` holds built-in defaults in `FALLBACK_SETTINGS`, but
`getSettings()` overlays any matching row from the Supabase `app_settings` table
on top of them. A stored `tailor_prompt_en` row therefore replaces the built-in
English prompt entirely.

This matters when changing prompt behaviour: **editing the code has no effect on
a deployment whose `app_settings` already contains that key.** To change a prompt
in production, either update the row through the admin UI (which invalidates the
server's cache immediately), or delete the row so the built-in default applies
again. The cache is otherwise refreshed every 5 minutes.

The built-in prompts forbid inventing facts, including numbers: no metrics,
percentages, counts or scale figures that are not already in the CV. That rule
exists because the model was reproducibly fabricating the same plausible-looking
figures — "500+ concurrent users", "98% reliability" — and the prompt used to
explicitly allow it. `server/routes/tailorPrompt.test.js` guards the constraint
in the built-in prompts; it cannot see a stored override.

---

## Rate limits

Every tailoring endpoint fans out to a metered upstream, so each is limited per
signed-in user. The ceilings sit well above normal interactive use and exist to
stop a loop from draining the API allowance.

| Endpoint | Limit |
|---|---|
| `POST /api/tailor` | 15 per 15 minutes |
| `POST /api/tailor/style` | 25 per 15 minutes |
| `POST /api/tailor/detect-tone` | 30 per 5 minutes |
| `POST /api/scrape` | 20 per 15 minutes |
| `GET /api/tailor/models` | 30 per 5 minutes, per IP (unauthenticated) |

Exceeding one returns `429` with a `Retry-After` header. Counters live in process
memory, which suits a single-instance deployment; if the backend is ever scaled
to multiple nodes each would enforce its own allowance, so move the counters to a
shared store before scaling out.

---

## Tests

```bash
cd server && npm test     # node:test
cd client && npm test     # vitest
```

The server suite covers the response splitter, the fit score, the history field
mapper, and the rate limiter, plus integration tests that drive the real routers
through real express, the real Clerk `getAuth`, and the real Supabase client with
only PostgREST stubbed. The client suite renders components to check that the
truncation notice and matched-keyword list actually reach the screen.

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

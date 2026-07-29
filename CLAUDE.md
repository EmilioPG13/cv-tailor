# cv-tailor

Tailors a CV to a job description and drafts a matching cover letter. React
client on Vercel, Express API on Render (`cv-tailor-8fo7.onrender.com`), Clerk
auth, Supabase for history and settings, NVIDIA NIM for inference via the OpenAI
SDK.

`client/` and `server/` have separate `package.json` files. The server is ESM
(`"type": "module"`) and tests run on `node --test`, not a framework.

## Gotchas

- **Stored settings outrank the code.** `getSettings()` in
  `server/routes/tailor.js` merges rows from the Supabase `app_settings` table
  over `FALLBACK_SETTINGS`, so a stored `tailor_prompt_en` / `tailor_prompt_es`
  row silently wins over any prompt change you make in the source. Editing the
  fallback does nothing on a deployment that has those rows. Cached 5 minutes.
- The same function swallows every Supabase error and returns the fallbacks, so
  a database outage looks like normal operation on `/api/tailor` while
  `/api/history`, `/api/analytics/me` and `/api/admin/*` return 500 with
  `TypeError: fetch failed`. Check whether the Supabase project is paused before
  hunting for missing env vars.
- The tailoring prompt must never license invented figures. The model
  reproducibly fabricated "500+ concurrent users" and "98% reliability" from a
  single clause allowing "reasonable metrics". There is a regression test in
  `server/routes/tailorPrompt.test.js` asserting the prohibition sits under the
  factual rules, not the style guidance.
- Client and server disagreed on CV field casing once already; requests send
  both spellings so deploy order cannot break the app. Keep that when touching
  `/api/tailor/style` or `/api/history`.
- Fit scoring tokenises without stripping URLs, so `https` and hostnames land in
  `missingKeywords` and filler words like `across` land in `matchedKeywords`.

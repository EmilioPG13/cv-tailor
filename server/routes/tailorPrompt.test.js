// Guards the factual constraints in the built-in tailoring prompts.
//
// The model was reproducibly inventing the same figures — "500+ concurrent
// users", "98% reliability" — because the prompt used to end its rewrite rules
// with "quantifying achievements with reasonable metrics is allowed". It was
// not a missing rule; it was an explicit licence. These tests pin the fix so it
// cannot be reintroduced by a well-meaning edit.
//
// NOTE: these cover the built-in fallbacks only. At runtime a `tailor_prompt_en`
// or `tailor_prompt_es` row in Supabase `app_settings` overrides them entirely,
// and no test here can see that. See the Prompt settings note in the README.
import test from 'node:test';
import assert from 'node:assert/strict';

process.env.NVIDIA_API_KEY ??= 'test-key-not-used';
const { FALLBACK_SETTINGS } = await import('./tailor.js');

const PROMPTS = [
  ['en', FALLBACK_SETTINGS.tailor_prompt_en],
  ['es', FALLBACK_SETTINGS.tailor_prompt_es],
];

for (const [lang, prompt] of PROMPTS) {
  test(`${lang}: does not licence inventing metrics`, () => {
    assert.doesNotMatch(prompt, /metrics is allowed/i);
    assert.doesNotMatch(prompt, /m[ée]tricas razonables/i);
    assert.doesNotMatch(prompt, /quantifying achievements/i);
    assert.doesNotMatch(prompt, /se permite cuantificar/i);
  });

  test(`${lang}: forbids inventing numbers outright`, () => {
    const forbids = lang === 'en'
      ? /never invent numbers/i
      : /nunca inventes cifras/i;
    assert.match(prompt, forbids);
  });

  test(`${lang}: states the rule among the factual constraints, not the style ones`, () => {
    const factualHeader = lang === 'en' ? 'FACTUAL RULES' : 'REGLAS DE VERACIDAD';
    const rewriteHeader = lang === 'en' ? 'REWRITE RULES' : 'REGLAS DE REDACCIÓN';
    const numbersRule = lang === 'en' ? 'Never invent numbers' : 'Nunca inventes cifras';

    const factualIdx = prompt.indexOf(factualHeader);
    const rewriteIdx = prompt.indexOf(rewriteHeader);
    const ruleIdx    = prompt.indexOf(numbersRule);

    assert.ok(factualIdx >= 0 && rewriteIdx > factualIdx, 'prompt structure changed');
    assert.ok(
      ruleIdx > factualIdx && ruleIdx < rewriteIdx,
      'the no-invented-numbers rule must sit under the never-violate constraints'
    );
  });

  test(`${lang}: still keeps the other factual constraints`, () => {
    const required = lang === 'en'
      ? [/NAME exactly/i, /Never change job titles/i, /invent seniority/i]
      : [/NOMBRE del candidato exactamente/i, /Nunca cambies los t[íi]tulos/i, /inventes seniority/i];

    for (const pattern of required) {
      assert.match(prompt, pattern);
    }
  });

  test(`${lang}: still carries the tone placeholder the builder substitutes`, () => {
    assert.match(prompt, /\{\{tone\}\}/);
  });
}

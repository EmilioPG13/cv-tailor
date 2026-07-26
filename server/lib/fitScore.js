// Computes how much of a job description's vocabulary the tailored CV actually
// covers.
//
// This replaces a hardcoded `fit: 88` that was shown on the gauge, stamped on
// every history row, and written to the database. A number presented to a user
// has to mean something, so this one has a stated definition: the share of the
// job description's most frequent distinctive terms that appear in the CV.
//
// It is deliberately a keyword-overlap measure, not a judgement of suitability.
// It runs locally — no model call, no cost, and the same inputs always give the
// same answer. When there is too little signal to say anything honest, it
// returns null rather than inventing a figure.

// Words carrying no signal about the role. Both languages are stripped
// regardless of the requested language, since postings mix them freely.
const STOPWORDS = new Set([
  // English
  'a', 'about', 'above', 'after', 'again', 'all', 'also', 'am', 'an', 'and', 'any',
  'are', 'as', 'at', 'back', 'be', 'because', 'been', 'before', 'being', 'below',
  'between', 'both', 'but', 'by', 'can', 'come', 'could', 'did', 'do', 'does',
  'doing', 'down', 'during', 'each', 'even', 'every', 'few', 'for', 'from',
  'further', 'get', 'give', 'go', 'had', 'has', 'have', 'having', 'he', 'her',
  'here', 'hers', 'him', 'his', 'how', 'however', 'if', 'in', 'into', 'is', 'it',
  'its', 'just', 'know', 'like', 'make', 'many', 'may', 'me', 'might', 'more',
  'most', 'much', 'must', 'my', 'no', 'nor', 'not', 'now', 'of', 'off', 'on',
  'once', 'one', 'only', 'or', 'other', 'others', 'our', 'ours', 'out', 'over',
  'own', 'per', 'same', 'see', 'she', 'should', 'so', 'some', 'such', 'take',
  'than', 'that', 'the', 'their', 'theirs', 'them', 'then', 'there', 'these',
  'they', 'this', 'those', 'through', 'to', 'too', 'under', 'until', 'up', 'upon',
  'us', 'very', 'was', 'way', 'we', 'well', 'were', 'what', 'when', 'where',
  'which', 'while', 'who', 'whom', 'why', 'will', 'with', 'within', 'would',
  'you', 'your', 'yours',
  // Spanish
  'al', 'algo', 'algunos', 'ante', 'antes', 'aqui', 'asi', 'aun', 'bien', 'cada',
  'como', 'con', 'contra', 'cual', 'cuando', 'de', 'del', 'desde', 'donde', 'dos',
  'el', 'ella', 'ellas', 'ellos', 'en', 'entre', 'era', 'eres', 'es', 'esa',
  'ese', 'eso', 'esta', 'estan', 'estar', 'este', 'esto', 'estos', 'ha', 'hace',
  'hacer', 'hacia', 'han', 'hasta', 'hay', 'la', 'las', 'le', 'les', 'lo', 'los',
  'mas', 'mi', 'mientras', 'muy', 'nada', 'ni', 'no', 'nos', 'nosotros', 'nuestro',
  'o', 'para', 'pero', 'poco', 'por', 'porque', 'que', 'quien', 'se', 'segun',
  'ser', 'si', 'sin', 'sobre', 'solo', 'son', 'su', 'sus', 'tambien', 'tanto',
  'te', 'tiene', 'tienen', 'todo', 'todos', 'tu', 'un', 'una', 'uno', 'unos',
  'ademas', 'debe', 'deben', 'puede', 'pueden', 'sera', 'sus', 'ya',
]);

// Recruiting boilerplate. Present in nearly every posting and nearly every CV,
// so counting it would inflate the score without indicating any real match.
const BOILERPLATE = new Set([
  // English
  'ability', 'able', 'applicant', 'applicants', 'application', 'apply', 'benefits',
  'candidate', 'candidates', 'career', 'company', 'culture', 'employee',
  'employees', 'employment', 'excellent', 'experience', 'experienced', 'flexible',
  'good', 'great', 'growth', 'help', 'hiring', 'ideal', 'included', 'includes',
  'including', 'job', 'join', 'looking', 'love', 'new', 'offer', 'office',
  'opportunity', 'organization', 'passion', 'people', 'plus', 'position',
  'preferred', 'proven', 'qualifications', 'related', 'required', 'requirements',
  'responsibilities', 'role', 'salary', 'seeking', 'skill', 'skills', 'strong',
  'team', 'teams', 'work', 'working', 'year', 'years',
  // Spanish
  'anos', 'aptitudes', 'buscamos', 'candidato', 'candidatos', 'capacidad',
  'carrera', 'conocimientos', 'empleo', 'empresa', 'equipo', 'experiencia',
  'habilidades', 'oferta', 'oportunidad', 'puesto', 'requisitos', 'salario',
  'trabajar', 'trabajo', 'vacante',
]);

const MIN_TOKEN_LENGTH = 3;
const MAX_KEYWORDS = 20;
// Below this there is not enough distinctive vocabulary for a percentage to mean
// anything — a three-line posting would swing wildly on a single word.
const MIN_KEYWORDS_FOR_SCORE = 5;

// Lowercase, strip accents, and reduce to word tokens. Accent-insensitive so
// "diseñó" in the posting matches "diseno" in a CV typed without accents.
function tokenize(text) {
  return String(text ?? '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    // Keep + and # so c++ and c# survive; keep . for node.js-style terms.
    .replace(/[^a-z0-9+#.]+/g, ' ')
    .split(' ')
    .map(token => token.replace(/^\.+|\.+$/g, ''))
    .filter(Boolean);
}

// Technology names built from symbols — c++, c# — are shorter than the minimum
// token length but carry as much signal as any word.
const isSymbolic = token => /[+#]/.test(token);

function isMeaningful(token) {
  if (token.length < MIN_TOKEN_LENGTH && !isSymbolic(token)) return false;
  if (STOPWORDS.has(token) || BOILERPLATE.has(token)) return false;
  if (/^\d+$/.test(token)) return false;  // bare numbers say nothing about fit
  return true;
}

// Conservative suffix stripping, applied to both sides so the comparison is
// symmetric. A posting asks you to "deploy" and "design"; a tailored CV says
// "Deployed" and "Designed". Without this, every genuine CV loses points on
// ordinary verb tense, which would understate the score across the board.
//
// The remainder must still be a substantial word, so "used" is left whole rather
// than reduced to "us". Irregular verbs (build/built) are left alone instead of
// guessed at — a missed match understates, while a wrong one inflates, and
// understating is the safer failure here.
// Each suffix carries its own floor for what is left behind. Verb endings need a
// generous one — stripping "ed" from "used" would leave "us" — while a plural
// "s" can safely come off a short word, so "APIs" still reaches "API".
const SUFFIXES = [['ing', 4], ['ed', 4], ['s', 3]];

function stem(token) {
  if (isSymbolic(token)) return token;
  for (const [suffix, minRoot] of SUFFIXES) {
    if (token.endsWith(suffix)) {
      const root = token.slice(0, -suffix.length);
      if (root.length >= minRoot) return root;
    }
  }
  return token;
}

/**
 * @param {string} jobDescription
 * @param {string} tailoredCv
 * @returns {{fit: number|null, matchedKeywords: string[], missingKeywords: string[]}}
 *   `fit` is a 0-100 percentage, or null when the posting yielded too few
 *   distinctive terms to score honestly.
 */
export function computeFit(jobDescription, tailoredCv) {
  const empty = { fit: null, matchedKeywords: [], missingKeywords: [] };

  const jdTokens = tokenize(jobDescription).filter(isMeaningful);
  if (jdTokens.length === 0) return empty;

  // Rank by frequency; ties break toward first appearance, which keeps the
  // result stable for a given posting.
  const frequency = new Map();
  for (const token of jdTokens) {
    frequency.set(token, (frequency.get(token) ?? 0) + 1);
  }
  const keywords = [...frequency.keys()]
    .sort((a, b) => frequency.get(b) - frequency.get(a))
    .slice(0, MAX_KEYWORDS);

  if (keywords.length < MIN_KEYWORDS_FOR_SCORE) return empty;

  // Compared on stems, but reported as the posting's own wording so the UI shows
  // "services" rather than "servic".
  const cvStems = new Set(tokenize(tailoredCv).map(stem));
  const matchedKeywords = [];
  const missingKeywords = [];

  for (const keyword of keywords) {
    (cvStems.has(stem(keyword)) ? matchedKeywords : missingKeywords).push(keyword);
  }

  return {
    fit: Math.round((matchedKeywords.length / keywords.length) * 100),
    matchedKeywords,
    missingKeywords,
  };
}

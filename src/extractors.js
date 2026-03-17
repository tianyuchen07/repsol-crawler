import {
  DATE_PATTERNS,
  FAIR_PATTERNS,
  LOCATION_PATTERNS,
  REPSOL_RELEVANCE_KEYWORDS
} from "./config.js";
import { normalizeWhitespace, truncate, uniqueBy } from "./utils.js";

const EMPLOYER_PATTERNS = [
  /\bemployer\b/i,
  /\bemployers\b/i,
  /\brecruiter\b/i,
  /\brecruiting\b/i,
  /\brecruitment\b/i,
  /\bfor employers\b/i,
  /\bpartner with us\b/i
];

const TECHNICAL_REPSOL_KEYWORDS = new Set([
  "energy",
  "oil",
  "gas",
  "petroleum",
  "chemical",
  "engineering",
  "mechanical",
  "electrical",
  "geology",
  "geoscience",
  "operations",
  "manufacturing",
  "refining",
  "sustainability"
]);

function firstMatch(patterns, text) {
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) {
      return match[0];
    }
  }

  return "";
}

function buildContextSnippets(text) {
  return normalizeWhitespace(text)
    .split(/(?<=[.!?])\s+|\s{2,}/)
    .map((snippet) => snippet.trim())
    .filter(Boolean);
}

function matchedKeywords(text) {
  const lower = text.toLowerCase();
  return REPSOL_RELEVANCE_KEYWORDS.filter((keyword) => lower.includes(keyword));
}

function hasEmployerCue(text) {
  return EMPLOYER_PATTERNS.some((pattern) => pattern.test(text));
}

function hasTechnicalRepsolCue(keywordHits) {
  return keywordHits.some((keyword) => TECHNICAL_REPSOL_KEYWORDS.has(keyword));
}

function computeScore(text, keywordHits, pageSignals) {
  let score = keywordHits.length * 2;
  const employerCue = hasEmployerCue(text);

  if (FAIR_PATTERNS.some((pattern) => pattern.test(text))) {
    score += 5;
  }

  if (employerCue) {
    score += 4;
  }

  if (DATE_PATTERNS.some((pattern) => pattern.test(text))) {
    score += 2;
  }

  if (LOCATION_PATTERNS.some((pattern) => pattern.test(text))) {
    score += 1;
  }

  if (pageSignals?.isEmployerPage) {
    score += 3;
  }

  if (pageSignals?.isEventPage) {
    score += 2;
  }

  if (pageSignals?.hasEmployerCue) {
    score += 1;
  }

  return score;
}

function extractEventName(text) {
  const fairMatch = FAIR_PATTERNS.find((pattern) => pattern.test(text));
  if (!fairMatch) {
    return "Possible employment fair";
  }

  const sentence = buildContextSnippets(text).find((snippet) => fairMatch.test(snippet)) || text;
  const cleaned = normalizeWhitespace(sentence.replace(/\s*\|\s*/g, " "));
  return truncate(cleaned, 120);
}

function shouldKeepCandidate({ cleaned, fairMatch, keywordHits, pageSignals }) {
  const employerCue = hasEmployerCue(cleaned) || pageSignals?.hasEmployerCue;
  const technicalCue = hasTechnicalRepsolCue(keywordHits);
  const hasDate = DATE_PATTERNS.some((pattern) => pattern.test(cleaned));

  if (!fairMatch) {
    return false;
  }

  if (employerCue && (technicalCue || hasDate)) {
    return true;
  }

  if (technicalCue && hasDate) {
    return true;
  }

  if (pageSignals?.isEmployerPage && (keywordHits.length >= 2 || hasDate)) {
    return true;
  }

  return false;
}

export function extractFairCandidates({
  university,
  pageTitle,
  sourceUrl,
  text,
  snippets = [],
  pageSignals = {}
}) {
  const snippetPool = snippets.length > 0 ? snippets : buildContextSnippets(text);
  const candidates = [];

  for (const snippet of snippetPool) {
    const cleaned = normalizeWhitespace(snippet);
    if (!cleaned || cleaned.length < 35) {
      continue;
    }

    const fairMatch = FAIR_PATTERNS.some((pattern) => pattern.test(cleaned));
    const keywordHits = matchedKeywords(cleaned);
    const employerCue = hasEmployerCue(cleaned);

    if (!shouldKeepCandidate({ cleaned, fairMatch, keywordHits, pageSignals })) {
      continue;
    }

    const score = computeScore(cleaned, keywordHits, pageSignals);
    if (score < 9) {
      continue;
    }

    candidates.push({
      university,
      pageTitle,
      sourceUrl,
      matchedText: truncate(cleaned, 280),
      eventName: extractEventName(cleaned),
      dateSnippet: firstMatch(DATE_PATTERNS, cleaned),
      locationSnippet: firstMatch(LOCATION_PATTERNS, cleaned),
      relevanceScore: score,
      matchedKeywords: uniqueBy(
        [
          ...keywordHits,
          ...(employerCue ? ["employers"] : []),
          ...(pageSignals?.isEmployerPage ? ["employer-page"] : [])
        ],
        (keyword) => keyword
      )
    });
  }

  return uniqueBy(candidates, (candidate) =>
    `${candidate.university}|${candidate.sourceUrl}|${candidate.eventName}|${candidate.dateSnippet}`
  )
    .sort((left, right) => right.relevanceScore - left.relevanceScore)
    .slice(0, 6);
}

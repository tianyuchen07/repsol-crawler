import * as cheerio from "cheerio";
import { DEFAULT_TIMEOUT_MS, FAIR_PATTERNS } from "./config.js";
import { extractFairCandidates } from "./extractors.js";
import { absoluteUrl, normalizeWhitespace, uniqueBy } from "./utils.js";

const RELEVANT_BLOCK_SELECTORS = [
  "main article",
  "main section",
  "article",
  "section",
  "li",
  "tr",
  ".event",
  ".events",
  ".event-item",
  ".career-fair",
  ".card",
  ".panel",
  ".views-row",
  "p"
];

async function fetchHtml(url, timeoutMs = DEFAULT_TIMEOUT_MS) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      headers: {
        "user-agent": "Mozilla/5.0 (compatible; university-fair-scraper/1.0; +https://repsol.com)"
      },
      signal: controller.signal
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    return await response.text();
  } finally {
    clearTimeout(timeoutId);
  }
}

function buildPageSignals({ url, title, bodyText }) {
  const haystack = `${url} ${title} ${bodyText}`.toLowerCase();

  return {
    hasFairCue: FAIR_PATTERNS.some((pattern) => pattern.test(haystack)),
    hasEmployerCue:
      haystack.includes("employer") ||
      haystack.includes("recruiter") ||
      haystack.includes("recruiting"),
    isEmployerPage:
      url.toLowerCase().includes("employer") ||
      title.toLowerCase().includes("employer"),
    isEventPage:
      url.toLowerCase().includes("event") ||
      url.toLowerCase().includes("fair") ||
      title.toLowerCase().includes("event") ||
      title.toLowerCase().includes("fair")
  };
}

function pageLooksRelevant(pageSignals) {
  return pageSignals.hasFairCue ||
    pageSignals.hasEmployerCue ||
    pageSignals.isEmployerPage ||
    pageSignals.isEventPage;
}

function buildAllowedHosts(seedUrls) {
  return seedUrls.map((url) => new URL(url).hostname);
}

function hostAllowed(url, allowedHosts) {
  try {
    const hostname = new URL(url).hostname;
    return allowedHosts.some((allowedHost) =>
      hostname === allowedHost || hostname.endsWith(`.${allowedHost}`)
    );
  } catch {
    return false;
  }
}

function collectRelevantLinks($, baseUrl) {
  const links = [];

  $("a[href]").each((_, element) => {
    const href = $(element).attr("href");
    const text = normalizeWhitespace($(element).text());
    const url = absoluteUrl(baseUrl, href);

    if (!url || !url.startsWith("http")) {
      return;
    }

    const combined = `${text} ${url}`.toLowerCase();
    let priority = 0;

    if (combined.includes("employer")) {
      priority += 6;
    }

    if (combined.includes("career fair") || combined.includes("employment fair")) {
      priority += 5;
    }

    if (combined.includes("fair") || combined.includes("expo")) {
      priority += 4;
    }

    if (combined.includes("recruit")) {
      priority += 3;
    }

    if (combined.includes("event")) {
      priority += 2;
    }

    if (combined.includes("career")) {
      priority += 1;
    }

    if (
      combined.includes("career") ||
      combined.includes("fair") ||
      combined.includes("event") ||
      combined.includes("employer") ||
      combined.includes("recruit")
    ) {
      links.push({
        url,
        priority
      });
    }
  });

  return uniqueBy(links, (link) => link.url)
    .sort((left, right) => right.priority - left.priority);
}

function buildChunkText($, element) {
  const heading = normalizeWhitespace($(element).find("h1, h2, h3, h4").first().text());
  const text = normalizeWhitespace($(element).text());
  return normalizeWhitespace([heading, text].filter(Boolean).join(". "));
}

function extractRelevantTextBlocks($, title) {
  const blocks = [title];

  for (const selector of RELEVANT_BLOCK_SELECTORS) {
    $(selector).each((_, element) => {
      const text = buildChunkText($, element);
      const lower = text.toLowerCase();

      if (text.length < 35 || text.length > 650) {
        return;
      }

      if (
        lower.includes("employer") ||
        lower.includes("recruit") ||
        FAIR_PATTERNS.some((pattern) => pattern.test(lower))
      ) {
        blocks.push(text);
      }
    });
  }

  return uniqueBy(blocks.map((block) => normalizeWhitespace(block)).filter(Boolean), (block) => block);
}

function enqueue(queue, items) {
  queue.push(...items);
  queue.sort((left, right) => right.priority - left.priority);
}

export async function scrapeUniversity(university, maxPages) {
  const queue = university.seedUrls.map((url) => ({
    url,
    priority: url.toLowerCase().includes("employer") ? 10 : 5
  }));
  const visited = new Set();
  const results = [];
  const errors = [];
  const allowedHosts = buildAllowedHosts(university.seedUrls);

  while (queue.length > 0 && visited.size < maxPages) {
    const currentItem = queue.shift();
    const currentUrl = currentItem?.url;
    if (!currentUrl || visited.has(currentUrl)) {
      continue;
    }

    visited.add(currentUrl);

    try {
      const html = await fetchHtml(currentUrl);
      const $ = cheerio.load(html);
      const title = normalizeWhitespace($("title").first().text()) || currentUrl;
      const bodyText = normalizeWhitespace($("body").text());
      const pageSignals = buildPageSignals({ url: currentUrl, title, bodyText });
      const snippets = extractRelevantTextBlocks($, title);

      if (pageLooksRelevant(pageSignals)) {
        results.push(
          ...extractFairCandidates({
            university: university.name,
            pageTitle: title,
            sourceUrl: currentUrl,
            text: bodyText,
            snippets,
            pageSignals
          })
        );
      }

      const newLinks = collectRelevantLinks($, currentUrl)
        .filter((link) => link.priority > 0)
        .map((link) => ({
          url: link.url,
          priority: link.priority
        }))
        .filter((link) => hostAllowed(link.url, allowedHosts))
        .filter((link) => !visited.has(link.url))
        .slice(0, Math.max(0, maxPages - visited.size));

      enqueue(queue, newLinks);
    } catch (error) {
      errors.push({
        university: university.name,
        sourceUrl: currentUrl,
        error: error.message
      });
    }
  }

  return {
    university: university.name,
    visitedPages: visited.size,
    results: uniqueBy(results, (result) =>
      `${result.sourceUrl}|${result.eventName}|${result.dateSnippet}|${result.locationSnippet}`
    )
      .sort((left, right) => right.relevanceScore - left.relevanceScore)
      .slice(0, 8),
    errors
  };
}

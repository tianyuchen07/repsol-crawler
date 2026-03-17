function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function formatRunDate(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(date);
}

function totals(payload) {
  const universities = payload.universities || [];
  return universities.reduce((summary, university) => {
    summary.universities += 1;
    summary.pages += university.visitedPages || 0;
    summary.matches += university.results?.length || 0;
    summary.errors += university.errors?.length || 0;
    return summary;
  }, {
    universities: 0,
    pages: 0,
    matches: 0,
    errors: 0
  });
}

function renderTag(tag) {
  return `<span class="tag">${escapeHtml(tag)}</span>`;
}

function renderResultCard(result) {
  const keywords = result.matchedKeywords?.length
    ? result.matchedKeywords.map(renderTag).join("")
    : '<span class="muted">No keyword hits recorded</span>';

  return `
    <article class="result-card">
      <div class="result-topline">
        <h4>${escapeHtml(result.eventName)}</h4>
        <span class="score">Score ${escapeHtml(result.relevanceScore)}</span>
      </div>
      <p class="snippet">${escapeHtml(result.matchedText)}</p>
      <dl class="meta-grid">
        <div class="meta-cell">
          <dt>Date</dt>
          <dd>${escapeHtml(result.dateSnippet || "N/A")}</dd>
        </div>
        <div class="meta-cell">
          <dt>Location</dt>
          <dd>${escapeHtml(result.locationSnippet || "N/A")}</dd>
        </div>
        <div class="meta-cell full-width">
          <dt>Source</dt>
          <dd><a href="${escapeHtml(result.sourceUrl)}" target="_blank" rel="noreferrer">${escapeHtml(result.pageTitle || result.sourceUrl)}</a></dd>
        </div>
      </dl>
      <div class="keyword-row">${keywords}</div>
    </article>
  `;
}

function renderUniversitySection(university) {
  const resultMarkup = university.results?.length
    ? university.results.map(renderResultCard).join("")
    : '<div class="empty-state">No likely employment fairs were detected from the pages explored for this school.</div>';

  const errorMarkup = university.errors?.length
    ? `
      <div class="errors">
        <h4>Fetch Issues</h4>
        <ul>
          ${university.errors.map((error) => `<li><a href="${escapeHtml(error.sourceUrl)}" target="_blank" rel="noreferrer">${escapeHtml(error.sourceUrl)}</a> <span>${escapeHtml(error.error)}</span></li>`).join("")}
        </ul>
      </div>
    `
    : "";

  return `
    <section class="university-section" id="${escapeHtml(university.university.toLowerCase().replace(/[^a-z0-9]+/g, "-"))}">
      <div class="section-header">
        <div>
          <p class="eyebrow">University</p>
          <h3>${escapeHtml(university.university)}</h3>
        </div>
        <div class="stats-inline">
          <span>${escapeHtml(university.visitedPages)} pages visited</span>
          <span>${escapeHtml(university.results?.length || 0)} matches</span>
        </div>
      </div>
      <div class="results-grid">
        ${resultMarkup}
      </div>
      ${errorMarkup}
    </section>
  `;
}

export function renderHtmlReport(payload) {
  const summary = totals(payload);
  const universities = [...(payload.universities || [])].sort((left, right) => {
    const resultDelta = (right.results?.length || 0) - (left.results?.length || 0);
    if (resultDelta !== 0) {
      return resultDelta;
    }

    return left.university.localeCompare(right.university);
  });
  const navigationUniversities = universities.filter((university) => (university.results?.length || 0) > 0);

  return `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>REPSOL University Employment Fair Report</title>
    <style>
      :root {
        --bg: #f7f3ea;
        --panel: rgba(255, 252, 246, 0.88);
        --panel-strong: #fffaf2;
        --ink: #1f2d2f;
        --muted: #5e6d70;
        --accent: #d35400;
        --accent-soft: #ffe4cf;
        --line: rgba(31, 45, 47, 0.12);
        --shadow: 0 18px 50px rgba(57, 46, 31, 0.12);
      }

      * {
        box-sizing: border-box;
      }

      body {
        margin: 0;
        font-family: Georgia, "Times New Roman", serif;
        color: var(--ink);
        background:
          radial-gradient(circle at top left, rgba(211, 84, 0, 0.16), transparent 30%),
          radial-gradient(circle at top right, rgba(18, 104, 125, 0.14), transparent 28%),
          linear-gradient(180deg, #fcf8f1 0%, #f4efe5 100%);
      }

      a {
        color: inherit;
        overflow-wrap: anywhere;
      }

      .page {
        width: min(1200px, calc(100% - 32px));
        margin: 0 auto;
        padding: 32px 0 48px;
      }

      .hero {
        background: linear-gradient(135deg, rgba(255, 248, 237, 0.95), rgba(247, 240, 229, 0.88));
        border: 1px solid var(--line);
        border-radius: 28px;
        padding: 32px;
        box-shadow: var(--shadow);
        overflow: hidden;
        position: relative;
      }

      .hero::after {
        content: "";
        position: absolute;
        inset: auto -8% -30% auto;
        width: 280px;
        height: 280px;
        background: radial-gradient(circle, rgba(211, 84, 0, 0.16), transparent 68%);
        pointer-events: none;
      }

      .eyebrow {
        margin: 0 0 10px;
        font-size: 0.78rem;
        letter-spacing: 0.18em;
        text-transform: uppercase;
        color: var(--accent);
      }

      h1, h2, h3, h4, p {
        margin-top: 0;
      }

      h1 {
        font-size: clamp(2rem, 4vw, 3.8rem);
        line-height: 0.98;
        max-width: 10ch;
        margin-bottom: 14px;
      }

      .hero-copy {
        max-width: 62ch;
        color: var(--muted);
        font-size: 1.02rem;
      }

      .summary-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
        gap: 14px;
        margin-top: 28px;
      }

      .summary-card, .university-section, .toc {
        background: var(--panel);
        border: 1px solid var(--line);
        box-shadow: var(--shadow);
        backdrop-filter: blur(10px);
      }

      .summary-card {
        border-radius: 22px;
        padding: 18px;
      }

      .summary-card strong {
        display: block;
        font-size: 2rem;
        margin-bottom: 4px;
      }

      .layout {
        display: grid;
        grid-template-columns: 280px minmax(0, 1fr);
        gap: 22px;
        margin-top: 24px;
      }

      .toc {
        position: sticky;
        top: 18px;
        align-self: start;
        border-radius: 24px;
        padding: 22px 18px;
      }

      .toc ul {
        list-style: none;
        padding: 0;
        margin: 0;
      }

      .toc li + li {
        margin-top: 10px;
      }

      .toc a {
        text-decoration: none;
        color: var(--muted);
        transition: color 160ms ease, transform 160ms ease;
      }

      .toc a:hover {
        color: var(--ink);
        transform: translateX(2px);
      }

      .content {
        display: grid;
        gap: 20px;
      }

      .university-section {
        border-radius: 28px;
        padding: 24px;
      }

      .section-header {
        display: flex;
        justify-content: space-between;
        gap: 20px;
        align-items: end;
        border-bottom: 1px solid var(--line);
        padding-bottom: 16px;
        margin-bottom: 18px;
      }

      .stats-inline {
        display: flex;
        gap: 10px;
        flex-wrap: wrap;
        color: var(--muted);
        font-size: 0.95rem;
      }

      .results-grid {
        display: grid;
        gap: 16px;
      }

      .result-card {
        background: var(--panel-strong);
        border: 1px solid rgba(31, 45, 47, 0.08);
        border-radius: 22px;
        padding: 18px;
        overflow: hidden;
      }

      .result-topline {
        display: flex;
        justify-content: space-between;
        gap: 14px;
        align-items: start;
      }

      .result-topline h4 {
        margin-bottom: 10px;
        font-size: 1.1rem;
      }

      .score {
        white-space: nowrap;
        background: var(--accent-soft);
        color: var(--accent);
        border-radius: 999px;
        padding: 8px 12px;
        font-size: 0.84rem;
      }

      .snippet {
        color: var(--muted);
        line-height: 1.55;
      }

      .meta-grid {
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 14px;
        margin: 0 0 16px;
      }

      .meta-grid dt {
        font-size: 0.78rem;
        text-transform: uppercase;
        letter-spacing: 0.08em;
        color: var(--muted);
        margin-bottom: 4px;
      }

      .meta-grid dd {
        margin: 0;
        overflow-wrap: anywhere;
      }

      .meta-cell {
        min-width: 0;
      }

      .full-width {
        grid-column: 1 / -1;
      }

      .keyword-row {
        display: flex;
        flex-wrap: wrap;
        gap: 8px;
      }

      .tag {
        border: 1px solid var(--line);
        border-radius: 999px;
        padding: 6px 10px;
        font-size: 0.82rem;
        background: white;
      }

      .errors {
        margin-top: 16px;
        padding-top: 16px;
        border-top: 1px dashed var(--line);
      }

      .errors ul {
        margin: 0;
        padding-left: 18px;
        color: var(--muted);
      }

      .empty-state, .muted {
        color: var(--muted);
      }

      .snippet,
      .errors li,
      .hero-copy {
        overflow-wrap: anywhere;
      }

      @media (max-width: 980px) {
        .layout {
          grid-template-columns: 1fr;
        }

        .toc {
          position: static;
        }
      }

      @media (max-width: 640px) {
        .page {
          width: min(100% - 20px, 1200px);
          padding-top: 20px;
        }

        .hero,
        .university-section {
          padding: 20px;
          border-radius: 22px;
        }

        .section-header,
        .result-topline {
          display: block;
        }

        .score {
          display: inline-block;
          margin-bottom: 12px;
        }

        .meta-grid {
          grid-template-columns: 1fr;
        }
      }
    </style>
  </head>
  <body>
    <main class="page">
      <section class="hero">
        <p class="eyebrow">REPSOL Recruiting Intelligence</p>
        <h1>University Employment Fair Report</h1>
        <p class="hero-copy">
          Scraped university career, employer, and event pages to surface likely employment fairs with engineering,
          energy, internship, and employer relevance for REPSOL S.A. recruiting teams.
        </p>
        <p class="hero-copy">
          Generated ${escapeHtml(formatRunDate(payload.runAt))}. Crawl limit: ${escapeHtml(payload.maxPagesPerUniversity)} pages per university.
        </p>
        <div class="summary-grid">
          <div class="summary-card"><strong>${escapeHtml(summary.universities)}</strong><span>Universities scanned</span></div>
          <div class="summary-card"><strong>${escapeHtml(summary.pages)}</strong><span>Pages visited</span></div>
          <div class="summary-card"><strong>${escapeHtml(summary.matches)}</strong><span>Likely fair matches</span></div>
          <div class="summary-card"><strong>${escapeHtml(summary.errors)}</strong><span>Fetch issues</span></div>
        </div>
      </section>
      <div class="layout">
        <aside class="toc">
          <p class="eyebrow">Universities</p>
          <ul>
            ${(navigationUniversities.length > 0 ? navigationUniversities : universities).map((university) => `
              <li>
                <a href="#${escapeHtml(university.university.toLowerCase().replace(/[^a-z0-9]+/g, "-"))}">
                  ${escapeHtml(university.university)} (${escapeHtml(university.results?.length || 0)})
                </a>
              </li>
            `).join("")}
          </ul>
        </aside>
        <section class="content">
          ${universities.map(renderUniversitySection).join("")}
        </section>
      </div>
    </main>
  </body>
</html>`;
}

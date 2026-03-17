# University Employment Fair Scraper

Node.js, Cheerio, and RegEx based web-scraping application for finding employment fairs at target universities across the United States for REPSOL S.A. recruiting workflows.

## What it does

- Fetches target university career-center and event pages.
- Parses HTML with Cheerio.
- Uses RegEx and keyword scoring to find likely employment fair listings.
- Prioritizes fairs with engineering, energy, STEM, and employer-facing relevance.
- Looks for employer-focused tabs and pages on university career sites so results are more useful for REPSOL recruiting.
- Prints structured results to the terminal and can save them to JSON.
- Can render the results into a styled HTML/CSS report page.

## Example targets

The default configuration includes examples such as:

- University of Texas at Austin
- Texas A&M University
- University of Houston
- Colorado School of Mines
- Louisiana State University

You can add or remove universities in `src/config.js`.

## Requirements

- Node.js 18+ recommended
- npm

## Install

```bash
npm install
```

## Run

```bash
npm run scrape
```

Save the results to a custom file:

```bash
node src/index.js --output output/results.json
```

Generate an HTML report page:

```bash
node src/index.js --html output/report.html
```

Generate both JSON and HTML:

```bash
node src/index.js --output output/results.json --html output/report.html
```

Limit how many matching pages are explored per university:

```bash
node src/index.js --max-pages 8
```

## Output shape

Each result contains:

- `university`
- `pageTitle`
- `sourceUrl`
- `matchedText`
- `eventName`
- `dateSnippet`
- `locationSnippet`
- `relevanceScore`
- `matchedKeywords`

## Notes

- University websites differ a lot. The scraper uses broad heuristics, so some manual review is still recommended.
- Many schools host fairs inside Handshake or third-party platforms that may require login. Those pages may not be fully scrapeable with this lightweight approach.
- This project is intentionally built with plain Node.js, Cheerio, and RegEx so it stays easy to customize.

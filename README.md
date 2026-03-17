# university employment fair crawler

Node.js, Cheerio, and RegEx based web-scraping application for finding employment fairs at target universities across the United States for REPSOL S.A. recruiting workflows.

## what it does

- fetches target university career-center and event pages.
- parses HTML with Cheerio.
- uses RegEx and keyword scoring to find likely employment fair listings.
- prioritizes fairs with engineering, energy, STEM, and employer-facing relevance.
- looks for employer-focused tabs and pages on university career sites so results are more useful for REPSOL recruiting.
- prints structured results to the terminal and can save them to JSON.
- can render the results into a styled HTML/CSS report page.

## Install

```bash
npm install
```

## run

```bash
npm run scrape
```

save the results to a custom file:

```bash
node src/index.js --output output/results.json
```

generate an HTML report page:

```bash
node src/index.js --html output/report.html
```

generate both JSON and HTML:

```bash
node src/index.js --output output/results.json --html output/report.html
```

limit how many matching pages are explored per university:

```bash
node src/index.js --max-pages 8
```

## output shape

each result contains:

- `university`
- `pageTitle`
- `sourceUrl`
- `matchedText`
- `eventName`
- `dateSnippet`
- `locationSnippet`
- `relevanceScore`
- `matchedKeywords`

## notes

- university websites differ a lot. the scraper uses broad heuristics, so some manual review is still recommended.
- many schools host fairs inside Handshake or third-party platforms that may require login. those pages may not be fully scrapeable with this lightweight approach.
- this project is intentionally built with plain Node.js, Cheerio, and RegEx so it stays easy to customize.
  

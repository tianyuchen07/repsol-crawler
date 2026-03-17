import fs from "node:fs/promises";
import path from "node:path";
import {
  DEFAULT_MAX_PAGES_PER_UNIVERSITY,
  TARGET_UNIVERSITIES
} from "./config.js";
import { renderHtmlReport } from "./report.js";
import { scrapeUniversity } from "./scraper.js";
import { parseArgs } from "./utils.js";

function printSummary(universityResult) {
  console.log(`\n${universityResult.university}`);
  console.log(`Visited pages: ${universityResult.visitedPages}`);

  if (universityResult.results.length === 0) {
    console.log("No likely fairs found.");
  } else {
    for (const result of universityResult.results) {
      console.log(`- ${result.eventName}`);
      console.log(`  Score: ${result.relevanceScore}`);
      console.log(`  Source: ${result.sourceUrl}`);
      console.log(`  Date: ${result.dateSnippet || "N/A"}`);
      console.log(`  Location: ${result.locationSnippet || "N/A"}`);
      console.log(`  Keywords: ${result.matchedKeywords.join(", ") || "N/A"}`);
      console.log(`  Snippet: ${result.matchedText}`);
    }
  }

  if (universityResult.errors.length > 0) {
    console.log("Page errors:");
    for (const error of universityResult.errors) {
      console.log(`  - ${error.sourceUrl}: ${error.error}`);
    }
  }
}

async function writeOutput(outputPath, payload) {
  const absolute = path.resolve(outputPath);
  await fs.mkdir(path.dirname(absolute), { recursive: true });
  await fs.writeFile(absolute, JSON.stringify(payload, null, 2), "utf8");
  console.log(`\nSaved output to ${absolute}`);
}

async function writeHtmlReport(outputPath, payload) {
  const absolute = path.resolve(outputPath);
  const html = renderHtmlReport(payload);
  await fs.mkdir(path.dirname(absolute), { recursive: true });
  await fs.writeFile(absolute, html, "utf8");
  console.log(`Saved HTML report to ${absolute}`);
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const maxPages = Number.isInteger(args.maxPages) && args.maxPages > 0
    ? args.maxPages
    : DEFAULT_MAX_PAGES_PER_UNIVERSITY;

  const runAt = new Date().toISOString();
  const universityRuns = [];

  for (const university of TARGET_UNIVERSITIES) {
    const result = await scrapeUniversity(university, maxPages);
    universityRuns.push(result);
    printSummary(result);
  }

  const payload = {
    runAt,
    maxPagesPerUniversity: maxPages,
    recruiterFocus: "REPSOL S.A. energy company recruiting",
    targets: TARGET_UNIVERSITIES.map((university) => ({
      name: university.name,
      shortName: university.shortName,
      tags: university.tags || [],
      seedUrls: university.seedUrls
    })),
    universities: universityRuns
  };

  if (args.output) {
    await writeOutput(args.output, payload);
  }

  if (args.html) {
    await writeHtmlReport(args.html, payload);
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

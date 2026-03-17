export function normalizeWhitespace(value) {
  return (value || "").replace(/\s+/g, " ").trim();
}

export function absoluteUrl(baseUrl, href) {
  if (!href) {
    return null;
  }

  try {
    return new URL(href, baseUrl).toString();
  } catch {
    return null;
  }
}

export function uniqueBy(items, keyFn) {
  const seen = new Set();
  const results = [];

  for (const item of items) {
    const key = keyFn(item);
    if (seen.has(key)) {
      continue;
    }

    seen.add(key);
    results.push(item);
  }

  return results;
}

export function truncate(value, maxLength = 280) {
  if (!value || value.length <= maxLength) {
    return value;
  }

  return `${value.slice(0, maxLength - 3)}...`;
}

export function parseArgs(argv) {
  const args = {
    output: null,
    html: null,
    maxPages: null
  };

  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (token === "--output" && argv[index + 1]) {
      args.output = argv[index + 1];
      index += 1;
      continue;
    }

    if (token === "--html" && argv[index + 1]) {
      args.html = argv[index + 1];
      index += 1;
      continue;
    }

    if (token === "--max-pages" && argv[index + 1]) {
      args.maxPages = Number.parseInt(argv[index + 1], 10);
      index += 1;
    }
  }

  return args;
}

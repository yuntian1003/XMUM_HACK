import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

type ParsedArgs = {
  input?: string;
  output?: string;
  limit?: number;
};

type RowRecord = Record<string, string>;

function printUsage(): void {
  console.log(
    [
      "Usage:",
      "  tsx scripts/utils/export-news-csv-to-rag-docs.mts --input <csvPath> --output <outputDir> [--limit <n>]",
      "",
      "Example:",
      "  tsx scripts/utils/export-news-csv-to-rag-docs.mts --input ./exports/news_export.csv --output ./rag-data/factual-news --limit 1000",
    ].join("\n")
  );
}

function parseArgs(argv: string[]): ParsedArgs {
  const args: ParsedArgs = {};

  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];
    if (token === "--input") args.input = argv[i + 1];
    if (token === "--output") args.output = argv[i + 1];
    if (token === "--limit") args.limit = Number(argv[i + 1]);
  }

  return args;
}

function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let currentRow: string[] = [];
  let currentField = "";
  let inQuotes = false;

  for (let i = 0; i < text.length; i += 1) {
    const ch = text[i];
    const next = text[i + 1];

    if (ch === '"') {
      if (inQuotes && next === '"') {
        currentField += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (ch === "," && !inQuotes) {
      currentRow.push(currentField);
      currentField = "";
      continue;
    }

    if ((ch === "\n" || ch === "\r") && !inQuotes) {
      if (ch === "\r" && next === "\n") i += 1;
      currentRow.push(currentField);
      const hasContent = currentRow.some((value) => value.trim().length > 0);
      if (hasContent) rows.push(currentRow);
      currentRow = [];
      currentField = "";
      continue;
    }

    currentField += ch;
  }

  // Flush final row.
  if (currentField.length > 0 || currentRow.length > 0) {
    currentRow.push(currentField);
    const hasContent = currentRow.some((value) => value.trim().length > 0);
    if (hasContent) rows.push(currentRow);
  }

  return rows;
}

function normalizeHeader(header: string): string {
  return header.trim().toLowerCase();
}

function rowToRecord(headers: string[], values: string[]): RowRecord {
  const record: RowRecord = {};
  for (let i = 0; i < headers.length; i += 1) {
    record[headers[i]] = (values[i] ?? "").trim();
  }
  return record;
}

function pick(record: RowRecord, candidates: string[], fallback = ""): string {
  for (const candidate of candidates) {
    const key = candidate.toLowerCase();
    if (record[key] && record[key].trim().length > 0) return record[key].trim();
  }
  return fallback;
}

function sanitizeFileToken(value: string): string {
  const safe = value
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
  return safe || "news";
}

function parseDateToken(raw: string): string {
  if (!raw) return "undated";
  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) return "undated";
  return parsed.toISOString().slice(0, 10);
}

function buildDocumentText(record: RowRecord): string {
  const id = pick(record, ["id", "article_id"], "unknown-id");
  const title = pick(record, ["title", "headline"], "Untitled");
  const source = pick(record, ["source", "source_name"], "Unknown");
  const url = pick(record, ["url", "link"], "");
  const publishedAt = pick(record, ["published_at", "publishedat", "published_date"], "");
  const description = pick(record, ["description", "summary", "content"], "");
  const eventType = pick(record, ["event_type", "eventtype", "category"], "");

  const lines = [
    `ID: ${id}`,
    `Title: ${title}`,
    `Source: ${source}`,
    `Published At: ${publishedAt || "Unknown"}`,
    ...(url ? [`URL: ${url}`] : []),
    ...(eventType ? [`Event Type: ${eventType}`] : []),
    "",
    "Body:",
    description || "No description provided.",
  ];

  return `${lines.join("\n")}\n`;
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));

  if (!args.input || !args.output) {
    printUsage();
    process.exitCode = 1;
    return;
  }

  const csvPath = path.resolve(args.input);
  const outputDir = path.resolve(args.output);

  const csvText = await readFile(csvPath, "utf8");
  const parsedRows = parseCsv(csvText);

  if (parsedRows.length < 2) {
    throw new Error("CSV appears empty or missing header row.");
  }

  const headers = parsedRows[0].map(normalizeHeader);
  const dataRows = parsedRows.slice(1);
  const limitedRows = Number.isFinite(args.limit) && (args.limit as number) > 0
    ? dataRows.slice(0, args.limit)
    : dataRows;

  await mkdir(outputDir, { recursive: true });

  let written = 0;
  for (const values of limitedRows) {
    const record = rowToRecord(headers, values);
    const id = pick(record, ["id", "article_id"], `row-${written + 1}`);
    const publishedAt = pick(record, ["published_at", "publishedat", "published_date"], "");
    const dateToken = parseDateToken(publishedAt);
    const idToken = sanitizeFileToken(id);
    const fileName = `${dateToken}_${idToken}.txt`;
    const target = path.join(outputDir, fileName);

    await writeFile(target, buildDocumentText(record), "utf8");
    written += 1;
  }

  console.log(`Generated ${written} RAG documents in ${outputDir}`);
}

main().catch((error) => {
  console.error("Failed to generate RAG documents:", error);
  process.exitCode = 1;
});

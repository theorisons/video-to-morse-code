import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, extname, resolve } from "node:path";
import { parseArgs } from "node:util";

const TIMESTAMP_LINE = /^\d{1,2}:\d{2}:\d{2}[,.]\d{1,3}\s+-->\s+\d{1,2}:\d{2}:\d{2}[,.]\d{1,3}/;

function printHelp() {
  console.log(`Extract subtitle text from an SRT file.

Usage:
  pnpm extract-content-from-srt --input <file.srt> [--output <file.txt>]
  pnpm extract-content-from-srt -- <file.srt>

Options:
  -i, --input   Path to the SRT file
  -o, --output  Path to the output TXT file
                (default: same directory and basename as the input, with .txt)
  -h, --help    Show this help
`);
}

function stripSrtMarkup(line: string): string {
  return line
    .replace(/\{\\an\d+\}/g, "")
    .replace(/<[^>]+>/g, "")
    .trim();
}

function extractSubtitleContent(srt: string): string {
  const normalized = srt
    .replace(/^\uFEFF/, "")
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .trim();

  if (!normalized) {
    return "";
  }

  const cues: string[] = [];

  for (const block of normalized.split(/\n{2,}/)) {
    const lines = block
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean);

    if (lines.length === 0) {
      continue;
    }

    let start = 0;
    if (/^\d+$/.test(lines[0] ?? "")) {
      start = 1;
    }
    if (start < lines.length && TIMESTAMP_LINE.test(lines[start] ?? "")) {
      start += 1;
    }

    const text = lines
      .slice(start)
      .map(stripSrtMarkup)
      .filter(Boolean)
      .join(" ");

    if (text) {
      cues.push(text);
    }
  }

  return cues.join("\n");
}

function defaultOutputPath(inputPath: string): string {
  const extension = extname(inputPath);
  const baseName =
    extension.toLowerCase() === ".srt"
      ? inputPath.slice(0, -extension.length)
      : inputPath;
  return `${baseName}.txt`;
}

function cliArgs(): string[] {
  const args = process.argv.slice(2);
  return args[0] === "--" ? args.slice(1) : args;
}

function main() {
  const { values, positionals } = parseArgs({
    args: cliArgs(),
    allowPositionals: true,
    options: {
      input: { type: "string", short: "i" },
      output: { type: "string", short: "o" },
      help: { type: "boolean", short: "h", default: false },
    },
  });

  if (values.help) {
    printHelp();
    return;
  }

  const inputArg = values.input ?? positionals[0];
  if (!inputArg) {
    console.error("Missing input SRT file.\n");
    printHelp();
    process.exitCode = 1;
    return;
  }

  const inputPath = resolve(inputArg);
  const outputPath = resolve(values.output ?? defaultOutputPath(inputPath));

  let srt: string;
  try {
    srt = readFileSync(inputPath, "utf8");
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`Could not read SRT file: ${inputPath}\n${message}`);
    process.exitCode = 1;
    return;
  }

  const content = extractSubtitleContent(srt);
  mkdirSync(dirname(outputPath), { recursive: true });
  writeFileSync(outputPath, content ? `${content}\n` : "", "utf8");

  console.log(`Wrote ${outputPath}`);
}

main();

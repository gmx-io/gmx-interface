import { readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import type { GmxExecutionCostDataset, GmxExecutionCostRow } from "../../src/pages/GmxExecutionCosts/types";

type DatasetSummary = GmxExecutionCostDataset["summary"];

const DEFAULT_INPUT_DIR = ".context/gmx-execution-costs";
const DEFAULT_OUTPUT = "src/pages/GmxExecutionCosts/gmxExecutionCostsData.json";

function parseArgs(argv: string[]) {
  const args = {
    inputDir: DEFAULT_INPUT_DIR,
    output: DEFAULT_OUTPUT,
  };

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    const readValue = () => {
      const value = argv[++i];
      if (!value) {
        throw new Error(`Missing value for ${arg}`);
      }
      return value;
    };

    if (arg === "--input-dir") {
      args.inputDir = readValue();
    } else if (arg === "--output") {
      args.output = readValue();
    } else if (arg === "--help" || arg === "-h") {
      console.log(`Usage:
  yarn tsx scripts/research/generateGmxExecutionAppData.ts [options]

Options:
  --input-dir <path>  Directory containing *.csv and *.summary.json files.
                     Default: ${DEFAULT_INPUT_DIR}
  --output <path>     App data JSON output path.
                     Default: ${DEFAULT_OUTPUT}
`);
      process.exit(0);
    } else {
      throw new Error(`Unknown argument: ${arg}`);
    }
  }

  return args;
}

function parseCsv(text: string) {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const nextChar = text[i + 1];

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        field += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === "," && !inQuotes) {
      row.push(field);
      field = "";
    } else if ((char === "\n" || char === "\r") && !inQuotes) {
      if (char === "\r" && nextChar === "\n") {
        i++;
      }
      row.push(field);
      field = "";
      if (row.some((value) => value !== "")) {
        rows.push(row);
      }
      row = [];
    } else {
      field += char;
    }
  }

  if (field || row.length) {
    row.push(field);
    rows.push(row);
  }

  if (!rows.length) {
    return [];
  }

  const headers = rows[0];

  return rows.slice(1).map((values) => {
    const record: Record<string, string> = {};
    headers.forEach((header, index) => {
      record[header] = values[index] ?? "";
    });
    return record;
  });
}

function nullableNumber(value: string) {
  if (value === "") {
    return null;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function numberValue(value: string) {
  return nullableNumber(value) ?? 0;
}

function toDataRow(record: Record<string, string>): GmxExecutionCostRow {
  return {
    marketName: record.marketName,
    orderKey: record.orderKey,
    side: record.side as "long" | "short",
    phase: record.phase as "increase" | "decrease",
    timestamp: numberValue(record.timestamp),
    delaySeconds: nullableNumber(record.delaySeconds),
    transactionHash: record.transactionHash,
    sizeUsd: numberValue(record.sizeUsd),
    oracleSpreadBps: nullableNumber(record.oracleSpreadBps),
    positionFeeBps: numberValue(record.positionFeeBps),
    netImpactCostBps: numberValue(record.netImpactCostBps),
    swapCostBps: numberValue(record.swapCostBps),
    protocolCostBps: nullableNumber(record.protocolCostBps),
    holdingFeeBps: numberValue(record.holdingFeeBps),
  };
}

function formatCompactUsd(value: number) {
  if (value >= 1_000_000) {
    return `$${Math.round((value / 1_000_000) * 10) / 10}m+`;
  }

  if (value >= 1_000) {
    return `$${Math.round(value / 1_000)}k+`;
  }

  return "all sizes";
}

function datasetLabel(summary: DatasetSummary) {
  const days = Math.round(((summary.to - summary.from) / 86_400) * 10) / 10;
  const size = summary.minSizeUsd ? formatCompactUsd(summary.minSizeUsd) : "all sizes";
  return `${summary.chain} BTC ${days}d ${size} (${summary.executions} fills)`;
}

async function loadDatasets(inputDir: string) {
  const files = await readdir(inputDir);
  const summaryFiles = files.filter((file) => file.endsWith(".summary.json")).sort();
  const datasets: GmxExecutionCostDataset[] = [];

  for (const summaryFile of summaryFiles) {
    const basename = summaryFile.replace(".summary.json", "");
    const csvFile = `${basename}.csv`;

    if (!files.includes(csvFile)) {
      continue;
    }

    const [summaryText, csvText] = await Promise.all([
      readFile(path.join(inputDir, summaryFile), "utf8"),
      readFile(path.join(inputDir, csvFile), "utf8"),
    ]);
    const rawSummary = JSON.parse(summaryText) as DatasetSummary & Record<string, unknown>;
    const summary: DatasetSummary = {
      generatedAt: rawSummary.generatedAt,
      chain: rawSummary.chain,
      chainId: rawSummary.chainId,
      from: rawSummary.from,
      to: rawSummary.to,
      fromIso: rawSummary.fromIso,
      toIso: rawSummary.toIso,
      executions: rawSummary.executions,
      minSizeUsd: rawSummary.minSizeUsd,
      summary: rawSummary.summary,
    };
    const rows = parseCsv(csvText).map(toDataRow);

    datasets.push({
      id: basename,
      label: datasetLabel(summary),
      summary,
      rows,
    });
  }

  return datasets.sort((a, b) => {
    if (a.summary.from !== b.summary.from) {
      return a.summary.from - b.summary.from;
    }

    return (a.summary.minSizeUsd || 0) - (b.summary.minSizeUsd || 0);
  });
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const datasets = await loadDatasets(args.inputDir);

  if (!datasets.length) {
    throw new Error(`No datasets found in ${args.inputDir}`);
  }

  await writeFile(args.output, `${JSON.stringify(datasets)}\n`);
  console.log(`Wrote ${args.output}`);
  console.log(`Datasets: ${datasets.length}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

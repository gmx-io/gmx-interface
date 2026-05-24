import { readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

type DatasetSummary = {
  generatedAt: string;
  chain: string;
  chainId: number;
  from: number;
  to: number;
  fromIso: string;
  toIso: string;
  executions: number;
  minSizeUsd: number;
  summary: {
    group: string;
    count: number;
    volumeUsd: number;
    medianSizeUsd: number | null;
    medianDelaySeconds: number | null;
    p75DelaySeconds: number | null;
    medianOracleSpreadBps: number | null;
    medianPositionFeeBps: number | null;
    medianNetImpactCostBps: number | null;
    p25ProtocolCostBps: number | null;
    medianProtocolCostBps: number | null;
    p75ProtocolCostBps: number | null;
    p90ProtocolCostBps: number | null;
  }[];
};

type DataRow = {
  chain: string;
  marketName: string;
  marketAddress: string;
  orderKey: string;
  orderType: string;
  side: "long" | "short";
  phase: "increase" | "decrease";
  timestamp: number;
  createdTimestamp: number | null;
  delaySeconds: number | null;
  account: string;
  transactionHash: string;
  sizeUsd: number;
  markPriceUsd: number | null;
  executionPriceUsd: number | null;
  executionVsMarkBps: number | null;
  oracleSpreadBps: number | null;
  positionFeeUsd: number;
  positionFeeBps: number;
  netImpactUsd: number;
  netImpactCostBps: number;
  protocolCostBps: number | null;
  holdingFeeUsd: number;
  holdingFeeBps: number;
  priceImpactUsd: number;
  proportionalPendingImpactUsd: number;
  priceImpactDiffUsd: number;
  isTwap: boolean;
};

type ReportDataset = {
  id: string;
  label: string;
  summary: DatasetSummary;
  rows: DataRow[];
};

const DEFAULT_INPUT_DIR = ".context/gmx-execution-costs";
const DEFAULT_OUTPUT = ".context/gmx-execution-costs/gmx-execution-costs-report.html";

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
  yarn tsx scripts/research/generateGmxExecutionReport.ts [options]

Options:
  --input-dir <path>  Directory containing *.csv and *.summary.json files.
                     Default: ${DEFAULT_INPUT_DIR}
  --output <path>     HTML output path.
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

function toDataRow(record: Record<string, string>): DataRow {
  return {
    chain: record.chain,
    marketName: record.marketName,
    marketAddress: record.marketAddress,
    orderKey: record.orderKey,
    orderType: record.orderType,
    side: record.side as "long" | "short",
    phase: record.phase as "increase" | "decrease",
    timestamp: numberValue(record.timestamp),
    createdTimestamp: nullableNumber(record.createdTimestamp),
    delaySeconds: nullableNumber(record.delaySeconds),
    account: record.account,
    transactionHash: record.transactionHash,
    sizeUsd: numberValue(record.sizeUsd),
    markPriceUsd: nullableNumber(record.markPriceUsd),
    executionPriceUsd: nullableNumber(record.executionPriceUsd),
    executionVsMarkBps: nullableNumber(record.executionVsMarkBps),
    oracleSpreadBps: nullableNumber(record.oracleSpreadBps),
    positionFeeUsd: numberValue(record.positionFeeUsd),
    positionFeeBps: numberValue(record.positionFeeBps),
    netImpactUsd: numberValue(record.netImpactUsd),
    netImpactCostBps: numberValue(record.netImpactCostBps),
    protocolCostBps: nullableNumber(record.protocolCostBps),
    holdingFeeUsd: numberValue(record.holdingFeeUsd),
    holdingFeeBps: numberValue(record.holdingFeeBps),
    priceImpactUsd: numberValue(record.priceImpactUsd),
    proportionalPendingImpactUsd: numberValue(record.proportionalPendingImpactUsd),
    priceImpactDiffUsd: numberValue(record.priceImpactDiffUsd),
    isTwap: record.isTwap === "true",
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
  const datasets: ReportDataset[] = [];

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
    const summary = JSON.parse(summaryText) as DatasetSummary;
    const rows = parseCsv(csvText).map(toDataRow);

    datasets.push({
      id: basename,
      label: datasetLabel(summary),
      summary,
      rows,
    });
  }

  return datasets.sort((a, b) => {
    const aMin = a.summary.minSizeUsd || 0;
    const bMin = b.summary.minSizeUsd || 0;
    if (a.summary.from !== b.summary.from) {
      return a.summary.from - b.summary.from;
    }
    return aMin - bMin;
  });
}

function htmlEscape(value: string) {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function buildHtml(datasets: ReportDataset[]) {
  const dataJson = JSON.stringify(datasets).replace(/</g, "\\u003c");
  const generatedAt = new Date().toISOString();

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>GMX BTC Execution Cost Report</title>
  <style>
    :root {
      color-scheme: light;
      --bg: #f7f4ef;
      --panel: #ffffff;
      --text: #202124;
      --muted: #656b74;
      --border: #d8d3ca;
      --grid: #e9e3d9;
      --blue: #2563eb;
      --green: #0f8b5f;
      --red: #bf3b2b;
      --amber: #c68021;
      --ink-soft: #3e4652;
      --shadow: 0 1px 2px rgba(32, 33, 36, 0.08);
    }

    * { box-sizing: border-box; }

    body {
      margin: 0;
      background: var(--bg);
      color: var(--text);
      font: 14px/1.45 Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
    }

    header {
      padding: 24px 28px 14px;
      border-bottom: 1px solid var(--border);
      background: #fbfaf7;
    }

    h1 {
      margin: 0;
      font-size: 24px;
      font-weight: 700;
      letter-spacing: 0;
    }

    .subtitle {
      max-width: 980px;
      margin-top: 8px;
      color: var(--muted);
      font-size: 14px;
    }

    main {
      padding: 18px 28px 32px;
      max-width: 1560px;
      margin: 0 auto;
    }

    .controls {
      display: grid;
      grid-template-columns: minmax(260px, 1.6fr) repeat(4, minmax(130px, 1fr));
      gap: 10px;
      align-items: end;
      padding: 12px;
      border: 1px solid var(--border);
      border-radius: 8px;
      background: var(--panel);
      box-shadow: var(--shadow);
      position: sticky;
      top: 0;
      z-index: 2;
    }

    label {
      display: grid;
      gap: 5px;
      color: var(--muted);
      font-size: 12px;
      font-weight: 600;
    }

    select, input {
      width: 100%;
      min-height: 34px;
      border: 1px solid var(--border);
      border-radius: 6px;
      background: #fff;
      color: var(--text);
      padding: 6px 9px;
      font: inherit;
    }

    .kpis {
      display: grid;
      grid-template-columns: repeat(6, minmax(120px, 1fr));
      gap: 10px;
      margin-top: 14px;
    }

    .kpi {
      padding: 12px;
      border: 1px solid var(--border);
      border-radius: 8px;
      background: var(--panel);
      box-shadow: var(--shadow);
      min-height: 78px;
    }

    .kpi .label {
      color: var(--muted);
      font-size: 12px;
      font-weight: 600;
    }

    .kpi .value {
      margin-top: 4px;
      font-size: 24px;
      font-weight: 700;
      line-height: 1.15;
      letter-spacing: 0;
    }

    .kpi .hint {
      color: var(--muted);
      font-size: 12px;
      margin-top: 4px;
    }

    .grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 14px;
      margin-top: 14px;
    }

    .panel {
      border: 1px solid var(--border);
      border-radius: 8px;
      background: var(--panel);
      box-shadow: var(--shadow);
      min-width: 0;
      overflow: hidden;
    }

    .panel.full { grid-column: 1 / -1; }

    .panel-head {
      display: flex;
      justify-content: space-between;
      gap: 10px;
      padding: 13px 14px 9px;
      border-bottom: 1px solid var(--grid);
    }

    .panel-title {
      font-weight: 700;
      font-size: 15px;
    }

    .panel-note {
      color: var(--muted);
      font-size: 12px;
      text-align: right;
    }

    .chart {
      width: 100%;
      height: 330px;
      display: block;
    }

    .chart.tall { height: 380px; }

    svg text {
      fill: var(--muted);
      font-size: 11px;
    }

    .axis { stroke: #8b929c; stroke-width: 1; }
    .gridline { stroke: var(--grid); stroke-width: 1; }
    .band { fill: rgba(198, 128, 33, 0.14); }
    .bar { fill: rgba(37, 99, 235, 0.68); }
    .bar-negative { fill: rgba(15, 139, 95, 0.72); }
    .increase { fill: var(--blue); stroke: #1647a8; }
    .decrease { fill: var(--red); stroke: #8f291f; }

    table {
      width: 100%;
      border-collapse: collapse;
      font-size: 13px;
    }

    th, td {
      padding: 8px 10px;
      border-bottom: 1px solid var(--grid);
      text-align: left;
      white-space: nowrap;
    }

    th {
      color: var(--muted);
      font-size: 12px;
      font-weight: 700;
      background: #fbfaf7;
      position: sticky;
      top: 0;
      z-index: 1;
    }

    .table-wrap {
      max-height: 430px;
      overflow: auto;
    }

    .pill {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      border: 1px solid var(--border);
      border-radius: 999px;
      padding: 2px 8px;
      font-size: 12px;
      background: #fff;
    }

    .dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      display: inline-block;
    }

    .dot.increase { background: var(--blue); }
    .dot.decrease { background: var(--red); }

    a { color: var(--blue); text-decoration: none; }
    a:hover { text-decoration: underline; }

    .tooltip {
      position: fixed;
      display: none;
      pointer-events: none;
      max-width: 320px;
      padding: 9px 10px;
      border: 1px solid var(--border);
      border-radius: 7px;
      background: #fff;
      box-shadow: 0 8px 30px rgba(32, 33, 36, 0.16);
      color: var(--text);
      font-size: 12px;
      z-index: 10;
    }

    .empty {
      height: 180px;
      display: grid;
      place-items: center;
      color: var(--muted);
    }

    .footnote {
      margin-top: 14px;
      color: var(--muted);
      font-size: 12px;
    }

    @media (max-width: 1100px) {
      .controls { grid-template-columns: 1fr 1fr; }
      .kpis { grid-template-columns: repeat(3, 1fr); }
      .grid { grid-template-columns: 1fr; }
    }

    @media (max-width: 720px) {
      header, main { padding-left: 14px; padding-right: 14px; }
      .controls { grid-template-columns: 1fr; position: static; }
      .kpis { grid-template-columns: 1fr 1fr; }
      th, td { padding: 7px; }
    }
  </style>
</head>
<body>
  <header>
    <h1>GMX BTC Execution Cost Report</h1>
    <div class="subtitle">
      Interactive view over observed GMX v2 BTC fills. Protocol cost is oracle spread + position fee + net position impact + swap cost. Holding fees and delay drift are shown separately where available.
      Generated ${htmlEscape(generatedAt)}.
    </div>
  </header>

  <main>
    <section class="controls">
      <label>Dataset
        <select id="datasetSelect"></select>
      </label>
      <label>Phase
        <select id="phaseSelect">
          <option value="all">All</option>
          <option value="increase">Increases</option>
          <option value="decrease">Decreases</option>
        </select>
      </label>
      <label>Side
        <select id="sideSelect">
          <option value="all">All</option>
          <option value="long">Long</option>
          <option value="short">Short</option>
        </select>
      </label>
      <label>Market
        <select id="marketSelect"></select>
      </label>
      <label>Min Size USD
        <input id="minSizeInput" type="number" min="0" step="1000" value="0">
      </label>
    </section>

    <section class="kpis" id="kpis"></section>

    <section class="grid">
      <section class="panel">
        <div class="panel-head">
          <div class="panel-title">Protocol Cost Distribution</div>
          <div class="panel-note">Shaded band: 12-17 bps</div>
        </div>
        <svg class="chart" id="histogram"></svg>
      </section>

      <section class="panel">
        <div class="panel-head">
          <div class="panel-title">Cost by Phase and Side</div>
          <div class="panel-note">p10 / p25 / median / p75 / p90</div>
        </div>
        <svg class="chart" id="boxplot"></svg>
      </section>

      <section class="panel">
        <div class="panel-head">
          <div class="panel-title">Size vs Protocol Cost</div>
          <div class="panel-note"><span class="pill"><span class="dot increase"></span>increase</span> <span class="pill"><span class="dot decrease"></span>decrease</span></div>
        </div>
        <svg class="chart tall" id="scatter"></svg>
      </section>

      <section class="panel">
        <div class="panel-head">
          <div class="panel-title">Median Cost Components</div>
          <div class="panel-note">Impact can be negative when execution receives a rebate</div>
        </div>
        <svg class="chart tall" id="components"></svg>
      </section>

      <section class="panel full">
        <div class="panel-head">
          <div class="panel-title">Timeline</div>
          <div class="panel-note">Each point is an executed fill</div>
        </div>
        <svg class="chart" id="timeline"></svg>
      </section>

      <section class="panel full">
        <div class="panel-head">
          <div class="panel-title">Largest Protocol Cost Fills</div>
          <div class="panel-note" id="tableNote"></div>
        </div>
        <div class="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Time</th>
                <th>Market</th>
                <th>Phase</th>
                <th>Side</th>
                <th>Size</th>
                <th>Protocol</th>
                <th>Fee</th>
                <th>Impact</th>
                <th>Delay</th>
                <th>Tx</th>
              </tr>
            </thead>
            <tbody id="fillsTable"></tbody>
          </table>
        </div>
      </section>
    </section>

    <p class="footnote">
      Methodology: observed market increases/decreases only. Exact delay drift is not included because the order-created oracle midpoint is not available in these rows. Re-run the report after new data with
      <code>yarn tsx scripts/research/generateGmxExecutionReport.ts</code>.
    </p>
  </main>

  <div class="tooltip" id="tooltip"></div>

  <script>
    const DATASETS = ${dataJson};

    function pickDefaultDatasetId() {
      const largeThirtyDay = DATASETS.find((dataset) => {
        const days = (dataset.summary.to - dataset.summary.from) / 86400;
        return dataset.summary.minSizeUsd >= 1_000_000 && days >= 29;
      });

      if (largeThirtyDay) return largeThirtyDay.id;

      return [...DATASETS].sort((a, b) => {
        const durationDiff = (b.summary.to - b.summary.from) - (a.summary.to - a.summary.from);
        if (durationDiff !== 0) return durationDiff;
        return (b.summary.minSizeUsd || 0) - (a.summary.minSizeUsd || 0);
      })[0]?.id;
    }

    const state = {
      datasetId: pickDefaultDatasetId(),
      phase: "all",
      side: "all",
      market: "all",
      minSize: 0
    };

    const els = {
      datasetSelect: document.getElementById("datasetSelect"),
      phaseSelect: document.getElementById("phaseSelect"),
      sideSelect: document.getElementById("sideSelect"),
      marketSelect: document.getElementById("marketSelect"),
      minSizeInput: document.getElementById("minSizeInput"),
      kpis: document.getElementById("kpis"),
      histogram: document.getElementById("histogram"),
      boxplot: document.getElementById("boxplot"),
      scatter: document.getElementById("scatter"),
      components: document.getElementById("components"),
      timeline: document.getElementById("timeline"),
      fillsTable: document.getElementById("fillsTable"),
      tableNote: document.getElementById("tableNote"),
      tooltip: document.getElementById("tooltip")
    };

    const svgNs = "http://www.w3.org/2000/svg";

    function fmt(value, digits = 2) {
      if (value === null || value === undefined || !Number.isFinite(value)) return "-";
      return Number(value).toLocaleString(undefined, { maximumFractionDigits: digits });
    }

    function fmtBps(value) {
      return value === null || value === undefined || !Number.isFinite(value) ? "-" : fmt(value, 2) + " bps";
    }

    function fmtUsd(value) {
      if (value === null || value === undefined || !Number.isFinite(value)) return "-";
      if (Math.abs(value) >= 1_000_000) return "$" + fmt(value / 1_000_000, 2) + "m";
      if (Math.abs(value) >= 1_000) return "$" + fmt(value / 1_000, 1) + "k";
      return "$" + fmt(value, 0);
    }

    function fmtDate(timestamp) {
      return new Date(timestamp * 1000).toLocaleString(undefined, {
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit"
      });
    }

    function quantile(values, q) {
      const sorted = values.filter(Number.isFinite).sort((a, b) => a - b);
      if (!sorted.length) return null;
      const pos = (sorted.length - 1) * q;
      const base = Math.floor(pos);
      const rest = pos - base;
      return sorted[base + 1] === undefined ? sorted[base] : sorted[base] + rest * (sorted[base + 1] - sorted[base]);
    }

    function median(values) {
      return quantile(values, 0.5);
    }

    function sum(values) {
      return values.reduce((total, value) => total + (Number.isFinite(value) ? value : 0), 0);
    }

    function currentDataset() {
      return DATASETS.find((dataset) => dataset.id === state.datasetId) || DATASETS[0];
    }

    function filteredRows() {
      const dataset = currentDataset();
      if (!dataset) return [];

      return dataset.rows.filter((row) => {
        if (state.phase !== "all" && row.phase !== state.phase) return false;
        if (state.side !== "all" && row.side !== state.side) return false;
        if (state.market !== "all" && row.marketName !== state.market) return false;
        if (row.sizeUsd < state.minSize) return false;
        return row.protocolCostBps !== null && Number.isFinite(row.protocolCostBps);
      });
    }

    function clearSvg(svg) {
      while (svg.firstChild) svg.removeChild(svg.firstChild);
    }

    function svgEl(name, attrs = {}, children = []) {
      const el = document.createElementNS(svgNs, name);
      for (const [key, value] of Object.entries(attrs)) {
        el.setAttribute(key, String(value));
      }
      for (const child of children) el.appendChild(child);
      return el;
    }

    function text(x, y, value, attrs = {}) {
      const node = svgEl("text", { x, y, ...attrs });
      node.textContent = value;
      return node;
    }

    function dims(svg) {
      const rect = svg.getBoundingClientRect();
      return { width: Math.max(360, rect.width), height: Math.max(260, rect.height) };
    }

    function empty(svg, message) {
      clearSvg(svg);
      const { width, height } = dims(svg);
      svg.setAttribute("viewBox", \`0 0 \${width} \${height}\`);
      svg.appendChild(text(width / 2, height / 2, message, { "text-anchor": "middle" }));
    }

    function scale(domainMin, domainMax, rangeMin, rangeMax) {
      if (domainMax === domainMin) {
        return () => (rangeMin + rangeMax) / 2;
      }
      return (value) => rangeMin + ((value - domainMin) / (domainMax - domainMin)) * (rangeMax - rangeMin);
    }

    function niceDomain(values, includeZero = true) {
      let min = Math.min(...values);
      let max = Math.max(...values);
      if (!Number.isFinite(min) || !Number.isFinite(max)) return [0, 1];
      if (includeZero) {
        min = Math.min(min, 0);
        max = Math.max(max, 0);
      }
      if (min === max) {
        min -= 1;
        max += 1;
      }
      const pad = (max - min) * 0.08;
      return [min - pad, max + pad];
    }

    function axis(svg, plot, xDomain, yDomain, xTicks = 5, yTicks = 5, xLabel = "", yLabel = "") {
      const x = scale(xDomain[0], xDomain[1], plot.left, plot.right);
      const y = scale(yDomain[0], yDomain[1], plot.bottom, plot.top);

      if (yTicks > 0) {
        for (let i = 0; i <= yTicks; i++) {
          const value = yDomain[0] + ((yDomain[1] - yDomain[0]) * i) / yTicks;
          const py = y(value);
          svg.appendChild(svgEl("line", { x1: plot.left, y1: py, x2: plot.right, y2: py, class: "gridline" }));
          svg.appendChild(text(plot.left - 8, py + 4, fmt(value, 1), { "text-anchor": "end" }));
        }
      }

      if (xTicks > 0) {
        for (let i = 0; i <= xTicks; i++) {
          const value = xDomain[0] + ((xDomain[1] - xDomain[0]) * i) / xTicks;
          const px = x(value);
          svg.appendChild(svgEl("line", { x1: px, y1: plot.top, x2: px, y2: plot.bottom, class: "gridline" }));
          svg.appendChild(text(px, plot.bottom + 18, fmt(value, 1), { "text-anchor": "middle" }));
        }
      }

      svg.appendChild(svgEl("line", { x1: plot.left, y1: plot.bottom, x2: plot.right, y2: plot.bottom, class: "axis" }));
      svg.appendChild(svgEl("line", { x1: plot.left, y1: plot.top, x2: plot.left, y2: plot.bottom, class: "axis" }));
      if (xLabel) svg.appendChild(text((plot.left + plot.right) / 2, plot.bottom + 38, xLabel, { "text-anchor": "middle" }));
      if (yLabel) svg.appendChild(text(18, (plot.top + plot.bottom) / 2, yLabel, { transform: \`rotate(-90 18 \${(plot.top + plot.bottom) / 2})\`, "text-anchor": "middle" }));
    }

    function showTooltip(event, html) {
      els.tooltip.innerHTML = html;
      els.tooltip.style.display = "block";
      const width = els.tooltip.offsetWidth || 260;
      const height = els.tooltip.offsetHeight || 120;
      let left = event.clientX + 14;
      let top = event.clientY + 14;
      if (left + width > window.innerWidth - 12) left = event.clientX - width - 14;
      if (top + height > window.innerHeight - 12) top = event.clientY - height - 14;
      els.tooltip.style.left = left + "px";
      els.tooltip.style.top = top + "px";
    }

    function hideTooltip() {
      els.tooltip.style.display = "none";
    }

    function rowTooltip(row) {
      return \`
        <strong>\${row.phase} \${row.side}</strong><br>
        \${row.marketName}<br>
        Size: \${fmtUsd(row.sizeUsd)}<br>
        Protocol: \${fmtBps(row.protocolCostBps)}<br>
        Fee: \${fmtBps(row.positionFeeBps)} · Impact: \${fmtBps(row.netImpactCostBps)}<br>
        Delay: \${row.delaySeconds ?? "-"}s<br>
        \${fmtDate(row.timestamp)}
      \`;
    }

    function populateSelectors() {
      els.datasetSelect.innerHTML = DATASETS.map((dataset) => \`<option value="\${dataset.id}">\${dataset.label}</option>\`).join("");
      els.datasetSelect.value = state.datasetId;
      updateMarketSelector();
    }

    function updateMarketSelector() {
      const dataset = currentDataset();
      const markets = Array.from(new Set((dataset?.rows || []).map((row) => row.marketName))).sort();
      const previous = state.market;
      els.marketSelect.innerHTML = \`<option value="all">All markets</option>\` + markets.map((market) => \`<option value="\${market}">\${market}</option>\`).join("");
      state.market = markets.includes(previous) ? previous : "all";
      els.marketSelect.value = state.market;
    }

    function renderKpis(rows) {
      const costs = rows.map((row) => row.protocolCostBps).filter(Number.isFinite);
      const delays = rows.map((row) => row.delaySeconds).filter(Number.isFinite);
      const positionFees = rows.map((row) => row.positionFeeBps).filter(Number.isFinite);
      const impacts = rows.map((row) => row.netImpactCostBps).filter(Number.isFinite);
      const kpis = [
        { label: "Fills", value: fmt(rows.length, 0), hint: "after filters" },
        { label: "Volume", value: fmtUsd(sum(rows.map((row) => row.sizeUsd))), hint: "matched notional" },
        { label: "Median Protocol", value: fmtBps(median(costs)), hint: "spread + fee + impact" },
        { label: "P90 Protocol", value: fmtBps(quantile(costs, 0.9)), hint: "right-tail cost" },
        { label: "Median Fee", value: fmtBps(median(positionFees)), hint: "position fee only" },
        { label: "Median Impact", value: fmtBps(median(impacts)), hint: "negative values are rebates" },
        { label: "P75 Delay", value: fmt(quantile(delays, 0.75), 1) + "s", hint: "created to executed" },
        { label: "Median Size", value: fmtUsd(median(rows.map((row) => row.sizeUsd))), hint: "per fill" }
      ];

      els.kpis.innerHTML = kpis.map((kpi) => \`
        <div class="kpi">
          <div class="label">\${kpi.label}</div>
          <div class="value">\${kpi.value}</div>
          <div class="hint">\${kpi.hint}</div>
        </div>
      \`).join("");
    }

    function renderHistogram(rows) {
      const svg = els.histogram;
      const values = rows.map((row) => row.protocolCostBps).filter(Number.isFinite);
      if (values.length < 2) return empty(svg, "No fills after filters");

      clearSvg(svg);
      const { width, height } = dims(svg);
      svg.setAttribute("viewBox", \`0 0 \${width} \${height}\`);
      const plot = { left: 58, right: width - 18, top: 24, bottom: height - 52 };
      const [min, max] = niceDomain(values, true);
      const binCount = Math.min(32, Math.max(8, Math.round(Math.sqrt(values.length) * 2)));
      const bins = Array.from({ length: binCount }, (_, index) => ({
        from: min + ((max - min) * index) / binCount,
        to: min + ((max - min) * (index + 1)) / binCount,
        count: 0
      }));
      for (const value of values) {
        const index = Math.max(0, Math.min(binCount - 1, Math.floor(((value - min) / (max - min)) * binCount)));
        bins[index].count++;
      }

      const x = scale(min, max, plot.left, plot.right);
      const y = scale(0, Math.max(...bins.map((bin) => bin.count)), plot.bottom, plot.top);

      const bandX1 = x(12);
      const bandX2 = x(17);
      svg.appendChild(svgEl("rect", { x: Math.min(bandX1, bandX2), y: plot.top, width: Math.abs(bandX2 - bandX1), height: plot.bottom - plot.top, class: "band" }));
      axis(svg, plot, [min, max], [0, Math.max(...bins.map((bin) => bin.count))], 6, 4, "protocol cost bps", "fills");

      for (const bin of bins) {
        const x1 = x(bin.from);
        const x2 = x(bin.to);
        const barHeight = plot.bottom - y(bin.count);
        const rect = svgEl("rect", {
          x: x1 + 1,
          y: y(bin.count),
          width: Math.max(1, x2 - x1 - 2),
          height: Math.max(0, barHeight),
          class: bin.to < 0 ? "bar-negative" : "bar"
        });
        rect.addEventListener("mousemove", (event) => showTooltip(event, \`\${fmt(bin.from, 2)} to \${fmt(bin.to, 2)} bps<br><strong>\${bin.count}</strong> fills\`));
        rect.addEventListener("mouseleave", hideTooltip);
        svg.appendChild(rect);
      }
    }

    function groupRows(rows, groups) {
      return groups.map((group) => ({
        label: group.label,
        rows: rows.filter(group.test)
      })).filter((group) => group.rows.length);
    }

    function renderBoxplot(rows) {
      const svg = els.boxplot;
      const groups = groupRows(rows, [
        { label: "Increase Long", test: (row) => row.phase === "increase" && row.side === "long" },
        { label: "Increase Short", test: (row) => row.phase === "increase" && row.side === "short" },
        { label: "Decrease Long", test: (row) => row.phase === "decrease" && row.side === "long" },
        { label: "Decrease Short", test: (row) => row.phase === "decrease" && row.side === "short" }
      ]).map((group) => {
        const values = group.rows.map((row) => row.protocolCostBps).filter(Number.isFinite);
        return {
          label: group.label,
          count: values.length,
          p10: quantile(values, 0.1),
          p25: quantile(values, 0.25),
          p50: quantile(values, 0.5),
          p75: quantile(values, 0.75),
          p90: quantile(values, 0.9)
        };
      });

      if (!groups.length) return empty(svg, "No grouped fills after filters");

      clearSvg(svg);
      const { width, height } = dims(svg);
      svg.setAttribute("viewBox", \`0 0 \${width} \${height}\`);
      const plot = { left: 116, right: width - 24, top: 24, bottom: height - 46 };
      const domain = niceDomain(groups.flatMap((group) => [group.p10, group.p90]).filter(Number.isFinite), true);
      const x = scale(domain[0], domain[1], plot.left, plot.right);

      axis(svg, plot, domain, [0, groups.length], 6, 0, "protocol cost bps", "");

      groups.forEach((group, index) => {
        const y = plot.top + ((plot.bottom - plot.top) * (index + 0.55)) / groups.length;
        svg.appendChild(text(plot.left - 10, y + 4, group.label, { "text-anchor": "end" }));
        svg.appendChild(text(plot.right + 4, y + 4, \`n=\${group.count}\`, { "text-anchor": "start" }));

        const whisker = svgEl("line", { x1: x(group.p10), y1: y, x2: x(group.p90), y2: y, stroke: "#5b6470", "stroke-width": 2 });
        const box = svgEl("rect", {
          x: x(group.p25),
          y: y - 12,
          width: Math.max(1, x(group.p75) - x(group.p25)),
          height: 24,
          rx: 4,
          fill: "rgba(37, 99, 235, 0.20)",
          stroke: "#2563eb"
        });
        const medianLine = svgEl("line", { x1: x(group.p50), y1: y - 15, x2: x(group.p50), y2: y + 15, stroke: "#bf3b2b", "stroke-width": 3 });
        const hit = svgEl("rect", { x: plot.left, y: y - 18, width: plot.right - plot.left, height: 36, fill: "transparent" });
        hit.addEventListener("mousemove", (event) => showTooltip(event, \`
          <strong>\${group.label}</strong><br>
          p10: \${fmtBps(group.p10)} · p25: \${fmtBps(group.p25)}<br>
          median: \${fmtBps(group.p50)}<br>
          p75: \${fmtBps(group.p75)} · p90: \${fmtBps(group.p90)}
        \`));
        hit.addEventListener("mouseleave", hideTooltip);
        svg.appendChild(whisker);
        svg.appendChild(box);
        svg.appendChild(medianLine);
        svg.appendChild(hit);
      });
    }

    function renderScatter(rows) {
      const svg = els.scatter;
      if (!rows.length) return empty(svg, "No fills after filters");

      clearSvg(svg);
      const { width, height } = dims(svg);
      svg.setAttribute("viewBox", \`0 0 \${width} \${height}\`);
      const plot = { left: 64, right: width - 20, top: 24, bottom: height - 54 };
      const xValues = rows.map((row) => Math.log10(Math.max(1, row.sizeUsd)));
      const yValues = rows.map((row) => row.protocolCostBps).filter(Number.isFinite);
      const xDomain = niceDomain(xValues, false);
      const yDomain = niceDomain(yValues, true);
      const x = scale(xDomain[0], xDomain[1], plot.left, plot.right);
      const y = scale(yDomain[0], yDomain[1], plot.bottom, plot.top);

      axis(svg, plot, xDomain, yDomain, 5, 5, "size, log10(USD)", "protocol cost bps");

      for (const row of rows) {
        const point = svgEl("circle", {
          cx: x(Math.log10(Math.max(1, row.sizeUsd))),
          cy: y(row.protocolCostBps),
          r: Math.max(3.2, Math.min(8, Math.sqrt(row.sizeUsd) / 700)),
          class: row.phase,
          opacity: row.phase === "increase" ? 0.72 : 0.78
        });
        point.addEventListener("mousemove", (event) => showTooltip(event, rowTooltip(row)));
        point.addEventListener("mouseleave", hideTooltip);
        svg.appendChild(point);
      }
    }

    function renderComponents(rows) {
      const svg = els.components;
      const groups = groupRows(rows, [
        { label: "All", test: () => true },
        { label: "Increase", test: (row) => row.phase === "increase" },
        { label: "Decrease", test: (row) => row.phase === "decrease" },
        { label: "Long", test: (row) => row.side === "long" },
        { label: "Short", test: (row) => row.side === "short" }
      ]).map((group) => ({
        label: group.label,
        fee: median(group.rows.map((row) => row.positionFeeBps).filter(Number.isFinite)) ?? 0,
        impact: median(group.rows.map((row) => row.netImpactCostBps).filter(Number.isFinite)) ?? 0,
        spread: median(group.rows.map((row) => row.oracleSpreadBps).filter(Number.isFinite)) ?? 0,
        holding: median(group.rows.map((row) => row.holdingFeeBps).filter(Number.isFinite)) ?? 0
      }));

      if (!groups.length) return empty(svg, "No fills after filters");

      clearSvg(svg);
      const { width, height } = dims(svg);
      svg.setAttribute("viewBox", \`0 0 \${width} \${height}\`);
      const plot = { left: 68, right: width - 22, top: 34, bottom: height - 62 };
      const values = groups.flatMap((group) => [group.fee, group.impact, group.spread, group.holding]);
      const domain = niceDomain(values, true);
      const y = scale(domain[0], domain[1], plot.bottom, plot.top);
      const zeroY = y(0);
      const groupWidth = (plot.right - plot.left) / groups.length;
      const colors = { fee: "#2563eb", impact: "#bf3b2b", spread: "#c68021", holding: "#0f8b5f" };
      const labels = ["fee", "impact", "spread", "holding"];

      axis(svg, plot, [0, groups.length], domain, 0, 5, "", "median bps");
      svg.appendChild(svgEl("line", { x1: plot.left, y1: zeroY, x2: plot.right, y2: zeroY, stroke: "#202124", "stroke-width": 1 }));

      groups.forEach((group, groupIndex) => {
        const barWidth = Math.min(18, groupWidth / 6);
        const startX = plot.left + groupIndex * groupWidth + groupWidth / 2 - (labels.length * barWidth) / 2;
        labels.forEach((label, labelIndex) => {
          const value = group[label];
          const yValue = y(value);
          const rect = svgEl("rect", {
            x: startX + labelIndex * barWidth,
            y: Math.min(zeroY, yValue),
            width: barWidth - 2,
            height: Math.max(1, Math.abs(zeroY - yValue)),
            fill: colors[label],
            opacity: 0.82
          });
          rect.addEventListener("mousemove", (event) => showTooltip(event, \`<strong>\${group.label}</strong><br>\${label}: \${fmtBps(value)}\`));
          rect.addEventListener("mouseleave", hideTooltip);
          svg.appendChild(rect);
        });
        svg.appendChild(text(plot.left + groupIndex * groupWidth + groupWidth / 2, plot.bottom + 18, group.label, { "text-anchor": "middle" }));
      });

      labels.forEach((label, index) => {
        const x = plot.left + index * 90;
        svg.appendChild(svgEl("rect", { x, y: 12, width: 10, height: 10, fill: colors[label], opacity: 0.82 }));
        svg.appendChild(text(x + 15, 21, label));
      });
    }

    function renderTimeline(rows) {
      const svg = els.timeline;
      if (!rows.length) return empty(svg, "No fills after filters");

      clearSvg(svg);
      const { width, height } = dims(svg);
      svg.setAttribute("viewBox", \`0 0 \${width} \${height}\`);
      const plot = { left: 64, right: width - 20, top: 24, bottom: height - 52 };
      const xValues = rows.map((row) => row.timestamp);
      const yValues = rows.map((row) => row.protocolCostBps).filter(Number.isFinite);
      const xDomain = [Math.min(...xValues), Math.max(...xValues)];
      const yDomain = niceDomain(yValues, true);
      const x = scale(xDomain[0], xDomain[1], plot.left, plot.right);
      const y = scale(yDomain[0], yDomain[1], plot.bottom, plot.top);

      axis(svg, plot, [0, 1], yDomain, 0, 5, "", "protocol cost bps");

      for (let i = 0; i <= 5; i++) {
        const timestamp = xDomain[0] + ((xDomain[1] - xDomain[0]) * i) / 5;
        const px = x(timestamp);
        svg.appendChild(svgEl("line", { x1: px, y1: plot.top, x2: px, y2: plot.bottom, class: "gridline" }));
        svg.appendChild(text(px, plot.bottom + 18, fmtDate(timestamp), { "text-anchor": "middle" }));
      }

      for (const row of rows) {
        const point = svgEl("circle", {
          cx: x(row.timestamp),
          cy: y(row.protocolCostBps),
          r: 4,
          class: row.phase,
          opacity: 0.74
        });
        point.addEventListener("mousemove", (event) => showTooltip(event, rowTooltip(row)));
        point.addEventListener("mouseleave", hideTooltip);
        svg.appendChild(point);
      }
    }

    function renderTable(rows) {
      const visible = [...rows].sort((a, b) => (b.protocolCostBps ?? -Infinity) - (a.protocolCostBps ?? -Infinity)).slice(0, 80);
      els.tableNote.textContent = \`\${visible.length} of \${rows.length} shown\`;
      els.fillsTable.innerHTML = visible.map((row) => \`
        <tr>
          <td>\${fmtDate(row.timestamp)}</td>
          <td>\${row.marketName}</td>
          <td><span class="pill"><span class="dot \${row.phase}"></span>\${row.phase}</span></td>
          <td>\${row.side}</td>
          <td>\${fmtUsd(row.sizeUsd)}</td>
          <td>\${fmtBps(row.protocolCostBps)}</td>
          <td>\${fmtBps(row.positionFeeBps)}</td>
          <td>\${fmtBps(row.netImpactCostBps)}</td>
          <td>\${row.delaySeconds ?? "-"}s</td>
          <td><a target="_blank" rel="noreferrer" href="https://arbiscan.io/tx/\${row.transactionHash}">open</a></td>
        </tr>
      \`).join("");
    }

    function render() {
      const rows = filteredRows();
      renderKpis(rows);
      renderHistogram(rows);
      renderBoxplot(rows);
      renderScatter(rows);
      renderComponents(rows);
      renderTimeline(rows);
      renderTable(rows);
    }

    populateSelectors();

    els.datasetSelect.addEventListener("change", () => {
      state.datasetId = els.datasetSelect.value;
      updateMarketSelector();
      render();
    });
    els.phaseSelect.addEventListener("change", () => {
      state.phase = els.phaseSelect.value;
      render();
    });
    els.sideSelect.addEventListener("change", () => {
      state.side = els.sideSelect.value;
      render();
    });
    els.marketSelect.addEventListener("change", () => {
      state.market = els.marketSelect.value;
      render();
    });
    els.minSizeInput.addEventListener("input", () => {
      state.minSize = Number(els.minSizeInput.value) || 0;
      render();
    });
    window.addEventListener("resize", render);

    render();
  </script>
</body>
</html>`;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const datasets = await loadDatasets(args.inputDir);

  if (!datasets.length) {
    throw new Error(`No datasets found in ${args.inputDir}`);
  }

  await writeFile(args.output, buildHtml(datasets));
  console.log(`Wrote ${args.output}`);
  console.log(`Datasets: ${datasets.length}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

type ChainName = "arbitrum" | "avalanche" | "botanix";

type ChainConfig = {
  chainId: number;
  oracleUrl: string;
  subsquidUrl: string;
};

type MarketInfo = {
  name: string;
  marketToken: string;
  indexToken: string;
  longToken: string;
  shortToken: string;
  isListed?: boolean;
};

type TokenInfo = {
  symbol: string;
  address: string;
  decimals: number;
};

type RawTradeAction = {
  id: string;
  eventName: "OrderCreated" | "OrderExecuted" | string;
  account: string;
  marketAddress: string;
  initialCollateralTokenAddress: string | null;
  sizeDeltaUsd: string | null;
  sizeDeltaInTokens: string | null;
  executionPrice: string | null;
  priceImpactUsd: string | null;
  priceImpactDiffUsd: string | null;
  swapFeeUsd: string | null;
  swapImpactUsd: string | null;
  positionFeeAmount: string | null;
  borrowingFeeAmount: string | null;
  fundingFeeAmount: string | null;
  liquidationFeeAmount: string | null;
  pnlUsd: string | null;
  basePnlUsd: string | null;
  collateralTokenPriceMax: string | null;
  collateralTokenPriceMin: string | null;
  indexTokenPriceMin: string | null;
  indexTokenPriceMax: string | null;
  orderType: number;
  orderKey: string;
  isLong: boolean | null;
  twapGroupId: string | null;
  numberOfParts: number | null;
  totalImpactUsd: string | null;
  proportionalPendingImpactUsd: string | null;
  timestamp: number;
  transactionHash: string;
};

type ResultRow = {
  chain: ChainName;
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
  swapFeeUsd: number;
  swapImpactUsd: number;
  swapCostBps: number;
  protocolCostBps: number | null;
  holdingFeeUsd: number;
  holdingFeeBps: number;
  priceImpactUsd: number;
  proportionalPendingImpactUsd: number;
  priceImpactDiffUsd: number;
  isTwap: boolean;
};

type Args = {
  chain: ChainName;
  indexSymbol: string;
  days: number;
  from?: number;
  to?: number;
  pageSize: number;
  maxActions: number;
  minSizeUsd: number;
  markets: string[];
  outDir: string;
};

const CHAINS: Record<ChainName, ChainConfig> = {
  arbitrum: {
    chainId: 42161,
    oracleUrl: "https://arbitrum-api.gmxinfra.io",
    subsquidUrl: "https://gmx.squids.live/gmx-synthetics-arbitrum:prod/api/graphql",
  },
  avalanche: {
    chainId: 43114,
    oracleUrl: "https://avalanche-api.gmxinfra.io",
    subsquidUrl: "https://gmx.squids.live/gmx-synthetics-avalanche:prod/api/graphql",
  },
  botanix: {
    chainId: 3637,
    oracleUrl: "https://botanix-api.gmxinfra.io",
    subsquidUrl: "https://gmx.squids.live/gmx-synthetics-botanix:prod/api/graphql",
  },
};

const ORDER_TYPE_NAMES: Record<number, string> = {
  2: "MarketIncrease",
  4: "MarketDecrease",
};

function parseArgs(argv: string[]): Args {
  const args: Args = {
    chain: "arbitrum",
    indexSymbol: "BTC",
    days: 1,
    pageSize: 200,
    maxActions: 20000,
    minSizeUsd: 0,
    markets: [],
    outDir: ".context/gmx-execution-costs",
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

    if (arg === "--chain") {
      args.chain = readValue() as ChainName;
    } else if (arg === "--index-symbol") {
      args.indexSymbol = readValue().toUpperCase();
    } else if (arg === "--days") {
      args.days = Number(readValue());
    } else if (arg === "--from") {
      args.from = parseTime(readValue());
    } else if (arg === "--to") {
      args.to = parseTime(readValue());
    } else if (arg === "--page-size") {
      args.pageSize = Number(readValue());
    } else if (arg === "--max-actions") {
      args.maxActions = Number(readValue());
    } else if (arg === "--min-size-usd") {
      args.minSizeUsd = Number(readValue());
    } else if (arg === "--market") {
      args.markets.push(readValue().toLowerCase());
    } else if (arg === "--out-dir") {
      args.outDir = readValue();
    } else if (arg === "--help" || arg === "-h") {
      printHelp();
      process.exit(0);
    } else {
      throw new Error(`Unknown argument: ${arg}`);
    }
  }

  if (!CHAINS[args.chain]) {
    throw new Error(`Unsupported chain: ${args.chain}`);
  }

  return args;
}

function printHelp() {
  console.log(`Usage:
  yarn tsx scripts/research/gmxExecutionCosts.ts [options]

Options:
  --chain arbitrum|avalanche|botanix  Default: arbitrum
  --index-symbol <symbol>              Index token symbol to include. Default: BTC
  --days <number>                     Lookback window if --from is omitted. Default: 1
  --from <unix|date>                  Start timestamp, e.g. 2026-05-23T00:00:00Z
  --to <unix|date>                    End timestamp. Default: now
  --market <address-or-name-fragment> Filter selected index markets. Can be repeated
  --min-size-usd <number>             Drop smaller executions from metrics
  --page-size <number>                GraphQL page size. Default: 200
  --max-actions <number>              Safety cap for raw actions. Default: 20000
  --out-dir <path>                    Output directory. Default: .context/gmx-execution-costs
`);
}

function parseTime(value: string) {
  if (/^\d+$/.test(value)) {
    const parsed = Number(value);
    return parsed > 10_000_000_000 ? Math.floor(parsed / 1000) : parsed;
  }

  const ms = Date.parse(value);
  if (!Number.isFinite(ms)) {
    throw new Error(`Invalid timestamp: ${value}`);
  }
  return Math.floor(ms / 1000);
}

async function fetchJson<T>(url: string): Promise<T> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`HTTP ${response.status} for ${url}`);
  }
  return response.json() as Promise<T>;
}

async function fetchGraphql<T>(endpoint: string, query: string): Promise<T> {
  const response = await fetch(endpoint, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ query }),
  });

  if (!response.ok) {
    throw new Error(`GraphQL HTTP ${response.status}: ${await response.text()}`);
  }

  const json = (await response.json()) as { data?: T; errors?: { message: string }[] };
  if (json.errors?.length) {
    throw new Error(`GraphQL error: ${json.errors.map((error) => error.message).join("; ")}`);
  }

  if (!json.data) {
    throw new Error("GraphQL response missing data");
  }

  return json.data;
}

function normalizeAddress(value: string) {
  return value.toLowerCase();
}

function quote(value: string) {
  return `"${value.replace(/"/g, '\\"')}"`;
}

function graphQlStringList(values: string[]) {
  return `[${values.map(quote).join(", ")}]`;
}

function usd30(value: string | null | undefined) {
  if (!value) {
    return 0;
  }
  return Number(value) / 1e30;
}

function usdToRaw30(value: number) {
  return (BigInt(Math.trunc(value)) * 10n ** 30n).toString();
}

function amountToUsd(amount: string | null | undefined, priceMin: string | null) {
  if (!amount || !priceMin) {
    return 0;
  }

  return (Number(amount) * Number(priceMin)) / 1e30;
}

function rawPriceToUsd(raw: string | null | undefined, tokenDecimals: number | undefined) {
  if (!raw || tokenDecimals === undefined) {
    return null;
  }
  return Number(raw) / 10 ** (30 - tokenDecimals);
}

function bps(valueUsd: number, sizeUsd: number) {
  if (!Number.isFinite(valueUsd) || !Number.isFinite(sizeUsd) || sizeUsd === 0) {
    return 0;
  }
  return (valueUsd / sizeUsd) * 10_000;
}

function computeExecutionVsMarkBps(action: RawTradeAction, indexMidRaw: number | null) {
  if (!action.executionPrice || indexMidRaw === null || indexMidRaw === 0 || action.isLong === null) {
    return null;
  }

  const executionRaw = Number(action.executionPrice);
  const isIncrease = action.orderType === 2;
  const buyLike = (isIncrease && action.isLong) || (!isIncrease && !action.isLong);
  const signedDiff = ((executionRaw - indexMidRaw) / indexMidRaw) * 10_000;

  return buyLike ? signedDiff : -signedDiff;
}

function computeOracleSpreadBps(action: RawTradeAction, indexMinRaw: number | null, indexMaxRaw: number | null) {
  if (indexMinRaw === null || indexMaxRaw === null || action.isLong === null) {
    return null;
  }

  const indexMidRaw = (indexMinRaw + indexMaxRaw) / 2;
  if (indexMidRaw === 0) {
    return null;
  }

  const isIncrease = action.orderType === 2;
  const sidePriceRaw = (isIncrease && action.isLong) || (!isIncrease && !action.isLong) ? indexMaxRaw : indexMinRaw;

  return Math.abs((sidePriceRaw - indexMidRaw) / indexMidRaw) * 10_000;
}

function quantile(values: number[], q: number) {
  const sorted = values.filter(Number.isFinite).sort((a, b) => a - b);
  if (!sorted.length) {
    return null;
  }

  const pos = (sorted.length - 1) * q;
  const base = Math.floor(pos);
  const rest = pos - base;
  const next = sorted[base + 1];

  if (next === undefined) {
    return sorted[base];
  }

  return sorted[base] + rest * (next - sorted[base]);
}

function summarizeRows(rows: ResultRow[]) {
  const groups = new Map<string, ResultRow[]>();

  for (const row of rows) {
    const keys = ["all", row.marketName, row.phase, `${row.phase}:${row.side}`];
    for (const key of keys) {
      groups.set(key, [...(groups.get(key) ?? []), row]);
    }
  }

  return [...groups.entries()]
    .map(([group, groupRows]) => {
      const metric = (fn: (row: ResultRow) => number | null) =>
        groupRows.map(fn).filter((value): value is number => value !== null && Number.isFinite(value));

      return {
        group,
        count: groupRows.length,
        volumeUsd: round(
          groupRows.reduce((sum, row) => sum + row.sizeUsd, 0),
          2
        ),
        medianSizeUsd: roundNullable(
          quantile(
            metric((row) => row.sizeUsd),
            0.5
          ),
          2
        ),
        medianDelaySeconds: roundNullable(
          quantile(
            metric((row) => row.delaySeconds),
            0.5
          ),
          2
        ),
        p75DelaySeconds: roundNullable(
          quantile(
            metric((row) => row.delaySeconds),
            0.75
          ),
          2
        ),
        medianOracleSpreadBps: roundNullable(
          quantile(
            metric((row) => row.oracleSpreadBps),
            0.5
          ),
          4
        ),
        medianPositionFeeBps: roundNullable(
          quantile(
            metric((row) => row.positionFeeBps),
            0.5
          ),
          4
        ),
        medianNetImpactCostBps: roundNullable(
          quantile(
            metric((row) => row.netImpactCostBps),
            0.5
          ),
          4
        ),
        medianSwapCostBps: roundNullable(
          quantile(
            metric((row) => row.swapCostBps),
            0.5
          ),
          4
        ),
        p25ProtocolCostBps: roundNullable(
          quantile(
            metric((row) => row.protocolCostBps),
            0.25
          ),
          4
        ),
        medianProtocolCostBps: roundNullable(
          quantile(
            metric((row) => row.protocolCostBps),
            0.5
          ),
          4
        ),
        p75ProtocolCostBps: roundNullable(
          quantile(
            metric((row) => row.protocolCostBps),
            0.75
          ),
          4
        ),
        p90ProtocolCostBps: roundNullable(
          quantile(
            metric((row) => row.protocolCostBps),
            0.9
          ),
          4
        ),
      };
    })
    .sort((a, b) => {
      if (a.group === "all") {
        return -1;
      }
      if (b.group === "all") {
        return 1;
      }
      return b.count - a.count;
    });
}

function round(value: number, decimals: number) {
  const scale = 10 ** decimals;
  return Math.round(value * scale) / scale;
}

function roundNullable(value: number | null, decimals: number) {
  return value === null ? null : round(value, decimals);
}

function csvEscape(value: unknown) {
  if (value === null || value === undefined) {
    return "";
  }

  const text = String(value);
  if (/[",\n]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`;
  }
  return text;
}

function toCsv(rows: ResultRow[]) {
  const headers: (keyof ResultRow)[] = [
    "chain",
    "marketName",
    "marketAddress",
    "orderKey",
    "orderType",
    "side",
    "phase",
    "timestamp",
    "createdTimestamp",
    "delaySeconds",
    "account",
    "transactionHash",
    "sizeUsd",
    "markPriceUsd",
    "executionPriceUsd",
    "executionVsMarkBps",
    "oracleSpreadBps",
    "positionFeeUsd",
    "positionFeeBps",
    "netImpactUsd",
    "netImpactCostBps",
    "swapFeeUsd",
    "swapImpactUsd",
    "swapCostBps",
    "protocolCostBps",
    "holdingFeeUsd",
    "holdingFeeBps",
    "priceImpactUsd",
    "proportionalPendingImpactUsd",
    "priceImpactDiffUsd",
    "isTwap",
  ];

  const lines = [headers.join(",")];
  for (const row of rows) {
    lines.push(headers.map((header) => csvEscape(row[header])).join(","));
  }
  return `${lines.join("\n")}\n`;
}

function buildRows({
  actions,
  chain,
  marketsByAddress,
  tokensByAddress,
  minSizeUsd,
}: {
  actions: RawTradeAction[];
  chain: ChainName;
  marketsByAddress: Map<string, MarketInfo>;
  tokensByAddress: Map<string, TokenInfo>;
  minSizeUsd: number;
}) {
  const byOrderKey = new Map<string, RawTradeAction[]>();

  for (const action of actions) {
    byOrderKey.set(action.orderKey, [...(byOrderKey.get(action.orderKey) ?? []), action]);
  }

  const rows: ResultRow[] = [];

  for (const actionsForOrder of byOrderKey.values()) {
    const created = actionsForOrder
      .filter((action) => action.eventName === "OrderCreated")
      .sort((a, b) => a.timestamp - b.timestamp)[0];

    const executedActions = actionsForOrder.filter((action) => action.eventName === "OrderExecuted");

    for (const executed of executedActions) {
      if (executed.orderType !== 2 && executed.orderType !== 4) {
        continue;
      }

      const market = marketsByAddress.get(normalizeAddress(executed.marketAddress));
      const indexToken = market ? tokensByAddress.get(normalizeAddress(market.indexToken)) : undefined;
      const sizeUsd = usd30(executed.sizeDeltaUsd);

      if (sizeUsd < minSizeUsd) {
        continue;
      }

      const indexMinRaw = executed.indexTokenPriceMin ? Number(executed.indexTokenPriceMin) : null;
      const indexMaxRaw = executed.indexTokenPriceMax ? Number(executed.indexTokenPriceMax) : null;
      const indexMidRaw = indexMinRaw !== null && indexMaxRaw !== null ? (indexMinRaw + indexMaxRaw) / 2 : null;
      const markPriceUsd =
        indexMidRaw === null || indexToken === undefined ? null : indexMidRaw / 10 ** (30 - indexToken.decimals);
      const executionPriceUsd = rawPriceToUsd(executed.executionPrice, indexToken?.decimals);

      const positionFeeUsd = amountToUsd(executed.positionFeeAmount, executed.collateralTokenPriceMin);
      const borrowingFeeUsd = amountToUsd(executed.borrowingFeeAmount, executed.collateralTokenPriceMin);
      const fundingFeeUsd = amountToUsd(executed.fundingFeeAmount, executed.collateralTokenPriceMin);
      const liquidationFeeUsd = amountToUsd(executed.liquidationFeeAmount, executed.collateralTokenPriceMin);

      const priceImpactUsd = usd30(executed.priceImpactUsd);
      const proportionalPendingImpactUsd = usd30(executed.proportionalPendingImpactUsd);
      const priceImpactDiffUsd = usd30(executed.priceImpactDiffUsd);
      const netImpactUsd = executed.totalImpactUsd === null ? priceImpactUsd : usd30(executed.totalImpactUsd);
      const netImpactCostBps = bps(-netImpactUsd, sizeUsd);
      const swapFeeUsd = usd30(executed.swapFeeUsd);
      const swapImpactUsd = usd30(executed.swapImpactUsd);
      const swapCostBps = bps(swapFeeUsd - swapImpactUsd, sizeUsd);
      const oracleSpreadBps = computeOracleSpreadBps(executed, indexMinRaw, indexMaxRaw);
      const positionFeeBps = bps(positionFeeUsd, sizeUsd);
      const protocolCostBps =
        oracleSpreadBps === null ? null : oracleSpreadBps + positionFeeBps + netImpactCostBps + swapCostBps;
      const holdingFeeUsd = borrowingFeeUsd + fundingFeeUsd + liquidationFeeUsd;

      rows.push({
        chain,
        marketName: market?.name ?? executed.marketAddress,
        marketAddress: executed.marketAddress,
        orderKey: executed.orderKey,
        orderType: ORDER_TYPE_NAMES[executed.orderType] ?? String(executed.orderType),
        side: executed.isLong ? "long" : "short",
        phase: executed.orderType === 2 ? "increase" : "decrease",
        timestamp: executed.timestamp,
        createdTimestamp: created?.timestamp ?? null,
        delaySeconds: created ? executed.timestamp - created.timestamp : null,
        account: executed.account,
        transactionHash: executed.transactionHash,
        sizeUsd,
        markPriceUsd,
        executionPriceUsd,
        executionVsMarkBps: computeExecutionVsMarkBps(executed, indexMidRaw),
        oracleSpreadBps,
        positionFeeUsd,
        positionFeeBps,
        netImpactUsd,
        netImpactCostBps,
        swapFeeUsd,
        swapImpactUsd,
        swapCostBps,
        protocolCostBps,
        holdingFeeUsd,
        holdingFeeBps: bps(holdingFeeUsd, sizeUsd),
        priceImpactUsd,
        proportionalPendingImpactUsd,
        priceImpactDiffUsd,
        isTwap: Boolean(executed.twapGroupId),
      });
    }
  }

  return rows.sort((a, b) => a.timestamp - b.timestamp);
}

async function fetchIndexMarkets(chainConfig: ChainConfig, indexSymbol: string, requestedMarkets: string[]) {
  const data = await fetchJson<{ markets: MarketInfo[] }>(`${chainConfig.oracleUrl}/markets/info`);
  const markets = data.markets.filter(
    (market) => market.name.startsWith(`${indexSymbol}/USD`) && market.isListed !== false
  );

  if (!requestedMarkets.length) {
    return markets;
  }

  return markets.filter((market) =>
    requestedMarkets.some((requested) => {
      const lowerName = market.name.toLowerCase();
      const lowerAddress = normalizeAddress(market.marketToken);
      return lowerAddress === requested || lowerName.includes(requested);
    })
  );
}

async function fetchTokens(chainConfig: ChainConfig) {
  const data = await fetchJson<{ tokens: TokenInfo[] }>(`${chainConfig.oracleUrl}/tokens`);
  return data.tokens;
}

async function fetchTradeActions({
  chainConfig,
  marketAddresses,
  from,
  to,
  pageSize,
  maxActions,
  minSizeUsd,
}: {
  chainConfig: ChainConfig;
  marketAddresses: string[];
  from: number;
  to: number;
  pageSize: number;
  maxActions: number;
  minSizeUsd: number;
}) {
  const actions: RawTradeAction[] = [];
  const sizeDeltaUsdFilter =
    minSizeUsd > 0 ? `sizeDeltaUsd_gte: "${usdToRaw30(minSizeUsd)}"` : 'sizeDeltaUsd_not_eq: "0"';

  for (let offset = 0; offset < maxActions; offset += pageSize) {
    const query = `{
      tradeActions(
        offset: ${offset},
        limit: ${pageSize},
        orderBy: timestamp_ASC,
        where: {
          marketAddress_in: ${graphQlStringList(marketAddresses)}
          timestamp_gte: ${from}
          timestamp_lte: ${to}
          eventName_in: ["OrderCreated", "OrderExecuted"]
          orderType_in: [2, 4]
          ${sizeDeltaUsdFilter}
        }
      ) {
        id
        eventName
        account
        marketAddress
        initialCollateralTokenAddress
        sizeDeltaUsd
        sizeDeltaInTokens
        executionPrice
        priceImpactUsd
        priceImpactDiffUsd
        swapFeeUsd
        swapImpactUsd
        positionFeeAmount
        borrowingFeeAmount
        fundingFeeAmount
        liquidationFeeAmount
        pnlUsd
        basePnlUsd
        collateralTokenPriceMax
        collateralTokenPriceMin
        indexTokenPriceMin
        indexTokenPriceMax
        orderType
        orderKey
        isLong
        twapGroupId
        numberOfParts
        totalImpactUsd
        proportionalPendingImpactUsd
        timestamp
        transactionHash
      }
    }`;

    const data = await fetchGraphql<{ tradeActions: RawTradeAction[] }>(chainConfig.subsquidUrl, query);
    actions.push(...data.tradeActions);

    console.log(`Fetched ${actions.length} raw actions...`);

    if (data.tradeActions.length < pageSize) {
      break;
    }
  }

  return actions;
}

async function writeFile(path: string, content: string) {
  await import("node:fs/promises").then((fs) => fs.writeFile(path, content));
}

async function mkdir(path: string) {
  await import("node:fs/promises").then((fs) => fs.mkdir(path, { recursive: true }));
}

function toIso(timestamp: number) {
  return new Date(timestamp * 1000).toISOString();
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const chainConfig = CHAINS[args.chain];
  const to = args.to ?? Math.floor(Date.now() / 1000);
  const from = args.from ?? to - Math.floor(args.days * 24 * 60 * 60);

  await mkdir(args.outDir);

  const [markets, tokens] = await Promise.all([
    fetchIndexMarkets(chainConfig, args.indexSymbol, args.markets),
    fetchTokens(chainConfig),
  ]);

  if (!markets.length) {
    throw new Error(`No ${args.indexSymbol} markets matched the requested filters`);
  }

  console.log(`Chain: ${args.chain} (${chainConfig.chainId})`);
  console.log(`Window: ${toIso(from)} to ${toIso(to)}`);
  console.log(`Markets: ${markets.map((market) => `${market.name} ${market.marketToken}`).join(", ")}`);

  const marketAddresses = markets.map((market) => market.marketToken);
  const marketsByAddress = new Map(markets.map((market) => [normalizeAddress(market.marketToken), market]));
  const tokensByAddress = new Map(tokens.map((token) => [normalizeAddress(token.address), token]));

  const actions = await fetchTradeActions({
    chainConfig,
    marketAddresses,
    from,
    to,
    pageSize: args.pageSize,
    maxActions: args.maxActions,
    minSizeUsd: args.minSizeUsd,
  });

  const rows = buildRows({
    actions,
    chain: args.chain,
    marketsByAddress,
    tokensByAddress,
    minSizeUsd: args.minSizeUsd,
  });
  const summary = {
    generatedAt: new Date().toISOString(),
    chain: args.chain,
    chainId: chainConfig.chainId,
    from,
    to,
    fromIso: toIso(from),
    toIso: toIso(to),
    indexSymbol: args.indexSymbol,
    markets,
    rawActions: actions.length,
    executions: rows.length,
    minSizeUsd: args.minSizeUsd,
    notes: [
      "protocolCostBps = oracleSpreadBps + positionFeeBps + netImpactCostBps + swapCostBps",
      "swapCostBps = (swapFeeUsd - swapImpactUsd) / sizeUsd * 10000",
      "holdingFeeBps is reported separately and excluded from protocolCostBps",
      "delaySeconds is measured from OrderCreated to OrderExecuted when both events are in the query window",
      "exact delay drift requires decision-time oracle or external second-level mid data and is not included",
    ],
    summary: summarizeRows(rows),
  };

  const suffix = `${args.chain}-${args.indexSymbol.toLowerCase()}-${from}-${to}-${args.minSizeUsd || "all"}`;
  const csvPath = `${args.outDir}/${suffix}.csv`;
  const jsonPath = `${args.outDir}/${suffix}.summary.json`;

  await Promise.all([writeFile(csvPath, toCsv(rows)), writeFile(jsonPath, `${JSON.stringify(summary, null, 2)}\n`)]);

  console.log(`Executions: ${rows.length}`);
  console.log(`CSV: ${csvPath}`);
  console.log(`Summary: ${jsonPath}`);
  console.table(summary.summary.slice(0, 12));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

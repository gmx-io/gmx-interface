/* eslint-disable no-console */
/**
 * Fetches current token prices from oracle keepers and updates priceDecimals
 * in sdk/src/configs/tokens.ts using calculateDisplayDecimals.
 *
 * Usage: cd sdk && npx tsx scripts/updateTokenPriceDecimals.ts [--dry-run]
 */

import fs from "fs";
import path from "path";

import { ARBITRUM, ARBITRUM_SEPOLIA, AVALANCHE, AVALANCHE_FUJI, BOTANIX } from "../src/configs/chainIds";
import { getOracleKeeperUrl } from "../src/configs/oracleKeeper";
import { calculateDisplayDecimals, USD_DECIMALS } from "../src/utils/numbers/utils";

const TOKENS_FILE = path.resolve(process.cwd(), "src/configs/tokens.ts");
const DRY_RUN = process.argv.includes("--dry-run");

const CHAINS = [
  { id: ARBITRUM, name: "Arbitrum", configKey: "ARBITRUM" },
  { id: AVALANCHE, name: "Avalanche", configKey: "AVALANCHE" },
  { id: AVALANCHE_FUJI, name: "Avalanche Fuji", configKey: "AVALANCHE_FUJI" },
  { id: BOTANIX, name: "Botanix", configKey: "BOTANIX" },
  { id: ARBITRUM_SEPOLIA, name: "Arbitrum Sepolia", configKey: "ARBITRUM_SEPOLIA" },
] as const;

type Ticker = {
  tokenSymbol: string;
  tokenAddress: string;
  minPrice: string;
  maxPrice: string;
};

type TokenConfig = {
  symbol: string;
  decimals: number;
  visualMultiplier?: number;
  currentPriceDecimals?: number;
  isStable?: boolean;
};

async function fetchTickers(chainId: number): Promise<Ticker[]> {
  const url = `${getOracleKeeperUrl(chainId)}/prices/tickers`;
  const res = await fetch(url);

  if (!res.ok) {
    throw new Error(`Failed to fetch tickers for chain ${chainId}: ${res.status}`);
  }

  return res.json();
}

// Oracle stores price as: rawPrice * 10^(USD_DECIMALS - tokenDecimals)
// calculateDisplayDecimals expects bigint with USD_DECIMALS precision
function tickerToPriceBigInt(ticker: Ticker, tokenDecimals: number): bigint {
  return BigInt(ticker.minPrice) * BigInt(10 ** tokenDecimals);
}

function parseTokenConfigs(source: string): Map<string, TokenConfig[]> {
  const chainTokens = new Map<string, TokenConfig[]>();

  const chainRegex = /\[(ARBITRUM|AVALANCHE|AVALANCHE_FUJI|ARBITRUM_SEPOLIA|BOTANIX)\]:\s*\[/g;
  let chainMatch;

  while ((chainMatch = chainRegex.exec(source)) !== null) {
    const chainName = chainMatch[1];
    const startIdx = chainMatch.index + chainMatch[0].length;

    let depth = 1;
    let i = startIdx;
    while (i < source.length && depth > 0) {
      if (source[i] === "[") depth++;
      if (source[i] === "]") depth--;
      i++;
    }
    const chainSection = source.substring(startIdx, i - 1);

    const tokens: TokenConfig[] = [];
    const tokenRegex = /\{[^{}]*(?:\{[^{}]*\}[^{}]*)*\}/g;
    let tokenMatch;

    while ((tokenMatch = tokenRegex.exec(chainSection)) !== null) {
      const tokenStr = tokenMatch[0];

      const symbolMatch = tokenStr.match(/symbol:\s*"([^"]+)"/);
      if (!symbolMatch) continue;

      const decimalsMatch = tokenStr.match(/decimals:\s*(\d+)/);
      if (!decimalsMatch) continue;

      const pdMatch = tokenStr.match(/priceDecimals:\s*(\d+)/);
      const vmMatch = tokenStr.match(/visualMultiplier:\s*([\d_]+)/);
      const stableMatch = tokenStr.match(/isStable:\s*true/);

      tokens.push({
        symbol: symbolMatch[1],
        decimals: parseInt(decimalsMatch[1]),
        currentPriceDecimals: pdMatch ? parseInt(pdMatch[1]) : undefined,
        visualMultiplier: vmMatch ? parseInt(vmMatch[1].replace(/_/g, "")) : undefined,
        isStable: !!stableMatch,
      });
    }

    chainTokens.set(chainName, tokens);
  }

  return chainTokens;
}

function applyUpdates(source: string, updates: Array<{ symbol: string; chain: string; newValue: number }>): string {
  let result = source;

  for (const update of updates) {
    const chainRegex = new RegExp(`\\[${update.chain}\\]:\\s*\\[`);
    const chainMatch = chainRegex.exec(result);
    if (!chainMatch) continue;

    const searchFrom = chainMatch.index;

    const symbolPattern = `symbol: "${update.symbol}"`;
    const symbolIdx = result.indexOf(symbolPattern, searchFrom);
    if (symbolIdx === -1) continue;

    let braceIdx = symbolIdx;
    while (braceIdx > searchFrom && result[braceIdx] !== "{") braceIdx--;

    let depth = 1;
    let endIdx = braceIdx + 1;
    while (endIdx < result.length && depth > 0) {
      if (result[endIdx] === "{") depth++;
      if (result[endIdx] === "}") depth--;
      endIdx++;
    }

    const tokenBlock = result.substring(braceIdx, endIdx);

    const pdRegex = /priceDecimals:\s*\d+/;
    const pdMatch = pdRegex.exec(tokenBlock);

    let newTokenBlock: string;
    if (pdMatch) {
      newTokenBlock = tokenBlock.replace(pdRegex, `priceDecimals: ${update.newValue}`);
    } else {
      const decimalsRegex = /(decimals:\s*\d+,?\n)/;
      const decimalsMatch = decimalsRegex.exec(tokenBlock);
      if (decimalsMatch) {
        const insertPos = decimalsMatch.index + decimalsMatch[0].length;
        const indent = tokenBlock.substring(0, decimalsMatch.index).match(/[ \t]*$/)?.[0] || "      ";
        newTokenBlock =
          tokenBlock.substring(0, insertPos) +
          `${indent}priceDecimals: ${update.newValue},\n` +
          tokenBlock.substring(insertPos);
      } else {
        continue;
      }
    }

    result = result.substring(0, braceIdx) + newTokenBlock + result.substring(endIdx);
  }

  return result;
}

async function main() {
  const source = fs.readFileSync(TOKENS_FILE, "utf-8");
  const chainTokens = parseTokenConfigs(source);

  const updates: Array<{ symbol: string; chain: string; newValue: number; priceUsd: number; oldValue?: number }> = [];
  const unchanged: Array<{ symbol: string; chain: string; value: number }> = [];
  const skipped: Array<{ symbol: string; chain: string; reason: string }> = [];

  for (const chain of CHAINS) {
    const chainConst = chain.configKey;
    const chainName = chain.name;

    const tokens = chainTokens.get(chainConst);
    if (!tokens) {
      console.log(`No tokens found for ${chainConst} in config`);
      continue;
    }

    console.log(`Fetching tickers for ${chainName}...`);
    let tickers: Ticker[];
    try {
      tickers = await fetchTickers(chain.id);
    } catch (e) {
      console.error(`  Failed: ${e}`);
      continue;
    }

    const tickersBySymbol = new Map<string, Ticker>();
    for (const t of tickers) {
      tickersBySymbol.set(t.tokenSymbol, t);
    }

    for (const token of tokens) {
      if (token.isStable) {
        skipped.push({ symbol: token.symbol, chain: chainConst, reason: "stable" });
        continue;
      }

      const ticker = tickersBySymbol.get(token.symbol);
      if (!ticker) {
        skipped.push({ symbol: token.symbol, chain: chainConst, reason: "no ticker data" });
        continue;
      }

      const priceBigInt = tickerToPriceBigInt(ticker, token.decimals);
      if (priceBigInt === 0n) {
        skipped.push({ symbol: token.symbol, chain: chainConst, reason: "zero price" });
        continue;
      }

      const vm = token.visualMultiplier ?? 1;
      const displayDecimals = calculateDisplayDecimals(priceBigInt, undefined, vm);
      // For tokens with visualMultiplier, pricescale = 10^priceDecimals / vm,
      // so priceDecimals must compensate: priceDecimals = displayDecimals + log10(vm)
      const expectedDecimals = vm === 1 ? displayDecimals : displayDecimals + Math.round(Math.log10(vm));

      const priceUsd = Number(priceBigInt) / 10 ** USD_DECIMALS;

      if (token.currentPriceDecimals === expectedDecimals) {
        unchanged.push({ symbol: token.symbol, chain: chainConst, value: expectedDecimals });
      } else {
        updates.push({
          symbol: token.symbol,
          chain: chainConst,
          newValue: expectedDecimals,
          priceUsd,
          oldValue: token.currentPriceDecimals,
        });
      }
    }
  }

  // Report
  if (updates.length > 0) {
    console.log(`\n${"=".repeat(70)}`);
    console.log(`UPDATES NEEDED: ${updates.length} tokens`);
    console.log(`${"=".repeat(70)}`);
    console.log(`${"Chain".padEnd(16)} ${"Symbol".padEnd(12)} ${"Price".padEnd(16)} ${"Old".padEnd(5)} → New`);
    console.log("-".repeat(60));
    for (const u of updates) {
      const oldStr = u.oldValue !== undefined ? String(u.oldValue) : "-";
      console.log(
        `${u.chain.padEnd(16)} ${u.symbol.padEnd(12)} $${u.priceUsd.toPrecision(6).padEnd(15)} ${oldStr.padEnd(5)} → ${u.newValue}`
      );
    }
  }

  console.log(`\nUnchanged: ${unchanged.length} | Updates: ${updates.length} | Skipped: ${skipped.length}`);

  if (skipped.length > 0) {
    console.log(`\nSkipped tokens:`);
    for (const s of skipped) {
      console.log(`  ${s.chain} ${s.symbol}: ${s.reason}`);
    }
  }

  if (updates.length === 0) {
    console.log("\nAll priceDecimals are up to date!");
    return;
  }

  if (DRY_RUN) {
    console.log("\n--dry-run: no changes written.");
    return;
  }

  const updatedSource = applyUpdates(source, updates);
  fs.writeFileSync(TOKENS_FILE, updatedSource, "utf-8");
  console.log(`\nWritten to ${TOKENS_FILE}`);
}

main().catch(console.error);

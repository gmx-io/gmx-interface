/* eslint-disable no-console */
/**
 * Fetches current token prices from oracle keepers and updates priceDecimals
 * in sdk/src/configs/tokens.ts using calculateDisplayDecimals.
 *
 * Usage: cd sdk && npx tsx scripts/updateTokenPriceDecimals.ts [--dry-run]
 */

import fs from "fs";
import path from "path";

import * as chainIds from "../src/configs/chainIds";
import { CONTRACTS_CHAIN_IDS_DEV } from "../src/configs/chains";
import { getOracleKeeperUrl } from "../src/configs/oracleKeeper";
import { TOKENS } from "../src/configs/tokens";
import { calculateDisplayDecimals, USD_DECIMALS } from "../src/utils/numbers/utils";

const TOKENS_FILE = path.resolve(process.cwd(), "src/configs/tokens.ts");
const DRY_RUN = process.argv.includes("--dry-run");

// Reverse map: chainId → variable name used in tokens.ts (e.g. 42161 → "ARBITRUM")
const CHAIN_ID_TO_NAME: Record<number, string> = {};
for (const [name, value] of Object.entries(chainIds)) {
  if (typeof value === "number") {
    CHAIN_ID_TO_NAME[value] = name;
  }
}

type Ticker = {
  tokenSymbol: string;
  tokenAddress: string;
  minPrice: string;
  maxPrice: string;
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

function applyUpdate(source: string, chainName: string, symbol: string, newValue: number): string {
  // Find the chain section: [ARBITRUM]: [
  const chainIdx = source.indexOf(`[${chainName}]`);
  if (chainIdx === -1) return source;

  // Find this symbol within the chain section
  const symbolIdx = source.indexOf(`symbol: "${symbol}"`, chainIdx);
  if (symbolIdx === -1) return source;

  // Find enclosing { }
  let braceIdx = symbolIdx;
  while (braceIdx > chainIdx && source[braceIdx] !== "{") braceIdx--;

  let depth = 1;
  let endIdx = braceIdx + 1;
  while (endIdx < source.length && depth > 0) {
    if (source[endIdx] === "{") depth++;
    if (source[endIdx] === "}") depth--;
    endIdx++;
  }

  const tokenBlock = source.substring(braceIdx, endIdx);

  const pdRegex = /priceDecimals:\s*\d+/;
  const pdMatch = pdRegex.exec(tokenBlock);

  let newTokenBlock: string;
  if (pdMatch) {
    newTokenBlock = tokenBlock.replace(pdRegex, `priceDecimals: ${newValue}`);
  } else {
    const decimalsRegex = /(decimals:\s*\d+,?\n)/;
    const decimalsMatch = decimalsRegex.exec(tokenBlock);
    if (!decimalsMatch) return source;

    const insertPos = decimalsMatch.index + decimalsMatch[0].length;
    const indent = tokenBlock.substring(0, decimalsMatch.index).match(/[ \t]*$/)?.[0] || "      ";
    newTokenBlock =
      tokenBlock.substring(0, insertPos) + `${indent}priceDecimals: ${newValue},\n` + tokenBlock.substring(insertPos);
  }

  return source.substring(0, braceIdx) + newTokenBlock + source.substring(endIdx);
}

type Update = {
  symbol: string;
  chainName: string;
  newValue: number;
  priceUsd: number;
  oldValue?: number;
};

async function main() {
  let source = fs.readFileSync(TOKENS_FILE, "utf-8");

  const updates: Update[] = [];
  let unchangedCount = 0;
  const skipped: Array<{ symbol: string; chainName: string; reason: string }> = [];

  for (const chainId of CONTRACTS_CHAIN_IDS_DEV) {
    const chainName = CHAIN_ID_TO_NAME[chainId];
    if (!chainName) {
      console.log(`No chain name mapping for ${chainId}`);
      continue;
    }

    const tokens = TOKENS[chainId];
    if (!tokens) continue;

    console.log(`Fetching tickers for ${chainName}...`);
    let tickers: Ticker[];
    try {
      tickers = await fetchTickers(chainId);
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
        skipped.push({ symbol: token.symbol, chainName, reason: "stable" });
        continue;
      }

      const ticker = tickersBySymbol.get(token.symbol);
      if (!ticker) {
        skipped.push({ symbol: token.symbol, chainName, reason: "no ticker data" });
        continue;
      }

      const priceBigInt = tickerToPriceBigInt(ticker, token.decimals);
      if (priceBigInt === 0n) {
        skipped.push({ symbol: token.symbol, chainName, reason: "zero price" });
        continue;
      }

      const vm = token.visualMultiplier ?? 1;
      const displayDecimals = calculateDisplayDecimals(priceBigInt, undefined, vm);
      // pricescale = 10^priceDecimals / vm, so priceDecimals = displayDecimals + log10(vm)
      const expectedDecimals = vm === 1 ? displayDecimals : displayDecimals + Math.round(Math.log10(vm));

      if (token.priceDecimals === expectedDecimals) {
        unchangedCount++;
      } else {
        updates.push({
          symbol: token.symbol,
          chainName,
          newValue: expectedDecimals,
          priceUsd: Number(priceBigInt) / 10 ** USD_DECIMALS,
          oldValue: token.priceDecimals,
        });
      }
    }
  }

  // Report
  if (updates.length > 0) {
    console.log(`\n${"=".repeat(65)}`);
    console.log(`UPDATES NEEDED: ${updates.length} tokens`);
    console.log(`${"=".repeat(65)}`);
    console.log(`${"Chain".padEnd(20)} ${"Symbol".padEnd(12)} ${"Price".padEnd(16)} ${"Old".padEnd(5)} → New`);
    console.log("-".repeat(60));
    for (const u of updates) {
      const oldStr = u.oldValue !== undefined ? String(u.oldValue) : "-";
      console.log(
        `${u.chainName.padEnd(20)} ${u.symbol.padEnd(12)} $${u.priceUsd.toPrecision(6).padEnd(15)} ${oldStr.padEnd(5)} → ${u.newValue}`
      );
    }
  }

  console.log(`\nUnchanged: ${unchangedCount} | Updates: ${updates.length} | Skipped: ${skipped.length}`);

  if (updates.length === 0) {
    console.log("\nAll priceDecimals are up to date!");
    return;
  }

  if (DRY_RUN) {
    console.log("\n--dry-run: no changes written.");
    return;
  }

  for (const update of updates) {
    source = applyUpdate(source, update.chainName, update.symbol, update.newValue);
  }

  fs.writeFileSync(TOKENS_FILE, source, "utf-8");
  console.log(`\nWritten to ${TOKENS_FILE}`);
}

main().catch(console.error);

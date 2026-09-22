import { PublicKey } from "@solana/web3.js";
import { useEffect, useSyncExternalStore } from "react";

import { createGmxSolanaWebSocketClient } from "lib/gmxSolanaRequest";

import { getSolanaRpcClient } from "../lib/rpc";
import {
  indexTokenPrices,
  readSplAmount,
  SOLANA_TRADE_TOKENS,
  solanaDisplaySymbol,
  solanaPriceSymbol,
  solanaTokenUsd,
  swapTokenMints,
} from "./solanaWalletSession";

const TOKEN_PROGRAM_ID = new PublicKey("TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA");
const TOKEN_2022_PROGRAM_ID = new PublicKey("TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb");
const ASSOCIATED_TOKEN_PROGRAM_ID = new PublicKey("ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL");

export type SolanaAsset = {
  mint: string;
  symbol: string;
  name: string;
  amount: bigint;
  decimals: number;
  priceSymbol: string;
};

type Store = {
  address?: string;
  status: "loading" | "ready" | "error";
  assets: SolanaAsset[];
  prices: Record<string, bigint>;
  error: string | null;
};

// ponytail: one app-wide socket. GmxAccountModal holds it, so opening the asset list does not reconnect.
let store: Store = { status: "loading", assets: [], prices: {}, error: null };
const listeners = new Set<() => void>();
let users = 0;
let socketAddress: string | undefined;
let client: { destroy: () => void; send: (data: string) => void } | undefined;
let mintKey = "";
let request = 0;
let lastMints: string[] = [];

function emit(next: Store) {
  store = next;
  listeners.forEach((listener) => listener());
}

function patch(partial: Partial<Store>) {
  emit({ ...store, ...partial });
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function getSnapshot() {
  return store;
}

function applyBalances(current: number, address: string, assets: SolanaAsset[]) {
  if (current !== request || socketAddress !== address) return;
  patch({ address, assets, error: null, status: "ready" });
}

function fail(current: number, cause: unknown) {
  if (current !== request) return;
  mintKey = "";
  if (store.status === "ready") return;
  patch({
    assets: [],
    error: cause instanceof Error ? cause.message : String(cause),
    status: "error",
  });
}

function refresh(address: string, mints: string[]) {
  const current = ++request;
  lastMints = mints;
  mintKey = mints.slice().sort().join("|");
  loadSolanaTradeBalances(address, mints)
    .then((assets) => applyBalances(current, address, assets))
    .catch((cause: unknown) => fail(current, cause));
}

function onSocketMessage(address: string, data: unknown) {
  let message: unknown;
  try {
    message = JSON.parse(String(data));
  } catch {
    return;
  }

  const type = message && typeof message === "object" && "type" in message ? String((message as { type?: unknown }).type) : "";

  if (type === "tickers") {
    const next = indexTokenPrices(message);
    if (Object.keys(next).length === 0) return;
    patch({ prices: { ...store.prices, ...next } });
    return;
  }

  if (type !== "swapList" || socketAddress !== address) return;
  const mints = swapTokenMints(message).filter((mint) => SOLANA_TRADE_TOKENS[mint]);
  const nextKey = mints.slice().sort().join("|");
  if (nextKey === mintKey) return;
  refresh(address, mints);
}

function open(address: string) {
  client?.destroy();
  client = undefined;
  socketAddress = address;
  mintKey = "";
  request += 1;
  if (store.address === address && store.status === "ready") {
    patch({ address, error: null });
  } else {
    patch({ address, status: "loading", assets: [], error: null });
  }

  const socket = createGmxSolanaWebSocketClient({
    onOpen() {
      socket.send(JSON.stringify({ subscribe: "swapList" }));
      socket.send(JSON.stringify({ subscribe: "tickers" }));
    },
    onMessage(event) {
      if (socketAddress !== address) return;
      onSocketMessage(address, event.data);
    },
  });
  client = socket;
  socket.connect();
}

function retain(address: string) {
  users += 1;
  if (socketAddress === address && client) {
    if (lastMints.length > 0) refresh(address, lastMints);
  } else {
    lastMints = [];
    open(address);
  }

  return () => {
    users -= 1;
    if (users > 0) return;
    client?.destroy();
    client = undefined;
    socketAddress = undefined;
    mintKey = "";
    request += 1;
  };
}

function associatedTokenAddress(owner: PublicKey, mint: PublicKey, program: PublicKey) {
  return PublicKey.findProgramAddressSync(
    [owner.toBuffer(), program.toBuffer(), mint.toBuffer()],
    ASSOCIATED_TOKEN_PROGRAM_ID
  )[0];
}

export async function loadSolanaTradeBalances(address: string, mints: string[]): Promise<SolanaAsset[]> {
  const tokens = mints.flatMap((mint) => {
    const meta = SOLANA_TRADE_TOKENS[mint];
    return meta ? [{ mint, meta }] : [];
  });
  if (tokens.length === 0) return [];

  const connection = getSolanaRpcClient();
  const owner = new PublicKey(address);
  const balances = new Map<string, bigint>();
  const splAccounts: { mint: string; ata: PublicKey }[] = [];

  for (const { mint, meta } of tokens) {
    if (meta.native) continue;
    const mintKey = new PublicKey(mint);
    splAccounts.push(
      { mint, ata: associatedTokenAddress(owner, mintKey, TOKEN_PROGRAM_ID) },
      { mint, ata: associatedTokenAddress(owner, mintKey, TOKEN_2022_PROGRAM_ID) }
    );
  }

  const lamportsPromise = tokens.some(({ meta }) => meta.native) ? connection.getBalance(owner) : Promise.resolve(0);
  const accountsPromise = splAccounts.length
    ? connection.getMultipleAccountsInfo(splAccounts.map((account) => account.ata))
    : Promise.resolve([]);
  const [lamports, accounts] = await Promise.all([lamportsPromise, accountsPromise]);

  if (tokens.some(({ meta }) => meta.native)) {
    const nativeBalance = BigInt(lamports);
    for (const { mint, meta } of tokens) {
      if (meta.native) balances.set(mint, nativeBalance);
    }
  }

  accounts.forEach((info, index) => {
    if (!info?.data) return;
    const amount = readSplAmount(info.data);
    if (amount === undefined || amount === 0n) return;
    const mint = splAccounts[index].mint;
    balances.set(mint, (balances.get(mint) ?? 0n) + amount);
  });

  return tokens.flatMap(({ mint, meta }) => {
    const amount = balances.get(mint) ?? 0n;
    if (amount <= 0n) return [];
    const symbol = solanaDisplaySymbol(meta.symbol);
    return [
      { mint, symbol, name: symbol, amount, decimals: meta.decimals, priceSymbol: solanaPriceSymbol(meta.symbol) },
    ];
  });
}

export function useSolanaAssetsConnection(address: string | undefined) {
  useEffect(() => {
    if (!address) return;
    return retain(address);
  }, [address]);
}

export function useSolanaAssets(address: string | undefined) {
  const snapshot = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
  useSolanaAssetsConnection(address);

  if (!address) {
    return { status: "ready" as const, error: null, rows: [], totalUsd: undefined };
  }

  const current = snapshot.address === address ? snapshot : undefined;
  const rows = (current?.assets ?? []).map((asset) => ({
    ...asset,
    balanceUsd: solanaTokenUsd(asset.amount, asset.decimals, snapshot.prices[asset.priceSymbol]) ?? 0n,
  }));
  const status = current?.status ?? "loading";

  return {
    status,
    error: current?.error ?? null,
    rows,
    totalUsd: status === "ready" ? rows.reduce((sum, row) => sum + row.balanceUsd, 0n) : undefined,
  };
}

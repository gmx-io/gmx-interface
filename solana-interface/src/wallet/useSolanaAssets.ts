import { PublicKey } from "@solana/web3.js";
import { useEffect, useState } from "react";

import { createGmxSolanaWebSocketClient } from "lib/gmxSolanaRequest";

import { indexTokenPrices, solanaTokenUsd } from "./solanaWalletSession";
import { getSolanaRpcClient } from "../lib/rpc";

const TOKEN_PROGRAM_ID = new PublicKey("TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA");
const TOKEN_2022_PROGRAM_ID = new PublicKey("TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb");

export type SolanaAsset = {
  mint: string;
  symbol: string;
  name: string;
  amount: bigint;
  decimals: number;
};

type ParsedTokenAccount = {
  account: {
    data: {
      parsed?: {
        info?: {
          mint?: string;
          tokenAmount?: { amount?: string; decimals?: number };
        };
      };
    };
  };
};

function readSplAccounts(accounts: ParsedTokenAccount[]) {
  const assets: SolanaAsset[] = [];

  for (const { account } of accounts) {
    const info = account.data.parsed?.info;
    const mint = info?.mint;
    const amount = info?.tokenAmount?.amount;
    const decimals = info?.tokenAmount?.decimals;
    if (!mint || amount === undefined || decimals === undefined) continue;

    const balance = BigInt(amount);
    if (balance <= 0n) continue;

    assets.push({
      mint,
      symbol: mint,
      name: "SPL",
      amount: balance,
      decimals,
    });
  }

  return assets;
}

export async function loadSolanaAssets(address: string): Promise<SolanaAsset[]> {
  const connection = getSolanaRpcClient();
  const owner = new PublicKey(address);
  const [lamports, splAccounts, token2022Accounts] = await Promise.all([
    connection.getBalance(owner),
    connection.getParsedTokenAccountsByOwner(owner, { programId: TOKEN_PROGRAM_ID }),
    connection.getParsedTokenAccountsByOwner(owner, { programId: TOKEN_2022_PROGRAM_ID }),
  ]);

  const assets = [
    ...readSplAccounts(splAccounts.value as ParsedTokenAccount[]),
    ...readSplAccounts(token2022Accounts.value as ParsedTokenAccount[]),
  ];

  if (lamports > 0) {
    assets.unshift({
      mint: "SOL",
      symbol: "SOL",
      name: "Solana",
      amount: BigInt(lamports),
      decimals: 9,
    });
  }

  return assets;
}

function useSolanaTokenPrices(enabled: boolean) {
  const [prices, setPrices] = useState<Record<string, number>>({});

  useEffect(() => {
    if (!enabled) return;

    const client = createGmxSolanaWebSocketClient({
      onOpen() {
        client.send(JSON.stringify({ subscribe: "indexTokens" }));
      },
      onMessage(event) {
        try {
          const next = indexTokenPrices(JSON.parse(String(event.data)));
          if (Object.keys(next).length === 0) return;
          setPrices((current) => ({ ...current, ...next }));
        } catch {
          // Ignore a message that is not the index token payload.
        }
      },
    });

    client.connect();
    return () => client.destroy();
  }, [enabled]);

  return prices;
}

export function useSolanaAssets(address: string | undefined) {
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [assets, setAssets] = useState<SolanaAsset[]>([]);
  const [error, setError] = useState<string | null>(null);
  const prices = useSolanaTokenPrices(Boolean(address));

  useEffect(() => {
    if (!address) {
      setAssets([]);
      setError(null);
      setStatus("ready");
      return;
    }

    let cancelled = false;
    setStatus("loading");
    setError(null);

    loadSolanaAssets(address)
      .then((next) => {
        if (cancelled) return;
        setAssets(next);
        setStatus("ready");
      })
      .catch((cause: unknown) => {
        if (cancelled) return;
        setAssets([]);
        setError(cause instanceof Error ? cause.message : String(cause));
        setStatus("error");
      });

    return () => {
      cancelled = true;
    };
  }, [address]);

  const rows = assets.map((asset) => ({
    ...asset,
    balanceUsd: solanaTokenUsd(asset.amount, asset.decimals, prices[asset.symbol.toUpperCase()] ?? prices[asset.mint]),
  }));
  const totalUsd =
    status === "ready"
      ? rows.reduce<bigint | undefined>((sum, row) => {
          if (row.balanceUsd === undefined) return sum;
          return (sum ?? 0n) + row.balanceUsd;
        }, undefined)
      : undefined;

  return { status, error, rows, totalUsd };
}

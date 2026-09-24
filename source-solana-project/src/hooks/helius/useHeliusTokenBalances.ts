/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { Address, translateAddress } from '@coral-xyz/anchor';
import {
  AccountLayout,
  getAssociatedTokenAddressSync,
  TOKEN_2022_PROGRAM_ID,
  TOKEN_PROGRAM_ID,
} from '@solana/spl-token';
import { useWallet } from '@solana/wallet-adapter-react';
import { Connection, PublicKey } from '@solana/web3.js';
import { toBN } from 'gmsol';
import { useEffect, useMemo, useRef, useState } from 'react';

import { DEFAULT_SWR_REFRESH_INTERVAL_5S } from '@/config/ui';
import { NATIVE_TOKEN_ADDRESS, SOL_TOKEN_ADDRESS } from '@/config/tokens';
import { useAnchorProvider } from '@/contexts/anchor';
import {
  getHeliusAccountWatcher,
  isHeliusAccountSubscribeEnabled,
} from '@/lib/helius/accountSubscriber';
import { TokenBalances } from '@/selectors/token/types';
import { useWsLastUpdatedAtStore } from '@/zustand/wsLastUpdatedAtStore';

interface AtaEntry {
  // Token mint base58 (the key under which the balance is exposed).
  tokenMint: string;
  // ATA address (or owner pubkey for the native SOL pseudo-entry).
  pubkey: string;
  // True for the native SOL entry: balance comes from `lamports` rather
  // than the SPL token account data.
  native: boolean;
}

const PUBKEY_BATCH_SIZE = 100;
type TokenBalanceAmount = ReturnType<typeof toBN>;

const seedRequests = new Map<
  string,
  Promise<Map<string, TokenBalanceAmount | null>>
>();

const balanceCache = new Map<string, TokenBalances>();

function getBalanceCacheKey(
  owner: string,
  tokens: Address[],
  spl2022Tokens?: Address[]
): string {
  const mints = new Set<string>();
  for (const token of tokens) {
    mints.add(translateAddress(token).toBase58());
  }
  for (const token of spl2022Tokens ?? []) {
    mints.add(translateAddress(token).toBase58());
  }
  return `${owner}:${Array.from(mints).sort().join('|')}`;
}

function readBalanceCache(key: string): TokenBalances {
  return balanceCache.get(key) ?? {};
}

function writeBalanceCache(key: string, balances: TokenBalances): void {
  balanceCache.set(key, { ...balances });
}

function isNativeBalanceToken(mint: PublicKey): boolean {
  return mint.equals(NATIVE_TOKEN_ADDRESS) || mint.equals(SOL_TOKEN_ADDRESS);
}

function getSeedRequestKey(connection: Connection, entries: AtaEntry[]): string {
  const endpoint =
    (connection as unknown as { rpcEndpoint?: string }).rpcEndpoint ?? '';
  const pubkeys = entries.map((entry) => entry.pubkey).sort();
  return `${endpoint}:${pubkeys.join('|')}`;
}

async function fetchSeedBalances(
  connection: Connection,
  entries: AtaEntry[]
): Promise<Map<string, TokenBalanceAmount | null>> {
  const seededBalances = new Map<string, TokenBalanceAmount | null>();
  const splPubkeys = entries
    .filter((entry) => !entry.native)
    .sort((a, b) => a.pubkey.localeCompare(b.pubkey));
  const nativeEntries = entries
    .filter((entry) => entry.native)
    .sort((a, b) => a.pubkey.localeCompare(b.pubkey));

  for (let i = 0; i < splPubkeys.length; i += PUBKEY_BATCH_SIZE) {
    const chunk = splPubkeys.slice(i, i + PUBKEY_BATCH_SIZE);
    const accountInfos = await connection.getMultipleAccountsInfo(
      chunk.map((entry) => new PublicKey(entry.pubkey)),
      'confirmed'
    );

    accountInfos.forEach((info, idx) => {
      const entry = chunk[idx];
      if (!info?.data) {
        seededBalances.set(entry.pubkey, null);
        return;
      }
      try {
        const decoded = AccountLayout.decode(info.data);
        seededBalances.set(entry.pubkey, toBN(decoded.amount));
      } catch (err) {
        console.error('[helius] initial decode failed', entry.pubkey, err);
        seededBalances.set(entry.pubkey, null);
      }
    });
  }

  for (const nativeEntry of nativeEntries) {
    try {
      const lamports = await connection.getBalance(
        new PublicKey(nativeEntry.pubkey)
      );
      seededBalances.set(nativeEntry.pubkey, toBN(lamports));
    } catch (err) {
      console.error('[helius] initial native balance seed failed', err);
      seededBalances.set(nativeEntry.pubkey, null);
    }
  }

  return seededBalances;
}

function getSeedBalances(
  connection: Connection,
  entries: AtaEntry[]
): Promise<Map<string, TokenBalanceAmount | null>> {
  const key = getSeedRequestKey(connection, entries);
  const existing = seedRequests.get(key);
  if (existing !== undefined) return existing;

  const request = fetchSeedBalances(connection, entries).finally(() => {
    seedRequests.delete(key);
  });
  seedRequests.set(key, request);
  return request;
}

// Subscription-driven replacement for the 5s-polling useTokenBalances. On
// mount the hook seeds initial balances with one batched
// getMultipleAccountsInfo (and a single getBalance for native SOL), then
// switches to Helius `accountSubscribe` deltas. Subsequent balance changes
// arrive as push notifications instead of polling cycles.
export const useHeliusTokenBalances = (
  tokens: Address[],
  spl2022Tokens?: Address[]
): TokenBalances => {
  const provider = useAnchorProvider();
  const { publicKey: owner } = useWallet();

  const ataEntries = useMemo<AtaEntry[]>(() => {
    if (!owner) return [];
    const ownerPub = owner;
    const entries: AtaEntry[] = [];
    const nativeTokenMints = new Set<string>();
    for (const token of tokens) {
      const mint = translateAddress(token);
      if (isNativeBalanceToken(mint)) {
        nativeTokenMints.add(mint.toBase58());
        continue;
      }
      const ata = getAssociatedTokenAddressSync(
        mint,
        ownerPub,
        true,
        TOKEN_PROGRAM_ID
      );
      entries.push({
        tokenMint: mint.toBase58(),
        pubkey: ata.toBase58(),
        native: false,
      });
    }
    for (const token of spl2022Tokens ?? []) {
      const mint = translateAddress(token);
      if (isNativeBalanceToken(mint)) {
        nativeTokenMints.add(mint.toBase58());
        continue;
      }
      const ata = getAssociatedTokenAddressSync(
        mint,
        ownerPub,
        true,
        TOKEN_2022_PROGRAM_ID
      );
      entries.push({
        tokenMint: mint.toBase58(),
        pubkey: ata.toBase58(),
        native: false,
      });
    }
    for (const nativeTokenMint of nativeTokenMints) {
      entries.push({
        tokenMint: nativeTokenMint,
        pubkey: ownerPub.toBase58(),
        native: true,
      });
    }
    return entries;
  }, [tokens, spl2022Tokens, owner]);

  const cacheKey = useMemo(
    () =>
      owner
        ? getBalanceCacheKey(owner.toBase58(), tokens, spl2022Tokens)
        : '',
    [owner, tokens, spl2022Tokens]
  );

  const [balances, setBalances] = useState<TokenBalances>(() =>
    cacheKey ? readBalanceCache(cacheKey) : {}
  );
  // pubkey -> tokenMint, used to route accountNotification updates.
  const pubkeyToMintRef = useRef<
    Map<string, { tokenMint: string; native: boolean }>
  >(new Map());
  const accountBalanceRef = useRef<Map<string, TokenBalanceAmount | null>>(
    new Map()
  );

  useEffect(() => {
    if (!provider || !owner || ataEntries.length === 0) {
      setBalances({});
      pubkeyToMintRef.current = new Map();
      accountBalanceRef.current = new Map();
      return;
    }

    setBalances(readBalanceCache(cacheKey));
    accountBalanceRef.current = new Map();
    const watcher = getHeliusAccountWatcher();
    const disposers: Array<() => void> = [];
    let fallbackTimer: ReturnType<typeof setInterval> | null = null;
    let cancelled = false;

    const canSubscribe = isHeliusAccountSubscribeEnabled();
    const seenLiveUpdates = new Set<string>();

    const pubkeyToMint = new Map<
      string,
      { tokenMint: string; native: boolean }
    >();
    for (const e of ataEntries) {
      pubkeyToMint.set(e.pubkey, { tokenMint: e.tokenMint, native: e.native });
    }
    pubkeyToMintRef.current = pubkeyToMint;

    const persistBalances = (next: TokenBalances) => {
      if (cacheKey) {
        writeBalanceCache(cacheKey, next);
      }
      return next;
    };

    const applyBalance = (
      pubkey: string,
      tokenMint: string,
      balance: TokenBalanceAmount | null
    ) => {
      if (cancelled) return;
      accountBalanceRef.current.set(pubkey, balance);
      let nextBalance: ReturnType<typeof toBN> | null = null;
      for (const [entryPubkey, entry] of pubkeyToMintRef.current.entries()) {
        if (entry.tokenMint !== tokenMint) continue;
        const entryBalance = accountBalanceRef.current.get(entryPubkey);
        if (!entryBalance) continue;
        nextBalance = nextBalance
          ? nextBalance.add(entryBalance)
          : entryBalance;
      }
      setBalances((prev) => {
        const next = { ...prev };
        next[tokenMint] = nextBalance;
        return persistBalances(next);
      });
    };
    const applySeedBalances = (
      seededBalances: Map<string, TokenBalanceAmount | null>
    ) => {
      if (cancelled) return;
      const nextByMint = new Map<string, TokenBalanceAmount | null>();

      for (const entry of ataEntries) {
        if (seenLiveUpdates.has(entry.pubkey)) continue;
        const balance = seededBalances.get(entry.pubkey) ?? null;
        accountBalanceRef.current.set(entry.pubkey, balance);
      }

      for (const [entryPubkey, entry] of pubkeyToMintRef.current.entries()) {
        const entryBalance = accountBalanceRef.current.get(entryPubkey);
        if (!entryBalance) continue;
        const previous = nextByMint.get(entry.tokenMint);
        nextByMint.set(
          entry.tokenMint,
          previous ? previous.add(entryBalance) : entryBalance
        );
      }

      setBalances((prev) => {
        const next = { ...prev };
        for (const entry of ataEntries) {
          next[entry.tokenMint] = nextByMint.get(entry.tokenMint) ?? null;
        }
        return persistBalances(next);
      });
    };

    // 1) Seed initial state in one batched RPC. Helius accountSubscribe
    //    only reports deltas, so we must read current state once.
    const seed = async () => {
      try {
        const seededBalances = await getSeedBalances(
          provider.connection,
          ataEntries
        );
        if (cancelled) return;
        applySeedBalances(seededBalances);
      } catch (err) {
        console.error('[helius] initial token balances seed failed', err);
      }
    };
    void seed();

    if (!canSubscribe) {
      fallbackTimer = setInterval(() => {
        void seed();
      }, DEFAULT_SWR_REFRESH_INTERVAL_5S);

      return () => {
        cancelled = true;
        if (fallbackTimer) clearInterval(fallbackTimer);
        pubkeyToMintRef.current = new Map();
        accountBalanceRef.current = new Map();
      };
    }

    // 2) Subscribe each pubkey for live deltas. New accounts (e.g. ATAs
    //    not yet created) start emitting once they exist on chain.
    for (const e of ataEntries) {
      const dispose = watcher.watch(e.pubkey, (snap) => {
        if (cancelled) return;
        useWsLastUpdatedAtStore
          .getState()
          .setWsLastUpdatedAt('heliusAccount');
        console.log('heliusAccount: ',useWsLastUpdatedAtStore.getState().heliusAccountLastUpdatedAt);
        seenLiveUpdates.add(e.pubkey);
        const route = pubkeyToMintRef.current.get(e.pubkey);
        if (!route) return;
        if (snap.removed) {
          applyBalance(e.pubkey, route.tokenMint, null);
          return;
        }
        if (route.native) {
          applyBalance(e.pubkey, route.tokenMint, toBN(snap.lamports));
          return;
        }
        if (!snap.data || snap.data.length === 0) {
          applyBalance(e.pubkey, route.tokenMint, null);
          return;
        }
        try {
          const decoded = AccountLayout.decode(snap.data);
          applyBalance(e.pubkey, route.tokenMint, toBN(decoded.amount));
        } catch (err) {
          console.error('[helius] delta decode failed', e.pubkey, err);
        }
      });
      disposers.push(dispose);
    }

    return () => {
      cancelled = true;
      if (fallbackTimer) clearInterval(fallbackTimer);
      for (const d of disposers) d();
      pubkeyToMintRef.current = new Map();
      accountBalanceRef.current = new Map();
    };
  }, [provider, owner, ataEntries, cacheKey]);

  return balances;
};

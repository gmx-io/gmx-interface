/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { Address, BN, translateAddress } from '@coral-xyz/anchor';
import { Market, Position as SdkPosition } from '@gmsol-labs/gmsol-sdk';
import isEqual from 'lodash/isEqual';
import { useEffect, useMemo, useReducer, useRef, useState } from 'react';
import { useShallow } from 'zustand/react/shallow';

import { GMX_SOLANA_TOKENS } from '@/config/program';
import { ONE_USD } from '@/config/constants';
import { useAnchor, useStoreProgram } from '@/contexts/anchor';
import {
  correctLiquidationPrice,
  processPosition,
} from '@/hooks/fetchHooks/usePositions';
import { getMarinClient } from '@/lib/marin/client';
import { MARIN_POSITIONS_SUBSCRIPTION } from '@/lib/marin/queries';
import {
  PositionsSubscriptionPayload,
  PositionSubscriptionRecord,
} from '@/lib/marin/types';
import { Markets } from '@/selectors/market/types';
import { Positions } from '@/selectors/position/types';
import {
  isLimitDecreaseOrderType,
  isMarketOrderShowType,
  isStopLossOrderType,
} from '@/utils/order/isOrderType';
import { useAppStore } from '@/zustand/useAppStore';

interface RawPosition {
  pubkey: string;
  base64: string;
  // Anchor-decoded `position` account.
  decoded: any;
  slot?: number | null;
}

type PositionEntry = Record<string, unknown>;

interface PositionComputationCacheEntry {
  rawBase64: string;
  marketBase64: string;
  marketSupply: string;
  positionModel: any;
  processed: ReturnType<typeof processPosition>;
  positionAddress: string;
}

const toPositionBase64Map = (positions: Map<string, RawPosition>) => {
  const next = new Map<string, string>();
  positions.forEach((position, pubkey) => {
    if (position.decoded?.state?.sizeInUsd?.gt(new BN(0))) {
      next.set(pubkey, position.base64);
    }
  });
  return next;
};

const convertBigIntToString = (obj: any): any =>
  typeof obj === 'bigint'
    ? obj.toString()
    : Array.isArray(obj)
      ? obj.map(convertBigIntToString)
      : obj && typeof obj === 'object'
        ? Object.fromEntries(
            Object.entries(obj).map(([k, v]) => [k, convertBigIntToString(v)])
          )
        : obj;

// Build the full position entry consumed by the position list UI. Mirrors
// the inline logic of the legacy usePositions polling branch but reads its
// inputs from already-cached subscription data instead of an RPC fetch.
function buildEntry(args: {
  raw: RawPosition;
  marketInfoByToken: Map<string, any>;
  marketBase64Map: Map<string, string>;
  marketsState: Record<string, any>;
  tokenPriceMap: Map<string, any>;
  ordersList: any[];
  owner: string;
  store: string;
  computationCache: Map<string, PositionComputationCacheEntry>;
}): PositionEntry | null {
  const {
    raw,
    marketInfoByToken,
    marketBase64Map,
    marketsState,
    tokenPriceMap,
    ordersList,
    owner,
    store,
    computationCache,
  } = args;
  const positionObj = raw.decoded;
  if (!positionObj) return null;
  if (!positionObj.state?.sizeInUsd?.gt(new BN(0))) return null;

  const marketTokenBase58 = positionObj.marketToken.toBase58();
  const marketInfo = marketInfoByToken.get(marketTokenBase58);
  if (!marketInfo) return null;
  const marketBase64 = marketBase64Map.get(marketTokenBase58);
  if (!marketBase64) return null;

  const marketSupply = String(marketInfo.supply);
  let cached = computationCache.get(raw.pubkey);
  if (
    !cached ||
    cached.rawBase64 !== raw.base64 ||
    cached.marketBase64 !== marketBase64 ||
    cached.marketSupply !== marketSupply
  ) {
    try {
      const marketModel = Market.decode_from_base64(marketBase64).to_model(
        BigInt(marketSupply)
      );
      const positionModel = SdkPosition.decode_from_base64(raw.base64).to_model(
        marketModel
      );
      const processed = processPosition(positionObj, owner, store);
      if (!processed) return null;
      cached = {
        rawBase64: raw.base64,
        marketBase64,
        marketSupply,
        positionModel,
        processed,
        positionAddress: (processed as any).address.toBase58(),
      };
      computationCache.set(raw.pubkey, cached);
    } catch (err) {
      console.error('[marin] position decode failed', raw.pubkey, err);
      computationCache.delete(raw.pubkey);
      return null;
    }
  }

  let statusData: any = {};
  let priceUnavailable = false;
  try {
    const indexTokenPrice = tokenPriceMap.get(marketInfo.indexToken);
    const longTokenPrice = tokenPriceMap.get(marketInfo.longToken);
    const shortTokenPrice = tokenPriceMap.get(marketInfo.shortToken);
    if (
      !indexTokenPrice?.minUnitPrice ||
      !longTokenPrice?.minUnitPrice ||
      !shortTokenPrice?.minUnitPrice
    ) {
      // Price feed not ready: surface position as-is rather than hiding it.
      priceUnavailable = true;
    } else {
      statusData = cached.positionModel.status({
        index_token: {
          min: BigInt(indexTokenPrice.minUnitPrice),
          max: BigInt(indexTokenPrice.maxUnitPrice),
        },
        long_token: {
          min: BigInt(longTokenPrice.minUnitPrice),
          max: BigInt(longTokenPrice.maxUnitPrice),
        },
        short_token: {
          min: BigInt(shortTokenPrice.minUnitPrice),
          max: BigInt(shortTokenPrice.maxUnitPrice),
        },
      });
    }
  } catch (err) {
    console.error('[marin] position status compute failed', raw.pubkey, err);
    return null;
  }

  const marketTokenKey =
    marketInfo.marketToken?.toString?.() ?? marketInfo.marketToken;
  const indexTokenKey =
    marketInfo.indexToken?.toString?.() ?? marketInfo.indexToken;
  if (!priceUnavailable) {
    statusData = correctLiquidationPrice(
      statusData,
      positionObj,
      marketsState[marketTokenKey],
      indexTokenKey
    );
  }

  const otherData = convertBigIntToString(statusData);
  const tokenMeta = GMX_SOLANA_TOKENS[marketInfo.indexToken];
  const entry: PositionEntry = {
    ...cached.processed,
    ...otherData,
    priceUnavailable,
    symbol: tokenMeta?.symbol,
    decimals: tokenMeta?.decimals,
    decimals_gmx: tokenMeta?.decimals_gmx,
    unitPrice: marketInfo.unitPrice,
    marketInfo,
    positionInitData: undefined,
    // Disable close/decrease when price data is unavailable to prevent incorrect fills.
    shouldDisablePosition: priceUnavailable,
  };
  const entryData = entry as any;

  const orderToken: any[] = [];
  const slToken: any[] = [];
  const tpToken: any[] = [];

  for (const order of ordersList) {
    if (order?.positionAddress?.toBase58() !== cached.positionAddress) continue;
    orderToken.push(order);

    if (
      isStopLossOrderType(order?.orderType) ||
      isLimitDecreaseOrderType(order?.orderType)
    ) {
      const sizeDeltaPercentUsd = order.sizeDeltaUsd
        .mul(new BN(10000))
        .div(entryData?.sizeInUsd ?? ONE_USD);
      const orderWithExtra = {
        ...order,
        sizeDeltaPercentUsd,
        positionPendingPnl: entryData?.pending_pnl,
        positionNetValue: entryData?.net_value,
        positionSizeInUsd: entryData?.sizeInUsd,
        positionUnitPrice: entryData?.unitPrice,
        collateralTokenAddress: entryData?.collateralTokenAddress,
      };
      if (isStopLossOrderType(order?.orderType)) {
        slToken.push(orderWithExtra);
      } else {
        tpToken.push(orderWithExtra);
      }
    } else if (!isMarketOrderShowType(order?.orderType)) {
      entryData.shouldDisablePosition = true;
    } else {
      entryData.shouldDisablePosition = priceUnavailable;
    }
  }

  if (orderToken.length) entryData.orderToken = orderToken;
  if (slToken.length) {
    entryData.slToken = slToken.sort((a, b) => {
      const diff = b.triggerPrice.sub(a.triggerPrice);
      return diff.gt(new BN(0)) ? 1 : diff.lt(new BN(0)) ? -1 : 0;
    });
  }
  if (tpToken.length) {
    entryData.tpToken = tpToken.sort((a, b) => {
      const diff = a.triggerPrice.sub(b.triggerPrice);
      return diff.gt(new BN(0)) ? 1 : diff.lt(new BN(0)) ? -1 : 0;
    });
  }
  return entry;
}

interface UseMarinPositionsResult {
  positions: any[];
  isLoading: boolean;
  error: unknown;
  refresh: () => void;
}

// Subscription-driven replacement for the polling + Helius-WS-driven
// usePositions. Receives every state change for the connected owner's
// positions over marin and keeps a derived display array in sync with the
// in-store market data, prices, and orders. Mirrors the legacy hook's
// return shape so usePositionsData can consume it without changes.
export const useMarinPositions = (
  store: Address | undefined,
  markets: Markets[],
  // Kept for legacy parity; the marin path is push-driven so we ignore them.
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _prevPositionsRef: object,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _updatePosition: boolean
): UseMarinPositionsResult => {
  const storeProgram = useStoreProgram();
  const { owner } = useAnchor();

  const { marketBase64Map, marketsState } = useAppStore(
    useShallow((state) => ({
      marketBase64Map: state.markets.marketBase64Map,
      marketsState: state.markets.marketsState,
    }))
  );
  const { orders } = useAppStore(
    useShallow((state) => ({
      orders: state.orderState.orders,
    }))
  );
  const { tokenPriceMap } = useAppStore(
    useShallow((state) => ({
      tokenPriceMap: state.tickersState.tokenPriceMap,
    }))
  );
  const setPositionMap = useAppStore(
    (state) => state.positionState.setPositionMap
  );

  const ownerBase58 = owner?.toBase58();
  const storeBase58 = useMemo(
    () => (store ? translateAddress(store).toBase58() : undefined),
    [store]
  );

  const rawPositionsRef = useRef<Map<string, RawPosition>>(new Map());
  const computationCacheRef = useRef<
    Map<string, PositionComputationCacheEntry>
  >(new Map());
  // Bumped by the subscription handler every time the cache changes; drives
  // the derivation effect below.
  const [cacheVersion, bumpCache] = useReducer((n: number) => n + 1, 0);
  const [positionData, setPositionData] = useState<PositionEntry[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(Boolean(ownerBase58));
  const [error, setError] = useState<unknown>(null);

  // Subscription lifecycle.
  useEffect(() => {
    if (!ownerBase58 || !storeBase58) {
      rawPositionsRef.current.clear();
      computationCacheRef.current.clear();
      setPositionMap(new Map());
      bumpCache();
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);
    rawPositionsRef.current = new Map();
    computationCacheRef.current = new Map();
    setPositionMap(new Map());
    bumpCache();

    const client = getMarinClient();
    let disposed = false;
    let inSnapshot = false;
    let seenInSnapshot = new Set<string>();

    // Marin only emits `isLastSnapshot` on an actual record. An owner with
    // zero positions therefore receives no records at all, leaving us
    // permanently in the loading state. Fall back to a deadline so the UI
    // unblocks even when the snapshot is empty.
    const SNAPSHOT_DEADLINE_MS = 8000;
    const deadlineTimer = setTimeout(() => {
      if (disposed) return;
      setIsLoading(false);
    }, SNAPSHOT_DEADLINE_MS);

    const handleRecord = (record: PositionSubscriptionRecord) => {
      // Server begins replaying snapshot. Track which pubkeys are reasserted
      // so we can prune anything that was closed while we were disconnected.
      if (record.isSnapshot && !inSnapshot) {
        inSnapshot = true;
        seenInSnapshot = new Set();
      }

      // Skip stale out-of-order live updates. Snapshot and null-slot records
      // always pass through to preserve snapshot reconciliation correctness.
      if (!record.isSnapshot && record.slot !== null) {
        const existing = rawPositionsRef.current.get(record.pubkey);
        if (existing?.slot != null && existing.slot > record.slot) {
          return;
        }
      }

      if (record.data === null) {
        rawPositionsRef.current.delete(record.pubkey);
        computationCacheRef.current.delete(record.pubkey);
      } else {
        try {
          const buffer = Buffer.from(record.data, 'base64');
          const decoded = storeProgram.coder.accounts.decode(
            'position',
            buffer
          );
          rawPositionsRef.current.set(record.pubkey, {
            pubkey: record.pubkey,
            base64: record.data,
            decoded,
            slot: record.slot,
          });
        } catch (err) {
          console.error(
            '[marin] anchor decode error for position',
            record.pubkey,
            err
          );
          return;
        }
      }

      if (record.isSnapshot) {
        seenInSnapshot.add(record.pubkey);
      }

      if (record.isLastSnapshot) {
        inSnapshot = false;
        // Reconcile: drop cache entries that did not reappear in this
        // snapshot pass. They were closed while we were not subscribed.
        for (const pk of [...rawPositionsRef.current.keys()]) {
          if (!seenInSnapshot.has(pk)) {
            rawPositionsRef.current.delete(pk);
            computationCacheRef.current.delete(pk);
          }
        }
        setIsLoading(false);
      }
      // `hasLastSnapshot=false` is the marin signal that the endpoint will
      // not deliver a closing record. Clear the loading gate on first event.
      if (!record.hasLastSnapshot) {
        setIsLoading(false);
      }

      setPositionMap(toPositionBase64Map(rawPositionsRef.current));
      bumpCache();
    };

    const unsubscribe = client.subscribe<PositionsSubscriptionPayload>(
      {
        query: MARIN_POSITIONS_SUBSCRIPTION,
        variables: {
          owner: ownerBase58,
          store: storeBase58,
          withSnapshot: true,
        },
      },
      {
        next: ({ data }) => {
          if (disposed) return;
          const record = data?.positions;
          if (!record) return;
          handleRecord(record);
        },
        error: (err) => {
          console.error('[marin] positions subscription error', err);
          setError(err);
        },
        complete: () => {
          // graphql-ws auto-retries; resubscription will replay snapshot.
        },
      }
    );

    return () => {
      disposed = true;
      clearTimeout(deadlineTimer);
      unsubscribe();
    };
  }, [ownerBase58, storeBase58, storeProgram, setPositionMap]);

  // Pre-index marketInfo by marketToken for cheap lookup during derivation.
  const marketInfoByToken = useMemo(() => {
    const m = new Map<string, any>();
    for (const info of markets) {
      const key =
        typeof (info as any)?.marketToken === 'string'
          ? (info as any).marketToken
          : (info as any)?.marketToken?.toString?.();
      if (key) m.set(key, info);
    }
    return m;
  }, [markets]);

  // Derive the displayed array whenever the cache or any contributing
  // store slice changes. Using cacheVersion as the trigger ensures we react
  // to push events even though rawPositionsRef itself is a ref.
  useEffect(() => {
    if (!ownerBase58 || !storeBase58) {
      setPositionData((previous) => (previous.length === 0 ? previous : []));
      return;
    }
    const ordersList = Object.values(orders ?? {});
    const list: PositionEntry[] = [];
    const livePubkeys = new Set<string>();
    for (const raw of rawPositionsRef.current.values()) {
      livePubkeys.add(raw.pubkey);
      const entry = buildEntry({
        raw,
        marketInfoByToken,
        marketBase64Map,
        marketsState,
        tokenPriceMap,
        ordersList,
        owner: ownerBase58,
        store: storeBase58,
        computationCache: computationCacheRef.current,
      });
      if (entry) list.push(entry);
    }
    for (const pubkey of computationCacheRef.current.keys()) {
      if (!livePubkeys.has(pubkey)) {
        computationCacheRef.current.delete(pubkey);
      }
    }
    list.sort(
      (a, b) => Number(String(b.increasedAt)) - Number(String(a.increasedAt))
    );
    setPositionData((previous) => (isEqual(previous, list) ? previous : list));
  }, [
    cacheVersion,
    marketInfoByToken,
    marketBase64Map,
    marketsState,
    tokenPriceMap,
    orders,
    ownerBase58,
    storeBase58,
  ]);

  // No-op refresh: marin is push-driven. Provided for legacy call-site
  // parity (usePositionsData calls refresh() on user-driven mutates).
  const refresh = useMemo(() => () => undefined, []);

  return { positions: positionData, isLoading, error, refresh };
};

export type { Positions };

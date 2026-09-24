/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { Address, BN, translateAddress } from '@coral-xyz/anchor';
import { Market, Position as SdkPosition } from '@gmsol-labs/gmsol-sdk';
import { MemcmpFilter } from '@solana/web3.js';
import isEqual from 'lodash/isEqual';
import {
  useCallback,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
} from 'react';
import { useShallow } from 'zustand/react/shallow';

import { GMX_SOLANA_TOKENS } from '@/config/program';
import { ONE_USD } from '@/config/constants';
import { useAnchor, useStoreProgram } from '@/contexts/anchor';
import {
  correctLiquidationPrice,
  processPosition,
} from '@/hooks/fetchHooks/usePositions';
import { Markets } from '@/selectors/market/types';
import { Positions } from '@/selectors/position/types';
import {
  isLimitDecreaseOrderType,
  isMarketOrderShowType,
  isStopLossOrderType,
} from '@/utils/order/isOrderType';
import { isPendingMarketStateError } from '@/utils/position/isPendingMarketStateError';
import { useAppStore } from '@/zustand/useAppStore';

// Anchor discriminator of the `Position` account:
// sha256("account:Position")[0..8] = [170,188,143,228,122,64,247,208].
const POSITION_DISCRIMINATOR = 'VZMoMoKgZQb';
// Position account data layout:
// 0 discriminator, 8 bytes
// 8 version(u8) 
// 9 bump(u8)
// 10 store(pubkey)  
// 42 kind(u8) 
// 43 padding(13)  
// 56 owner(pubkey) 
// 88 market_token  
// 120 collateral_token.
const STORE_OFFSET = 10;
const OWNER_OFFSET = 56;
// Minimum interval between two refresh-triggered snapshots.
const REFRESH_MIN_INTERVAL_MS = 3000;

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

// Build the full position entry consumed by the position list UI. Same
// derivation as useMarinPositions.buildEntry, fed from RPC data instead of
// the marin subscription.
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
      console.error('[onchain] position decode failed', raw.pubkey, err);
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
    if (isPendingMarketStateError(err)) {
      // Position and market accounts from one transaction can arrive through
      // independent subscriptions. Show the raw position until market state
      // catches up, then this effect recomputes the derived values.
      priceUnavailable = true;
    } else {
      console.error('[onchain] position status compute failed', raw.pubkey, err);
      return null;
    }
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

interface UseOnChainPositionsResult {
  positions: any[];
  isLoading: boolean;
  error: unknown;
  refresh: () => void;
}

// Pure on-chain replacement for useMarinPositions: one getProgramAccounts
// snapshot on mount (and on refresh()), then a programSubscribe WebSocket
// with the same memcmp filters for incremental updates. Mirrors the marin
// hook's return shape so usePositionsData can consume it without changes.
export const useOnChainPositions = (
  store: Address | undefined,
  markets: Markets[],
  // Kept for legacy parity with usePositions' signature.
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _prevPositionsRef?: object,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _updatePosition?: boolean
): UseOnChainPositionsResult => {
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
  // Bumped on every cache change; drives the derivation effect below.
  const [cacheVersion, bumpCache] = useReducer((n: number) => n + 1, 0);
  const [positionData, setPositionData] = useState<PositionEntry[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(Boolean(ownerBase58));
  const [error, setError] = useState<unknown>(null);
  // refresh() re-runs the snapshot without tearing down the subscription.
  const loadSnapshotRef = useRef<() => void>(() => undefined);
  const lastSnapshotAtRef = useRef(0);
  const refreshTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Snapshot + subscription lifecycle.
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

    let disposed = false;
    const connection = storeProgram.provider.connection;
    const filters: MemcmpFilter[] = [
      { memcmp: { offset: 0, bytes: POSITION_DISCRIMINATOR } },
      { memcmp: { offset: STORE_OFFSET, bytes: storeBase58 } },
      { memcmp: { offset: OWNER_OFFSET, bytes: ownerBase58 } },
    ];

    // Decode and store one account. `slot` guards against out-of-order
    // updates (a stale snapshot must not clobber a fresher WS push).
    const applyAccount = (pubkey: string, data: Buffer, slot: number) => {
      const existing = rawPositionsRef.current.get(pubkey);
      if (existing?.slot != null && existing.slot > slot) return false;
      try {
        const decoded = storeProgram.coder.accounts.decode('position', data);
        rawPositionsRef.current.set(pubkey, {
          pubkey,
          base64: data.toString('base64'),
          decoded,
          slot,
        });
        return true;
      } catch (err) {
        console.error('[onchain] anchor decode error for position', pubkey, err);
        return false;
      }
    };

    const loadSnapshot = async () => {
      lastSnapshotAtRef.current = Date.now();
      try {
        const response = await connection.getProgramAccounts(
          storeProgram.programId,
          { filters, commitment: 'confirmed', withContext: true }
        );
        if (disposed) return;
        const snapshotSlot = response.context.slot;
        const seen = new Set<string>();
        let changed = false;
        for (const e of response.value) {
          const pubkey = e.pubkey.toBase58();
          seen.add(pubkey);
          if (applyAccount(pubkey, e.account.data, snapshotSlot)) {
            changed = true;
          }
        }
        // Reconcile: positions absent from the snapshot were closed while we
        // were not subscribed. Keep entries with a fresher slot (a WS push
        // that landed while the snapshot was in flight).
        for (const [pubkey, existing] of [...rawPositionsRef.current]) {
          if (
            !seen.has(pubkey) &&
            (existing.slot == null || existing.slot <= snapshotSlot)
          ) {
            rawPositionsRef.current.delete(pubkey);
            computationCacheRef.current.delete(pubkey);
            changed = true;
          }
        }
        setError(null);
        if (changed) {
          setPositionMap(toPositionBase64Map(rawPositionsRef.current));
        }
        bumpCache();
      } catch (err) {
        if (disposed) return;
        console.error('[onchain] positions snapshot failed', err);
        setError(err);
      } finally {
        if (!disposed) setIsLoading(false);
      }
    };

    loadSnapshotRef.current = () => void loadSnapshot();
    void loadSnapshot();

    // Closed accounts no longer match the memcmp filters and emit no event,
    // but a position is always decreased to sizeInUsd=0 first (which does
    // emit), so the UI hides it before the account itself goes away.
    const subscriptionId = connection.onProgramAccountChange(
      storeProgram.programId,
      (info, context) => {
        if (disposed) return;
        if (
          applyAccount(
            info.accountId.toBase58(),
            info.accountInfo.data,
            context.slot
          )
        ) {
          setPositionMap(toPositionBase64Map(rawPositionsRef.current));
          bumpCache();
        }
      },
      { commitment: 'confirmed', filters }
    );

    return () => {
      disposed = true;
      loadSnapshotRef.current = () => undefined;
      if (refreshTimerRef.current) {
        clearTimeout(refreshTimerRef.current);
        refreshTimerRef.current = null;
      }
      void connection
        .removeProgramAccountChangeListener(subscriptionId)
        .catch(() => undefined);
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
  // store slice changes.
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

  // Throttled: upstream events (e.g. the trade-event log listener) can ask
  // for refreshes in bursts, and the WS account subscription already keeps
  // the data fresh; the snapshot is only a reconciliation safety net.
  const refresh = useCallback(() => {
    const elapsed = Date.now() - lastSnapshotAtRef.current;
    if (elapsed >= REFRESH_MIN_INTERVAL_MS) {
      loadSnapshotRef.current();
    } else if (!refreshTimerRef.current) {
      refreshTimerRef.current = setTimeout(() => {
        refreshTimerRef.current = null;
        loadSnapshotRef.current();
      }, REFRESH_MIN_INTERVAL_MS - elapsed);
    }
  }, []);

  return { positions: positionData, isLoading, error, refresh };
};

export type { Positions };

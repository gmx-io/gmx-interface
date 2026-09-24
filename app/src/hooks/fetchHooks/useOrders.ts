import useSWR from "swr";
import { useEffect, useRef, useCallback } from "react";
import { GMX_SOLANA_MARKET_TOKENS, GMX_SOLANA_STORE_ADDRESS, GMX_SOLANA_TOKENS_RAW } from "@/config/program";
import { useAppStore } from "@/zustand/useAppStore";
import { useWallet } from "@solana/wallet-adapter-react";
import { useShallow } from "zustand/react/shallow";
import { useAnchor, useStoreProgram } from "@/contexts/anchor";
import { isOrderForFetching } from "@/utils/order/isOrderType";
import { getOrderTypeFromOrderKind } from "@/utils/order/getOrderTypeFromOrderKind";
import { utils, translateAddress, BN } from "@coral-xyz/anchor";
import { MemcmpFilter, PublicKey } from "@solana/web3.js";
import { BaseOrder, Order, OrderKind } from "@/selectors/order/types";

type MarketSummary = { indexToken: string; marketToken: string };
import { optionalAccount } from "gmsol";
import { DEFAULT_SWR_REFRESH_INTERVAL_15S } from '@/config/ui';

// import { isMarketOrderShowType } from '@/utils/order/isOrderType';

type OptionalAccount = (account: PublicKey | null | undefined) => PublicKey | null;
const typedOptionalAccount = optionalAccount as OptionalAccount;

interface OrderTokens {
  initialCollateral: { token: PublicKey };
  longToken: { token: PublicKey };
  shortToken: { token: PublicKey };
  finalOutputToken: { token: PublicKey };
}

interface OrderParams {
  side: number;
  position: PublicKey;
  collateralToken: PublicKey;
  kind: OrderKind;
  acceptablePrice: BN;
  sizeDeltaValue: BN;
  initialCollateralDeltaAmount: BN;
  triggerPrice: BN;
  minOutput: BN;
}

interface HeaderItem {
  updatedAt: BN;
}

interface OrderAccount {
  marketToken: PublicKey;
  tokens: OrderTokens;
  params: OrderParams;
  swap: { paths: PublicKey[]; primaryLength: number; secondaryLength: number };
  header: HeaderItem;
}

const ORDERS_KEY = 'data_store/orders';

function processOrder(
  orderAccount: OrderAccount | null,
  orderAddress: PublicKey,
  owner: PublicKey | string
): BaseOrder | null {
  if (!orderAccount) return null;

  const order = orderAccount;
  const isLong = order.params.side === 0;
  const swap = order.swap;
  const kind = order.params.kind;
  if (kind === undefined || kind < 0 || kind > 8) return null;
  if (!isOrderForFetching(kind)) return null;

  return {
    owner: translateAddress(owner),
    orderAddress,
    orderRelatedPositionAddress: typedOptionalAccount(order.params.position),
    marketTokenAddress: order.marketToken,
    initialCollateralTokenAddress: order.tokens.initialCollateral.token,
    collateralTokenAddress: order.params.collateralToken,
    longTokenAddress: order.tokens.longToken.token,
    shortTokenAddress: order.tokens.shortToken.token,
    finalOutputTokenAddress: typedOptionalAccount(order.tokens.finalOutputToken.token),
    isLong,
    orderType: getOrderTypeFromOrderKind(kind),
    acceptablePrice: order.params.acceptablePrice,
    sizeDeltaUsd: order.params.sizeDeltaValue,
    initialCollateralDeltaAmount: order.params.initialCollateralDeltaAmount,
    triggerPrice: order.params.triggerPrice,
    minOutputAmount: order.params.minOutput,
    primarySwapPath: swap.paths.slice(0, swap.primaryLength).map((key) => key.toBase58()),
  } satisfies BaseOrder;
}

export const useOrders = ({
  pollingEnabled = true,
}: {
  pollingEnabled?: boolean;
} = {}) => {
  const { connected } = useWallet();
  const { owner } = useAnchor();
  const storeProgram = useStoreProgram();

  const { markets, sortedIndexTokens } = useAppStore(
    useShallow((state) => ({
      markets: state.markets.markets,
      sortedIndexTokens: state.indexTokens.sortedIndexTokens,
    }))
  );

  // ========== fetcher ==========
  const fetchOrders = useCallback(async () => {
    if (!connected || !owner) return {};

    const ORDER_DISCRIMATOR = "PXZJQQ2HEmx";
    const DISCRIMATOR_LENGTH = 8;
    const SELECTOR_OFFSET = 16;

    const selector = Buffer.concat([owner.toBytes()]);
    const filters: MemcmpFilter[] = [
      { memcmp: { offset: 0, bytes: ORDER_DISCRIMATOR } },
      {
        memcmp: {
          offset: DISCRIMATOR_LENGTH + SELECTOR_OFFSET + 64,
          bytes: utils.bytes.bs58.encode(selector),
          encoding: "base58",
        },
      },
    ];

    const accounts = await storeProgram.provider.connection.getProgramAccounts(storeProgram.programId, { filters });

    const marketInfoMap = markets.reduce((acc, cur) => {
      acc[cur.marketToken] = cur;
      return acc;
    }, {} as Record<string, MarketSummary>);

    const orders: Record<string, Order> = {};
    accounts.forEach((e) => {
      const order: OrderAccount = storeProgram.coder.accounts.decode("order", e.account.data);
      const processedOrder = processOrder(order, e.pubkey, owner);
      if (processedOrder && processedOrder.orderAddress) {
        const marketSummary = marketInfoMap[processedOrder.marketTokenAddress.toBase58()];
        orders[processedOrder.orderAddress.toBase58()] = {
          ...processedOrder,
          marketSummary,
          marketInfo: marketSummary,
          kind: new BN(order.params.kind),
          time: order?.header?.updatedAt,
          inSymbol: GMX_SOLANA_TOKENS_RAW[processedOrder.initialCollateralTokenAddress?.toString()]?.symbol || "",
          outSymbol: GMX_SOLANA_TOKENS_RAW[processedOrder.finalOutputTokenAddress?.toString()]?.symbol || "",
          positionAddress: order.params.position,
        };
      }
    });

    const entries = Object.entries(orders);

    // entries = entries.filter(([_, order]) => {
    //   return isMarketOrderShowType(order?.orderType);
    // });

    entries.sort((a, b) => {
      const bnA = a[1].kind;
      const bnB = b[1].kind;
      const ret = bnB.cmp(bnA);
      if (ret === 0) return a[1].time.cmp(b[1].time);
      return ret;
    });

    return Object.fromEntries(entries);
  }, [connected, owner, markets, storeProgram]);

  const { data, error, isLoading, mutate } = useSWR(
    ORDERS_KEY,
    fetchOrders,
    {
      refreshInterval: pollingEnabled ? DEFAULT_SWR_REFRESH_INTERVAL_15S : 0,
      revalidateOnFocus: false,
      onSuccess: (data) => {
        // console.log('orders fetch success', data);
      },
    }
  );

  return {
    orders: data ?? {},
    isLoading,
    error,
    refresh: mutate,
  };
};

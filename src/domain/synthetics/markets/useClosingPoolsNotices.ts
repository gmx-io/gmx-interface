import { useCallback, useMemo, useReducer } from "react";

import { USD_DECIMALS } from "config/factors";
import { CLOSING_POOLS_NOTICE_SEEN_KEY_PREFIX } from "config/localStorage";
import { QA_ACCOUNT, isQaMockOn } from "config/qaMocks";
import { MARKET_CLOSING_DATES, hasClosingMarkets } from "config/static/markets";
import { useMarketsInfoRequest } from "domain/synthetics/markets";
import { useOrdersInfoRequest } from "domain/synthetics/orders/useOrdersInfo";
import { usePositions } from "domain/synthetics/positions";
import { useTokensDataRequest } from "domain/synthetics/tokens";
import { useChainId } from "lib/chains";
import { expandDecimals } from "lib/numbers";
import { EMPTY_ARRAY } from "lib/objects";
import { Storage } from "lib/storage/Storage";
import useWallet from "lib/wallets/useWallet";

import {
  ClosingMarketExposure,
  ClosingNoticeSeenStages,
  ClosingPoolsNotice,
  getClosingMarketsExposure,
  getClosingPoolsNotices,
} from "./closingPoolsNotices";

function getQaExposures(chainId: number): ClosingMarketExposure[] {
  const marketAddress = Object.keys(MARKET_CLOSING_DATES[chainId] ?? {})[0] ?? "qa-closing-market";
  return [
    {
      marketAddress,
      name: "NEAR",
      closingDate: Date.UTC(2026, 11, 15),
      isClosed: false,
      isLastDay: false,
      hasPosition: true,
      orderKeys: ["qa-order"],
      exposureUsd: expandDecimals(5_000, USD_DECIMALS),
    },
  ];
}

export function useClosingPoolsNotices(): {
  notices: ClosingPoolsNotice[];
  isLoading: boolean;
  markSeen: (notice: ClosingPoolsNotice) => void;
} {
  const { account } = useWallet();
  const { chainId, srcChainId } = useChainId();
  const enabled = Boolean(account) && hasClosingMarkets(chainId);

  const { tokensData } = useTokensDataRequest(chainId, srcChainId);
  const { marketsInfoData } = useMarketsInfoRequest(chainId, { tokensData });

  const { positionsData } = usePositions(chainId, {
    marketsData: marketsInfoData,
    tokensData,
    account,
    enabled,
  });

  const { ordersInfoData } = useOrdersInfoRequest(chainId, {
    account: enabled ? account : undefined,
    marketsInfoData,
    tokensData,
  });

  const isQa = isQaMockOn("funds");

  const storage = useMemo(
    () =>
      enabled || isQa
        ? new Storage<ClosingNoticeSeenStages>(
            `${CLOSING_POOLS_NOTICE_SEEN_KEY_PREFIX}-${chainId}-${isQa ? QA_ACCOUNT : account}`
          )
        : undefined,
    [account, chainId, enabled, isQa]
  );

  const [, forceRerender] = useReducer((count: number) => count + 1, 0);

  const notices =
    isQa && storage
      ? getClosingPoolsNotices(getQaExposures(chainId), storage.getState())
      : storage && positionsData && ordersInfoData
        ? getClosingPoolsNotices(
            getClosingMarketsExposure({ chainId, positionsData, ordersInfoData, marketsInfoData, now: Date.now() }),
            storage.getState()
          )
        : EMPTY_ARRAY;

  const markSeen = useCallback(
    (notice: ClosingPoolsNotice) => {
      if (!storage) {
        return;
      }

      for (const [key, stages] of Object.entries(notice.seenStages)) {
        storage.set(key, stages);
      }

      forceRerender();
    },
    [storage]
  );

  return { notices, isLoading: !isQa && enabled && (!positionsData || !ordersInfoData), markSeen };
}

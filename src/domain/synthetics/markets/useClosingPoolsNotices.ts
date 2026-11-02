import { useCallback, useMemo, useReducer } from "react";

import { CLOSING_POOLS_NOTICE_SEEN_KEY_PREFIX } from "config/localStorage";
import { hasClosingMarkets } from "config/static/markets";
import { useMarketsInfoRequest } from "domain/synthetics/markets";
import { useOrdersInfoRequest } from "domain/synthetics/orders/useOrdersInfo";
import { usePositions } from "domain/synthetics/positions";
import { useTokensDataRequest } from "domain/synthetics/tokens";
import { useChainId } from "lib/chains";
import { EMPTY_ARRAY } from "lib/objects";
import { Storage } from "lib/storage/Storage";
import useWallet from "lib/wallets/useWallet";

import {
  ClosingNoticeSeenStages,
  ClosingPoolsNotice,
  getClosingMarketsExposure,
  getClosingPoolsNotices,
} from "./closingPoolsNotices";

export function useClosingPoolsNotices(): {
  notices: ClosingPoolsNotice[];
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

  const storage = useMemo(
    () =>
      enabled
        ? new Storage<ClosingNoticeSeenStages>(`${CLOSING_POOLS_NOTICE_SEEN_KEY_PREFIX}-${chainId}-${account}`)
        : undefined,
    [account, chainId, enabled]
  );

  const [, forceRerender] = useReducer((count: number) => count + 1, 0);

  const notices =
    storage && positionsData && ordersInfoData
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

  return { notices, markSeen };
}

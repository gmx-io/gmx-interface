import { useCallback, useEffect, useState } from "react";

import { useSettings } from "context/SettingsContext/SettingsContextProvider";
import { OrderType } from "domain/synthetics/orders";
import { convertToUsd } from "domain/tokens";
import { useLocalStorageSerializeKey } from "lib/localStorage";
import { getBasisPoints } from "lib/numbers";
import { EMPTY_ARRAY } from "lib/objects";
import { PositionTradeAction, TradeActionType, isPositionTradeAction } from "sdk/types/tradeHistory";

import { useTradeHistory } from "./useTradeHistory";

const POSITION_SHARE_MIN_PNL_THRESHOLD_BPS = 1000n;
const MAX_NOT_INTERACTED_VIEW_COUNT = 5;
const LAST_HOUR_MS = 60 * 60 * 1000;

const ORDER_EVENT_COMBINATIONS = [
  {
    eventName: TradeActionType.OrderExecuted,
    orderType: [OrderType.MarketDecrease],
  },
];

type ShareSuccessClosedPositionResult = {
  tradeAction: PositionTradeAction | null;
  isShareModalOpen: boolean;
  setIsShareModalOpen: (isOpen: boolean) => void;
  doNotShowAgain: boolean;
  onDoNotShowAgainChange: (value: boolean) => void;
  onShareAction: () => void;
};

export function useShareSuccessClosedPosition({
  chainId,
  account,
}: {
  chainId: number;
  account: string | null | undefined;
}): ShareSuccessClosedPositionResult {
  const [shareTradeAction, setShareTradeAction] = useState<PositionTradeAction | null>(null);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [hasShareModalInteraction, setHasShareModalInteraction] = useState(false);
  const { shouldDisableShareModalPnlCheck } = useSettings();

  const [doNotShowShareAgain, setDoNotShowShareAgain] = useLocalStorageSerializeKey<boolean>(
    "position-share-do-not-show-again",
    false
  );
  const [_notInteractedShareViewCount, setNotInteractedShareViewCount] = useLocalStorageSerializeKey<number>(
    "position-share-not-interacted-view-count",
    0
  );
  const [_seenTradeActionsIds, setSeenTradeActionsIds] = useLocalStorageSerializeKey<string[]>(
    "position-share-seen-trade-actions-ids",
    []
  );
  const seenTradeActionsIds = _seenTradeActionsIds ?? EMPTY_ARRAY;
  const notInteractedShareViewCount = _notInteractedShareViewCount ?? 0;

  const { tradeActions } = useTradeHistory(chainId, {
    account,
    pageSize: 5,
    orderEventCombinations: ORDER_EVENT_COMBINATIONS,
    refreshInterval: 1000,
  });

  useEffect(() => {
    setShareTradeAction(null);
    setIsShareModalOpen(false);
    setHasShareModalInteraction(false);
  }, [account, chainId]);

  const shouldShowShareModal = useCallback(
    (tradeAction: PositionTradeAction) => {
      if (
        doNotShowShareAgain ||
        notInteractedShareViewCount >= MAX_NOT_INTERACTED_VIEW_COUNT ||
        seenTradeActionsIds.includes(tradeAction.id)
      ) {
        return false;
      }

      if (tradeAction.timestamp * 1000 < Date.now() - LAST_HOUR_MS) {
        return false;
      }

      if (shouldDisableShareModalPnlCheck) {
        return true;
      }

      const collateralUsd =
        convertToUsd(
          tradeAction.initialCollateralDeltaAmount,
          tradeAction.initialCollateralToken.decimals,
          tradeAction.initialCollateralToken.prices.minPrice
        ) ?? 0n;

      const pnlAfterFeesBps = getBasisPoints(tradeAction.pnlUsd ?? 0n, collateralUsd);

      return pnlAfterFeesBps >= POSITION_SHARE_MIN_PNL_THRESHOLD_BPS;
    },
    [doNotShowShareAgain, notInteractedShareViewCount, seenTradeActionsIds, shouldDisableShareModalPnlCheck]
  );

  useEffect(() => {
    if (!tradeActions || !tradeActions.length) {
      return;
    }

    if (isShareModalOpen) {
      return;
    }

    const newActions: PositionTradeAction[] = [];

    for (const tradeAction of tradeActions) {
      if (
        isPositionTradeAction(tradeAction) &&
        tradeAction.eventName === TradeActionType.OrderExecuted &&
        tradeAction.orderType === OrderType.MarketDecrease
      ) {
        newActions.push(tradeAction);
      }
    }

    const actionToShare = newActions.find(shouldShowShareModal);

    if (!actionToShare) {
      return;
    }

    setSeenTradeActionsIds([...seenTradeActionsIds, actionToShare.id]);
    setShareTradeAction(actionToShare);
    setHasShareModalInteraction(false);
    setIsShareModalOpen(true);
  }, [isShareModalOpen, shouldShowShareModal, tradeActions, seenTradeActionsIds, setSeenTradeActionsIds]);

  const handleShareModalVisibilityChange = useCallback(
    (isOpen: boolean) => {
      setIsShareModalOpen(isOpen);

      if (isOpen) {
        setHasShareModalInteraction(false);
        return;
      }

      if (!shareTradeAction) {
        return;
      }

      setNotInteractedShareViewCount(hasShareModalInteraction ? 0 : notInteractedShareViewCount + 1);

      setShareTradeAction(null);
      setHasShareModalInteraction(false);
    },
    [hasShareModalInteraction, setNotInteractedShareViewCount, shareTradeAction, notInteractedShareViewCount]
  );

  const handleShareAction = useCallback(() => {
    setHasShareModalInteraction(true);
  }, []);

  return {
    tradeAction: shareTradeAction,
    isShareModalOpen,
    setIsShareModalOpen: handleShareModalVisibilityChange,
    doNotShowAgain: doNotShowShareAgain ?? false,
    onDoNotShowAgainChange: setDoNotShowShareAgain,
    onShareAction: handleShareAction,
  };
}

import { t } from "@lingui/macro";
import { useSidecarOrders } from "domain/synthetics/sidecarOrders/useSidecarOrders";
import type { TradeStage } from "domain/synthetics/trade/useTradeboxState";

import {
  selectTradeboxMarkPrice,
  selectTradeboxTradeFlags,
  selectTradeboxTriggerPrice,
} from "context/SyntheticsStateContext/selectors/tradeboxSelectors";
import { useSelector } from "context/SyntheticsStateContext/utils";
import { useSidecarEntries } from "domain/synthetics/sidecarOrders/useSidecarEntries";
import { useMemo } from "react";
import { useDecreaseOrdersThatWillBeExecuted } from "./useDecreaseOrdersThatWillBeExecuted";

export function useTradeboxButtonState({
  stage,
  isTriggerWarningAccepted,
  text,
  error,
}: {
  stage: TradeStage;
  isTriggerWarningAccepted: boolean;
  text: string;
  error: string | undefined;
}) {
  const tradeFlags = useSelector(selectTradeboxTradeFlags);
  const markPrice = useSelector(selectTradeboxMarkPrice);
  const triggerPrice = useSelector(selectTradeboxTriggerPrice);
  const { stopLoss, takeProfit } = useSidecarOrders();
  const sidecarEntries = useSidecarEntries();

  const { isIncrease, isLimit, isLong } = tradeFlags;

  const decreaseOrdersThatWillBeExecuted = useDecreaseOrdersThatWillBeExecuted();

  return useMemo(() => {
    if (error) {
      return {
        text: error,
        disabled: true,
      };
    }

    if (stopLoss.error?.percentage || takeProfit.error?.percentage) {
      return {
        text: t`TP/SL orders exceed the position`,
        disabled: true,
      };
    }

    if (isLimit) {
      if (isLong) {
        if (markPrice !== undefined && triggerPrice !== undefined && triggerPrice > markPrice) {
          return {
            text: t`Limit price above Mark Price`,
            disabled: true,
          };
        }
      } else {
        if (markPrice !== undefined && triggerPrice !== undefined && triggerPrice < markPrice) {
          return {
            text: t`Limit price below Mark Price`,
            disabled: true,
          };
        }
      }
    }

    if (stage === "processing") {
      return {
        text: t`Creating Order...`,
        disabled: true,
      };
    }

    if (isIncrease && decreaseOrdersThatWillBeExecuted.length > 0 && !isTriggerWarningAccepted) {
      return {
        text: t`Accept confirmation of trigger orders`,
        disabled: true,
      };
    }

    if (isIncrease && sidecarEntries.length > 0) {
      const isError = sidecarEntries.some((e) => {
        if (e.txnType === "cancel") return false;

        return e.sizeUsd?.error || e.percentage?.error || e.price?.error;
      });

      return {
        text,
        disabled: isError,
      };
    }

    return {
      text,
      disabled: false,
    };
  }, [
    isIncrease,
    decreaseOrdersThatWillBeExecuted.length,
    isLimit,
    isLong,
    sidecarEntries,
    stopLoss,
    takeProfit,
    markPrice,
    triggerPrice,
    stage,
    text,
    isTriggerWarningAccepted,
    error,
  ]);
}

import { t } from "@lingui/macro";
import {
  useTradeboxMarkPrice,
  useTradeboxTradeFlags,
  useTradeboxTriggerPrice,
} from "context/SyntheticsStateContext/hooks/tradeboxHooks";
import { useSidecarOrders } from "domain/synthetics/sidecarOrders/useSidecarOrders";
import type { TradeStage } from "domain/synthetics/trade/useTradeboxState";

import { useMemo } from "react";
import { useDecreaseOrdersThatWillBeExecuted } from "./useDecreaseOrdersThatWillBeExecuted";

export function useTradeboxButtonState({
  stage,
  consentError,
  isTriggerWarningAccepted,
  text,
}: {
  stage: TradeStage;
  consentError: string | null;
  isTriggerWarningAccepted: boolean;
  text: string;
}) {
  const tradeFlags = useTradeboxTradeFlags();
  const markPrice = useTradeboxMarkPrice();
  const triggerPrice = useTradeboxTriggerPrice();
  const { stopLoss, takeProfit, limit } = useSidecarOrders();
  const { isIncrease, isLimit, isLong } = tradeFlags;

  const sidecarEntries = useMemo(
    () => [...(stopLoss?.entries || []), ...(takeProfit?.entries || []), ...(limit?.entries || [])],
    [stopLoss, takeProfit, limit]
  );

  const decreaseOrdersThatWillBeExecuted = useDecreaseOrdersThatWillBeExecuted();

  return useMemo(() => {
    if (consentError) {
      return {
        text: consentError,
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
    consentError,
    stage,
    text,
    isTriggerWarningAccepted,
  ]);
}

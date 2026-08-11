import { Trans } from "@lingui/macro";
import { useCallback } from "react";

import { usePositionEditorOpenAtPrice } from "context/SyntheticsStateContext/hooks/positionEditorHooks";
import {
  selectTradeboxFromToken,
  selectTradeboxFromTokenAmount,
  selectTradeboxFromTokenInputValue,
  selectTradeboxSelectedPosition,
  selectTradeboxSelectedPositionKey,
  selectTradeboxTradeFlags,
  selectTradeboxTradeMode,
  selectTradeboxTriggerPrice,
  selectTradeboxTriggerPriceInputValue,
} from "context/SyntheticsStateContext/selectors/tradeboxSelectors";
import { useSelector } from "context/SyntheticsStateContext/utils";
import { TradeMode } from "sdk/utils/trade/types";

import { AlertInfoCard } from "components/AlertInfo/AlertInfoCard";
import { ColorfulButtonLink } from "components/ColorfulBanner/ColorfulBanner";

import { getTradeboxMarginDepositPrefill } from "./tradeboxMarginDepositPrefill";

export function MarginDepositSuggestionCard({ onClose }: { onClose: () => void }) {
  const tradeMode = useSelector(selectTradeboxTradeMode);
  const { isPosition, isIncrease, isTwap } = useSelector(selectTradeboxTradeFlags);
  const positionKey = useSelector(selectTradeboxSelectedPositionKey);
  const position = useSelector(selectTradeboxSelectedPosition);

  const fromToken = useSelector(selectTradeboxFromToken);
  const fromTokenInputValue = useSelector(selectTradeboxFromTokenInputValue);
  const fromTokenAmount = useSelector(selectTradeboxFromTokenAmount);
  const triggerPriceInputValue = useSelector(selectTradeboxTriggerPriceInputValue);
  const triggerPrice = useSelector(selectTradeboxTriggerPrice);

  const openAtPrice = usePositionEditorOpenAtPrice();

  const handleDepositAtPrice = useCallback(() => {
    if (positionKey === undefined) {
      return;
    }

    const prefill = getTradeboxMarginDepositPrefill({
      payToken: fromToken,
      payTokenInputValue: fromTokenInputValue,
      payTokenAmount: fromTokenAmount,
      positionCollateralToken: position?.collateralToken,
      triggerPriceInputValue,
      triggerPrice,
    });

    openAtPrice({
      positionKey,
      collateralInputValue: prefill.collateralInputValue,
      triggerPriceInputValue: prefill.triggerPriceInputValue,
    });
  }, [
    fromToken,
    fromTokenAmount,
    fromTokenInputValue,
    openAtPrice,
    position?.collateralToken,
    positionKey,
    triggerPrice,
    triggerPriceInputValue,
  ]);

  // Only limit increases on an existing position; stop market shares the isLimit flag and must not show the card.
  // Size, margin and trigger price values do not matter, dismissal is the only way to hide the card.
  const isEligible = tradeMode === TradeMode.Limit && isPosition && isIncrease && !isTwap && position !== undefined;

  if (!isEligible) {
    return null;
  }

  return (
    <AlertInfoCard onClose={onClose}>
      <Trans>Want to add margin without increasing your position size?</Trans>
      <ColorfulButtonLink color="blue" onClick={handleDepositAtPrice}>
        <Trans>Deposit margin at price</Trans>
      </ColorfulButtonLink>
    </AlertInfoCard>
  );
}

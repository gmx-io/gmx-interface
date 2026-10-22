import { Trans } from "@lingui/macro";
import { ReactNode, useCallback } from "react";
import { useHistory } from "react-router-dom";

import { selectTokensData } from "context/SyntheticsStateContext/selectors/globalSelectors";
import {
  selectTradeboxCollateralTokenAddress,
  selectTradeboxFromToken,
  selectTradeboxFromTokenAmount,
} from "context/SyntheticsStateContext/selectors/tradeboxSelectors";
import {
  selectTradeboxIsUsdgConversionTooLarge,
  selectTradeboxUsdgMaxInstantAmount,
} from "context/SyntheticsStateContext/selectors/tradeboxSelectors/tradeboxUsdgConversionSelectors";
import { useSelector } from "context/SyntheticsStateContext/utils";
import { formatMaxInstantAmount } from "domain/synthetics/usdgPools/usdcConversion";
import { formatAmountFree } from "lib/numbers";

import { EmbeddedActionButton } from "components/Button/EmbeddedActionButton";

export type TradeboxUsdgConversion = ReturnType<typeof useTradeboxUsdgConversion>;

/**
 * USDG pools take only USDG: a USDC margin converts inside the order through our pool or the aggregator,
 * and when neither can fill the trader needs the instant limit instead of a bare "No swap path found"
 */
export function useTradeboxUsdgConversion({
  setFromTokenInputValue,
  setFocusedInput,
}: {
  setFromTokenInputValue: (value: string, resetPriceImpactAndSwapSlippage?: boolean) => void;
  setFocusedInput: (input: "from" | "to") => void;
}) {
  const history = useHistory();
  const tokensData = useSelector(selectTokensData);
  const collateralTokenAddress = useSelector(selectTradeboxCollateralTokenAddress);
  const fromToken = useSelector(selectTradeboxFromToken);
  const fromTokenAmount = useSelector(selectTradeboxFromTokenAmount);
  const isTooLarge = useSelector(selectTradeboxIsUsdgConversionTooLarge);
  const maxInstantAmount = useSelector(selectTradeboxUsdgMaxInstantAmount);
  const usdgToken = collateralTokenAddress ? tokensData?.[collateralTokenAddress] : undefined;

  const onUseMaxInstant = useCallback(() => {
    if (maxInstantAmount === undefined || !fromToken) return;

    setFocusedInput("from");
    setFromTokenInputValue(formatAmountFree(maxInstantAmount, fromToken.decimals), true);
  }, [fromToken, maxInstantAmount, setFocusedInput, setFromTokenInputValue]);

  const onConvertWithPaxos = useCallback(() => {
    if (!fromToken || !usdgToken || fromTokenAmount === undefined) return;

    history.push(
      `/trade/swap?mode=market&from=${fromToken.symbol}&to=${usdgToken.symbol}&amount=${formatAmountFree(
        fromTokenAmount,
        fromToken.decimals
      )}`
    );
  }, [fromToken, fromTokenAmount, history, usdgToken]);

  const maxInstantText =
    maxInstantAmount !== undefined && fromToken ? formatMaxInstantAmount(fromToken, maxInstantAmount) : undefined;

  let tooLargeAlert: ReactNode = undefined;

  if (isTooLarge && maxInstantAmount !== undefined && maxInstantAmount > 0n) {
    tooLargeAlert = (
      <Trans>
        Up to {maxInstantText} can be converted instantly.{" "}
        <EmbeddedActionButton tone="link" onClick={onUseMaxInstant}>
          Use max instant
        </EmbeddedActionButton>
        , or{" "}
        <EmbeddedActionButton tone="link" onClick={onConvertWithPaxos}>
          convert with Paxos first
        </EmbeddedActionButton>{" "}
        in the Swap tab: a one-time conversion, 2 to 10 min or longer. Trades paid in USDG need no conversion.
      </Trans>
    );
  } else if (isTooLarge && maxInstantAmount !== undefined) {
    tooLargeAlert = (
      <Trans>
        Nothing can be converted instantly right now.{" "}
        <EmbeddedActionButton tone="link" onClick={onConvertWithPaxos}>
          Convert with Paxos first
        </EmbeddedActionButton>{" "}
        in the Swap tab: a one-time conversion, 2 to 10 min or longer. Trades paid in USDG need no conversion.
      </Trans>
    );
  }

  return {
    tooLargeAlert,
  };
}

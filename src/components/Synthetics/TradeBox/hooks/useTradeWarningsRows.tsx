import { t } from "@lingui/macro";
import { ApproveTokenButton } from "components/ApproveTokenButton/ApproveTokenButton";
import { HighPriceImpactWarning } from "components/Synthetics/HighPriceImpactWarning/HighPriceImpactWarning";
import { getContract } from "config/contracts";
import { useTokensData } from "context/SyntheticsStateContext/hooks/globalsHooks";
import {
  selectTradeboxExecutionFee,
  selectTradeboxFromTokenAddress,
  selectTradeboxIncreasePositionAmounts,
  selectTradeboxIsWrapOrUnwrap,
  selectTradeboxSwapAmounts,
  selectTradeboxTradeFlags,
} from "context/SyntheticsStateContext/selectors/tradeboxSelectors";
import { useSelector } from "context/SyntheticsStateContext/utils";
import { getNeedTokenApprove, useTokensAllowanceData } from "domain/synthetics/tokens";
import { useHighExecutionFeeConsent } from "domain/synthetics/trade/useHighExecutionFeeConsent";
import { usePriceImpactWarningState } from "domain/synthetics/trade/usePriceImpactWarningState";
import { useChainId } from "lib/chains";
import { getByKey } from "lib/objects";
import { useMemo } from "react";

export function useTradeboxWarningsRows(priceImpactWarningState: ReturnType<typeof usePriceImpactWarningState>) {
  const tokenData = useTokensData();
  const { chainId } = useChainId();
  const fromTokenAddress = useSelector(selectTradeboxFromTokenAddress);
  const tradeFlags = useSelector(selectTradeboxTradeFlags);
  const fromToken = getByKey(tokenData, fromTokenAddress);
  const increaseAmounts = useSelector(selectTradeboxIncreasePositionAmounts);
  const isWrapOrUnwrap = useSelector(selectTradeboxIsWrapOrUnwrap);
  const swapAmounts = useSelector(selectTradeboxSwapAmounts);
  const executionFee = useSelector(selectTradeboxExecutionFee);
  const { tokensAllowanceData } = useTokensAllowanceData(chainId, {
    spenderAddress: getContract(chainId, "SyntheticsRouter"),
    tokenAddresses: fromToken ? [fromToken.address] : [],
    skip: false,
  });

  const { isSwap, isIncrease } = tradeFlags;

  const payAmount = useMemo(() => {
    if (isSwap && !isWrapOrUnwrap) {
      return swapAmounts?.amountIn;
    }
    if (isIncrease) {
      return increaseAmounts?.initialCollateralAmount;
    }
  }, [increaseAmounts?.initialCollateralAmount, isIncrease, isSwap, isWrapOrUnwrap, swapAmounts?.amountIn]);

  const needPayTokenApproval =
    tokensAllowanceData &&
    fromToken &&
    payAmount !== undefined &&
    getNeedTokenApprove(tokensAllowanceData, fromToken.address, payAmount);

  const { element: highExecutionFeeAcknowledgement, isHighFeeConsentError } = useHighExecutionFeeConsent(
    executionFee?.feeUsd
  );

  const consentError: string | undefined = useMemo(() => {
    if (highExecutionFeeAcknowledgement && isHighFeeConsentError) {
      return t`High Network Fee not yet acknowledged`;
    }

    if (
      (priceImpactWarningState.shouldShowWarningForPosition && !priceImpactWarningState.isHighPositionImpactAccepted) ||
      (priceImpactWarningState.shouldShowWarningForSwap && !priceImpactWarningState.isHighSwapImpactAccepted)
    ) {
      return t`Price Impact not yet acknowledged`;
    }

    if (needPayTokenApproval && fromToken) {
      return t`Pending ${fromToken?.assetSymbol ?? fromToken?.symbol} approval`;
    }

    return undefined;
  }, [
    fromToken,
    needPayTokenApproval,
    priceImpactWarningState,
    highExecutionFeeAcknowledgement,
    isHighFeeConsentError,
  ]);

  const element = (
    <>
      <HighPriceImpactWarning priceImpactWarningState={priceImpactWarningState} />
      {highExecutionFeeAcknowledgement}
      {(needPayTokenApproval && fromToken && (
        <ApproveTokenButton
          tokenAddress={fromToken.address}
          tokenSymbol={fromToken.assetSymbol ?? fromToken.symbol}
          spenderAddress={getContract(chainId, "SyntheticsRouter")}
        />
      )) ||
        null}
    </>
  );

  return [element, consentError] as const;
}

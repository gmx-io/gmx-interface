import { t } from "@lingui/macro";
import { ApproveTokenButton } from "components/ApproveTokenButton/ApproveTokenButton";
import { HighPriceImpactWarning } from "components/Synthetics/HighPriceImpactWarning/HighPriceImpactWarning";
import { getContract } from "config/contracts";
import { useTokensData } from "context/SyntheticsStateContext/hooks/globalsHooks";
import {
  selectTradeboxFromTokenAddress,
  selectTradeboxIncreasePositionAmounts,
  selectTradeboxIsWrapOrUnwrap,
  selectTradeboxSwapAmounts,
  selectTradeboxTradeFlags,
} from "context/SyntheticsStateContext/selectors/tradeboxSelectors";
import { useSelector } from "context/SyntheticsStateContext/utils";
import { getNeedTokenApprove, useTokensAllowanceData } from "domain/synthetics/tokens";
import { usePriceImpactWarningState } from "domain/synthetics/trade/usePriceImpactWarningState";
import { useChainId } from "lib/chains";
import { getByKey } from "lib/objects";
import useWallet from "lib/wallets/useWallet";
import { useMemo } from "react";

export function useTradeboxWarningsRows(priceImpactWarningState: ReturnType<typeof usePriceImpactWarningState>) {
  const tokenData = useTokensData();
  const { account } = useWallet();
  const { chainId } = useChainId();
  const fromTokenAddress = useSelector(selectTradeboxFromTokenAddress);
  const tradeFlags = useSelector(selectTradeboxTradeFlags);
  const fromToken = getByKey(tokenData, fromTokenAddress);
  const increaseAmounts = useSelector(selectTradeboxIncreasePositionAmounts);
  const isWrapOrUnwrap = useSelector(selectTradeboxIsWrapOrUnwrap);
  const swapAmounts = useSelector(selectTradeboxSwapAmounts);
  const {
    tokensAllowanceData,
    isLoading: isAllowanceLoading,
    isLoaded: isAllowanceLoaded,
  } = useTokensAllowanceData(chainId, {
    spenderAddress: getContract(chainId, "SyntheticsRouter"),
    tokenAddresses: fromToken ? [fromToken.address] : [],
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

  const isBalanceLoading = account && fromToken?.address && fromToken.balance === undefined;

  const needPayTokenApproval = getNeedTokenApprove(tokensAllowanceData, fromToken?.address, payAmount);

  const consentError: string | undefined = useMemo(() => {
    if (priceImpactWarningState.validationError) {
      return t`Acknowledgment Required`;
    }

    if (isAllowanceLoading || isBalanceLoading) {
      return t`Loading...`;
    }

    if (needPayTokenApproval) {
      return t`Pending ${fromToken?.assetSymbol ?? fromToken?.symbol} approval`;
    }

    return undefined;
  }, [
    priceImpactWarningState,
    isAllowanceLoading,
    isBalanceLoading,
    needPayTokenApproval,
    fromToken?.assetSymbol,
    fromToken?.symbol,
  ]);

  const element = (
    <>
      <HighPriceImpactWarning priceImpactWarningState={priceImpactWarningState} />
      {isAllowanceLoaded && needPayTokenApproval && fromToken && (
        <ApproveTokenButton
          tokenAddress={fromToken.address}
          tokenSymbol={fromToken.assetSymbol ?? fromToken.symbol}
          spenderAddress={getContract(chainId, "SyntheticsRouter")}
        />
      )}
    </>
  );

  return [element, consentError] as const;
}

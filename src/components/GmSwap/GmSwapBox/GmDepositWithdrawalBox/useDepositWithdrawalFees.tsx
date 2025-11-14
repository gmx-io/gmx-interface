import { useMemo } from "react";

import { useGasMultichainUsd, useNativeTokenMultichainUsd } from "domain/multichain/useMultichainQuoteFeeUsd";
import { ExecutionFee, getFeeItem, getTotalFeeItem, type FeeItem, type GasLimitsConfig } from "domain/synthetics/fees";
import { GlvInfo } from "domain/synthetics/markets";
import { SourceChainDepositFees } from "domain/synthetics/markets/feeEstimation/estimateSourceChainDepositFees";
import { SourceChainGlvDepositFees } from "domain/synthetics/markets/feeEstimation/estimateSourceChainGlvDepositFees";
import { SourceChainWithdrawalFees } from "domain/synthetics/markets/feeEstimation/estimateSourceChainWithdrawalFees";
import { convertToUsd, getMidPrice, TokensData } from "domain/synthetics/tokens";
import { DepositAmounts, GmSwapFees, WithdrawalAmounts } from "domain/synthetics/trade";
import { ContractsChainId, SourceChainId } from "sdk/configs/chains";
import { getWrappedToken } from "sdk/configs/tokens";

export const useDepositWithdrawalFees = ({
  amounts,
  chainId,
  gasLimits,
  gasPrice,
  isDeposit,
  tokensData,
  // glvInfo,
  // isMarketTokenDeposit,
  technicalFees,
  srcChainId,
}: {
  amounts: DepositAmounts | WithdrawalAmounts | undefined;
  chainId: ContractsChainId;
  gasLimits: GasLimitsConfig | undefined;
  gasPrice: bigint | undefined;
  isDeposit: boolean;
  tokensData: TokensData | undefined;
  glvInfo: GlvInfo | undefined;
  isMarketTokenDeposit: boolean;
  technicalFees:
    | ExecutionFee
    | SourceChainGlvDepositFees
    | SourceChainDepositFees
    | SourceChainWithdrawalFees
    | undefined;
  srcChainId: SourceChainId | undefined;
}): { logicalFees?: GmSwapFees } => {
  const txnEstimatedNativeFeeUsd = useNativeTokenMultichainUsd({
    sourceChainTokenAmount:
      technicalFees && "txnEstimatedNativeFee" in technicalFees ? technicalFees.txnEstimatedNativeFee : undefined,
    sourceChainId: srcChainId,
    targetChainId: chainId,
  });

  const txnEstimatedGasUsd = useGasMultichainUsd({
    sourceChainGas:
      technicalFees && "txnEstimatedGasLimit" in technicalFees ? technicalFees.txnEstimatedGasLimit : undefined,
    sourceChainId: srcChainId,
    targetChainId: chainId,
  });

  return useMemo(() => {
    if (!gasLimits || gasPrice === undefined || !tokensData || !amounts || !technicalFees) {
      return { logicalFees: undefined };
    }

    const basisUsd = isDeposit
      ? (amounts?.longTokenUsd ?? 0n) + (amounts?.shortTokenUsd ?? 0n)
      : amounts?.marketTokenUsd || 0n;

    const swapFee = getFeeItem(amounts.swapFeeUsd * -1n, basisUsd);
    const swapPriceImpact = getFeeItem(amounts.swapPriceImpactDeltaUsd, basisUsd);
    const uiFee = getFeeItem(amounts.uiFeeUsd * -1n, basisUsd, {
      shouldRoundUp: true,
    });

    const logicalNetworkFee = getFeeItem(
      "feeTokenAmount" in technicalFees
        ? convertToUsd(
            technicalFees.feeTokenAmount * -1n,
            getWrappedToken(chainId).decimals,
            getMidPrice(tokensData[getWrappedToken(chainId).address].prices)
          )!
        : (technicalFees.relayFeeUsd + (txnEstimatedNativeFeeUsd ?? 0n) + (txnEstimatedGasUsd ?? 0n)) * -1n,
      basisUsd
    )!;
    // TODO ADD stargate protocol fees
    const logicalProtocolFee = getTotalFeeItem([swapFee, uiFee, swapPriceImpact].filter(Boolean) as FeeItem[]);

    const logicalFees: GmSwapFees = {
      totalFees: logicalProtocolFee,
      swapPriceImpact,
      logicalNetworkFee,
      swapFee,
    };

    return {
      logicalFees,
    };
  }, [
    amounts,
    chainId,
    gasLimits,
    gasPrice,
    isDeposit,
    technicalFees,
    tokensData,
    txnEstimatedGasUsd,
    txnEstimatedNativeFeeUsd,
  ]);
};

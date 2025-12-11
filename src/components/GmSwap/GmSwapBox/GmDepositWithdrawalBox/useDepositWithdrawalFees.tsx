import { useMemo } from "react";

import { TechnicalGmFees } from "domain/multichain/technical-fees-types";
import { useGasMultichainUsd, useNativeTokenMultichainUsd } from "domain/multichain/useMultichainQuoteFeeUsd";
import { getFeeItem, getTotalFeeItem, type FeeItem, type GasLimitsConfig } from "domain/synthetics/fees";
import { GlvInfo } from "domain/synthetics/markets";
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
  technicalFees: TechnicalGmFees | undefined;
  srcChainId: SourceChainId | undefined;
}): { logicalFees?: GmSwapFees } => {
  const sourceChainEstimatedNativeFeeUsd = useNativeTokenMultichainUsd({
    sourceChainTokenAmount:
      technicalFees?.kind === "sourceChain" ? technicalFees.fees.txnEstimatedNativeFee : undefined,
    sourceChainId: srcChainId,
    targetChainId: chainId,
  });

  const sourceChainTxnEstimatedGasUsd = useGasMultichainUsd({
    sourceChainGas: technicalFees?.kind === "sourceChain" ? technicalFees.fees.txnEstimatedGasLimit : undefined,
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

    const wrappedToken = getWrappedToken(chainId);
    const wrappedTokenData = tokensData[wrappedToken.address];
    const wrappedTokenPrice = getMidPrice(wrappedTokenData.prices);

    let logicalNetworkFeeUsd = 0n;

    if (technicalFees.kind === "settlementChain") {
      const keeperUsd = convertToUsd(technicalFees.fees.feeTokenAmount, wrappedToken.decimals, wrappedTokenPrice)!;
      logicalNetworkFeeUsd = keeperUsd * -1n;
    } else if (technicalFees.kind === "gmxAccount") {
      logicalNetworkFeeUsd = (technicalFees.fees.executionFee.feeUsd + technicalFees.fees.relayFeeUsd) * -1n;
    } else if (technicalFees.kind === "sourceChain") {
      logicalNetworkFeeUsd = ((sourceChainEstimatedNativeFeeUsd ?? 0n) + (sourceChainTxnEstimatedGasUsd ?? 0n)) * -1n;
    }

    const logicalNetworkFee = getFeeItem(logicalNetworkFeeUsd, basisUsd)!;
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
    sourceChainEstimatedNativeFeeUsd,
    sourceChainTxnEstimatedGasUsd,
    technicalFees,
    tokensData,
  ]);
};

import { useMemo } from "react";

import { useGasMultichainUsd, useNativeTokenMultichainUsd } from "domain/multichain/useMultichainQuoteFeeUsd";
import { getFeeItem, getTotalFeeItem, type FeeItem, type GasLimitsConfig } from "domain/synthetics/fees";
import { GlvInfo } from "domain/synthetics/markets";
import type { TechnicalGmFees } from "domain/synthetics/markets/technicalFees/technical-fees-types";
import { convertToUsd, getMidPrice, TokenData, TokensData } from "domain/synthetics/tokens";
import { DepositAmounts, GmSwapFees, SwapPathStats, WithdrawalAmounts } from "domain/synthetics/trade";
import { defined } from "lib/guards";
import { getByKey } from "lib/objects";
import { ContractsChainId, SourceChainId } from "sdk/configs/chains";
import { getWrappedToken } from "sdk/configs/tokens";

function calculateLogicalNetworkFeeUsd({
  technicalFees,
  wrappedTokenData,
  gasPrice,
  sourceChainEstimatedNativeFeeUsd,
  sourceChainTxnEstimatedGasUsd,
}: {
  technicalFees: TechnicalGmFees;
  wrappedTokenData: TokenData | undefined;
  gasPrice: bigint | undefined;
  sourceChainEstimatedNativeFeeUsd: bigint | undefined;
  sourceChainTxnEstimatedGasUsd: bigint | undefined;
}): bigint | undefined {
  if (technicalFees.kind === "settlementChain") {
    if (!wrappedTokenData || gasPrice === undefined) {
      return undefined;
    }

    const wrappedTokenPrice = getMidPrice(wrappedTokenData.prices);
    const keeperUsd = convertToUsd(technicalFees.fees.feeTokenAmount, wrappedTokenData.decimals, wrappedTokenPrice)!;
    // Keep displayed network fee aligned with submit validation by adding an estimated wallet tx gas component.
    const walletTxGasAmount = technicalFees.fees.gasLimit * gasPrice;
    const walletTxGasUsd = convertToUsd(walletTxGasAmount, wrappedTokenData.decimals, wrappedTokenPrice) ?? 0n;

    return (keeperUsd + walletTxGasUsd) * -1n;
  }

  if (technicalFees.kind === "gmxAccount") {
    return (technicalFees.fees.executionFee.feeUsd + technicalFees.fees.relayFeeUsd) * -1n;
  }

  if (technicalFees.kind === "sourceChain") {
    return ((sourceChainEstimatedNativeFeeUsd ?? 0n) + (sourceChainTxnEstimatedGasUsd ?? 0n)) * -1n;
  }

  return 0n;
}

export type GmLogicalFees = GmSwapFees & { collateralSwapFee?: FeeItem; transitFee?: FeeItem };

function getCollateralSwapPathStats(amounts: DepositAmounts | WithdrawalAmounts, isDeposit: boolean): SwapPathStats[] {
  if (isDeposit) {
    const depositAmounts = amounts as DepositAmounts;

    return [depositAmounts.shortTokenSwapPathStats].filter(defined);
  }

  const withdrawalAmounts = amounts as WithdrawalAmounts;

  return [withdrawalAmounts.longTokenSwapPathStats, withdrawalAmounts.shortTokenSwapPathStats].filter(defined);
}

function calculateLogicalFees({
  amounts,
  isDeposit,
  logicalNetworkFeeUsd,
  transitFeesUsd,
}: {
  amounts: DepositAmounts | WithdrawalAmounts;
  isDeposit: boolean;
  logicalNetworkFeeUsd: bigint;
  transitFeesUsd: bigint | undefined;
}): GmLogicalFees {
  const basisUsd = isDeposit
    ? (amounts.longTokenUsd ?? 0n) + (amounts.shortTokenUsd ?? 0n)
    : amounts.marketTokenUsd ?? 0n;

  const collateralSwapPathStats = getCollateralSwapPathStats(amounts, isDeposit);
  const collateralSwapFeesDeltaUsd = collateralSwapPathStats.reduce(
    (total, stats) => total - stats.totalSwapFeeUsd,
    0n
  );
  const collateralSwapPriceImpactDeltaUsd = collateralSwapPathStats.reduce(
    (total, stats) => total + stats.totalSwapPriceImpactDeltaUsd,
    0n
  );

  const swapFee = getFeeItem(amounts.swapFeeUsd * -1n, basisUsd);
  const collateralSwapFee = getFeeItem(collateralSwapFeesDeltaUsd, basisUsd);
  const transitFee = transitFeesUsd === undefined ? undefined : getFeeItem(transitFeesUsd * -1n, basisUsd);
  const swapPriceImpact = getFeeItem(amounts.swapPriceImpactDeltaUsd + collateralSwapPriceImpactDeltaUsd, basisUsd);
  const uiFee = getFeeItem(amounts.uiFeeUsd * -1n, basisUsd, {
    shouldRoundUp: true,
  });

  const logicalNetworkFee = getFeeItem(logicalNetworkFeeUsd, basisUsd)!;
  // TODO ADD stargate protocol fees
  const logicalProtocolFee = getTotalFeeItem(
    [swapFee, collateralSwapFee, transitFee, uiFee].filter(Boolean) as FeeItem[]
  );

  const logicalFees: GmLogicalFees = {
    totalFees: logicalProtocolFee,
    swapPriceImpact,
    logicalNetworkFee,
    swapFee,
    collateralSwapFee,
    transitFee,
  };

  return logicalFees;
}

export const useDepositWithdrawalFees = ({
  amounts,
  chainId,
  gasLimits,
  gasPrice,
  isDeposit,
  tokensData,
  technicalFees,
  srcChainId,
  transitFeesUsd,
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
  transitFeesUsd: bigint | undefined;
}): GmLogicalFees | undefined => {
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
    if (!gasLimits || !tokensData || !amounts || !technicalFees) {
      return undefined;
    }

    const wrappedToken = getWrappedToken(chainId);
    const wrappedTokenData = getByKey(tokensData, wrappedToken.address);

    const logicalNetworkFeeUsd = calculateLogicalNetworkFeeUsd({
      technicalFees,
      wrappedTokenData,
      gasPrice,
      sourceChainEstimatedNativeFeeUsd,
      sourceChainTxnEstimatedGasUsd,
    });

    if (logicalNetworkFeeUsd === undefined) {
      return undefined;
    }

    return calculateLogicalFees({
      amounts,
      isDeposit,
      transitFeesUsd,
      logicalNetworkFeeUsd,
    });
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
    transitFeesUsd,
  ]);
};

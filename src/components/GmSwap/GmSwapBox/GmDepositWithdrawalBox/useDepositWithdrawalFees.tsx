import { useMemo } from "react";

import { useGasMultichainUsd, useNativeTokenMultichainUsd } from "domain/multichain/useMultichainQuoteFeeUsd";
import { getFeeItem, getTotalFeeItem, type FeeItem, type GasLimitsConfig } from "domain/synthetics/fees";
import { GlvInfo } from "domain/synthetics/markets";
import type { TechnicalGmFees } from "domain/synthetics/markets/technicalFees/technical-fees-types";
import { convertToUsd, getMidPrice, TokenData, TokensData } from "domain/synthetics/tokens";
import { DepositAmounts, GmSwapFees, WithdrawalAmounts } from "domain/synthetics/trade";
import { getByKey } from "lib/objects";
import { ContractsChainId, SourceChainId } from "sdk/configs/chains";
import { getWrappedToken } from "sdk/configs/tokens";

function calculateLogicalNetworkFeeUsd({
  technicalFees,
  wrappedTokenData,
  sourceChainEstimatedNativeFeeUsd,
  sourceChainTxnEstimatedGasUsd,
}: {
  technicalFees: TechnicalGmFees;
  wrappedTokenData: TokenData | undefined;
  sourceChainEstimatedNativeFeeUsd: bigint | undefined;
  sourceChainTxnEstimatedGasUsd: bigint | undefined;
}): bigint | undefined {
  if (technicalFees.kind === "settlementChain") {
    if (!wrappedTokenData) {
      return undefined;
    }
    const wrappedTokenPrice = getMidPrice(wrappedTokenData.prices);
    const keeperUsd = convertToUsd(technicalFees.fees.feeTokenAmount, wrappedTokenData.decimals, wrappedTokenPrice)!;
    return keeperUsd * -1n;
  }

  if (technicalFees.kind === "gmxAccount") {
    return (technicalFees.fees.executionFee.feeUsd + technicalFees.fees.relayFeeUsd) * -1n;
  }

  if (technicalFees.kind === "sourceChain") {
    return ((sourceChainEstimatedNativeFeeUsd ?? 0n) + (sourceChainTxnEstimatedGasUsd ?? 0n)) * -1n;
  }

  return 0n;
}

function calculateLogicalFees({
  amounts,
  isDeposit,
  logicalNetworkFeeUsd,
}: {
  amounts: DepositAmounts | WithdrawalAmounts;
  isDeposit: boolean;
  logicalNetworkFeeUsd: bigint;
}): GmSwapFees {
  const basisUsd = isDeposit
    ? (amounts.longTokenUsd ?? 0n) + (amounts.shortTokenUsd ?? 0n)
    : amounts.marketTokenUsd ?? 0n;

  const swapFee = getFeeItem(amounts.swapFeeUsd * -1n, basisUsd);
  const swapPriceImpact = getFeeItem(amounts.swapPriceImpactDeltaUsd, basisUsd);
  const uiFee = getFeeItem(amounts.uiFeeUsd * -1n, basisUsd, {
    shouldRoundUp: true,
  });

  const logicalNetworkFee = getFeeItem(logicalNetworkFeeUsd, basisUsd)!;
  // TODO ADD stargate protocol fees
  const logicalProtocolFee = getTotalFeeItem([swapFee, uiFee].filter(Boolean) as FeeItem[]);

  const logicalFees: GmSwapFees = {
    totalFees: logicalProtocolFee,
    swapPriceImpact,
    logicalNetworkFee,
    swapFee,
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
}): GmSwapFees | undefined => {
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
      return undefined;
    }

    const wrappedToken = getWrappedToken(chainId);
    const wrappedTokenData = getByKey(tokensData, wrappedToken.address);

    const logicalNetworkFeeUsd = calculateLogicalNetworkFeeUsd({
      technicalFees,
      wrappedTokenData,
      sourceChainEstimatedNativeFeeUsd,
      sourceChainTxnEstimatedGasUsd,
    });

    if (logicalNetworkFeeUsd === undefined) {
      return undefined;
    }

    return calculateLogicalFees({
      amounts,
      isDeposit,
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
  ]);
};

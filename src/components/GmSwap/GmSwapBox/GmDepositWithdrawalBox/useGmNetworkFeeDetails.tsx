import { useMemo } from "react";
import { zeroAddress } from "viem";

import { getViemChain, type SourceChainId } from "config/chains";
import { useGasMultichainNativeAmount } from "domain/multichain/useMultichainQuoteFeeUsd";
import {
  GMX_ACCOUNT_NETWORK_FEE_SOURCE,
  WALLET_NETWORK_FEE_SOURCE,
  getSourceChainNetworkFeeSource,
  type NetworkFeeDetails,
  type NetworkFeeSource,
} from "domain/synthetics/fees/networkFeeSource";
import type { TechnicalGmFees } from "domain/synthetics/markets/technicalFees/technical-fees-types";
import { convertToTokenAmount, type TokenData, type TokensData } from "domain/synthetics/tokens";
import { getByKey } from "lib/objects";

export type GmNetworkFeeInfo = {
  details: NetworkFeeDetails | undefined;
  source: NetworkFeeSource;
  isExpress: boolean;
};

export type GmNetworkFeeParams = {
  technicalFees: TechnicalGmFees | undefined;
  logicalNetworkFeeUsd: bigint | undefined;
  srcChainId: SourceChainId | undefined;
  tokensData: TokensData | undefined;
  gasPrice: bigint | undefined;
  gasPaymentToken: TokenData | undefined;
};

export function getGmNetworkFeeInfo({
  technicalFees,
  logicalNetworkFeeUsd,
  srcChainId,
  tokensData,
  gasPrice,
  gasPaymentToken,
  sourceChainGasNativeAmount,
}: GmNetworkFeeParams & { sourceChainGasNativeAmount: bigint | undefined }): GmNetworkFeeInfo | undefined {
  if (!technicalFees) {
    return undefined;
  }

  const usd = logicalNetworkFeeUsd === undefined ? undefined : -logicalNetworkFeeUsd;

  switch (technicalFees.kind) {
    case "settlementChain": {
      const nativeToken = getByKey(tokensData, zeroAddress);

      if (!nativeToken || gasPrice === undefined || usd === undefined) {
        return { details: undefined, source: WALLET_NETWORK_FEE_SOURCE, isExpress: false };
      }

      return {
        details: {
          amount: technicalFees.fees.feeTokenAmount + technicalFees.fees.gasLimit * gasPrice,
          usd,
          decimals: nativeToken.decimals,
          symbol: nativeToken.symbol,
        },
        source: WALLET_NETWORK_FEE_SOURCE,
        isExpress: false,
      };
    }
    case "gmxAccount": {
      if (!gasPaymentToken || usd === undefined) {
        return { details: undefined, source: GMX_ACCOUNT_NETWORK_FEE_SOURCE, isExpress: true };
      }

      return {
        details: {
          amount: convertToTokenAmount(usd, gasPaymentToken.decimals, gasPaymentToken.prices.maxPrice)!,
          usd,
          decimals: gasPaymentToken.decimals,
          symbol: gasPaymentToken.symbol,
          isStable: gasPaymentToken.isStable,
        },
        source: GMX_ACCOUNT_NETWORK_FEE_SOURCE,
        isExpress: true,
      };
    }
    case "sourceChain": {
      if (srcChainId === undefined) {
        return undefined;
      }

      const source = getSourceChainNetworkFeeSource(srcChainId);

      if (sourceChainGasNativeAmount === undefined || usd === undefined) {
        return { details: undefined, source, isExpress: false };
      }

      const nativeCurrency = getViemChain(srcChainId).nativeCurrency;

      return {
        details: {
          amount: technicalFees.fees.txnEstimatedNativeFee + sourceChainGasNativeAmount,
          usd,
          decimals: nativeCurrency.decimals,
          symbol: nativeCurrency.symbol,
        },
        source,
        isExpress: false,
      };
    }
  }
}

export function useGmNetworkFeeDetails({
  technicalFees,
  logicalNetworkFeeUsd,
  srcChainId,
  tokensData,
  gasPrice,
  gasPaymentToken,
}: GmNetworkFeeParams): GmNetworkFeeInfo | undefined {
  const sourceChainGasNativeAmount = useGasMultichainNativeAmount({
    sourceChainId: technicalFees?.kind === "sourceChain" ? srcChainId : undefined,
    sourceChainGas: technicalFees?.kind === "sourceChain" ? technicalFees.fees.txnEstimatedGasLimit : undefined,
  });

  return useMemo(
    () =>
      getGmNetworkFeeInfo({
        technicalFees,
        logicalNetworkFeeUsd,
        srcChainId,
        tokensData,
        gasPrice,
        gasPaymentToken,
        sourceChainGasNativeAmount,
      }),
    [gasPaymentToken, gasPrice, logicalNetworkFeeUsd, sourceChainGasNativeAmount, srcChainId, technicalFees, tokensData]
  );
}

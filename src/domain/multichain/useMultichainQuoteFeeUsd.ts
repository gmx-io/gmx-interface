import { zeroAddress } from "viem";

import { AnyChainId, type SettlementChainId, type SourceChainId } from "config/chains";
import { getMappedTokenId } from "config/multichain";
import { useTokenRecentPricesRequest } from "domain/synthetics/tokens";
import { convertToUsd } from "domain/tokens";
import { useChainId } from "lib/chains";
import { getToken } from "sdk/configs/tokens";

import { NATIVE_TOKEN_PRICE_MAP } from "./nativeTokenPriceMap";
import type { QuoteOft, MessagingFee } from "./types";

export function useMultichainQuoteFeeUsd({
  quoteSend,
  quoteOft,
  unwrappedTokenAddress,
  sourceChainId,
  targetChainId,
}: {
  quoteSend: MessagingFee | undefined;
  quoteOft: QuoteOft | undefined;
  unwrappedTokenAddress: string | undefined;
  sourceChainId: AnyChainId | undefined;
  targetChainId: AnyChainId | undefined;
}): {
  networkFee: bigint | undefined;
  networkFeeUsd: bigint | undefined;
  protocolFeeAmount: bigint | undefined;
  protocolFeeUsd: bigint | undefined;
  amountReceivedLD: bigint | undefined;
} {
  const { chainId } = useChainId();
  const { pricesData: settlementChainTokenPricesData } = useTokenRecentPricesRequest(chainId);

  if (!unwrappedTokenAddress || sourceChainId === undefined || targetChainId === undefined) {
    return {
      networkFee: undefined,
      networkFeeUsd: undefined,
      protocolFeeAmount: undefined,
      protocolFeeUsd: undefined,
      amountReceivedLD: undefined,
    };
  }

  const sourceChainTokenId = getMappedTokenId(
    chainId as SettlementChainId,
    unwrappedTokenAddress,
    sourceChainId as SourceChainId
  );

  if (!sourceChainTokenId) {
    return {
      networkFee: undefined,
      networkFeeUsd: undefined,
      protocolFeeAmount: undefined,
      protocolFeeUsd: undefined,
      amountReceivedLD: undefined,
    };
  }

  const nativeFee = quoteSend?.nativeFee as bigint;
  const amountReceivedLD = quoteOft?.receipt.amountReceivedLD as bigint;

  const sourceChainNativeTokenPrices =
    settlementChainTokenPricesData?.[NATIVE_TOKEN_PRICE_MAP[sourceChainId]?.[targetChainId] ?? zeroAddress];

  const transferTokenPrices = settlementChainTokenPricesData?.[unwrappedTokenAddress];
  const sourceChainNativeTokenDecimals = getToken(chainId, zeroAddress)?.decimals ?? 18;

  const sourceChainDepositTokenDecimals = sourceChainTokenId?.decimals;

  const nativeFeeUsd =
    nativeFee !== undefined
      ? convertToUsd(nativeFee as bigint, sourceChainNativeTokenDecimals, sourceChainNativeTokenPrices?.maxPrice)
      : undefined;

  let protocolFeeAmount: bigint | undefined = undefined;
  let protocolFeeUsd: bigint | undefined = undefined;
  if (quoteOft !== undefined) {
    protocolFeeAmount = 0n;
    for (const feeDetail of quoteOft.oftFeeDetails) {
      if (feeDetail.feeAmountLD !== 0n) {
        protocolFeeAmount -= feeDetail.feeAmountLD;
      }
    }
    protocolFeeUsd = convertToUsd(protocolFeeAmount, sourceChainDepositTokenDecimals, transferTokenPrices?.maxPrice);
  }

  return {
    networkFee: nativeFee,
    networkFeeUsd: nativeFeeUsd,
    protocolFeeAmount,
    protocolFeeUsd,
    amountReceivedLD,
  };
}

import { useEffect, useState } from "react";
import { zeroAddress } from "viem";

import { AnyChainId, getViemChain, type SettlementChainId, type SourceChainId } from "config/chains";
import { getMappedTokenId } from "config/multichain";
import { getMidPrice, useTokenRecentPricesRequest } from "domain/synthetics/tokens";
import { convertToUsd } from "domain/tokens";
import { useChainId } from "lib/chains";
import { getPublicClientWithRpc } from "lib/wallets/rainbowKitConfig";

import { NATIVE_TOKEN_PRICE_MAP } from "./nativeTokenPriceMap";
import type { MessagingFee, QuoteOft } from "./types";

export function useNativeTokenMultichainUsd({
  sourceChainId,
  sourceChainTokenAmount,
  targetChainId,
}: {
  sourceChainId: AnyChainId | undefined;
  sourceChainTokenAmount: bigint | undefined;
  targetChainId: AnyChainId | undefined;
}): bigint | undefined {
  const { chainId } = useChainId();

  let sourceNativeTokenPriceChain = chainId;
  let sourceNativeTokenAddress = zeroAddress;
  let hasSourceNativeTokenPrice = false;
  if (sourceChainId !== undefined && targetChainId !== undefined && sourceChainId !== chainId) {
    if (NATIVE_TOKEN_PRICE_MAP[sourceChainId]?.[targetChainId]?.[targetChainId]) {
      sourceNativeTokenPriceChain = chainId;
      sourceNativeTokenAddress = NATIVE_TOKEN_PRICE_MAP[sourceChainId]?.[targetChainId]?.[targetChainId];
      hasSourceNativeTokenPrice = true;
    } else {
      const someChain = Object.keys(NATIVE_TOKEN_PRICE_MAP[sourceChainId]?.[targetChainId] ?? {})[0];
      if (someChain) {
        sourceNativeTokenPriceChain = parseInt(someChain) as SettlementChainId;
        sourceNativeTokenAddress =
          NATIVE_TOKEN_PRICE_MAP[sourceChainId]?.[targetChainId]?.[sourceNativeTokenPriceChain];
        hasSourceNativeTokenPrice = true;
      }
    }
  } else if (sourceChainId === chainId) {
    sourceNativeTokenPriceChain = chainId;
    sourceNativeTokenAddress = zeroAddress;
    hasSourceNativeTokenPrice = true;
  }

  const { pricesData: priceChainTokenPricesData } = useTokenRecentPricesRequest(sourceNativeTokenPriceChain);

  if (
    sourceChainTokenAmount === undefined ||
    sourceChainId === undefined ||
    targetChainId === undefined ||
    chainId === undefined ||
    !hasSourceNativeTokenPrice
  ) {
    return undefined;
  }

  const nativeFeeUsd =
    sourceChainTokenAmount !== undefined && priceChainTokenPricesData?.[sourceNativeTokenAddress] !== undefined
      ? convertToUsd(
          sourceChainTokenAmount as bigint,
          getViemChain(sourceChainId).nativeCurrency.decimals,
          getMidPrice(priceChainTokenPricesData[sourceNativeTokenAddress])
        )
      : undefined;

  return nativeFeeUsd;
}
export function useGasMultichainUsd({
  sourceChainId,
  sourceChainGas,
  targetChainId,
}: {
  sourceChainId: AnyChainId | undefined;
  sourceChainGas: bigint | undefined;
  targetChainId: AnyChainId | undefined;
}): bigint | undefined {
  const [nativeWeiAmount, setNativeWeiAmount] = useState<bigint | undefined>(undefined);

  useEffect(() => {
    if (!sourceChainId || sourceChainGas === undefined) {
      return;
    }

    getPublicClientWithRpc(sourceChainId)
      .getGasPrice()
      .then((price) => setNativeWeiAmount(sourceChainGas * price));
  }, [sourceChainGas, sourceChainId]);

  return useNativeTokenMultichainUsd({
    sourceChainId,
    sourceChainTokenAmount: nativeWeiAmount,
    targetChainId,
  });
}

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

  const nativeFee = quoteSend?.nativeFee as bigint;
  const amountReceivedLD = quoteOft?.receipt.amountReceivedLD as bigint;

  const nativeFeeUsd = useNativeTokenMultichainUsd({
    sourceChainId,
    sourceChainTokenAmount: nativeFee,
    targetChainId,
  });

  if (
    !unwrappedTokenAddress ||
    sourceChainId === undefined ||
    targetChainId === undefined ||
    nativeFeeUsd === undefined
  ) {
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

  const transferTokenPrices = settlementChainTokenPricesData?.[unwrappedTokenAddress];

  const sourceChainDepositTokenDecimals = sourceChainTokenId?.decimals;

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

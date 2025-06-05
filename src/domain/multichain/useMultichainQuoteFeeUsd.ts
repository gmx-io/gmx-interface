import { zeroAddress } from "viem";

import type { UiSettlementChain, UiSourceChain } from "config/chains";
import { getMappedTokenId } from "domain/multichain/config";
import { useTokenRecentPricesRequest } from "domain/synthetics/tokens";
import { convertToUsd } from "domain/tokens";
import { useChainId } from "lib/chains";
import { getToken } from "sdk/configs/tokens";
import type {
  MessagingFeeStruct,
  OFTFeeDetailStruct,
  OFTLimitStruct,
  OFTReceiptStruct,
} from "typechain-types-stargate/interfaces/IStargate";

export function useMultichainQuoteFeeUsd({
  quoteSend,
  quoteOft,
  unwrappedTokenAddress,
}: {
  quoteSend: MessagingFeeStruct | undefined;
  quoteOft:
    | {
        limit: OFTLimitStruct;
        oftFeeDetails: OFTFeeDetailStruct[];
        receipt: OFTReceiptStruct;
      }
    | undefined;
  unwrappedTokenAddress: string | undefined;
}): {
  networkFee: bigint | undefined;
  networkFeeUsd: bigint | undefined;
  protocolFeeAmount: bigint | undefined;
  protocolFeeUsd: bigint | undefined;
  amountReceivedLD: bigint | undefined;
} {
  const { chainId, srcChainId } = useChainId();
  const { pricesData: settlementChainTokenPricesData } = useTokenRecentPricesRequest(chainId);

  if (!unwrappedTokenAddress) {
    return {
      networkFee: undefined,
      networkFeeUsd: undefined,
      protocolFeeAmount: undefined,
      protocolFeeUsd: undefined,
      amountReceivedLD: undefined,
    };
  }

  const sourceChainTokenId = getMappedTokenId(
    chainId as UiSettlementChain,
    unwrappedTokenAddress,
    srcChainId as UiSourceChain
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

  // ETH is the same as the source chain
  // TODO: check if this is correct
  const nativeTokenPrices = settlementChainTokenPricesData?.[zeroAddress];
  const depositTokenPrices = settlementChainTokenPricesData?.[unwrappedTokenAddress];
  const sourceChainNativeTokenDecimals = getToken(chainId, zeroAddress)?.decimals ?? 18;

  const sourceChainDepositTokenDecimals = sourceChainTokenId?.decimals;

  const nativeFeeUsd =
    nativeFee !== undefined
      ? convertToUsd(nativeFee as bigint, sourceChainNativeTokenDecimals, nativeTokenPrices?.maxPrice)
      : undefined;

  let protocolFeeAmount: bigint | undefined = undefined;
  let protocolFeeUsd: bigint | undefined = undefined;
  if (quoteOft !== undefined) {
    protocolFeeAmount = 0n;
    for (const feeDetail of quoteOft.oftFeeDetails) {
      if (feeDetail.feeAmountLD) {
        protocolFeeAmount -= feeDetail.feeAmountLD as bigint;
      }
    }
    protocolFeeUsd = convertToUsd(protocolFeeAmount, sourceChainDepositTokenDecimals, depositTokenPrices?.maxPrice);
  }

  return {
    networkFee: nativeFee,
    networkFeeUsd: nativeFeeUsd,
    protocolFeeAmount,
    protocolFeeUsd,
    amountReceivedLD,
  };
}

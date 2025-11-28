import type { SettlementChainId, SourceChainId } from "config/chains";
import { getMultichainTokenId, RANDOM_WALLET } from "config/multichain";
import { getMultichainTransferSendParams } from "domain/multichain/getSendParams";
import { expandDecimals } from "sdk/utils/numbers";

import { stargateTransferFees } from "./stargateTransferFees";

export async function estimateDepositPlatformTokenTransferOutFees({
  fromChainId,
  toChainId,
  marketOrGlvAddress,
}: {
  fromChainId: SettlementChainId | SourceChainId;
  toChainId: SettlementChainId | SourceChainId;
  marketOrGlvAddress: string;
}): Promise<{
  platformTokenReturnTransferGasLimit: bigint;
  platformTokenReturnTransferNativeFee: bigint;
}> {
  const marketTokenId = getMultichainTokenId(fromChainId, marketOrGlvAddress);

  if (!marketTokenId) {
    throw new Error("Settlement chain market token ID not found");
  }

  const returnTransferSendParams = getMultichainTransferSendParams({
    dstChainId: toChainId,
    account: RANDOM_WALLET.address,
    srcChainId: fromChainId,
    amountLD: expandDecimals(1, marketTokenId.decimals),
    isToGmx: false,
    // TODO MLTCH check that all gm and glv transfers are manual gas
    isManualGas: true,
  });

  const { nativeFee: returnTransferNativeFee, transferGasLimit: returnTransferGasLimit } = await stargateTransferFees({
    chainId: fromChainId,
    stargateAddress: marketTokenId.stargate,
    sendParams: returnTransferSendParams,
    tokenAddress: marketTokenId.address,
  });

  return {
    platformTokenReturnTransferGasLimit: returnTransferGasLimit,
    platformTokenReturnTransferNativeFee: returnTransferNativeFee,
  };
}

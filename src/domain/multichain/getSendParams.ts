import type { AnyChainId } from "config/chains";
import { SendParam } from "domain/multichain/types";
import { getMultichainTransferSendParams as getMultichainTransferSendParamsSdk } from "sdk/utils/multichain/sendParams";

import { encodeMultichainComposeActionData, MultichainAction } from "./codecs/CodecUiHelper";

/**
 * Slippage is set to 0, meaning infinite slippage
 */
export function getMultichainTransferSendParams({
  dstChainId,
  account,
  srcChainId,
  amountLD,
  composeGas,
  isToGmx,
  action,
  isManualGas = false,
  nativeDropAmount = 0n,
}: {
  dstChainId: AnyChainId;
  account: string;
  srcChainId?: AnyChainId;
  amountLD: bigint;
  composeGas?: bigint;
  isToGmx: boolean;
  isManualGas?: boolean;
  action?: MultichainAction;
  nativeDropAmount?: bigint;
}): SendParam {
  const innerData = action ? encodeMultichainComposeActionData(action) : undefined;

  return getMultichainTransferSendParamsSdk({
    dstChainId,
    account,
    srcChainId,
    amountLD,
    composeGas,
    isToGmx,
    isManualGas,
    nativeDropAmount,
    innerData,
  });
}

import { Options, addressToBytes32 } from "@layerzerolabs/lz-v2-utilities";
import { toHex } from "viem";

import type { AnyChainId, ContractsChainId } from "config/chains";
import { getContract } from "config/contracts";
import { getLayerZeroEndpointId, isSettlementChain, isSourceChain } from "config/multichain";
import { SendParam } from "domain/multichain/types";

import { CodecUiHelper, MultichainAction } from "./codecs/CodecUiHelper";
import { OftCmd, SEND_MODE_TAXI } from "./codecs/OftCmd";

/**
 * This is used for LZ receive receive gas (dont confuse with LZ compose gas)
 * Stargate puts 150k for their contract so we copy it for our
 */
const LZ_RECEIVE_CUSTOM_GAS = 150000n;

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
  const oftCmd: OftCmd = new OftCmd(SEND_MODE_TAXI, []);

  const dstEid = getLayerZeroEndpointId(dstChainId);

  if (dstEid === undefined) {
    throw new Error(`No layer zero endpoint for chain: ${dstChainId}`);
  }

  if (isToGmx && (!isSettlementChain(dstChainId) || composeGas === undefined)) {
    throw new Error(`LayerZero provider is not supported on this chain: ${dstChainId}`);
  }

  let to: string;

  if (isToGmx) {
    to = toHex(addressToBytes32(getContract(dstChainId as ContractsChainId, "LayerZeroProvider")));
  } else {
    to = toHex(addressToBytes32(account));
  }

  let composeMsg = "0x";
  let extraOptions = "0x";

  if (isToGmx) {
    if (srcChainId === undefined || !isSourceChain(srcChainId)) {
      throw new Error("Source chain is not supported");
    }

    const data = action ? CodecUiHelper.encodeMultichainComposeActionData(action) : undefined;

    composeMsg = CodecUiHelper.encodeDepositMessage(account, data);
    const builder = Options.newOptions();

    if (isManualGas) {
      extraOptions = builder
        .addExecutorLzReceiveOption(LZ_RECEIVE_CUSTOM_GAS)
        .addExecutorComposeOption(0, composeGas!, nativeDropAmount)
        .toHex();
    } else {
      extraOptions = builder.addExecutorComposeOption(0, composeGas!, nativeDropAmount).toHex();
    }
  } else {
    const builder = Options.newOptions();
    extraOptions = builder.toHex();
  }

  const sendParams: SendParam = {
    dstEid,
    to,
    amountLD,
    minAmountLD: 0n,
    extraOptions,
    composeMsg,
    oftCmd: oftCmd.toBytes(),
  };

  return sendParams;
}

import { Options, addressToBytes32 } from "@layerzerolabs/lz-v2-utilities";
import { toHex } from "viem";

import type { ContractsChainId, AnyChainId } from "config/chains";
import { getContract } from "config/contracts";
import { getLayerZeroEndpointId, isSettlementChain, isSourceChain } from "domain/multichain/config";
import type { SendParamStruct } from "typechain-types-stargate/interfaces/IStargate";

import { CodecUiHelper, MultichainAction } from "./codecs/CodecUiHelper";
import { OftCmd, SEND_MODE_TAXI } from "./codecs/OftCmd";

/**
 * Slippage is set to 0, meaning infinite slippage
 */
export function getMultichainTransferSendParams({
  dstChainId,
  account,
  srcChainId,
  inputAmount,
  composeGas,
  isDeposit,
  action,
}: {
  dstChainId: AnyChainId;
  account: string;
  srcChainId?: AnyChainId;
  inputAmount: bigint;
  composeGas?: bigint;
  isDeposit: boolean;
  action?: MultichainAction;
}): SendParamStruct {
  const oftCmd: OftCmd = new OftCmd(SEND_MODE_TAXI, []);

  const dstEid = getLayerZeroEndpointId(dstChainId);

  if (dstEid === undefined) {
    throw new Error(`No layer zero endpoint for chain id ${dstChainId}`);
  }

  if (isDeposit && (!isSettlementChain(dstChainId) || composeGas === undefined)) {
    throw new Error("LayerZero provider is not supported on this chain");
  }

  let to: string;

  if (isDeposit) {
    to = toHex(addressToBytes32(getContract(dstChainId as ContractsChainId, "LayerZeroProvider")));
  } else {
    to = toHex(addressToBytes32(account));
  }

  let composeMsg = "0x";
  let extraOptions = "0x";

  if (isDeposit) {
    if (srcChainId === undefined) {
      throw new Error("Source chain is not supported");
    }
    if (!isSourceChain(srcChainId)) {
      throw new Error("Source chain is not supported");
    }

    const data = action ? CodecUiHelper.encodeMultichainActionData(action) : undefined;

    composeMsg = CodecUiHelper.encodeDepositMessage(account, data);
    const builder = Options.newOptions();
    extraOptions = builder.addExecutorComposeOption(0, composeGas!, 0).toHex();
  } else {
    const builder = Options.newOptions();
    extraOptions = builder.toHex();
  }

  const sendParams: SendParamStruct = {
    dstEid,
    to,
    amountLD: inputAmount,
    minAmountLD: 0n,
    extraOptions,
    composeMsg,
    oftCmd: oftCmd.toBytes(),
  };

  return sendParams;
}

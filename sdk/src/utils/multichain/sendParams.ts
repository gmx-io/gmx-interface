import { Options, addressToBytes32 } from "@layerzerolabs/lz-v2-utilities";
import { toHex } from "viem";

import type { AnyChainId, ContractsChainId } from "configs/chains";
import { getContract } from "configs/contracts";
import { getLayerZeroEndpointId, isSettlementChain, isSourceChain } from "configs/multichain";

import { encodeDepositMessage, OFT_CMD_TAXI } from "./codecs";

export type SendParam = {
  dstEid: number;
  to: string;
  amountLD: bigint;
  minAmountLD: bigint;
  extraOptions: string;
  composeMsg: string;
  oftCmd: string;
};

export type MessagingFee = {
  nativeFee: bigint;
  lzTokenFee: bigint;
};

/**
 * Stargate puts 150k for their contract; mirrored here.
 * Used only for bridge-in lzReceive (NOT compose).
 */
const LZ_RECEIVE_CUSTOM_GAS = 150_000n;

export function quoteFromNativeFee(nativeFee: bigint): MessagingFee {
  return { nativeFee, lzTokenFee: 0n };
}

export type GetTransferSendParamsArgs = {
  dstChainId: AnyChainId;
  account: string;
  srcChainId?: AnyChainId;
  amountLD: bigint;
  /** Required when isToGmx is true. */
  composeGas?: bigint;
  /** True for bridge-in (deposit into GMX account on settlement chain). */
  isToGmx: boolean;
  /** When true, also adds an explicit lzReceive option (used in bridge-in). */
  isManualGas?: boolean;
  nativeDropAmount?: bigint;
  /** Optional encoded payload appended to the deposit message (`abi.encode(account, data)`). */
  innerData?: string;
};

/**
 * Builds Stargate `SendParam` for either:
 *  - bridge-in to GMX account (`isToGmx=true`): `to` is the destination LayerZeroProvider, payload composes the deposit
 *  - bridge-out / source-chain receiver (`isToGmx=false`): `to` is the user account, no compose payload
 *
 * Slippage is set to 0 (infinite); caller must apply min-amount checks separately if needed.
 */
export function getMultichainTransferSendParams({
  dstChainId,
  account,
  srcChainId,
  amountLD,
  composeGas,
  isToGmx,
  isManualGas = false,
  nativeDropAmount = 0n,
  innerData,
}: GetTransferSendParamsArgs): SendParam {
  const dstEid = getLayerZeroEndpointId(dstChainId);
  if (dstEid === undefined) {
    throw new Error(`No layer zero endpoint for chain: ${dstChainId}`);
  }

  if (isToGmx && !isSettlementChain(dstChainId)) {
    throw new Error(`LayerZero provider is not supported on this chain: ${dstChainId}`);
  }

  if (isToGmx && composeGas === undefined) {
    throw new Error("composeGas is required when isToGmx=true");
  }

  let to: string;
  let composeMsg = "0x";
  let extraOptions = "0x";

  if (isToGmx) {
    if (srcChainId === undefined || !isSourceChain(srcChainId, dstChainId)) {
      throw new Error("Source chain is not supported");
    }

    to = toHex(addressToBytes32(getContract(dstChainId as ContractsChainId, "LayerZeroProvider")));
    composeMsg = encodeDepositMessage(account, innerData);

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
    to = toHex(addressToBytes32(account));
    extraOptions = Options.newOptions().toHex();
  }

  return {
    dstEid,
    to,
    amountLD,
    minAmountLD: 0n,
    extraOptions,
    composeMsg,
    oftCmd: OFT_CMD_TAXI,
  };
}

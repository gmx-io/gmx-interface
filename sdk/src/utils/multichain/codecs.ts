import { addressToBytes32 } from "@layerzerolabs/lz-v2-utilities";
import { Address, concatHex, encodeAbiParameters, encodePacked, type Hex, isHex, toHex } from "viem";

import type { ContractsChainId } from "configs/chains";
import { getContract } from "configs/contracts";

/**
 * Stargate "taxi" send mode — the only mode used by GMX multichain transfers.
 * Other Stargate modes are bus modes that batch passengers; we always send solo.
 */
export const OFT_CMD_TAXI: Hex = "0x";

/**
 * Encodes the inner deposit payload `(address account, bytes data)`.
 */
export function encodeDepositMessage(account: string, data?: string): Hex {
  return encodeAbiParameters([{ type: "address" }, { type: "bytes" }], [account, data ?? "0x"]);
}

/**
 * Wraps an inner message with the LayerZero `composeFrom` prefix (bytes32 address).
 */
export function encodeComposeMsg(composeFromAddress: string, msg: string): Hex {
  if (!isHex(msg)) {
    throw new Error("msg must start with 0x");
  }
  const composeFrom = toHex(addressToBytes32(composeFromAddress));
  return concatHex([composeFrom, msg]);
}

/**
 * Returns the full `composeFromWithMsg` payload used by the destination chain
 * `LayerZeroProvider.lzCompose` to deposit funds for `account`.
 */
export function composeDepositMessage(dstChainId: ContractsChainId, account: string, data?: string): Hex {
  const inner = encodeDepositMessage(account, data);
  return encodeComposeMsg(getLzEndpoint(dstChainId), inner);
}

export function getLzEndpoint(chainId: ContractsChainId): Address {
  return getContract(chainId, "LayerZeroEndpoint") as Address;
}

/**
 * Encodes an OFT composed message: `[nonce][srcEid][amountLD][composeFrom + composeMsg]`.
 */
export function encodeOftComposeMsg(nonce: bigint, srcEid: number, amountLD: bigint, composeMsg: Hex): Hex {
  return encodePacked(["uint64", "uint32", "uint256", "bytes"], [nonce, srcEid, amountLD, composeMsg]);
}

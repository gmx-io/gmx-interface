import { PublicKey } from "@solana/web3.js";

import { ORDER_ACCOUNT_SIZE } from "./solanaOrderConstants";

export const ORDER_DISCRIMINATOR_BYTES = [134, 173, 223, 185, 77, 86, 28, 51];

export type OrderAccountFixtureInput = {
  store: string;
  owner: string;
  marketToken: string;
  actionState?: number;
  updatedAt?: bigint;
  updatedAtSlot?: bigint;
  initialCollateralToken: string;
  finalOutputToken?: string;
  longToken: string;
  shortToken: string;
  primarySwapPath?: string[];
  kind: number;
  side?: number;
  collateralToken: string;
  position?: string;
  initialCollateralDeltaAmount?: bigint;
  sizeDeltaUsd?: bigint;
  minOutput?: bigint;
  triggerPrice?: bigint;
  acceptablePrice?: bigint;
};

function writeU128(buffer: Buffer, value: bigint, offset: number) {
  buffer.writeBigUInt64LE(value & ((1n << 64n) - 1n), offset);
  buffer.writeBigUInt64LE(value >> 64n, offset + 8);
}

function writePubkey(buffer: Buffer, address: string | undefined, offset: number) {
  (address ? new PublicKey(address) : PublicKey.default).toBuffer().copy(buffer, offset);
}

/**
 * Builds raw `order` account bytes at the documented offsets (see solanaOrderConstants.ts). Test only:
 * Anchor's `coder.accounts.encode` cannot encode this account (its fixed buffer is smaller than 2472 bytes).
 */
export function buildOrderAccountFixture(input: OrderAccountFixtureInput): Buffer {
  const buffer = Buffer.alloc(ORDER_ACCOUNT_SIZE);
  Buffer.from(ORDER_DISCRIMINATOR_BYTES).copy(buffer, 0);
  buffer.writeUInt8(input.actionState ?? 0, 9);
  writePubkey(buffer, input.store, 24);
  writePubkey(buffer, input.owner, 88);
  buffer.writeBigInt64LE(input.updatedAt ?? 0n, 160);
  buffer.writeBigUInt64LE(input.updatedAtSlot ?? 0n, 168);
  writePubkey(buffer, input.marketToken, 528);
  writePubkey(buffer, input.initialCollateralToken, 560);
  writePubkey(buffer, input.finalOutputToken, 624);
  writePubkey(buffer, input.longToken, 688);
  writePubkey(buffer, input.shortToken, 752);
  const path = input.primarySwapPath ?? [];
  buffer.writeUInt8(path.length, 944);
  path.forEach((address, index) => writePubkey(buffer, address, 980 + index * 32));
  buffer.writeUInt8(input.kind, 2104);
  buffer.writeUInt8(input.side ?? 0, 2105);
  writePubkey(buffer, input.collateralToken, 2112);
  writePubkey(buffer, input.position, 2144);
  buffer.writeBigUInt64LE(input.initialCollateralDeltaAmount ?? 0n, 2176);
  writeU128(buffer, input.sizeDeltaUsd ?? 0n, 2184);
  writeU128(buffer, input.minOutput ?? 0n, 2200);
  writeU128(buffer, input.triggerPrice ?? 0n, 2216);
  writeU128(buffer, input.acceptablePrice ?? 0n, 2232);
  return buffer;
}

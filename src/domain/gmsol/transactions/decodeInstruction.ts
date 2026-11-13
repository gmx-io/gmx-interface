import orderAbi from "./orderAbi.json";

export type GmsolInstructionName = keyof typeof orderAbi;

// Pinned to crates/programs/idls/gmsol_store.json at 7fe40082 (SDK 0.11.0-beta.1).
export class GmsolInstructionReader {
  offset = 0;
  constructor(readonly bytes: Uint8Array) {}

  read(length: number) {
    if (this.offset + length > this.bytes.length) throw new Error("Truncated instruction data");
    const value = this.bytes.slice(this.offset, this.offset + length);
    this.offset += length;
    return value;
  }

  uint(length: number): bigint {
    return this.read(length).reduceRight((value, byte) => (value << 8n) + BigInt(byte), 0n);
  }

  boolean() {
    const value = this.uint(1);
    if (value !== 0n && value !== 1n) throw new Error("Invalid instruction boolean");
    return value === 1n;
  }

  option<T>(read: () => T): T | undefined {
    return this.boolean() ? read() : undefined;
  }

  end() {
    if (this.offset !== this.bytes.length) throw new Error("Unexpected trailing instruction data");
  }
}

export function readCreateOrderParams(reader: GmsolInstructionReader) {
  return {
    kind: reader.uint(1),
    decreaseSwapType: reader.option(() => reader.uint(1)),
    executionLamports: reader.uint(8),
    swapPathLength: reader.uint(1),
    amount: reader.uint(8),
    size: reader.uint(16),
    isLong: reader.boolean(),
    isCollateralLong: reader.boolean(),
    minOutput: reader.option(() => reader.uint(16)),
    triggerPrice: reader.option(() => reader.uint(16)),
    acceptablePrice: reader.option(() => reader.uint(16)),
    unwrapNative: reader.boolean(),
    validFromTs: reader.option(() => reader.uint(8)),
  };
}

export function decodeGmsolInstruction(data: Uint8Array, accounts: readonly string[]) {
  const reader = new GmsolInstructionReader(data);
  const discriminator = reader.read(8);
  const name = (Object.keys(orderAbi) as GmsolInstructionName[]).find((key) =>
    orderAbi[key].discriminator.every((byte, index) => byte === discriminator[index])
  );
  if (!name) throw new Error("Unexpected gmsol instruction");
  const names: readonly string[] = orderAbi[name].accounts;
  // This slice supports direct orders only: callbacks and swap paths require a separately reviewed ABI extension.
  if (accounts.length !== names.length) throw new Error("Unexpected instruction account count");
  const accountMap = Object.fromEntries(names.map((key, index) => [key, accounts[index]]));
  return { name, reader, accounts: accountMap };
}

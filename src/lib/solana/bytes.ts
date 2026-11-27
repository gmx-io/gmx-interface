import type { ReadonlyUint8Array } from "@solana/kit";

// Kit's readonly view is a Uint8Array at runtime; copy it before passing it to mutable DOM/codec APIs.
export function copySolanaBytes(bytes: ReadonlyUint8Array | Uint8Array): Uint8Array {
  return Uint8Array.from(bytes as Uint8Array);
}

export function isSameSolanaBytes(a: ReadonlyUint8Array | Uint8Array, b: ReadonlyUint8Array | Uint8Array) {
  return a.length === b.length && (a as Uint8Array).every((byte, index) => byte === b[index]);
}

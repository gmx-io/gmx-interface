import { address, getCompiledTransactionMessageEncoder, type Instruction } from "@solana/kit";

import { copySolanaBytes } from "lib/solana/bytes";

import { GmsolInstructionReader } from "./decodeInstruction";
import type { GmsolTransactionPlan } from "./types";
import { decodeGmsolTransaction, requireGmsol } from "./validateTransaction";

const LIGHTHOUSE_PROGRAM = address("L2TExMFKdjpN9kozasaurPirfHy9P8sbXoAN1qA3S95");
const MESSAGE_ERROR = "Wallet returned a different transaction message";
const sameBytes = (a: Uint8Array, b: Uint8Array) => a.length === b.length && a.every((byte, i) => byte === b[i]);

const lookupAccounts = (message: ReturnType<typeof decodeGmsolTransaction>["compiled"]) =>
  (message.addressTableLookups ?? [])
    .map((lookup) => ({
      table: lookup.lookupTableAddress,
      writable: [...lookup.writableIndexes].sort((a, b) => a - b),
      readonly: [...lookup.readonlyIndexes].sort((a, b) => a - b),
    }))
    .sort((a, b) => a.table.localeCompare(b.table));

// Lighthouse ABI at Jac0xb/lighthouse 4c579479: Borsh enums and unsigned LEB128 vectors/CompactU64.
function compactU64(reader: GmsolInstructionReader) {
  let value = 0n;
  for (let i = 0; i < 10; i++) {
    const byte = reader.uint(1);
    requireGmsol(i < 9 || byte <= 1n, "Invalid Lighthouse compact integer");
    value |= (byte & 127n) << BigInt(i * 7);
    if (byte < 128n) {
      requireGmsol(i === 0 || byte !== 0n, "Noncanonical Lighthouse compact integer");
      return value;
    }
  }
  throw new Error("Invalid Lighthouse compact integer");
}

function enumValue(reader: GmsolInstructionReader, count: bigint) {
  const value = reader.uint(1);
  requireGmsol(value < count, "Unsupported Lighthouse assertion encoding");
  return value;
}

function validateLighthouseAssertion(ix: Instruction, originalAccounts: Set<string>) {
  requireGmsol(
    ix.accounts?.length === 1 && originalAccounts.has(ix.accounts[0].address),
    "Unexpected Lighthouse assertion account"
  );
  const reader = new GmsolInstructionReader(ix.data ? copySolanaBytes(ix.data) : new Uint8Array());
  const instruction = reader.uint(1);
  requireGmsol(instruction === 6n || instruction === 10n, "Unsupported Lighthouse instruction");
  enumValue(reader, 7n); // Borsh LogLevel ordinal, not its Rust repr(u8) value.
  const count = compactU64(reader);
  requireGmsol(count > 0n && count <= BigInt(reader.bytes.length), "Invalid Lighthouse assertion count");
  for (let i = 0n; i < count; i++) {
    const field = enumValue(reader, 9n);
    if (instruction === 6n) {
      if (field === 8n) {
        reader.read(32); // VerifyDatahash: expected hash, start and length.
        compactU64(reader);
        compactU64(reader);
        continue;
      }
      if (field === 2n) reader.read(32);
      else if (field === 3n) enumValue(reader, 9n);
      else if (field >= 5n) reader.boolean();
      else reader.read(8);
      enumValue(reader, field === 0n || field === 1n || field === 4n ? 8n : 2n);
    } else {
      if (field === 8n) continue; // TokenAccountOwnerIsDerived has no payload.
      if (field === 0n || field === 1n) reader.read(32);
      else if (field === 3n || field === 7n) reader.option(() => reader.read(32));
      else if (field === 5n) reader.option(() => reader.read(8));
      else reader.read(field === 4n ? 1 : 8);
      enumValue(reader, field === 2n || field === 4n || field === 6n ? 8n : 2n);
    }
  }
  reader.end();
}

/** Accept only additive, read-only Lighthouse assertions around an otherwise identical transaction. */
export function validateGmsolWalletTransaction({
  originalBytes,
  signedBytes,
  plan,
}: {
  originalBytes: Uint8Array;
  signedBytes: Uint8Array;
  plan: GmsolTransactionPlan;
}) {
  const original = decodeGmsolTransaction(originalBytes, plan);
  const signed = decodeGmsolTransaction(signedBytes, plan);
  if (sameBytes(copySolanaBytes(original.tx.messageBytes), copySolanaBytes(signed.tx.messageBytes)))
    return { transaction: signed.tx, hasAssertions: false };

  const before = original.compiled;
  const after = signed.compiled;
  requireGmsol(
    !before.staticAccounts.includes(LIGHTHOUSE_PROGRAM) &&
      after.staticAccounts.length === before.staticAccounts.length + 1 &&
      new Set(after.staticAccounts).size === after.staticAccounts.length &&
      before.staticAccounts.every((key, i) => {
        const j = after.staticAccounts.indexOf(key);
        return (
          j >= 0 &&
          i < before.staticAccounts.length - before.header.numReadonlyNonSignerAccounts ===
            j < after.staticAccounts.length - after.header.numReadonlyNonSignerAccounts
        );
      }) &&
      after.header.numReadonlyNonSignerAccounts === before.header.numReadonlyNonSignerAccounts + 1 &&
      after.staticAccounts.indexOf(LIGHTHOUSE_PROGRAM) >=
        after.staticAccounts.length - after.header.numReadonlyNonSignerAccounts &&
      JSON.stringify(lookupAccounts(before)) === JSON.stringify(lookupAccounts(after)) &&
      sameBytes(
        copySolanaBytes(getCompiledTransactionMessageEncoder().encode(after)),
        copySolanaBytes(signed.tx.messageBytes)
      ),
    MESSAGE_ERROR
  );
  const originalAccounts = new Set<string>([
    ...before.staticAccounts,
    ...[...original.message.instructions].flatMap((ix) => (ix.accounts ?? []).map((account) => account.address)),
  ]);
  let index = 0;
  let assertions = 0;
  for (const ix of signed.message.instructions) {
    if (ix.programAddress === LIGHTHOUSE_PROGRAM) {
      validateLighthouseAssertion(ix, originalAccounts);
      assertions++;
      continue;
    }
    const expected = original.message.instructions[index++];
    requireGmsol(
      expected &&
        ix.programAddress === expected.programAddress &&
        JSON.stringify(ix.accounts ?? []) === JSON.stringify(expected.accounts ?? []) &&
        sameBytes(
          ix.data ? copySolanaBytes(ix.data) : new Uint8Array(),
          expected.data ? copySolanaBytes(expected.data) : new Uint8Array()
        ),
      MESSAGE_ERROR
    );
  }
  requireGmsol(assertions > 0 && index === original.message.instructions.length, MESSAGE_ERROR);
  return { transaction: signed.tx, hasAssertions: true };
}

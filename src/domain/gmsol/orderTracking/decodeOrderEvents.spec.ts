// @vitest-environment node
import { getBase58Decoder, getBase58Encoder } from "@solana/kit";
import { describe, expect, it } from "vitest";

import contract from "./__fixtures__/event-contract.json";
import fixtures from "./__fixtures__/order-event-fixtures.json";
import { decodeOrderEvents } from "./decodeOrderEvents";
import layout from "./orderEventLayout.json";

const sample = fixtures.cases[1];
function input(c = sample) {
  const receipt = JSON.parse(JSON.stringify(c.report.receipt));
  receipt.version = 0;
  receipt.slot = BigInt(receipt.slot);
  for (const group of receipt.meta.innerInstructions) {
    group.index = Number(group.index);
    for (const ix of group.instructions) {
      ix.programIdIndex = Number(ix.programIdIndex);
      ix.accounts = ix.accounts.map(Number);
    }
  }
  return { network: "solana-mainnet" as const, signature: c.report.signature, slot: receipt.slot as bigint, receipt };
}
const serializable = (value: unknown) =>
  JSON.parse(JSON.stringify(value, (_, item) => (typeof item === "bigint" ? item.toString() : item)));
const encoder = getBase58Encoder();
const decoder = getBase58Decoder();
function mutateEvent(mutate: (bytes: Uint8Array) => Uint8Array, name = "TradeEvent") {
  const c = name === "OrderUpdated" ? fixtures.cases[0] : sample;
  const request = input(c);
  const event = c.expectedEvents.find((e) => e.name === name)!;
  const group = request.receipt.meta.innerInstructions.find(
    (g: { index: number }) => g.index === Number(event.outerIndex)
  );
  const ix = group.instructions[Number(event.innerIndex)];
  ix.data = decoder.decode(mutate(encoder.encode(ix.data).slice()));
  return request;
}

describe("pinned order event decoding", () => {
  it("decodes all fields of actual finalized v0 receipts including LUTs and preserves scope and location", () => {
    for (const c of fixtures.cases) {
      const request = input(c);
      const result = decodeOrderEvents(request);
      expect(result.status).toBe("decoded");
      if (result.status !== "decoded") throw new Error("Expected decoded receipt");
      expect(result.signature).toBe(c.report.signature);
      expect(result.slot).toBe(BigInt(c.report.receipt.slot));
      expect(serializable(result.events)).toEqual(
        c.expectedEvents.map((event) => ({
          name: event.name,
          outerIndex: Number(event.outerIndex),
          innerIndex: Number(event.innerIndex),
          fields: event.decoded,
        }))
      );
    }
    const cancelled = decodeOrderEvents(input(fixtures.cases[3]));
    expect(cancelled.events[0].fields).toMatchObject({ state: "Cancelled", reason: "executed", id: 6273n });
    expect(layout.idlSha256).toBe(contract.idlSha256);
    expect(layout.envelope).toEqual(contract.envelope);
    expect(layout.events).toEqual(contract.events.map(({ name, discriminatorHex }) => ({ name, discriminatorHex })));
    expect(layout.types).toEqual(Object.fromEntries(contract.types.map((t) => [t.name, stripDocs(t.type)])));
  });

  it("excludes failed metadata before inspecting event bytes and distinguishes missing evidence", () => {
    for (const err of ["AccountNotFound", { InstructionError: [0, "Custom"] }]) {
      const request = input();
      request.receipt.meta = { err };
      expect(decodeOrderEvents(request)).toMatchObject({ status: "transaction-failed", events: [] });
    }
    for (const err of ["", {}, undefined]) {
      const request = input();
      request.receipt.meta.err = err;
      expect(decodeOrderEvents(request)).toMatchObject({ status: "invalid", events: [] });
    }
    for (const field of ["meta", "err", "innerInstructions", "loadedAddresses"]) {
      const request = input();
      if (field === "meta") request.receipt.meta = null;
      else delete request.receipt.meta[field];
      expect(decodeOrderEvents(request)).toMatchObject({ status: "unavailable", events: [] });
    }
  });

  it("rejects corrupted target data without exposing partial valid events", () => {
    const mutations: ((bytes: Uint8Array) => Uint8Array)[] = [
      (b) => b.subarray(0, 7),
      (b) => b.subarray(0, 15),
      (b) => b.subarray(0, b.length - 1),
      (b) => new Uint8Array([...b, 0]),
      (b) => {
        b[0] ^= 1;
        return b;
      },
      (b) => {
        b.fill(255, 8, 16);
        return b;
      },
    ];
    for (const mutation of mutations)
      expect(decodeOrderEvents(mutateEvent(mutation))).toMatchObject({ status: "invalid", events: [] });
    for (const [offset, value] of [
      [16 + 88, 255],
      [16 + 153, 255],
      [16 + 158, 255],
      [16 + 154, 255],
    ]) {
      const request = mutateEvent((b) => {
        b[offset] = value;
        return b;
      }, "OrderRemoved");
      expect(decodeOrderEvents(request)).toMatchObject({ status: "invalid", events: [] });
    }
  });

  it("rejects wrong signatures, slots, versions and unresolved account indices", () => {
    const mutations = [
      (r) => {
        r.signature = fixtures.cases[0].report.signature;
      },
      (r) => {
        r.slot += 1n;
      },
      (r) => {
        r.receipt.version = 1;
      },
      (r) => {
        r.receipt.meta.innerInstructions[0].index = 999;
      },
      (r) => {
        r.receipt.meta.innerInstructions.push(r.receipt.meta.innerInstructions[0]);
      },
      (r) => {
        r.receipt.meta.loadedAddresses.readonly = [];
      },
      (r) => {
        r.receipt.meta.innerInstructions[0].instructions[0].programIdIndex = 999;
      },
    ] satisfies ((r: ReturnType<typeof input>) => void)[];
    for (const mutate of mutations) {
      const request = input();
      mutate(request);
      expect(decodeOrderEvents(request)).toMatchObject({ status: "invalid", events: [] });
    }
  });
  it("preserves u128 and signed i128 and rejects invalid bool and option tags", () => {
    const result = decodeOrderEvents(
      mutateEvent((b) => {
        b.fill(255, 16 + 976, 16 + 1008);
        return b;
      })
    );
    expect(result.events[0].fields).toMatchObject({ execution_price: (1n << 128n) - 1n, price_impact_value: -1n });
    for (const offset of [16, 16 + 156]) {
      expect(
        decodeOrderEvents(
          mutateEvent((b) => {
            b[offset] = 2;
            return b;
          }, "OrderUpdated")
        )
      ).toMatchObject({ status: "invalid", events: [] });
    }
  });

  it("never consumes top-level/log events, rejects a forged authority, and supports explicit legacy accounts", () => {
    const empty = input();
    const target = sample.expectedEvents[0];
    const eventGroup = empty.receipt.meta.innerInstructions.find(
      (g: { index: number }) => g.index === Number(target.outerIndex)
    );
    const fakeTopLevel = eventGroup.instructions[Number(target.innerIndex)];
    empty.receipt.transaction.message.instructions.push(fakeTopLevel);
    empty.receipt.meta.logMessages = [fakeTopLevel.data];
    empty.receipt.meta.innerInstructions = [];
    expect(decodeOrderEvents(empty)).toMatchObject({ status: "decoded", events: [] });
    const wrong = input();
    const event = sample.expectedEvents[0];
    const group = wrong.receipt.meta.innerInstructions.find(
      (g: { index: number }) => g.index === Number(event.outerIndex)
    );
    group.instructions[Number(event.innerIndex)].accounts = [0];
    expect(decodeOrderEvents(wrong)).toMatchObject({ status: "invalid", events: [] });
    const legacy = input();
    legacy.receipt.version = "legacy";
    const loaded = legacy.receipt.meta.loadedAddresses;
    legacy.receipt.transaction.message.accountKeys.push(...loaded.writable, ...loaded.readonly);
    legacy.receipt.meta.loadedAddresses = null;
    expect(decodeOrderEvents(legacy).events).toEqual(decodeOrderEvents(input()).events);
  });
});

function stripDocs(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(stripDocs);
  if (value && typeof value === "object")
    return Object.fromEntries(
      Object.entries(value)
        .filter(([key]) => key !== "docs" && key !== "repr")
        .map(([key, item]) => [key, stripDocs(item)])
    );
  return value;
}

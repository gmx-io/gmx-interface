import { describe, expect, it } from "vitest";

import fixtures from "./__fixtures__/order-event-fixtures.json";
import { getCreatedOrderActions } from "./getCreatedOrderActions";
import { readOrderLifecycle, type OrderLifecycleReader } from "./readOrderLifecycle";

function receipt(index: number) {
  const c = fixtures.cases[index];
  const result = JSON.parse(JSON.stringify(c.report.receipt));
  result.version = 0;
  result.slot = BigInt(result.slot);
  for (const group of result.meta.innerInstructions) {
    group.index = Number(group.index);
    for (const ix of group.instructions) {
      ix.programIdIndex = Number(ix.programIdIndex);
      ix.accounts = ix.accounts.map(Number);
    }
  }
  return result;
}
function action(index = 0) {
  const c = fixtures.cases[index];
  const fields = c.expectedEvents[0].decoded;
  return getCreatedOrderActions({
    signature: c.report.signature,
    slot: BigInt(c.report.receipt.slot),
    owner: fields.owner!,
    orderAddresses: [fields.order],
    receipt: receipt(index),
  })[0];
}
function reader(indices: number[]): OrderLifecycleReader {
  return {
    getSignatures: async () =>
      indices.map((index) => ({
        signature: fixtures.cases[index].report.signature,
        slot: BigInt(fixtures.cases[index].report.receipt.slot),
        err: null,
      })),
    getTransaction: async (signature) => receipt(fixtures.cases.findIndex((c) => c.report.signature === signature)),
    getBlockSignatures: async () => undefined,
  };
}

describe("tracked order lifecycle reads", () => {
  it("matches real creation identities and outcomes without equating confirmation with execution", async () => {
    for (const [indices, expected, creation] of [
      [[1, 0], "executed", 0],
      [[3, 2], "cancelled", 2],
      [[0], "unresolved", 0],
    ] as const) {
      const result = await readOrderLifecycle({
        action: action(creation),
        reader: reader([...indices]),
        signal: new AbortController().signal,
      });
      expect(result.execution).toBe(expected);
      expect(result.submission).toBe("submitted");
    }
    for (const patch of [{ owner: "other-owner" }, { orderAddresses: ["other-order"] }, { orderAddresses: [] }]) {
      const c = fixtures.cases[0];
      expect(() =>
        getCreatedOrderActions({
          signature: c.report.signature,
          slot: BigInt(c.report.receipt.slot),
          owner: c.expectedEvents[0].decoded.owner!,
          orderAddresses: [c.expectedEvents[0].decoded.order],
          receipt: receipt(0),
          ...patch,
        })
      ).toThrow();
    }
  });

  it("keeps missing, failed, unavailable and unanchored observations unresolved", async () => {
    const variants: ((r: OrderLifecycleReader) => void)[] = [
      (r) => {
        r.getSignatures = reader([1]).getSignatures;
      },
      (r) => {
        r.getTransaction = async () => null;
      },
      (r) => {
        r.getTransaction = async () => {
          throw new Error("RPC unavailable");
        };
      },
      (r) => {
        const source = r.getTransaction;
        r.getTransaction = async (signature, signal) => {
          const tx = (await source(signature, signal)) as ReturnType<typeof receipt>;
          if (signature === fixtures.cases[1].report.signature) tx.meta.err = { InstructionError: [0, "Custom"] };
          return tx;
        };
      },
    ];
    for (const change of variants) {
      const source = reader([1, 0]);
      change(source);
      const result = await readOrderLifecycle({
        action: action(),
        reader: source,
        signal: new AbortController().signal,
      });
      expect(result.execution).toBe("unresolved");
    }
  });

  it("orders same-slot observations from block signatures even when RPC address history puts creation first", async () => {
    const source = reader([0, 1]);
    const original = source.getTransaction;
    const slot = BigInt(fixtures.cases[0].report.receipt.slot);
    source.getSignatures = async () =>
      [0, 1].map((i) => ({ signature: fixtures.cases[i].report.signature, slot, err: null }));
    source.getTransaction = async (signature, signal) => {
      const tx = (await original(signature, signal)) as ReturnType<typeof receipt>;
      tx.slot = slot;
      // Move the historical execute observation to the creation slot, including its event slot field.
      if (signature === fixtures.cases[1].report.signature) {
        const { getBase58Decoder, getBase58Encoder } = await import("@solana/kit");
        const encoder = getBase58Encoder();
        const decoder = getBase58Decoder();
        for (const event of fixtures.cases[1].expectedEvents) {
          const ix = tx.meta.innerInstructions.find((g: { index: number }) => g.index === Number(event.outerIndex))
            .instructions[Number(event.innerIndex)];
          const bytes = encoder.encode(ix.data).slice();
          const offset = event.name === "TradeEvent" ? 16 + 8 + 8 + 32 * 7 + 8 : 16 + 8 + 8;
          new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength).setBigUint64(offset, slot, true);
          ix.data = decoder.decode(bytes);
        }
      }
      return tx;
    };
    source.getBlockSignatures = async () => [fixtures.cases[0].report.signature, fixtures.cases[1].report.signature];
    expect(
      (await readOrderLifecycle({ action: action(), reader: source, signal: new AbortController().signal })).execution
    ).toBe("executed");
    source.getBlockSignatures = async () => undefined;
    expect(
      (await readOrderLifecycle({ action: action(), reader: source, signal: new AbortController().signal })).execution
    ).toBe("unresolved");
  });

  it("paginates to the creation anchor and bounds a missing anchor without accepting failed keeper events", async () => {
    const source = reader([1, 0]);
    const getSignatures = source.getSignatures;
    const failed = Array.from({ length: 100 }, (_, i) => ({
      signature: `failed-${i}`,
      slot: 999999999n,
      err: { InstructionError: [0, "Custom"] },
    }));
    source.getSignatures = async (params) => (params.before ? getSignatures(params) : failed);
    const result = await readOrderLifecycle({ action: action(), reader: source, signal: new AbortController().signal });
    expect(result.execution).toBe("executed");
    let pages = 0;
    source.getSignatures = async () => failed.map((item) => ({ ...item, signature: `${pages++}:${item.signature}` }));
    const missing = await readOrderLifecycle({
      action: action(),
      reader: source,
      signal: new AbortController().signal,
    });
    expect(missing.execution).toBe("unresolved");
    expect(pages).toBe(500);
    const controller = new AbortController();
    controller.abort();
    await expect(readOrderLifecycle({ action: action(), reader: source, signal: controller.signal })).rejects.toThrow();
  });
});

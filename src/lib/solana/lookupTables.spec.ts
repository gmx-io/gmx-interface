import { expect, it } from "vitest";

import { decodeReviewedSolanaLookupTable } from "./lookupTables";

it("accepts a frozen active LUT and rejects mutable, deactivated or malformed accounts FESOL-56", () => {
  const bytes = new Uint8Array(88);
  const view = new DataView(bytes.buffer);
  view.setUint32(0, 1, true);
  view.setBigUint64(4, (1n << 64n) - 1n, true);
  expect(decodeReviewedSolanaLookupTable(bytes)).toEqual(["11111111111111111111111111111111"]);
  const mutable = bytes.slice();
  mutable[21] = 1;
  expect(() => decodeReviewedSolanaLookupTable(mutable)).toThrow(/frozen/);
  const deactivated = bytes.slice();
  new DataView(deactivated.buffer).setBigUint64(4, 1n, true);
  expect(() => decodeReviewedSolanaLookupTable(deactivated)).toThrow(/deactivated/);
  expect(() => decodeReviewedSolanaLookupTable(bytes.slice(0, 87))).toThrow(/length/);
  expect(() => decodeReviewedSolanaLookupTable(new Uint8Array(56 + 257 * 32))).toThrow();
});

it("accepts only an explicitly reviewed authority for a mutable GMX copy FESOL-56", () => {
  const bytes = new Uint8Array(88);
  const view = new DataView(bytes.buffer);
  view.setUint32(0, 1, true);
  view.setBigUint64(4, (1n << 64n) - 1n, true);
  bytes[21] = 1;
  const authority = "11111111111111111111111111111111";
  expect(decodeReviewedSolanaLookupTable(bytes, authority)).toEqual([authority]);
  expect(() => decodeReviewedSolanaLookupTable(bytes)).toThrow(/reviewed/);
  expect(() => decodeReviewedSolanaLookupTable(bytes, "CoMLGFDWf5soeQ6vtzL6yXeARtwNhTV41cVsrTos31wg")).toThrow(
    /reviewed/
  );
  bytes[21] = 2;
  expect(() => decodeReviewedSolanaLookupTable(bytes, authority)).toThrow(/reviewed/);
  bytes[21] = 1;
  view.setBigUint64(4, 1n, true);
  expect(() => decodeReviewedSolanaLookupTable(bytes, authority)).toThrow(/deactivated/);
});

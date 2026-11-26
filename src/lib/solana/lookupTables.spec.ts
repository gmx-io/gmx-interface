import { address, getAddressEncoder, getBase64Decoder } from "@solana/kit";
import { expect, it, vi } from "vitest";

import { GMSOL_LOOKUP_TABLE_ADDRESSES } from "config/gmsol/lookupTables";

import { copySolanaBytes } from "./bytes";
import { decodeReviewedSolanaLookupTable, fetchGmsolLookupTables } from "./lookupTables";

const { fetchSolanaAccounts, reviewedAuthority } = vi.hoisted(() => ({
  fetchSolanaAccounts: vi.fn(),
  reviewedAuthority: "CoMLGFDWf5soeQ6vtzL6yXeARtwNhTV41cVsrTos31wg",
}));
vi.mock("./rpc", () => ({ fetchSolanaAccounts }));
vi.mock("config/gmsol/lookupTables", async (importOriginal) => {
  const config = await importOriginal<typeof import("config/gmsol/lookupTables")>();
  return { ...config, GMSOL_LOOKUP_TABLE_AUTHORITIES: { [config.GMSOL_LOOKUP_TABLE_ADDRESSES[1]]: reviewedAuthority } };
});

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

it("reads a frozen LUT once per session and one with a reviewed authority on every read FESOL-56", async () => {
  const [frozen, owned] = GMSOL_LOOKUP_TABLE_ADDRESSES;
  const account = (key: string) => {
    const bytes = new Uint8Array(88);
    const view = new DataView(bytes.buffer);
    view.setUint32(0, 1, true);
    view.setBigUint64(4, (1n << 64n) - 1n, true);
    if (key === owned) {
      bytes[21] = 1;
      bytes.set(copySolanaBytes(getAddressEncoder().encode(address(reviewedAuthority))), 22);
    }
    bytes.set(copySolanaBytes(getAddressEncoder().encode(address(key))), 56);
    return {
      owner: "AddressLookupTab1e1111111111111111111111111",
      executable: false,
      data: [getBase64Decoder().decode(bytes), "base64"],
    };
  };
  fetchSolanaAccounts.mockImplementation(async (keys: string[]) => keys.map((key) => account(key)));
  // The build and the sender's re-read before signing; a caller's edit must not reach the cache.
  for (let read = 0; read < 2; read++) {
    const tables = await fetchGmsolLookupTables();
    expect(tables).toEqual({ [frozen]: [frozen], [owned]: [owned] });
    tables[frozen].push(owned);
  }
  expect(fetchSolanaAccounts.mock.calls).toEqual([[[frozen, owned]], [[owned]]]);
  fetchSolanaAccounts.mockResolvedValueOnce([null]);
  await expect(fetchGmsolLookupTables()).rejects.toThrow("Invalid lookup table account");
});

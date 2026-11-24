import { address, getAddressDecoder, getBase64Encoder } from "@solana/kit";

import { GMSOL_LOOKUP_TABLE_ADDRESSES, GMSOL_LOOKUP_TABLE_AUTHORITIES } from "config/gmsol/lookupTables";

import { copySolanaBytes } from "./bytes";
import { fetchSolanaAccounts } from "./rpc";

const LOOKUP_TABLE_PROGRAM = "AddressLookupTab1e1111111111111111111111111";
const U64_MAX = (1n << 64n) - 1n;

export function decodeReviewedSolanaLookupTable(data: Uint8Array, expectedAuthority?: string): string[] {
  if (data.length < 56 || data.length > 56 + 256 * 32 || (data.length - 56) % 32 !== 0)
    throw new Error("Invalid lookup table length");
  const view = new DataView(data.buffer, data.byteOffset, data.byteLength);
  if (view.getUint32(0, true) !== 1 || view.getBigUint64(4, true) !== U64_MAX) {
    throw new Error("Lookup table is invalid or deactivated");
  }
  const frozen = data[21] === 0;
  const reviewedGmxAuthority =
    data[21] === 1 &&
    expectedAuthority !== undefined &&
    getAddressDecoder().decode(data.subarray(22, 54)) === expectedAuthority;
  if (!frozen && !reviewedGmxAuthority) throw new Error("Trading requires frozen or reviewed GMX-owned lookup tables");
  return Array.from({ length: (data.length - 56) / 32 }, (_, index) =>
    getAddressDecoder().decode(data.subarray(56 + index * 32, 88 + index * 32))
  );
}

export async function fetchGmsolLookupTables(): Promise<Record<string, string[]>> {
  const tables = await fetchSolanaAccounts(GMSOL_LOOKUP_TABLE_ADDRESSES.map((key) => address(key)));
  return Object.fromEntries(
    tables.map((table, index) => {
      if (!table || table.owner !== LOOKUP_TABLE_PROGRAM || table.executable)
        throw new Error("Invalid lookup table account");
      return [
        GMSOL_LOOKUP_TABLE_ADDRESSES[index],
        decodeReviewedSolanaLookupTable(
          copySolanaBytes(getBase64Encoder().encode(table.data[0])),
          GMSOL_LOOKUP_TABLE_AUTHORITIES[GMSOL_LOOKUP_TABLE_ADDRESSES[index]]
        ),
      ];
    })
  );
}

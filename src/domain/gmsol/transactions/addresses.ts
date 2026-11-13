import { address, getAddressEncoder, getProgramDerivedAddress } from "@solana/kit";

import { GMSOL_STORE_ADDRESS, GMSOL_STORE_PROGRAM_ID, SOLANA_TOKEN_PROGRAM_ID } from "config/gmsol/program";

export const ASSOCIATED_TOKEN_PROGRAM = "ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL";
export const COMPUTE_BUDGET_PROGRAM = "ComputeBudget111111111111111111111111111111";
export const WRAPPED_SOL_MINT = "So11111111111111111111111111111111111111112";

const encode = (key: string) => getAddressEncoder().encode(address(key));

export async function gmsolPda(seed: string, keys: string[], extra: Uint8Array[] = []) {
  const [key] = await getProgramDerivedAddress({
    programAddress: address(GMSOL_STORE_PROGRAM_ID),
    seeds: [new TextEncoder().encode(seed), ...keys.map(encode), ...extra],
  });
  return key;
}

export function getGmsolPositionAddress(p: {
  owner: string;
  marketToken: string;
  collateralToken: string;
  isLong: boolean;
}) {
  return gmsolPda(
    "position",
    [GMSOL_STORE_ADDRESS, p.owner, p.marketToken, p.collateralToken],
    [Uint8Array.of(p.isLong ? 1 : 2)]
  );
}

export async function getGmsolAta(owner: string, mint: string) {
  const [key] = await getProgramDerivedAddress({
    programAddress: address(ASSOCIATED_TOKEN_PROGRAM),
    seeds: [encode(owner), encode(SOLANA_TOKEN_PROGRAM_ID), encode(mint)],
  });
  return key;
}

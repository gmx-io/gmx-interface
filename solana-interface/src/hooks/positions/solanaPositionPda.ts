import { PublicKey } from "@solana/web3.js";

import { GMX_SOLANA_STORE_ADDRESS, GMX_SOLANA_STORE_PROGRAM_ID } from "../../config/solanaProgram";

/** Position PDA: seeds `["position", store, owner, marketToken, collateralToken, [kind]]`. */
export function findSolanaPositionPda(
  owner: string,
  marketToken: string,
  collateralToken: string,
  kind: number,
  store = GMX_SOLANA_STORE_ADDRESS
): PublicKey {
  return PublicKey.findProgramAddressSync(
    [
      Buffer.from("position"),
      new PublicKey(store).toBuffer(),
      new PublicKey(owner).toBuffer(),
      new PublicKey(marketToken).toBuffer(),
      new PublicKey(collateralToken).toBuffer(),
      Uint8Array.from([kind]),
    ],
    new PublicKey(GMX_SOLANA_STORE_PROGRAM_ID)
  )[0];
}

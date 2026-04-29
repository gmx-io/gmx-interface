import { keccak256, type Hash } from "viem";
import { privateKeyToAccount } from "viem/accounts";

import { SUBACCOUNT_MESSAGE } from "configs/express";
import type { IAbstractSigner } from "utils/signer";
import { PrivateKeySigner } from "utils/signer";

export type GeneratedSubaccount = {
  address: string;
  signer: PrivateKeySigner;
  privateKey: string;
};

export async function generateSubaccount(mainSigner: IAbstractSigner): Promise<GeneratedSubaccount> {
  const signature = await mainSigner.signMessage(SUBACCOUNT_MESSAGE);

  const pk = keccak256(signature as Hash) as `0x${string}`;
  const account = privateKeyToAccount(pk);
  const signer = new PrivateKeySigner(pk);

  return {
    address: account.address,
    signer,
    privateKey: pk,
  };
}

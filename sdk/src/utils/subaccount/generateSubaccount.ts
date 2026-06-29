import cryptoJs from "crypto-js";
import { keccak256, type Hash } from "viem";
import { privateKeyToAccount } from "viem/accounts";

import { SUBACCOUNT_MESSAGE } from "configs/express";
import type { IAbstractSigner } from "utils/signer";
import { PrivateKeySigner } from "utils/signer";

export type GeneratedSubaccount = {
  address: string;
  signer: PrivateKeySigner;
  /** AES-encrypted private key (encrypted with main account address) */
  privateKey: string;
};

export async function generateSubaccount(mainSigner: IAbstractSigner): Promise<GeneratedSubaccount> {
  const signature = await mainSigner.signMessage(SUBACCOUNT_MESSAGE);

  const pk = keccak256(signature as Hash) as `0x${string}`;
  const account = privateKeyToAccount(pk);
  const signer = new PrivateKeySigner(pk);

  const encryptedPrivateKey = cryptoJs.AES.encrypt(pk, mainSigner.address).toString();

  return {
    address: account.address,
    signer,
    privateKey: encryptedPrivateKey,
  };
}

export function decryptSubaccountPrivateKey(encryptedPrivateKey: string, mainAccountAddress: string): `0x${string}` {
  const decrypted = cryptoJs.AES.decrypt(encryptedPrivateKey, mainAccountAddress).toString(cryptoJs.enc.Utf8);
  if (!decrypted) {
    throw new Error("Failed to decrypt subaccount private key");
  }
  return decrypted as `0x${string}`;
}

export function createSubaccountSignerFromConfig(
  encryptedPrivateKey: string,
  mainAccountAddress: string
): PrivateKeySigner {
  const pk = decryptSubaccountPrivateKey(encryptedPrivateKey, mainAccountAddress);
  return new PrivateKeySigner(pk);
}

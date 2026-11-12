import cryptoJs from "crypto-js";
import { keccak256, type Hash } from "viem";
import { generatePrivateKey } from "viem/accounts";

import { SUBACCOUNT_MESSAGE } from "configs/express";
import type { IAbstractSigner } from "utils/signer";
import { PrivateKeySigner } from "utils/signer";

export type GeneratedSubaccount = {
  address: string;
  signer: PrivateKeySigner;
  privateKey: `0x${string}`;
};

export function getSubaccountFromPrivateKey(privateKey: `0x${string}`): GeneratedSubaccount {
  const signer = new PrivateKeySigner(privateKey);

  return { address: signer.address, signer, privateKey };
}

export function generateSubaccount(): GeneratedSubaccount {
  return getSubaccountFromPrivateKey(generatePrivateKey() as `0x${string}`);
}

/**
 * Rebuilds a key that came from a signature of `SUBACCOUNT_MESSAGE` or `OLD_SUBACCOUNT_MESSAGE`,
 * to withdraw native tokens left on its address. Never approve this key again.
 */
export async function deriveLegacySubaccount(
  mainSigner: IAbstractSigner,
  message: string = SUBACCOUNT_MESSAGE
): Promise<GeneratedSubaccount> {
  const signature = await mainSigner.signMessage(message);

  return getSubaccountFromPrivateKey(keccak256(signature as Hash) as `0x${string}`);
}

/**
 * @deprecated Only reads configs stored by SDK versions below 3.0.0.
 */
export function decryptSubaccountPrivateKey(encryptedPrivateKey: string, mainAccountAddress: string): `0x${string}` {
  const decrypted = cryptoJs.AES.decrypt(encryptedPrivateKey, mainAccountAddress).toString(cryptoJs.enc.Utf8);
  if (!decrypted) {
    throw new Error("Failed to decrypt subaccount private key");
  }
  return decrypted as `0x${string}`;
}

/**
 * @deprecated Only reads configs stored by SDK versions below 3.0.0.
 */
export function createSubaccountSignerFromConfig(
  encryptedPrivateKey: string,
  mainAccountAddress: string
): PrivateKeySigner {
  const pk = decryptSubaccountPrivateKey(encryptedPrivateKey, mainAccountAddress);
  return new PrivateKeySigner(pk);
}

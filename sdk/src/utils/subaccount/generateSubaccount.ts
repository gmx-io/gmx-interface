import cryptoJs from "crypto-js";
import { generatePrivateKey } from "viem/accounts";

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

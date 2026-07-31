import { AES } from "crypto-js";
import { Signer } from "ethers";
import { keccak256, type Hash } from "viem";
import { privateKeyToAccount } from "viem/accounts";

import { getSignatureKind, signMessage } from "lib/wallets/signing";
import { SUBACCOUNT_MESSAGE } from "sdk/configs/express";

export const EMPTY_SUBACCOUNT_SIGNATURE_ERROR = "Wallet returned an empty signature";

export async function generateSubaccount(signer: Signer, verificationChainId: number) {
  const signature = await signMessage({ signer, message: SUBACCOUNT_MESSAGE, verificationChainId });

  if (getSignatureKind(signature) === "malformed") {
    throw new Error(EMPTY_SUBACCOUNT_SIGNATURE_ERROR);
  }

  const pk = keccak256(signature as Hash);
  const subaccount = privateKeyToAccount(pk);

  const encrypted = AES.encrypt(pk, await signer.getAddress());

  return {
    privateKey: encrypted.toString(),
    address: subaccount.address,
    isNew: true,
  };
}

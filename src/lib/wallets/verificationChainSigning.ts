import { getAccount } from "@wagmi/core";
import { isHex, size, type Hex } from "viem";

import { getVerificationChainSigningKey } from "config/localStorage";
import { extendError } from "lib/errors";
import { readLocalStorageItem, writeLocalStorageItem } from "lib/localStorage";
import { metrics } from "lib/metrics";

import { getSignatureKind } from "./signatureDiagnostics";
import { AccountType, getAccountType } from "./useAccountType";
import { getPublicClientWithRpc, getWagmiConfig } from "./walletConfig";

function getStorageKey(address: string, verificationChainId: number) {
  return getVerificationChainSigningKey(getAccount(getWagmiConfig()).connector?.id, address, verificationChainId);
}

/** Some EIP-7702 wallets bind the digest to the connected chain id (Coinbase's `replaySafeHash`) and some
 * don't; delegation alone can't tell them apart, so it's learned from a failed verification. */
export function requiresVerificationChainSigning(address: string, verificationChainId: number): boolean {
  return (
    readLocalStorageItem<boolean>(getStorageKey(address, verificationChainId), { deserializer: JSON.parse }) === true
  );
}

export function rememberVerificationChainSigning(address: string, verificationChainId: number) {
  writeLocalStorageItem(getStorageKey(address, verificationChainId), true, { serializer: JSON.stringify });
}

export async function isPostEip7702OnEitherChain({
  address,
  currentChainId,
  verificationChainId,
}: {
  address: string;
  currentChainId: number;
  verificationChainId: number;
}): Promise<boolean> {
  const accountTypes = await Promise.all(
    Array.from(new Set([currentChainId, verificationChainId])).map((chainId) =>
      getAccountType(address, getPublicClientWithRpc(chainId)).catch((error) => {
        metrics.pushError(extendError(error, { data: { chainId, address } }), "signing.adaptiveAccountTypeProbe");

        return undefined;
      })
    )
  );

  return accountTypes.includes(AccountType.PostEip7702EOA);
}

export async function verifySignatureOnVerificationChain({
  signedHash,
  signature,
  expectedAccount,
  verificationChainId,
}: {
  signedHash: Hex;
  signature: string;
  expectedAccount: string;
  verificationChainId: number;
}): Promise<boolean | undefined> {
  if (!isHex(signature)) {
    return false;
  }

  const client = getPublicClientWithRpc(verificationChainId);

  try {
    return await client.verifyHash({
      address: expectedAccount,
      hash: signedHash,
      signature,
    });
  } catch (error) {
    metrics.pushError(
      extendError(new Error("Signature validation unavailable"), {
        errorSource: "signing.adaptiveSignatureValidation",
        data: {
          cause: error?.message?.split("\n")[0],
          expectedAccount,
          signatureBytes: size(signature),
          signatureKind: getSignatureKind(signature),
          signedHash,
          verificationChainId,
        },
      }),
      "signing.adaptiveSignatureValidation"
    );

    return undefined;
  }
}

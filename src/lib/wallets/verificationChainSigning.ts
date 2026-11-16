import { getAccount, getChainId } from "@wagmi/core";
import { isHex, size, type Hex } from "viem";

import { getVerificationChainSigningKey } from "config/localStorage";
import { DAY_MS } from "lib/dates";
import { extendError } from "lib/errors";
import {
  readLocalStorageItem,
  removeLocalStorageItem,
  writeLocalStorageItem,
  type LocalStorageKey,
} from "lib/localStorage";
import { metrics } from "lib/metrics";

import { getSignatureKind } from "./signatureDiagnostics";
import { AccountType, getAccountType } from "./useAccountType";
import { getPublicClientWithRpc, getWagmiConfig } from "./walletConfig";

export type ChainBindingState = "needsVerificationChain" | "chainSwitchDoesNotHelp";

type StoredChainBindingState = { state: ChainBindingState; learnedAt: number };

const CHAIN_SWITCH_DOES_NOT_HELP_TTL = 30 * DAY_MS;

function getStorageKey(address: string, verificationChainId: number) {
  return getVerificationChainSigningKey(getAccount(getWagmiConfig()).connector?.id, address, verificationChainId);
}

export function getChainBindingState(address: string, verificationChainId: number): ChainBindingState | undefined {
  const storageKey = getStorageKey(address, verificationChainId);
  const stored = readLocalStorageItem<StoredChainBindingState>(storageKey, { deserializer: JSON.parse });

  if (!stored?.state) {
    return undefined;
  }

  if (stored.state === "chainSwitchDoesNotHelp" && Date.now() - stored.learnedAt > CHAIN_SWITCH_DOES_NOT_HELP_TTL) {
    removeLocalStorageItem(storageKey);

    return undefined;
  }

  forgetStateIfDelegationRevoked(address, verificationChainId, storageKey);

  return stored.state;
}

export function rememberChainBindingState(address: string, verificationChainId: number, state: ChainBindingState) {
  writeLocalStorageItem<StoredChainBindingState>(
    getStorageKey(address, verificationChainId),
    { state, learnedAt: Date.now() },
    { serializer: JSON.stringify }
  );
}

const checkedForRevocation = new Set<string>();

function forgetStateIfDelegationRevoked(address: string, verificationChainId: number, storageKey: LocalStorageKey[]) {
  const checkKey = JSON.stringify(storageKey);

  if (checkedForRevocation.has(checkKey)) {
    return;
  }

  checkedForRevocation.add(checkKey);

  probeAccountTypes(address, [getChainId(getWagmiConfig()), verificationChainId], "signing.adaptiveAccountTypeProbe")
    .then((accountTypes) => {
      if (accountTypes.every((accountType) => accountType === AccountType.EOA)) {
        removeLocalStorageItem(storageKey);
      }
    })
    .catch(() => undefined);
}

export async function probeAccountTypes(
  address: string,
  chainIds: number[],
  errorSource: string
): Promise<(AccountType | undefined)[]> {
  return Promise.all(
    Array.from(new Set(chainIds)).map((chainId) =>
      getAccountType(address, getPublicClientWithRpc(chainId)).catch((error) => {
        metrics.pushError(extendError(error, { data: { chainId, address } }), errorSource);

        return undefined;
      })
    )
  );
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
  const accountTypes = await probeAccountTypes(
    address,
    [currentChainId, verificationChainId],
    "signing.adaptiveAccountTypeProbe"
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

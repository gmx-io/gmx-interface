import { t } from "@lingui/macro";
import { getAccount, getChainId, getWalletClient } from "@wagmi/core";
import { AbstractSigner, type Wallet } from "ethers";
import { hashTypedData, isAddressEqual, withRetry, type Hex } from "viem";

import { getChainName } from "config/chains";
import { extendError, parseError, type ErrorLike } from "lib/errors";
import {
  SMART_WALLET_ACCOUNT_CHANGED_ERROR,
  SMART_WALLET_CHAIN_UNAVAILABLE_ERROR,
  SMART_WALLET_WRONG_CHAIN_ERROR,
} from "lib/errors/customErrors";
import { helperToast } from "lib/helperToast";
import { metrics } from "lib/metrics";
import { ISigner } from "lib/transactions/iSigner";
import type { IAbstractSigner } from "sdk/utils/signer";

import { switchNetwork, type WalletSigner } from ".";
import { analyzeSignatureShape, reportSignatureProduced } from "./signatureDiagnostics";
import { AccountType } from "./useAccountType";
import { clientToSigner } from "./useEthersSigner";
import { getConnectedWalletName, isAccountMissingOnChain } from "./useWalletSessionChains";
import {
  getChainBindingState,
  isPostEip7702OnEitherChain,
  probeAccountTypes,
  rememberChainBindingState,
  verifySignatureOnVerificationChain,
} from "./verificationChainSigning";
import { getWagmiConfig } from "./walletConfig";

export type SignatureDomain = {
  name: string;
  version: string;
  chainId: number;
  verifyingContract: string;
};

/** The root struct must come FIRST — its key is taken as the EIP-712 primary type. */
export type SignatureTypes = Record<string, { name: string; type: string }[]>;

export type SignTypedDataParams = {
  signer: WalletSigner | Wallet | AbstractSigner | ISigner | IAbstractSigner;
  types: SignatureTypes;
  typedData: Record<string, any>;
  domain: SignatureDomain;
  shouldUseSignerMethod?: boolean;
  minified?: boolean;
  verificationChainId: number;
};

type RpcSendable = Pick<WalletSigner["provider"], "send">;

type AnySigner = WalletSigner | Wallet | AbstractSigner | ISigner;

/** Contract accounts bind signatures to the connected chainId; EOAs (incl. 7702) can sign from any chain. */
function mustSignOnVerificationChain(accountType: AccountType | undefined): boolean {
  return accountType !== undefined && accountType !== AccountType.EOA && accountType !== AccountType.PostEip7702EOA;
}

async function probeChainBoundSigning({
  address,
  currentChainId,
  targetChainId,
}: {
  address: string;
  currentChainId: number;
  targetChainId: number | undefined;
}): Promise<boolean> {
  if (targetChainId === undefined || targetChainId === currentChainId) {
    return false;
  }

  // Smart wallets deploy lazily per chain, so the current chain alone would misread a
  // not-yet-deployed one as an EOA and skip the swap.
  const accountTypes = await probeAccountTypes(address, [currentChainId, targetChainId], "signing.accountTypeProbe");

  return accountTypes.some(mustSignOnVerificationChain);
}

function isUnsupportedChainError(error: ErrorLike): boolean {
  return parseError(error)?.errorMessage?.includes("Unsupported chains") ?? false;
}

function providerSendSign(signer: AnySigner, from: string, eip712: object) {
  return withRetry<string>(
    () => (signer.provider as RpcSendable).send("eth_signTypedData_v4", [from, JSON.stringify(eip712)]),
    {
      retryCount: 1,
      delay: 100,
      shouldRetry: ({ error }) => {
        const errorData = parseError(error);
        return errorData?.errorMessage?.toLowerCase().includes("an error has occurred") || false;
      },
    }
  );
}

async function buildChainSwitchError({
  address,
  startingChainId,
  targetChainId,
  cause,
}: {
  address: string;
  startingChainId: number;
  targetChainId: number;
  cause: ErrorLike;
}) {
  const [isMissing, walletName] = await Promise.all([
    isAccountMissingOnChain(address, targetChainId).catch(() => false),
    getConnectedWalletName(address).catch(() => undefined),
  ]);

  return extendError(new Error(isMissing ? SMART_WALLET_CHAIN_UNAVAILABLE_ERROR : SMART_WALLET_WRONG_CHAIN_ERROR), {
    data: { address, startingChainId, targetChainId, walletName, cause: cause?.message },
  });
}

async function withSmartWalletChainSwap<T, S extends AnySigner>(
  {
    signer,
    address,
    targetChainId,
    forceVerificationChain = false,
    shouldUseLearnedChainBinding = true,
  }: {
    signer: S;
    address: string;
    targetChainId: number | undefined;
    forceVerificationChain?: boolean;
    shouldUseLearnedChainBinding?: boolean;
  },
  action: (signer: S | WalletSigner, signingChainId: number) => Promise<T>
): Promise<T> {
  const config = getWagmiConfig();
  const startingChainId = getChainId(config);

  if (targetChainId === undefined || targetChainId === startingChainId) {
    return action(signer, startingChainId);
  }

  const hasLearnedChainBinding =
    shouldUseLearnedChainBinding && getChainBindingState(address, targetChainId) === "needsVerificationChain";

  const needsSwap =
    forceVerificationChain ||
    hasLearnedChainBinding ||
    (await probeChainBoundSigning({ address, currentChainId: startingChainId, targetChainId }));

  if (!needsSwap) {
    return action(signer, startingChainId);
  }

  try {
    await switchNetwork(targetChainId, true);
  } catch (error) {
    throw await buildChainSwitchError({ address, startingChainId, targetChainId, cause: error });
  }

  try {
    const account = getAccount(config).address;

    if (!account) {
      throw new Error("No account after chain swap");
    }

    if (!isAddressEqual(account, address)) {
      throw extendError(new Error(SMART_WALLET_ACCOUNT_CHANGED_ERROR), {
        data: { expected: address, actual: account, targetChainId },
      });
    }

    const swappedWalletClient = await getWalletClient(config, { chainId: targetChainId });
    const swappedSigner = clientToSigner(swappedWalletClient, account);
    try {
      return await action(swappedSigner, targetChainId);
    } catch (error) {
      if (!isUnsupportedChainError(error)) {
        throw error;
      }

      throw await buildChainSwitchError({ address, startingChainId, targetChainId, cause: error });
    }
  } finally {
    await switchNetwork(startingChainId, true).catch((error) => {
      metrics.pushError(
        extendError(error, { data: { startingChainId, targetChainId, address } }),
        "signing.chainSwapRestore"
      );
    });
  }
}

function hashTypedDataWithViem({
  domain,
  types,
  message,
}: {
  domain: SignatureDomain;
  types: SignatureTypes;
  message: Record<string, any>;
}): Hex {
  const primaryType = Object.keys(types).find((t) => t !== "EIP712Domain");

  if (!primaryType) {
    throw new Error("Unable to determine EIP-712 primary type");
  }

  return hashTypedData({
    domain,
    types,
    primaryType,
    message,
  });
}

type TypedDataToSign = { types: SignatureTypes; message: Record<string, any> };

function minifyTypedData({
  domain,
  types,
  message,
}: {
  domain: SignatureDomain;
  types: SignatureTypes;
  message: Record<string, any>;
}): TypedDataToSign {
  return {
    types: { Minified: [{ name: "digest", type: "bytes32" }] },
    message: { digest: hashTypedDataWithViem({ domain, types, message }) },
  };
}

export function hashSignedTypedData({
  domain,
  types,
  typedData,
  minified = true,
}: Pick<SignTypedDataParams, "domain" | "types" | "typedData" | "minified">): Hex {
  const toSign = minified ? minifyTypedData({ domain, types, message: typedData }) : { types, message: typedData };

  return hashTypedDataWithViem({ domain, ...toSign });
}

export async function signMessage({
  signer,
  message,
  verificationChainId,
}: {
  signer: WalletSigner | Wallet | AbstractSigner;
  message: string;
  verificationChainId: number;
}): Promise<string> {
  const from = await signer.getAddress();
  const startingChainId = getChainId(getWagmiConfig());

  // `generateSubaccount` derives a private key from this signature, so it has to stay stable for a given
  // wallet — it is never checked on chain, and learning chain binding later would change the subaccount.
  return withSmartWalletChainSwap(
    { signer, address: from, targetChainId: verificationChainId, shouldUseLearnedChainBinding: false },
    async (signWith, signingChainId) => {
      const signature = await signWith.signMessage(message);

      reportSignatureProduced({
        address: from,
        signature,
        signaturePurpose: "message",
        signingChainId,
        startingChainId,
        verificationChainId,
      });

      return signature;
    }
  );
}

export async function signTypedData({
  signer,
  domain,
  types,
  typedData,
  shouldUseSignerMethod = false,
  minified = true,
  verificationChainId,
}: SignTypedDataParams) {
  // filter inputs
  for (const [key, value] of Object.entries(domain)) {
    if (value === undefined) {
      // @ts-expect-error
      delete domain[key];
    }
  }

  for (const [key, value] of Object.entries(types)) {
    if (value === undefined) {
      delete types[key];
    }
  }

  for (const [key, value] of Object.entries(typedData)) {
    if (value === undefined) {
      delete typedData[key];
    }
  }

  const { types: typesToSign, message: messageToSign } = minified
    ? minifyTypedData({ domain, types, message: typedData })
    : { types, message: typedData };

  const primaryType = Object.keys(typesToSign).filter((t) => t !== "EIP712Domain")[0];

  if (!("provider" in signer) || !("getAddress" in signer)) {
    if (signer.signTypedData) {
      return signer.signTypedData(domain, typesToSign, messageToSign);
    }
    throw new Error("Signer does not support provider-based signing or signTypedData");
  }

  const from = await signer.getAddress();

  const eip712 = {
    types: {
      EIP712Domain: [
        { name: "name", type: "string" },
        { name: "version", type: "string" },
        { name: "chainId", type: "uint256" },
        { name: "verifyingContract", type: "address" },
      ],
      ...typesToSign,
    },
    primaryType,
    domain,
    message: messageToSign,
  };

  const requestSignature = (signWith: AnySigner) => {
    if (shouldUseSignerMethod && signWith.signTypedData) {
      return signWith.signTypedData(domain, typesToSign, messageToSign).catch((e) => {
        if (!e.message.includes("requires a provider")) throw e;
        return providerSendSign(signWith, from, eip712);
      });
    }
    return providerSendSign(signWith, from, eip712);
  };

  // `typesToSign` collapses to `Minified`, so name the signature after the original struct.
  const signaturePurpose = Object.keys(types).find((type) => type !== "EIP712Domain") ?? "unknown";
  const startingChainId = getChainId(getWagmiConfig());

  const firstResult = await withSmartWalletChainSwap(
    { signer, address: from, targetChainId: verificationChainId },
    async (signWith, signingChainId) => {
      const signature = await requestSignature(signWith);

      reportSignatureProduced({
        address: from,
        signature,
        signaturePurpose,
        signingChainId,
        startingChainId,
        verificationChainId,
      });

      return { signature, signingChainId };
    }
  );

  if (firstResult.signingChainId === verificationChainId) {
    return firstResult.signature;
  }

  if (getChainBindingState(from, verificationChainId) === "chainSwitchDoesNotHelp") {
    return firstResult.signature;
  }

  const isPostEip7702 = await isPostEip7702OnEitherChain({
    address: from,
    currentChainId: firstResult.signingChainId,
    verificationChainId,
  });

  if (!isPostEip7702) {
    return firstResult.signature;
  }

  const signedHash = hashSignedTypedData({ domain, types, typedData, minified });
  const firstSignatureIsValid = await verifySignatureOnVerificationChain({
    signedHash,
    signature: firstResult.signature,
    expectedAccount: from,
    verificationChainId,
  });

  if (firstSignatureIsValid !== false) {
    return firstResult.signature;
  }

  // Before the swap, so it explains the network prompt instead of trailing it.
  helperToast.info(
    t`This wallet creates network-specific signatures. Approve the switch to ${getChainName(verificationChainId)} and sign once more.`
  );

  const retryResult = await withSmartWalletChainSwap(
    {
      signer,
      address: from,
      targetChainId: verificationChainId,
      forceVerificationChain: true,
    },
    async (signWith, signingChainId) => {
      const signature = await requestSignature(signWith);

      reportSignatureProduced({
        address: from,
        signature,
        signaturePurpose,
        signingChainId,
        startingChainId,
        verificationChainId,
        isRetryAfterInvalidSignature: true,
      });

      return { signature, signingChainId };
    }
  );

  const retrySignatureIsValid = await verifySignatureOnVerificationChain({
    signedHash,
    signature: retryResult.signature,
    expectedAccount: from,
    verificationChainId,
  });

  // `verifyHash` also reports `false` when the deployless ERC-6492 `eth_call` is unsupported, so the
  // relay stays the authority on validity — we only record that our own check disagreed.
  if (retrySignatureIsValid === false) {
    metrics.pushError(
      extendError(new Error("Signature invalid after signing on verification chain"), {
        data: {
          expectedAccount: from,
          ...analyzeSignatureShape(retryResult.signature),
          verificationChainId,
        },
      }),
      "signing.adaptiveRetryStillInvalid"
    );
  }

  if (retrySignatureIsValid !== undefined) {
    rememberChainBindingState(
      from,
      verificationChainId,
      retrySignatureIsValid ? "needsVerificationChain" : "chainSwitchDoesNotHelp"
    );
  }

  return retryResult.signature;
}

export function splitSignature(signature: string): { r: string; s: string; v: number } {
  const sig = signature.slice(2);
  const r = "0x" + sig.substring(0, 64);
  const s = "0x" + sig.substring(64, 128);
  const v = parseInt(sig.substring(128, 130), 16);

  // ECDSA signature components
  return { r, s, v };
}

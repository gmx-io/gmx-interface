import { isHex, size } from "viem";

import { metrics, type SignatureProducedEvent } from "lib/metrics";

import { ACCOUNT_TYPE_LABELS, getAccountType } from "./useAccountType";
import { getPublicClientWithRpc } from "./walletConfig";

export const ERC6492_MAGIC_SUFFIX = "6492649264926492649264926492649264926492649264926492649264926492";

export type SignatureKind = "eoa" | "erc6492" | "erc1271" | "malformed";

export function getSignatureKind(signature: string): SignatureKind {
  if (!isHex(signature) || size(signature) === 0) {
    return "malformed";
  }

  if (signature.toLowerCase().endsWith(ERC6492_MAGIC_SUFFIX)) {
    return "erc6492";
  }

  return size(signature) === 65 ? "eoa" : "erc1271";
}

/** Above this, `ECDSA.tryRecover` returns `InvalidSignatureS` — see OpenZeppelin 4.9.3. */
const SECP256K1_HALF_ORDER = BigInt("0x7FFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF5D576E7357A4501DDFE92F46681B20A0");

export type SignatureShape = {
  signatureKind: SignatureKind;
  signatureBytes: number | undefined;
  ecdsaV: number | undefined;
  isHighS: boolean | undefined;
  isOnChainRecoverableShape: boolean | undefined;
};

/** Diagnostic only: an odd shape is not proof of rejection, since ERC-1271 is tried after ECDSA on-chain. */
export function analyzeSignatureShape(signature: string): SignatureShape {
  const signatureKind = getSignatureKind(signature);
  const signatureBytes = isHex(signature) ? size(signature) : undefined;

  if (!isHex(signature) || signatureBytes !== 65) {
    return {
      signatureKind,
      signatureBytes,
      ecdsaV: undefined,
      isHighS: undefined,
      isOnChainRecoverableShape: undefined,
    };
  }

  const ecdsaV = parseInt(signature.slice(130, 132), 16);
  const isHighS = BigInt(`0x${signature.slice(66, 130)}`) > SECP256K1_HALF_ORDER;

  return {
    signatureKind,
    signatureBytes,
    ecdsaV,
    isHighS,
    isOnChainRecoverableShape: !isHighS && (ecdsaV === 27 || ecdsaV === 28),
  };
}

async function resolveAccountTypeLabel(address: string, chainId: number): Promise<string | undefined> {
  return getAccountType(address, getPublicClientWithRpc(chainId))
    .then((accountType) => ACCOUNT_TYPE_LABELS[accountType])
    .catch(() => undefined);
}

/** Fire-and-forget, and never carries the raw signature — it authorizes the action. */
export function reportSignatureProduced({
  address,
  signature,
  signaturePurpose,
  signingChainId,
  startingChainId,
  verificationChainId,
  isRetryAfterInvalidSignature = false,
}: {
  address: string;
  signature: string;
  /** EIP-712 primary type, or "message". */
  signaturePurpose: string;
  signingChainId: number;
  startingChainId: number;
  verificationChainId: number;
  isRetryAfterInvalidSignature?: boolean;
}) {
  Promise.all([
    resolveAccountTypeLabel(address, signingChainId),
    signingChainId === verificationChainId
      ? resolveAccountTypeLabel(address, signingChainId)
      : resolveAccountTypeLabel(address, verificationChainId),
  ])
    .then(([accountTypeOnSigningChain, accountTypeOnVerificationChain]) => {
      metrics.pushEvent<SignatureProducedEvent>({
        event: "signature.produced",
        isError: false,
        data: {
          ...analyzeSignatureShape(signature),
          signaturePurpose,
          signingChainId,
          verificationChainId,
          didSwitchChain: signingChainId !== startingChainId,
          isRetryAfterInvalidSignature,
          accountTypeOnSigningChain,
          accountTypeOnVerificationChain,
        },
      });
    })
    .catch(() => undefined);
}

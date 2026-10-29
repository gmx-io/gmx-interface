import { t } from "@lingui/macro";
import { AES } from "crypto-js";
import { useEffect, useState, useSyncExternalStore } from "react";
import { bytesToHex, concat, keccak256, numberToBytes, toBytes, type Hex } from "viem";
import { privateKeyToAccount } from "viem/accounts";

import { shortenAddress } from "lib/legacy";
import type { SubaccountSerializedConfig } from "sdk/utils/subaccount";

import { SUBACCOUNT_CONFIG_VERSION } from "./subaccountConfigStorage";

export type PasskeyMode = "create" | "use";

export type PasskeySubaccountConfig = SubaccountSerializedConfig & {
  keySource: "passkey";
  passkeyCredentialId: string;
};

export enum PasskeyErrorReason {
  Unavailable = "unavailable",
  Cancelled = "cancelled",
  PrfUnsupported = "prfUnsupported",
  AccountMismatch = "accountMismatch",
  CreatedNeedsUse = "createdNeedsUse",
}

export class PasskeyError extends Error {
  reason: PasskeyErrorReason;

  constructor(reason: PasskeyErrorReason, message: string) {
    super(message);
    this.name = "PasskeyError";
    this.reason = reason;
  }
}

export type PasskeySupport = {
  isSecureContext: boolean;
  hasWebAuthn: boolean;
  hasPlatformAuthenticator?: boolean;
  clientCapabilities?: Record<string, boolean>;
};

export type PasskeyAttempt = {
  mode: PasskeyMode;
  at: string;
  prfEnabledAtCreate?: boolean;
  prfResultAtCreate?: boolean;
  prfResultAtGet?: boolean;
  authenticatorAttachment?: string | null;
  error?: string;
};

type PrfExtensionOutput = { enabled?: boolean; results?: { first?: ArrayBuffer } };

type PublicKeyCredentialStatic = typeof PublicKeyCredential & {
  getClientCapabilities?: () => Promise<Record<string, boolean>>;
};

const PRF_SALT = toBytes("GMX One-Click Trading session key v1");
const PASSKEY_TIMEOUT_MS = 120_000;
const PRF_CAPABILITY = "extension:prf";

export function getIsPasskeySubaccountConfig(
  config: SubaccountSerializedConfig | undefined
): config is PasskeySubaccountConfig {
  return (config as Partial<PasskeySubaccountConfig> | undefined)?.keySource === "passkey";
}

async function getPasskeySupport(): Promise<PasskeySupport> {
  const hasWebAuthn = typeof window.PublicKeyCredential !== "undefined" && Boolean(navigator.credentials);
  const support: PasskeySupport = { isSecureContext: window.isSecureContext, hasWebAuthn };

  if (!hasWebAuthn) {
    return support;
  }

  const credentialStatic = window.PublicKeyCredential as PublicKeyCredentialStatic;

  const [hasPlatformAuthenticator, clientCapabilities] = await Promise.all([
    credentialStatic.isUserVerifyingPlatformAuthenticatorAvailable().catch(() => undefined),
    credentialStatic.getClientCapabilities?.().catch(() => undefined),
  ]);

  return { ...support, hasPlatformAuthenticator, clientCapabilities };
}

export function getPasskeyErrorText(reason: PasskeyErrorReason | undefined): string | undefined {
  switch (reason) {
    case PasskeyErrorReason.Unavailable:
      return t`Passkeys are not available in this browser`;
    case PasskeyErrorReason.Cancelled:
      return t`The passkey request was cancelled or timed out`;
    case PasskeyErrorReason.PrfUnsupported:
      return t`This passkey can't create a session key: its provider doesn't support PRF`;
    case PasskeyErrorReason.AccountMismatch:
      return t`This passkey belongs to another account`;
    case PasskeyErrorReason.CreatedNeedsUse:
      return t`Passkey created. Press Restore from passkey to finish`;
    default:
      return undefined;
  }
}

export function getIsPasskeyUnavailable(support: PasskeySupport | undefined): boolean {
  if (!support) {
    return false;
  }

  return !support.isSecureContext || !support.hasWebAuthn || support.clientCapabilities?.[PRF_CAPABILITY] === false;
}

export function usePasskeySupport(): PasskeySupport | undefined {
  const [support, setSupport] = useState<PasskeySupport | undefined>(undefined);

  useEffect(() => {
    let isActual = true;

    getPasskeySupport().then((result) => {
      if (isActual) {
        setSupport(result);
      }
    });

    return () => {
      isActual = false;
    };
  }, []);

  return support;
}

let lastPasskeyAttempt: PasskeyAttempt | undefined;
const lastPasskeyAttemptListeners = new Set<() => void>();

function setLastPasskeyAttempt(attempt: PasskeyAttempt) {
  lastPasskeyAttempt = attempt;
  lastPasskeyAttemptListeners.forEach((listener) => listener());
}

function subscribeToLastPasskeyAttempt(listener: () => void) {
  lastPasskeyAttemptListeners.add(listener);

  return () => {
    lastPasskeyAttemptListeners.delete(listener);
  };
}

export function useLastPasskeyAttempt(): PasskeyAttempt | undefined {
  return useSyncExternalStore(subscribeToLastPasskeyAttempt, () => lastPasskeyAttempt);
}

export function derivePasskeySubaccountPrivateKey({
  secret,
  account,
  chainId,
}: {
  secret: ArrayBuffer;
  account: string;
  chainId: number;
}): Hex {
  return keccak256(concat([new Uint8Array(secret), toBytes(account), numberToBytes(chainId, { size: 32 })]));
}

export async function generatePasskeySubaccount({
  account,
  chainId,
  mode,
}: {
  account: string;
  chainId: number;
  mode: PasskeyMode;
}): Promise<PasskeySubaccountConfig> {
  const attempt: PasskeyAttempt = { mode, at: new Date().toISOString() };

  try {
    if (!window.isSecureContext || typeof window.PublicKeyCredential === "undefined" || !navigator.credentials) {
      throw new PasskeyError(PasskeyErrorReason.Unavailable, "WebAuthn is not available");
    }

    let credentialId: ArrayBuffer | undefined;
    let secret: ArrayBuffer | undefined;

    if (mode === "create") {
      ({ credentialId, secret } = await createPasskey(account, attempt));

      if (!secret) {
        ({ credentialId, secret } = await getPasskeySecretAfterCreate(account, attempt, credentialId));
      }
    } else {
      ({ credentialId, secret } = await getPasskeySecret(account, attempt, undefined));
    }

    const privateKey = derivePasskeySubaccountPrivateKey({ secret, account, chainId });

    return {
      version: SUBACCOUNT_CONFIG_VERSION,
      address: privateKeyToAccount(privateKey).address,
      privateKey: AES.encrypt(privateKey, account).toString(),
      isNew: true,
      keySource: "passkey",
      passkeyCredentialId: bytesToHex(new Uint8Array(credentialId!)),
    };
  } catch (error) {
    attempt.error = `${error?.name ?? "Error"}: ${error?.message ?? String(error)}`;
    throw toPasskeyError(error);
  } finally {
    setLastPasskeyAttempt(attempt);
  }
}

async function createPasskey(
  account: string,
  attempt: PasskeyAttempt
): Promise<{ credentialId: ArrayBuffer; secret: ArrayBuffer | undefined }> {
  const userName = `GMX One-Click ${shortenAddress(account, 13)}`;

  const credential = (await navigator.credentials.create({
    publicKey: {
      challenge: crypto.getRandomValues(new Uint8Array(32)),
      rp: { name: "GMX" },
      user: { id: getPasskeyUserId(account), name: userName, displayName: userName },
      pubKeyCredParams: [
        { type: "public-key", alg: -7 },
        { type: "public-key", alg: -257 },
      ],
      authenticatorSelection: { residentKey: "required", requireResidentKey: true, userVerification: "required" },
      timeout: PASSKEY_TIMEOUT_MS,
      extensions: { prf: { eval: { first: PRF_SALT } } } as AuthenticationExtensionsClientInputs,
    },
  })) as PublicKeyCredential | null;

  if (!credential) {
    throw new PasskeyError(PasskeyErrorReason.Cancelled, "Passkey creation returned no credential");
  }

  const prf = (credential.getClientExtensionResults() as { prf?: PrfExtensionOutput }).prf;

  attempt.prfEnabledAtCreate = prf?.enabled;
  attempt.prfResultAtCreate = Boolean(prf?.results?.first);
  attempt.authenticatorAttachment = credential.authenticatorAttachment;

  return { credentialId: credential.rawId, secret: prf?.results?.first };
}

async function getPasskeySecret(
  account: string,
  attempt: PasskeyAttempt,
  credentialId: ArrayBuffer | undefined
): Promise<{ credentialId: ArrayBuffer; secret: ArrayBuffer }> {
  const assertion = (await navigator.credentials.get({
    publicKey: {
      challenge: crypto.getRandomValues(new Uint8Array(32)),
      allowCredentials: credentialId ? [{ type: "public-key", id: credentialId }] : [],
      userVerification: "required",
      timeout: PASSKEY_TIMEOUT_MS,
      extensions: { prf: { eval: { first: PRF_SALT } } } as AuthenticationExtensionsClientInputs,
    },
  })) as PublicKeyCredential | null;

  if (!assertion) {
    throw new PasskeyError(PasskeyErrorReason.Cancelled, "Passkey request returned no credential");
  }

  attempt.authenticatorAttachment = assertion.authenticatorAttachment;

  const { userHandle } = assertion.response as AuthenticatorAssertionResponse;

  if (userHandle && bytesToHex(new Uint8Array(userHandle)) !== bytesToHex(getPasskeyUserId(account))) {
    throw new PasskeyError(PasskeyErrorReason.AccountMismatch, "The passkey belongs to another account");
  }

  const secret = (assertion.getClientExtensionResults() as { prf?: PrfExtensionOutput }).prf?.results?.first;

  attempt.prfResultAtGet = Boolean(secret);

  if (!secret) {
    throw new PasskeyError(PasskeyErrorReason.PrfUnsupported, "The passkey returned no PRF result");
  }

  return { credentialId: assertion.rawId, secret };
}

async function getPasskeySecretAfterCreate(
  account: string,
  attempt: PasskeyAttempt,
  credentialId: ArrayBuffer
): Promise<{ credentialId: ArrayBuffer; secret: ArrayBuffer }> {
  try {
    return await getPasskeySecret(account, attempt, credentialId);
  } catch (error) {
    const passkeyError = toPasskeyError(error);

    if (passkeyError instanceof PasskeyError && passkeyError.reason === PasskeyErrorReason.Cancelled) {
      throw new PasskeyError(PasskeyErrorReason.CreatedNeedsUse, passkeyError.message);
    }

    throw error;
  }
}

function getPasskeyUserId(account: string): Uint8Array {
  return toBytes(keccak256(concat([toBytes("GMX One-Click"), toBytes(account)])));
}

function toPasskeyError(error: unknown): unknown {
  if (error instanceof PasskeyError) {
    return error;
  }

  const name = (error as { name?: string } | undefined)?.name;

  if (name === "NotAllowedError" || name === "AbortError") {
    return new PasskeyError(PasskeyErrorReason.Cancelled, (error as Error).message);
  }

  if (name === "NotSupportedError" || name === "SecurityError") {
    return new PasskeyError(PasskeyErrorReason.Unavailable, (error as Error).message);
  }

  return error;
}

import { getCapabilities } from "@wagmi/core";
import {
  type Address,
  ChainDisconnectedError,
  MethodNotFoundRpcError,
  MethodNotSupportedRpcError,
  ProviderDisconnectedError,
  ResourceUnavailableRpcError,
  UnauthorizedProviderError,
  UnsupportedProviderMethodError,
  UserRejectedRequestError,
} from "viem";
import type { Connector } from "wagmi";

import { withFallback } from "lib/withFallback";

import { getWagmiConfig } from "./walletConfig";

// This background probe does not block any user action.
const CAPABILITIES_TIMEOUT_MS = 30_000;
// EIP-5792 wallets may report capabilities shared by all chains under 0x0
const ALL_CHAINS_ID = 0;

type ChainCapabilities = {
  atomic?: { status?: string };
  atomicBatch?: { supported?: boolean };
  alternateGasFees?: { supported?: boolean };
  paymasterService?: { supported?: boolean };
};

export type WalletChainCapabilities = {
  atomicStatus: string | undefined;
  hasAlternateGasFees: boolean | undefined;
  hasPaymasterService: boolean | undefined;
};

export type WalletChainCapabilitiesResult = (
  | { status: "ok"; capabilities: WalletChainCapabilities }
  | { status: "unsupported" | "skipped" | "error" | "timeout"; capabilities: undefined }
) & {
  durationMs?: number;
  timeoutMs?: number;
  errorCode?: number;
  errorName?: string;
  errorMessage?: string;
  errorReason?:
    | "unsupportedMethod"
    | "requestPending"
    | "userRejected"
    | "unauthorized"
    | "disconnected"
    | "timeout"
    | "unknown";
};

const TIMEOUT_RESULT: WalletChainCapabilitiesResult = {
  status: "timeout",
  capabilities: undefined,
  errorReason: "timeout",
};

export async function fetchWalletChainCapabilities({
  account,
  connector,
  chainId,
}: {
  account: Address;
  connector: Connector;
  chainId: number;
}): Promise<WalletChainCapabilitiesResult> {
  const startedAt = Date.now();
  const request = Promise.resolve()
    .then(() => getCapabilities(getWagmiConfig(), { account, connector }))
    .then((result): WalletChainCapabilitiesResult => {
      const capabilitiesByChain = result as Record<number, ChainCapabilities | undefined>;

      return {
        status: "ok",
        capabilities: getChainCapabilities(capabilitiesByChain[chainId], capabilitiesByChain[ALL_CHAINS_ID]),
      };
    })
    .catch((error): WalletChainCapabilitiesResult => {
      const diagnostics = getCapabilitiesError(error);

      return {
        status: diagnostics.errorReason === "unsupportedMethod" ? "unsupported" : "error",
        capabilities: undefined,
        ...diagnostics,
      };
    });

  const result = await withFallback(request, TIMEOUT_RESULT, CAPABILITIES_TIMEOUT_MS);

  return { ...result, durationMs: Date.now() - startedAt, timeoutMs: CAPABILITIES_TIMEOUT_MS };
}

function getCapabilitiesError(error: unknown) {
  let errorCode: number | undefined;
  let errorName: string | undefined;
  let errorMessage = typeof error === "string" ? error.slice(0, 200) : undefined;
  const seen = new Set<unknown>();

  // Viem wraps provider errors; the actionable RPC code may be in the cause.
  while (error && typeof error === "object" && !seen.has(error)) {
    seen.add(error);

    if ("name" in error && typeof error.name === "string") {
      errorName = error.name;
    }

    if ("shortMessage" in error && typeof error.shortMessage === "string") {
      errorMessage = error.shortMessage.slice(0, 200);
    } else if ("message" in error && typeof error.message === "string") {
      errorMessage = error.message.slice(0, 200);
    }

    if ("code" in error && (typeof error.code === "number" || typeof error.code === "string")) {
      const code = Number(error.code);
      if (Number.isFinite(code) && error.code !== "") {
        errorCode = code;
      }
    }

    error = "cause" in error ? error.cause : undefined;
  }

  let errorReason: WalletChainCapabilitiesResult["errorReason"] = "unknown";

  if (
    errorCode === MethodNotFoundRpcError.code ||
    errorCode === MethodNotSupportedRpcError.code ||
    errorCode === UnsupportedProviderMethodError.code
  ) {
    errorReason = "unsupportedMethod";
  } else if (errorCode === ResourceUnavailableRpcError.code) {
    errorReason = "requestPending";
  } else if (errorCode === UserRejectedRequestError.code) {
    errorReason = "userRejected";
  } else if (errorCode === UnauthorizedProviderError.code) {
    errorReason = "unauthorized";
  } else if (errorCode === ProviderDisconnectedError.code || errorCode === ChainDisconnectedError.code) {
    errorReason = "disconnected";
  }

  return { errorCode, errorName, errorMessage, errorReason };
}

function getChainCapabilities(
  chain: ChainCapabilities | undefined,
  allChains: ChainCapabilities | undefined
): WalletChainCapabilities {
  return {
    atomicStatus: getAtomicStatus(chain) ?? getAtomicStatus(allChains),
    hasAlternateGasFees: chain?.alternateGasFees?.supported ?? allChains?.alternateGasFees?.supported,
    hasPaymasterService: chain?.paymasterService?.supported ?? allChains?.paymasterService?.supported,
  };
}

function getAtomicStatus(capabilities: ChainCapabilities | undefined): string | undefined {
  if (capabilities?.atomic?.status !== undefined) {
    return capabilities.atomic.status;
  }

  // wallets on the first EIP-5792 draft report atomicBatch instead of atomic
  if (capabilities?.atomicBatch?.supported !== undefined) {
    return capabilities.atomicBatch.supported ? "supported" : "unsupported";
  }

  return undefined;
}

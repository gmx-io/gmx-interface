import { getCapabilities } from "@wagmi/core";
import { type Address, MethodNotFoundRpcError, MethodNotSupportedRpcError, UnsupportedProviderMethodError } from "viem";
import type { Connector } from "wagmi";

import { withFallback } from "lib/withFallback";

import { getWagmiConfig } from "./walletConfig";

const CAPABILITIES_TIMEOUT_MS = 5000;
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

export type WalletChainCapabilitiesResult =
  | { status: "ok"; capabilities: WalletChainCapabilities }
  | { status: "unsupported" | "skipped" | "error" | "timeout"; capabilities: undefined };

const UNSUPPORTED_RESULT: WalletChainCapabilitiesResult = { status: "unsupported", capabilities: undefined };
const ERROR_RESULT: WalletChainCapabilitiesResult = { status: "error", capabilities: undefined };
const TIMEOUT_RESULT: WalletChainCapabilitiesResult = { status: "timeout", capabilities: undefined };

export function fetchWalletChainCapabilities({
  account,
  connector,
  chainId,
}: {
  account: Address;
  connector: Connector;
  chainId: number;
}): Promise<WalletChainCapabilitiesResult> {
  const request = getCapabilities(getWagmiConfig(), { account, connector })
    .then((result): WalletChainCapabilitiesResult => {
      const capabilitiesByChain = result as Record<number, ChainCapabilities | undefined>;

      return {
        status: "ok",
        capabilities: getChainCapabilities(capabilitiesByChain[chainId], capabilitiesByChain[ALL_CHAINS_ID]),
      };
    })
    .catch((error) => (getIsUnsupportedMethodError(error) ? UNSUPPORTED_RESULT : ERROR_RESULT));

  return withFallback(request, TIMEOUT_RESULT, CAPABILITIES_TIMEOUT_MS);
}

function getIsUnsupportedMethodError(error: unknown) {
  const code = (error as { code?: unknown } | undefined)?.code;

  return (
    code === MethodNotFoundRpcError.code ||
    code === MethodNotSupportedRpcError.code ||
    code === UnsupportedProviderMethodError.code
  );
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

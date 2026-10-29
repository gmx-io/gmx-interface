import { useWallets } from "@privy-io/react-auth";
import { useEffect } from "react";
import type { Address } from "viem";
import type { Connector } from "wagmi";
import { useAccount } from "wagmi";

import { useChainId } from "lib/chains";
import { getPrivyWagmiConnectorId } from "lib/wallets/privyWagmi";
import { ACCOUNT_TYPE_LABELS, AccountType, getAccountType } from "lib/wallets/useAccountType";
import { getConnectedWalletName } from "lib/wallets/useWalletSessionChains";
import { fetchWalletChainCapabilities, type WalletChainCapabilitiesResult } from "lib/wallets/walletCapabilities";
import { getPublicClientWithRpc } from "lib/wallets/walletConfig";
import { withFallback } from "lib/withFallback";

import { metrics } from "./Metrics";
import type { WalletCapabilitiesEvent } from "./types";

// these wallets answer wallet_getCapabilities without a round trip to another device
const LOCAL_CAPABILITIES_CONNECTOR_TYPES = ["injected", "coinbase_wallet", "base_account"];
const ACCOUNT_INFO_TIMEOUT_MS = 5000;

const reportedKeys = new Set<string>();

export function useWalletCapabilitiesMetric() {
  const { address, connector } = useAccount();
  const { chainId, srcChainId } = useChainId();
  const { wallets } = useWallets();
  const walletChainId = srcChainId ?? chainId;

  // one address can be connected through several Privy wallets, the active wagmi connector picks the one in use
  const wallet =
    connector !== undefined ? wallets.find((wallet) => getPrivyWagmiConnectorId(wallet) === connector.id) : undefined;
  const connectorType = wallet?.connectorType;
  const connectorId = wallet?.meta.id;

  useEffect(() => {
    if (!address || !connector || connectorType === undefined || connectorId === undefined) {
      return;
    }

    const key = `${connector.uid}:${address}:${walletChainId}`;

    if (reportedKeys.has(key)) {
      return;
    }

    reportedKeys.add(key);
    sendWalletCapabilitiesMetric({ address, connector, connectorId, connectorType, chainId: walletChainId });
  }, [address, connector, connectorId, connectorType, walletChainId]);
}

async function sendWalletCapabilitiesMetric({
  address,
  connector,
  connectorId,
  connectorType,
  chainId,
}: {
  address: string;
  connector: Connector;
  connectorId: string;
  connectorType: string;
  chainId: number;
}) {
  const [accountInfo, capabilitiesResult, walletName] = await Promise.all([
    getAccountInfo(address, chainId).catch(() => ({ accountType: undefined, delegateAddress: undefined })),
    getCapabilitiesResult({ address, connector, connectorType, chainId }),
    withFallback(getConnectedWalletName(address), connector.name, ACCOUNT_INFO_TIMEOUT_MS),
  ]);

  metrics.pushEvent<WalletCapabilitiesEvent>({
    event: "wallet.capabilities",
    isError: false,
    data: {
      chainId,
      walletName,
      connectorId,
      connectorType,
      accountType: accountInfo.accountType !== undefined ? ACCOUNT_TYPE_LABELS[accountInfo.accountType] : undefined,
      delegateAddress: accountInfo.delegateAddress,
      capabilitiesStatus: capabilitiesResult.status,
      capabilitiesDurationMs: capabilitiesResult.durationMs,
      capabilitiesTimeoutMs: capabilitiesResult.timeoutMs,
      capabilitiesErrorCode: capabilitiesResult.errorCode,
      capabilitiesErrorName: capabilitiesResult.errorName,
      capabilitiesErrorMessage: capabilitiesResult.errorMessage,
      capabilitiesErrorReason: capabilitiesResult.errorReason,
      atomicStatus: capabilitiesResult.capabilities?.atomicStatus,
      hasAlternateGasFees: capabilitiesResult.capabilities?.hasAlternateGasFees,
      hasPaymasterService: capabilitiesResult.capabilities?.hasPaymasterService,
    },
  });
}

async function getAccountInfo(address: string, chainId: number) {
  const client = getPublicClientWithRpc(chainId);
  // shares the cached lookup with useAccountType, the code is read again only to name the 7702 delegate
  const accountType = await withFallback(getAccountType(address, client), undefined, ACCOUNT_INFO_TIMEOUT_MS);
  const delegateAddress =
    accountType === AccountType.PostEip7702EOA
      ? await withFallback(client.getDelegation({ address: address as Address }), undefined, ACCOUNT_INFO_TIMEOUT_MS)
      : undefined;

  return { accountType, delegateAddress };
}

function getCapabilitiesResult({
  address,
  connector,
  connectorType,
  chainId,
}: {
  address: string;
  connector: Connector;
  connectorType: string;
  chainId: number;
}): Promise<WalletChainCapabilitiesResult> {
  if (connectorType === "embedded") {
    return Promise.resolve({ status: "unsupported", capabilities: undefined });
  }

  // a WalletConnect request reaches the phone and can deep-link the user into the wallet app
  if (!LOCAL_CAPABILITIES_CONNECTOR_TYPES.includes(connectorType)) {
    return Promise.resolve({ status: "skipped", capabilities: undefined });
  }

  return fetchWalletChainCapabilities({ account: address as Address, connector, chainId });
}

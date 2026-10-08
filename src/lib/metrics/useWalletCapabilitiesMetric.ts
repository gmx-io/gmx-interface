import { useWallets } from "@privy-io/react-auth";
import { useEffect } from "react";
import { type Address, isAddressEqual } from "viem";
import type { Connector } from "wagmi";
import { useAccount } from "wagmi";

import { useChainId } from "lib/chains";
import { ACCOUNT_TYPE_LABELS, AccountType, getAccountType } from "lib/wallets/useAccountType";
import { getConnectedWalletName } from "lib/wallets/useWalletSessionChains";
import { fetchWalletChainCapabilities, type WalletChainCapabilitiesResult } from "lib/wallets/walletCapabilities";
import { getPublicClientWithRpc } from "lib/wallets/walletConfig";

import { metrics } from "./Metrics";
import type { WalletCapabilitiesEvent } from "./types";

// these wallets answer wallet_getCapabilities without a round trip to another device
const LOCAL_CAPABILITIES_CONNECTOR_TYPES = ["injected", "coinbase_wallet"];

const reportedKeys = new Set<string>();

export function useWalletCapabilitiesMetric() {
  const { address, connector } = useAccount();
  const { chainId, srcChainId } = useChainId();
  const { wallets } = useWallets();
  const walletChainId = srcChainId ?? chainId;

  const connectorType =
    address !== undefined
      ? wallets.find((wallet) => isAddressEqual(wallet.address as Address, address))?.connectorType
      : undefined;

  useEffect(() => {
    if (!address || !connector || connectorType === undefined) {
      return;
    }

    const key = `${connector.uid}:${address}:${walletChainId}`;

    if (reportedKeys.has(key)) {
      return;
    }

    reportedKeys.add(key);
    sendWalletCapabilitiesMetric({ address, connector, connectorType, chainId: walletChainId });
  }, [address, connector, connectorType, walletChainId]);
}

async function sendWalletCapabilitiesMetric({
  address,
  connector,
  connectorType,
  chainId,
}: {
  address: string;
  connector: Connector;
  connectorType: string;
  chainId: number;
}) {
  const [accountInfo, capabilitiesResult, walletName] = await Promise.all([
    getAccountInfo(address, chainId),
    getCapabilitiesResult({ address, connector, connectorType, chainId }),
    getConnectedWalletName(address).catch(() => undefined),
  ]);

  metrics.pushEvent<WalletCapabilitiesEvent>({
    event: "wallet.capabilities",
    isError: false,
    data: {
      chainId,
      walletName,
      accountType: accountInfo.accountType !== undefined ? ACCOUNT_TYPE_LABELS[accountInfo.accountType] : undefined,
      delegateAddress: accountInfo.delegateAddress,
      capabilitiesStatus: capabilitiesResult.status,
      atomicStatus: capabilitiesResult.capabilities?.atomicStatus,
      hasAlternateGasFees: capabilitiesResult.capabilities?.hasAlternateGasFees,
      hasPaymasterService: capabilitiesResult.capabilities?.hasPaymasterService,
    },
  });
}

async function getAccountInfo(address: string, chainId: number) {
  const client = getPublicClientWithRpc(chainId);
  // shares the cached lookup with useAccountType, the code is read again only to name the 7702 delegate
  const accountType = await getAccountType(address, client).catch(() => undefined);
  const delegateAddress =
    accountType === AccountType.PostEip7702EOA
      ? await client.getDelegation({ address: address as Address }).catch(() => undefined)
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

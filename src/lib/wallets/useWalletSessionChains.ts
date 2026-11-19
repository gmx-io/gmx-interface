import { getAccount } from "@wagmi/core";
import type { SessionTypes } from "@walletconnect/types";
import uniq from "lodash/uniq";
import useSWR from "swr";
import { useAccount, type Connector } from "wagmi";

import { AnyChainId, CONTRACTS_CHAIN_IDS, isTestnetChain, SOLANA_NETWORK_ID, SOURCE_CHAIN_IDS } from "config/chains";
import { getIsSolanaNetworkSelected } from "config/solanaNetwork";
import { useChainId } from "lib/chains";
import { assertEvmRpcActive } from "lib/rpc/fetchRpc";
import { withFallback } from "lib/withFallback";

import { AccountType, getAccountType } from "./useAccountType";
import { getPublicClientWithRpc, getWagmiConfig } from "./walletConfig";

const PROBE_STALL_TIMEOUT_MS = 5000;

const PROBE_CHAIN_IDS = uniq([...CONTRACTS_CHAIN_IDS, ...SOURCE_CHAIN_IDS] as AnyChainId[]);

function getConnectedProvider(connector: Connector | undefined): Promise<any> {
  try {
    return Promise.resolve(connector?.getProvider()).catch(() => undefined);
  } catch {
    return Promise.resolve(undefined);
  }
}

// Privy hands back a proxy that does not forward the getter, so the real provider is one level down.
function getProviderSession(provider: any): SessionTypes.Struct | undefined {
  return provider?.session ?? provider?.walletProvider?.session;
}

function getSessionChainsForAccount(session: SessionTypes.Struct | undefined, address: string): number[] {
  const accounts = session?.namespaces?.eip155?.accounts;

  if (!Array.isArray(accounts)) {
    return [];
  }

  return uniq(
    accounts
      .filter(
        (account) => typeof account === "string" && account.split(":")[2]?.toLowerCase() === address.toLowerCase()
      )
      .map((account) => Number(account.split(":")[1]))
  ).filter(Number.isFinite);
}

/** Safe{Mobile} declares no signing methods and rejects them all with no UI: safe-wallet-monorepo#7178. */
export function useWalletCanSignTypedData(): { canSignTypedData: boolean; isLoading: boolean } {
  const { connector, address } = useAccount();

  const { data, isLoading } = useSWR<boolean>(
    connector && address ? [connector.uid, address, "walletCanSignTypedData"] : null,
    {
      fetcher: async () => {
        const session = getProviderSession(await getConnectedProvider(connector));
        const methods = session?.namespaces?.eip155?.methods;

        return !Array.isArray(methods) || methods.includes("eth_signTypedData_v4");
      },
      refreshInterval: 0,
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
      revalidateIfStale: false,
    }
  );

  return { canSignTypedData: data ?? true, isLoading };
}

async function findConnectedSession(address: string): Promise<SessionTypes.Struct | undefined> {
  const provider = await getConnectedProvider(getAccount(getWagmiConfig()).connector);
  const session = getProviderSession(provider);

  return session && getSessionChainsForAccount(session, address).length ? session : undefined;
}

function useWalletSessionChains(): { sessionChains: number[] | undefined; isLoading: boolean } {
  const { connector, address } = useAccount();

  const { data, isLoading } = useSWR<number[] | undefined>(
    connector && address ? [connector.uid, address, "walletSessionChains"] : null,
    {
      fetcher: async () => {
        if (!address) {
          return undefined;
        }

        const session = await findConnectedSession(address);

        return session ? getSessionChainsForAccount(session, address) : undefined;
      },
      refreshInterval: 0,
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
      revalidateIfStale: false,
    }
  );

  return { sessionChains: data, isLoading };
}

async function fetchWhileEvmActive<T>(fetcher: () => Promise<T>): Promise<T> {
  assertEvmRpcActive();
  let interrupted = false;
  const onNetworkChange = () => {
    interrupted = interrupted || getIsSolanaNetworkSelected();
  };
  document.addEventListener("networkChange", onNetworkChange);

  try {
    const result = await fetcher();
    if (interrupted) {
      throw new DOMException("EVM account probe interrupted by network selection", "AbortError");
    }
    assertEvmRpcActive();
    return result;
  } finally {
    document.removeEventListener("networkChange", onNetworkChange);
  }
}

async function probeAccountType({
  address,
  chainId,
  skipSolanaGate = false,
}: {
  address: string;
  chainId: number;
  skipSolanaGate?: boolean;
}): Promise<AccountType | undefined> {
  const client = getPublicClientWithRpc(chainId, { skipSolanaGate });
  const retryPausedProbe = skipSolanaGate && getIsSolanaNetworkSelected();
  return withFallback<AccountType | undefined>(
    getAccountType(address, client).catch((error) => {
      // A cached passive probe can reject as a viem timeout after its Solana gate aborted it.
      if (retryPausedProbe) {
        return getAccountType(address, client);
      }
      throw error;
    }),
    undefined,
    PROBE_STALL_TIMEOUT_MS
  );
}

/** EOAs exist on every chain, so only a contract account can be missing from one. */
export async function getIsContractAccount({
  address,
  referenceChainId,
  skipSolanaGate = false,
}: {
  address: string;
  referenceChainId: number;
  skipSolanaGate?: boolean;
}): Promise<boolean> {
  const isTestnet = isTestnetChain(referenceChainId);
  const accountTypes = await Promise.all(
    PROBE_CHAIN_IDS.filter((chainId) => isTestnetChain(chainId) === isTestnet).map((chainId) =>
      probeAccountType({ address, chainId, skipSolanaGate })
    )
  );

  return accountTypes.some((accountType) => accountType === AccountType.SmartAccount);
}

export function useIsContractAccount(): { isContractAccount: boolean } {
  const { address, connector } = useAccount();
  const { chainId, networkId } = useChainId();
  const isSolanaSelected = networkId === SOLANA_NETWORK_ID;

  const { data } = useSWR<boolean>(
    address && !isSolanaSelected ? [address, chainId, connector?.uid, "isContractAccount"] : null,
    {
      fetcher: () => fetchWhileEvmActive(() => getIsContractAccount({ address: address!, referenceChainId: chainId })),
      refreshInterval: 0,
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
      revalidateIfStale: false,
    }
  );

  return { isContractAccount: data ?? false };
}

// A chain list is all testnet or all mainnet, never mixed, so any of them names the realm to probe.
async function getUndeployedChains({
  address,
  chainIds,
  skipSolanaGate = false,
}: {
  address: string;
  chainIds: number[];
  skipSolanaGate?: boolean;
}): Promise<number[]> {
  if (!chainIds.length || !(await getIsContractAccount({ address, referenceChainId: chainIds[0], skipSolanaGate }))) {
    return [];
  }

  const accountTypes = await Promise.all(
    chainIds.map((chainId) => probeAccountType({ address, chainId, skipSolanaGate }))
  );

  return chainIds.filter((_, index) => accountTypes[index] === AccountType.EOA);
}

export async function isAccountMissingOnChain(address: string, chainId: number): Promise<boolean> {
  return (await getUndeployedChains({ address, chainIds: [chainId], skipSolanaGate: true })).includes(chainId);
}

export async function getConnectedWalletName(address: string): Promise<string | undefined> {
  const session = await findConnectedSession(address);

  return session?.peer?.metadata?.name ?? getAccount(getWagmiConfig()).connector?.name;
}

/** Safe answers a switch by offering whatever accounts it has on the target chain. */
export async function getWillChainSwitchChangeAccount(address: string, chainId: number): Promise<boolean> {
  const session = await findConnectedSession(address);
  const sessionChains = session ? getSessionChainsForAccount(session, address) : undefined;

  if (!sessionChains || sessionChains.includes(chainId)) {
    return false;
  }

  return isAccountMissingOnChain(address, chainId);
}

/** Undefined also means "no restriction", so callers must wait on `isLoading` before acting. */
export function useWalletUnavailableChains(chainIds: number[]): {
  unavailableChains: number[] | undefined;
  isLoading: boolean;
} {
  const { address } = useAccount();
  const { networkId } = useChainId();
  const isSolanaSelected = networkId === SOLANA_NETWORK_ID;
  const { sessionChains, isLoading: isLoadingSession } = useWalletSessionChains();

  // Unavailable needs both: the session will not route there and the account is not deployed there.
  const undeclaredChainIds = sessionChains ? chainIds.filter((chainId) => !sessionChains.includes(chainId)) : [];

  const { data, isLoading: isLoadingDeployments } = useSWR<number[] | undefined>(
    address && sessionChains && !isSolanaSelected
      ? [address, undeclaredChainIds.join(","), "walletUnavailableChains"]
      : null,
    {
      fetcher: () =>
        fetchWhileEvmActive(() => getUndeployedChains({ address: address!, chainIds: undeclaredChainIds })),
      refreshInterval: 0,
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
      revalidateIfStale: false,
    }
  );

  return {
    unavailableChains: sessionChains ? data : undefined,
    isLoading:
      !isSolanaSelected &&
      (isLoadingSession || (Boolean(sessionChains) && (isLoadingDeployments || data === undefined))),
  };
}

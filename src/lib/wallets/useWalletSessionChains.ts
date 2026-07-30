import { getAccount } from "@wagmi/core";
import type { SessionTypes } from "@walletconnect/types";
import uniq from "lodash/uniq";
import useSWR from "swr";
import { useAccount, type Connector } from "wagmi";

import { AnyChainId, CONTRACTS_CHAIN_IDS, isTestnetChain, SOURCE_CHAIN_IDS } from "config/chains";
import { withFallback } from "lib/withFallback";

import { AccountType, getAccountType } from "./useAccountType";
import { getPublicClientWithRpc, getWagmiConfig } from "./walletConfig";

const PROBE_STALL_TIMEOUT_MS = 5000;

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

function probeAccountType(address: string, chainId: number): Promise<AccountType | undefined> {
  return withFallback<AccountType | undefined>(
    getAccountType(address, getPublicClientWithRpc(chainId)),
    undefined,
    PROBE_STALL_TIMEOUT_MS
  );
}

/** EOAs exist on every chain, so only a contract account can be missing from one. */
async function getIsContractAccount(address: string, referenceChainId: number): Promise<boolean> {
  const isTestnet = isTestnetChain(referenceChainId);
  const chainIds = uniq([...CONTRACTS_CHAIN_IDS, ...SOURCE_CHAIN_IDS] as AnyChainId[]).filter(
    (chainId) => isTestnetChain(chainId) === isTestnet
  );
  const accountTypes = await Promise.all(chainIds.map((chainId) => probeAccountType(address, chainId)));

  return accountTypes.some((accountType) => accountType === AccountType.SmartAccount);
}

async function getUndeployedChains(address: string, chainIds: number[]): Promise<number[]> {
  if (!chainIds.length || !(await getIsContractAccount(address, chainIds[0]))) {
    return [];
  }

  const accountTypes = await Promise.all(chainIds.map((chainId) => probeAccountType(address, chainId)));

  return chainIds.filter((_, index) => accountTypes[index] === AccountType.EOA);
}

export async function isAccountMissingOnChain(address: string, chainId: number): Promise<boolean> {
  return (await getUndeployedChains(address, [chainId])).includes(chainId);
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
  const { sessionChains, isLoading: isLoadingSession } = useWalletSessionChains();

  // Unavailable needs both: the session will not route there and the account is not deployed there.
  const undeclaredChainIds = sessionChains ? chainIds.filter((chainId) => !sessionChains.includes(chainId)) : [];

  const { data, isLoading: isLoadingDeployments } = useSWR<number[] | undefined>(
    address && sessionChains ? [address, undeclaredChainIds.join(","), "walletUnavailableChains"] : null,
    {
      fetcher: async () => getUndeployedChains(address!, undeclaredChainIds),
      refreshInterval: 0,
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
      revalidateIfStale: false,
    }
  );

  return {
    unavailableChains: sessionChains ? data : undefined,
    isLoading: isLoadingSession || (Boolean(sessionChains) && isLoadingDeployments),
  };
}

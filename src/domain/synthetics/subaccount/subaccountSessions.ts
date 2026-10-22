import { useCallback } from "react";
import useSWR from "swr";

import type { ContractsChainId } from "config/chains";
import { getPublicClientWithRpc } from "lib/wallets/walletConfig";
import { abis } from "sdk/abis";
import { getContract } from "sdk/configs/contracts";
import {
  maxAllowedSubaccountActionCountKey,
  SUBACCOUNT_ORDER_ACTION,
  subaccountActionCountKey,
  subaccountExpiresAtKey,
  subaccountListKey,
} from "sdk/configs/dataStore";
import { nowInSeconds } from "sdk/utils/time";

export type SubaccountSession = {
  address: string;
  expiresAt: bigint;
  maxAllowedCount: bigint;
  actionsCount: bigint;
};

export async function fetchSubaccountSessions(
  chainId: ContractsChainId,
  account: string
): Promise<SubaccountSession[]> {
  const client = getPublicClientWithRpc(chainId);
  const dataStoreAddress = getContract(chainId, "DataStore");
  const listKey = subaccountListKey(account);

  const count = await client.readContract({
    address: dataStoreAddress,
    abi: abis.DataStore,
    functionName: "getAddressCount",
    args: [listKey],
  });

  if (count === 0n) {
    return [];
  }

  const addresses = await client.readContract({
    address: dataStoreAddress,
    abi: abis.DataStore,
    functionName: "getAddressValuesAt",
    args: [listKey, 0n, count],
  });

  const getUint = (key: string) =>
    ({
      address: dataStoreAddress,
      abi: abis.DataStore,
      functionName: "getUint",
      args: [key],
    }) as const;

  const values = await client.multicall({
    allowFailure: false,
    contracts: addresses.flatMap((address) => [
      getUint(subaccountExpiresAtKey(account, address, SUBACCOUNT_ORDER_ACTION)),
      getUint(maxAllowedSubaccountActionCountKey(account, address, SUBACCOUNT_ORDER_ACTION)),
      getUint(subaccountActionCountKey(account, address, SUBACCOUNT_ORDER_ACTION)),
    ]),
  });

  return addresses.map((address, index) => ({
    address,
    expiresAt: values[index * 3],
    maxAllowedCount: values[index * 3 + 1],
    actionsCount: values[index * 3 + 2],
  }));
}

export function getSubaccountSessionRemainingActions(session: SubaccountSession): bigint {
  return session.maxAllowedCount > session.actionsCount ? session.maxAllowedCount - session.actionsCount : 0n;
}

export function getIsSubaccountSessionUsable(session: SubaccountSession): boolean {
  return session.expiresAt > BigInt(nowInSeconds()) && getSubaccountSessionRemainingActions(session) > 0n;
}

export function useSubaccountSessions(chainId: ContractsChainId, account: string | undefined) {
  const { data, mutate, error } = useSWR(account ? ["subaccountSessions", chainId, account] : null, {
    fetcher: () => fetchSubaccountSessions(chainId, account!),
    refreshInterval: 60_000,
  });

  const refreshSessions = useCallback(() => {
    mutate();
  }, [mutate]);

  return { sessions: data, error, refreshSessions };
}

import { ContractCallResult } from "lib/multicall";

export function sumBalancesFromCalls(
  result: Record<string, ContractCallResult | undefined> | undefined,
  addressesCount: number
): bigint {
  if (!result || !addressesCount) {
    return 0n;
  }

  let balance = 0n;

  for (let index = 0; index < addressesCount; index++) {
    const rawValue = result[`balance_${index}`]?.returnValues?.[0];

    if (rawValue !== undefined && rawValue !== null) {
      balance += BigInt(rawValue);
    }
  }

  return balance;
}

export function createBalanceCalls(
  addresses: string[],
  options: { balanceMethodName?: string; includeDecimals?: boolean } = {}
): Record<string, { methodName: string; params: unknown[] }> {
  const { balanceMethodName = "balanceOf", includeDecimals } = options;

  const baseCalls: Record<string, { methodName: string; params: unknown[] }> = includeDecimals
    ? {
        decimals: {
          methodName: "decimals",
          params: [],
        },
      }
    : {};

  return addresses.reduce<Record<string, { methodName: string; params: unknown[] }>>((calls, account, index) => {
    calls[`balance_${index}`] = {
      methodName: balanceMethodName,
      params: [account],
    };

    return calls;
  }, baseCalls);
}

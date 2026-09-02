type TokenPoolValue = {
  tokenAddress: string;
  poolValueUsd: bigint;
};

export function getTokenAddressesSortedByPoolValue(tokenPoolValues: TokenPoolValue[]): string[] {
  const poolValueByTokenAddress: Record<string, bigint> = {};

  for (const { tokenAddress, poolValueUsd } of tokenPoolValues) {
    poolValueByTokenAddress[tokenAddress] = (poolValueByTokenAddress[tokenAddress] ?? 0n) + poolValueUsd;
  }

  return Object.keys(poolValueByTokenAddress).sort((a, b) => {
    const aPoolValue = poolValueByTokenAddress[a];
    const bPoolValue = poolValueByTokenAddress[b];

    if (aPoolValue !== bPoolValue) {
      return bPoolValue > aPoolValue ? 1 : -1;
    }

    return a.localeCompare(b);
  });
}

export type UsdgClosePayout = {
  receivedTokenAddress: string;
  receivedAmount: bigint;
  isConversionFailed: boolean;
  isConvertLinkShown: boolean;
};

/**
 * Reads a USDG close payout from the transfers to the trader: a close either converts in full to USDC or pays USDG
 * Undefined when nothing reached the account, e.g. a payout to the GMX Account lands in the multichain vault
 */
export function getUsdgClosePayout({
  receivedAmounts,
  usdgAddress,
  usdcAddress,
  isUsdcRequested,
  swapPathLength,
}: {
  receivedAmounts: Record<string, bigint>;
  usdgAddress: string;
  usdcAddress: string;
  isUsdcRequested: boolean;
  swapPathLength: number;
}): UsdgClosePayout | undefined {
  const receivedTokenAddress = (receivedAmounts[usdcAddress] ?? 0n) > 0n ? usdcAddress : usdgAddress;
  const receivedAmount = receivedAmounts[receivedTokenAddress] ?? 0n;

  if (receivedAmount === 0n) {
    return undefined;
  }

  const isPaidInUsdg = receivedTokenAddress === usdgAddress;

  return {
    receivedTokenAddress,
    receivedAmount,
    isConversionFailed: isUsdcRequested && isPaidInUsdg && swapPathLength > 0,
    isConvertLinkShown: isUsdcRequested && isPaidInUsdg,
  };
}

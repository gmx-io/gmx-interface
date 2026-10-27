export type UsdgCloseReceiptAmounts = {
  /** amountOut of the order's last swap leg; undefined when there was no swap or it couldn't fill */
  swapOutputAmount: bigint | undefined;
  /** USDG paid to the wallet or credited to the GMX Account */
  usdgAmount: bigint;
};

export type UsdgClosePayout = {
  receivedTokenAddress: string;
  receivedAmount: bigint;
  isConversionFailed: boolean;
  /** set when the trader asked for another token but was paid USDG */
  convertToTokenAddress: string | undefined;
};

/**
 * A USDG close either pays the swap output in full or pays USDG, never a mix
 * Undefined when the receipt shows no payout, e.g. a close that returned nothing
 */
export function getUsdgClosePayout({
  receiptAmounts,
  usdgAddress,
  outTokenAddress,
  requestedTokenAddress,
  swapPathLength,
}: {
  receiptAmounts: UsdgCloseReceiptAmounts;
  usdgAddress: string;
  outTokenAddress: string;
  requestedTokenAddress: string;
  swapPathLength: number;
}): UsdgClosePayout | undefined {
  const { swapOutputAmount, usdgAmount } = receiptAmounts;

  if (swapOutputAmount !== undefined && swapOutputAmount > 0n) {
    return {
      receivedTokenAddress: outTokenAddress,
      receivedAmount: swapOutputAmount,
      isConversionFailed: false,
      convertToTokenAddress: undefined,
    };
  }

  if (usdgAmount === 0n) {
    return undefined;
  }

  const isOtherTokenRequested = requestedTokenAddress !== usdgAddress;

  return {
    receivedTokenAddress: usdgAddress,
    receivedAmount: usdgAmount,
    isConversionFailed: isOtherTokenRequested && swapPathLength > 0,
    convertToTokenAddress: isOtherTokenRequested ? requestedTokenAddress : undefined,
  };
}

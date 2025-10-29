export type TokenInputState = {
  address: string;
  value: string;
  amount: bigint | undefined;
  usd: bigint | undefined;
  setValue: (val: string) => void;
  isMarketToken: boolean;
};

/**
 * Focused input types for GM deposit/withdrawal box
 */
export type FocusedInput = "market" | "longCollateral" | "shortCollateral";

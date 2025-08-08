export type TokenInputState = {
  address: string;
  value: string;
  amount: bigint | undefined;
  usd: bigint | undefined;
  setValue: (val: string) => void;
  isMarketToken: boolean;
};

export type GmOrGlvPaySource = "settlementChain" | "gmxAccount" | "sourceChain";

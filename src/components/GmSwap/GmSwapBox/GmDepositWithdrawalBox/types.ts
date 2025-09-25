import { TokenData } from "domain/synthetics/tokens";

export type TokenInputState = {
  address: string;
  value: string;
  amount?: bigint | undefined;
  usd?: bigint | undefined;
  token?: TokenData | undefined;
  setValue: (val: string) => void;
  isMarketToken?: boolean;
};

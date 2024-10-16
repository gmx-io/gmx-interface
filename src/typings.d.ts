import "ethers";
declare global {
  interface Window {
    ethereum?: any;
    TradingView?: any;
    evmproviders?: Record<string, any>;
    avalanche?: any;
  }
  interface Navigator {
    msSaveBlob?: (blob: any, defaultName?: string) => boolean;
  }

  interface BigInt {
    /** Convert to BigInt to string form in JSON.stringify */
    toJSON: () => string;
  }

  type FilterOutFalsy = <T>(x: T | false | null | undefined | 0 | "") => x is T;
}

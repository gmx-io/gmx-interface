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

  type FilterOutFalsy = <T>(x: T | false | null | undefined | 0 | "") => x is T;
}

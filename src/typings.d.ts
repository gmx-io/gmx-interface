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
}

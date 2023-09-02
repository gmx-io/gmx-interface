import "ethers";
declare global {
  interface Window {
    ethereum?: any;
    TradingView?: any;
  }
  interface Navigator {
    msSaveBlob?: (blob: any, defaultName?: string) => boolean;
  }
}

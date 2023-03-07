import "@web3-react";

declare global {
  interface Window {
    ethereum?: any;
    TradingView?: any;
  }
  interface Navigator {
    msSaveBlob?: (blob: any, defaultName?: string) => boolean;
  }
}

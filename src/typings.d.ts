import "ethers";
declare global {
  interface Window {
    ethereum?: any;
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

  interface Document {
    addEventListener<K extends keyof CustomEventMap>(
      type: K,
      listener: (this: Document, ev: CustomEventMap[K]) => void
    ): void;
    dispatchEvent<K extends keyof CustomEventMap>(ev: CustomEventMap[K]): void;
    removeEventListener<K extends keyof CustomEventMap>(
      type: K,
      listener: (this: Document, ev: CustomEventMap[K]) => void
    ): void;
  }
}

interface CustomEventMap {
  chartMouseMove: CustomEvent<{ x: number; y: number } | undefined>;
}

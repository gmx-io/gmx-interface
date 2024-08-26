import type { Key } from "swr";

export type CacheKey = Key;
export type SkipKey = null | undefined | false;

export type ContractCallConfig = {
  methodName: string;
  params: any[];
  /**
   * Makes the multicall request hash each param before sending them.
   *
   * Takes precedence over the call `shouldHashParams` option.
   */
  shouldHashParams?: boolean;
};

export type ContractCallsConfig<T extends { calls: any }> = {
  contractAddress: string;
  abi: any;
  calls: {
    [callKey in keyof T["calls"]]: ContractCallConfig | SkipKey;
  };
  /**
   * Makes the multicall request hash each param before sending them.
   */
  shouldHashParams?: boolean;
};

export type MulticallRequestConfig<T extends { [key: string]: any }> = {
  [contractKey in keyof T]: ContractCallsConfig<T[contractKey]>;
};

export type ContractCallResult = {
  returnValues: {
    [key: string | number]: any;
  };
  contractKey: string;
  callKey: string;
  success?: boolean;
  error?: string;
};

export type ContractCallsResult<T extends ContractCallsConfig<any>> = {
  [callKey in keyof T["calls"]]: ContractCallResult;
};

export type MulticallResult<T extends MulticallRequestConfig<any>> = {
  success: boolean;
  errors: {
    [contractKey in keyof T]: {
      [callKey in keyof T[contractKey]["calls"]]: string;
    };
  };
  data: {
    [contractKey in keyof T]: ContractCallsResult<T[contractKey]>;
  };
};

export function multicall<T extends MulticallRequestConfig<any>>(request: T): MulticallResult<T> {
  return request as any;
}

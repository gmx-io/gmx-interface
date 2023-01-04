/**
 * TODO: Update swr to 1.1 to allow use object-like keys safely
 * @see https://swr.vercel.app/docs/arguments#passing-objects
 */
export type CacheKey = (string | number | boolean | null | undefined)[];
export type SkipKey = null | undefined | false;

export type ContractCallConfig = {
  methodName: string;
  params: any[];
};

export type ContractCallsConfig<T extends { calls: any }> = {
  contractAddress: string;
  abi: any;
  calls: {
    [callKey in keyof T["calls"]]: ContractCallConfig | SkipKey;
  };
};

export type MulticallRequestConfig<T extends { [key: string]: any }> = {
  [contractKey in keyof T]: ContractCallsConfig<T[contractKey]>;
};

export type ContractCallResult = {
  returnValues: any[];
  success?: boolean;
};

export type ContractCallsResult<T extends ContractCallsConfig<any>> = {
  [callKey in keyof T["calls"]]: ContractCallResult;
};

export type MulticallResult<T extends MulticallRequestConfig<any>> = {
  [contractKey in keyof T]: ContractCallsResult<T[contractKey]>;
};

export function multicall<T extends MulticallRequestConfig<any>>(request: T): MulticallResult<T> {
  return request as any;
}

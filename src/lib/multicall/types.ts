export type ContractCallConfig = {
  methodName: string;
  params: any[];
};

export type ContractCallsConfig<T extends { calls: ContractCallConfig }> = {
  contractAddress: string;
  abi: any;
  calls: {
    [callKey in keyof T["calls"]]: ContractCallConfig;
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

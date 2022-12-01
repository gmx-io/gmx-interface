export type ContractCallConfig = {
  methodName: string;
  params: any[];
};

export type ContractCallsConfig = {
  contractAddress: string;
  abi: any;
  calls: {
    [key: string]: ContractCallConfig;
  };
};

export type MulticallRequestConfig<TContractFields extends string> = {
  [fieldName in TContractFields]: ContractCallsConfig;
};

export type ContractCallResult = {
  returnValues: any[];
  success?: boolean;
};

export type ContractCallsResult = {
  [fieldName: string]: ContractCallResult;
};

export type MulticallResult<TRequestFields extends string> = {
  [fieldName in TRequestFields]: ContractCallsResult;
};

export function multicallId<TContractFields extends string>(
  request: MulticallRequestConfig<TContractFields>
): MulticallResult<TContractFields> {
  return request as any;
}

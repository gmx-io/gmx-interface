import type { AbiId } from "sdk/abis";
import type { Key } from "swr";

export type CacheKey = Key;
export type SkipKey = null | undefined | false;

export type ContractCallConfig = {
  methodName: string;
  params: any[];
};

export type ContractCallsConfig<T extends { calls: any }> = {
  contractAddress: string;
  abiId: AbiId;
  calls: {
    [callKey in keyof T["calls"]]: ContractCallConfig | SkipKey;
  };
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

export type MulticallError = {
  message: string;
  shortMessage?: string;
  functionName: string;
  contractAddress: string;
};

export type MulticallErrors<T extends MulticallRequestConfig<any>> = {
  [contractKey in keyof T]: {
    [callKey in keyof T[contractKey]["calls"]]: MulticallError;
  };
};

export type ContractCallsResult<T extends ContractCallsConfig<any>> = {
  [callKey in keyof T["calls"]]: ContractCallResult;
};

export type MulticallResult<T extends MulticallRequestConfig<any>> = {
  success: boolean;
  errors: MulticallErrors<T>;
  data: {
    [contractKey in keyof T]: ContractCallsResult<T[contractKey]>;
  };
};

export function multicall<T extends MulticallRequestConfig<any>>(request: T): MulticallResult<T> {
  return request as any;
}

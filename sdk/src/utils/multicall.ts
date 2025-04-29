import { AbiId, abis as allAbis } from "abis";
import type { GmxSdk } from "index";

import { sleep } from "./common";

export const MAX_TIMEOUT = 20000;

export type MulticallProviderUrls = {
  primary: string;
  secondary: string;
};

export class Multicall {
  static instances: {
    [chainId: number]: Multicall | undefined;
  } = {};

  static async getInstance(sdk: GmxSdk) {
    const chainId = sdk.chainId;
    let instance = Multicall.instances[chainId];

    if (!instance || instance.chainId !== chainId) {
      instance = new Multicall(sdk);

      Multicall.instances[chainId] = instance;
    }

    return instance;
  }

  constructor(public sdk: GmxSdk) {}

  get chainId() {
    return this.sdk.chainId;
  }

  async call(request: MulticallRequestConfig<any>, maxTimeout: number) {
    const client = this.sdk.publicClient;

    if (!client) {
      throw new Error("Public client is not initialized");
    }

    const originalKeys: {
      contractKey: string;
      callKey: string;
    }[] = [];

    const abis: any = {};

    const encodedPayload: { address: string; abi: any; functionName: string; args: any }[] = [];

    const contractKeys = Object.keys(request);

    contractKeys.forEach((contractKey) => {
      const contractCallConfig = request[contractKey];

      if (!contractCallConfig) {
        return;
      }

      Object.keys(contractCallConfig.calls).forEach((callKey) => {
        const call = contractCallConfig.calls[callKey];

        if (!call) {
          return;
        }

        // Add Errors ABI to each contract ABI to correctly parse errors
        abis[contractCallConfig.contractAddress] = abis[contractCallConfig.contractAddress] || [
          ...allAbis[contractCallConfig.abiId],
          ...allAbis.CustomErrors,
        ];
        const abi = abis[contractCallConfig.contractAddress];

        originalKeys.push({
          contractKey,
          callKey,
        });

        encodedPayload.push({
          address: contractCallConfig.contractAddress,
          functionName: call.methodName,
          args: call.params,
          abi,
        });
      });
    });

    const processResponse = (response: any) => {
      const multicallResult: MulticallResult<any> = {
        success: true,
        errors: {},
        data: {},
      };

      response.forEach(({ result, status, error }: { result: any; status: string; error: any }, i: number) => {
        const { contractKey, callKey } = originalKeys[i];

        if (status === "success") {
          let values: any;

          if (Array.isArray(result) || typeof result === "object") {
            values = result;
          } else {
            values = [result];
          }

          multicallResult.data[contractKey] = multicallResult.data[contractKey] || {};
          multicallResult.data[contractKey][callKey] = {
            contractKey,
            callKey,
            returnValues: values,
            success: true,
          };
        } else {
          multicallResult.success = false;

          multicallResult.errors[contractKey] = multicallResult.errors[contractKey] || {};
          multicallResult.errors[contractKey][callKey] = error;

          multicallResult.data[contractKey] = multicallResult.data[contractKey] || {};
          multicallResult.data[contractKey][callKey] = {
            contractKey,
            callKey,
            returnValues: [],
            success: false,
            error: error,
          };
        }
      });

      return multicallResult;
    };

    const timeoutController = new AbortController();

    const result = await Promise.race([
      client.multicall({ contracts: encodedPayload as any }),
      sleep(maxTimeout, timeoutController.signal).then(() => Promise.reject(new Error("multicall timeout"))),
    ])
      .then((response) => {
        timeoutController.abort();
        return processResponse(response);
      })
      .catch((_viemError) => {
        timeoutController.abort();
        const e = new Error(_viemError.message.slice(0, 150));

        /* eslint-disable-next-line */
        console.error(e);

        throw e;
      });

    if (result.success) {
      return result;
    }

    /* eslint-disable-next-line */
    console.error(result.errors);

    return result;
  }
}

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

export type MulticallErrors<T extends MulticallRequestConfig<any>> = {
  [contractKey in keyof T]: {
    [callKey in keyof T[contractKey]["calls"]]: {
      message: string;
      shortMessage: string;
      functionName: string;
      contractAddress: string;
    };
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

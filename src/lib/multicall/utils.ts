import { JsonRpcProvider, Web3Provider } from "@ethersproject/providers";
import CustomErrors from "abis/CustomErrors.json";
import Multicall3 from "abis/Multicall.json";
import {
  ARBITRUM,
  ARBITRUM_GOERLI,
  AVALANCHE,
  AVALANCHE_FUJI,
  CHAIN_NAMES_MAP,
  getFallbackRpcUrl,
  getRpcUrl,
} from "config/chains";
import { BigNumber, ethers } from "ethers";
import { createPublicClient, getContract as getViemContract, http } from "viem";
import { arbitrum, arbitrumGoerli, avalanche, avalancheFuji } from "viem/chains";
import { MulticallRequestConfig, MulticallResult } from "./types";

import { getContract } from "config/contracts";
import { mapValues } from "lodash";
import { sleep } from "lib/sleep";

export const MAX_TIMEOUT = 2000;

const CHAIN_BY_CHAIN_ID = {
  [AVALANCHE_FUJI]: avalancheFuji,
  [ARBITRUM_GOERLI]: arbitrumGoerli,
  [ARBITRUM]: arbitrum,
  [AVALANCHE]: avalanche,
};

export async function executeMulticall(
  chainId: number,
  library: Web3Provider | undefined,
  request: MulticallRequestConfig<any>,
  requireSucess: boolean
) {
  const multicall = await Multicall.getInstance(chainId, library ? library.getSigner().provider : undefined);

  return multicall.call(request, requireSucess, MAX_TIMEOUT);
}

export class Multicall {
  viemClient: any;
  viemMulticallContract: any;

  static instance: Multicall | undefined = undefined;
  static providerInstance: ethers.providers.Provider | undefined = undefined;

  static async getInstance(chainId: number, customProvider?: JsonRpcProvider) {
    if (customProvider && !customProvider.network) {
      await customProvider.ready;
    }

    if (
      !Multicall.instance ||
      (customProvider && Multicall.instance.provider !== customProvider) ||
      Multicall.instance.provider.network.chainId !== chainId
    ) {
      const rpcUrl = getRpcUrl(chainId);
      const rpcProvider = new ethers.providers.StaticJsonRpcProvider(rpcUrl, {
        chainId,
        name: CHAIN_NAMES_MAP[chainId],
      });

      await rpcProvider.ready;

      Multicall.instance = new Multicall(chainId, rpcProvider);
    }

    return Multicall.instance;
  }

  constructor(public chainId: number, public provider: JsonRpcProvider) {
    this.viemClient = createPublicClient({
      transport: http(provider.connection.url, { retryCount: 0, retryDelay: 10000000, batch: true }),
      chain: CHAIN_BY_CHAIN_ID[chainId],
    });
    this.viemMulticallContract = getViemContract({
      address: getContract(chainId, "Multicall") as any,
      abi: Multicall3.abi,
      publicClient: this.viemClient,
    });
  }

  async call(request: MulticallRequestConfig<any>, requireSuccess: boolean, maxTimeout: number) {
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

        if (!call) return;

        abis[contractCallConfig.contractAddress] =
          abis[contractCallConfig.contractAddress] || contractCallConfig.abi.concat(CustomErrors.abi);

        const abi = abis[contractCallConfig.contractAddress];

        originalKeys.push({
          contractKey,
          callKey,
        });

        encodedPayload.push({
          address: contractCallConfig.contractAddress,
          functionName: call.methodName,
          abi,
          args: call.params,
        });
      });
    });

    const response: any = await Promise.race([
      this.viemClient.multicall({ contracts: encodedPayload }),
      sleep(maxTimeout).then(() => Promise.reject("multicall timeout")),
    ])
      .catch((e) => {
        // eslint-disable-next-line no-console
        console.log("multicall error:", e);

        const rpcUrl = getFallbackRpcUrl(this.chainId);

        if (!rpcUrl) {
          throw e;
        }

        const fallbackClient = createPublicClient({
          transport: http(rpcUrl, { retryCount: 0, retryDelay: 10000000, batch: true }),
          chain: CHAIN_BY_CHAIN_ID[this.chainId],
        });

        // eslint-disable-next-line no-console
        console.log(`using multicall fallback for chain ${this.chainId}`);

        return fallbackClient.multicall({ contracts: encodedPayload as any });
      })
      .catch((e) => {
        // eslint-disable-next-line no-console
        console.error("multicall error:", e);

        throw e;
      });

    const multicallResult: MulticallResult<any> = {
      success: true,
      errors: {},
      data: {},
    };

    response.forEach(({ result, status, error }, i) => {
      const { contractKey, callKey } = originalKeys[i];

      if (status === "success") {
        let values: any = result;

        if (typeof values === "bigint") {
          values = [BigNumber.from(values)];
        } else if (Array.isArray(values)) {
          values = values.map((value) => {
            if (typeof value === "bigint") {
              return BigNumber.from(value);
            }

            return value;
          });
        } else if (typeof values === "object") {
          values = mapValues(values, (value) => {
            if (typeof value === "bigint") {
              return BigNumber.from(value);
            }

            return value;
          });
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
  }
}

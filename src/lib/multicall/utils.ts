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
import { ethers } from "ethers";
import { PublicClient, createPublicClient, getContract as getViemContract, http } from "viem";
import { arbitrum, arbitrumGoerli, avalanche, avalancheFuji } from "viem/chains";
import { MulticallRequestConfig, MulticallResult } from "./types";

import { getContract } from "config/contracts";
import { sleep } from "lib/sleep";

export const MAX_TIMEOUT = 2000;

const CHAIN_BY_CHAIN_ID = {
  [AVALANCHE_FUJI]: avalancheFuji,
  [ARBITRUM_GOERLI]: arbitrumGoerli,
  [ARBITRUM]: arbitrum,
  [AVALANCHE]: avalanche,
};

const BATCH_CONFIGS = {
  [ARBITRUM]: {
    http: {
      batchSize: 0, // disable batches, here batchSize is the number of eth_calls in a batch
      wait: 0, // keep this setting in case batches are enabled in future
    },
    client: {
      multicall: {
        batchSize: 1024 * 1024, // here batchSize is the number of bytes in a multicall
        wait: 0, // zero delay means formation of a batch in the current macro-task, like setTimeout(fn, 0)
      },
    },
  },
  [AVALANCHE]: {
    http: {
      batchSize: 0,
      wait: 0,
    },
    client: {
      multicall: {
        batchSize: 1024 * 1024,
        wait: 0,
      },
    },
  },
  [AVALANCHE_FUJI]: {
    http: {
      batchSize: 40,
      wait: 0,
    },
    client: {
      multicall: {
        batchSize: 1024 * 1024,
        wait: 0,
      },
    },
  },
  [ARBITRUM_GOERLI]: {
    http: {
      batchSize: 0,
      wait: 0,
    },
    client: {
      multicall: {
        batchSize: 1024 * 1024,
        wait: 0,
      },
    },
  },
};

export async function executeMulticall(
  chainId: number,
  library: Web3Provider | undefined,
  request: MulticallRequestConfig<any>
) {
  const multicall = await Multicall.getInstance(chainId, library ? library.getSigner().provider : undefined);

  return multicall.call(request, MAX_TIMEOUT);
}

export class Multicall {
  viemClient: PublicClient;
  viemMulticallContract: any;

  static instance: Multicall | undefined = undefined;

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
      transport: http(provider.connection.url, {
        // retries works strangely in viem, so we disable them
        retryCount: 0,
        retryDelay: 10000000,
        batch: BATCH_CONFIGS[chainId].http,
      }),
      batch: BATCH_CONFIGS[chainId].client,
      chain: CHAIN_BY_CHAIN_ID[chainId],
    });
    this.viemMulticallContract = getViemContract({
      address: getContract(chainId, "Multicall") as any,
      abi: Multicall3.abi,
      publicClient: this.viemClient,
    });
  }

  async call(request: MulticallRequestConfig<any>, maxTimeout: number) {
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
      this.viemClient.multicall({ contracts: encodedPayload as any }),
      sleep(maxTimeout).then(() => Promise.reject("multicall timeout")),
    ])
      .catch((e) => {
        // eslint-disable-next-line no-console
        console.groupCollapsed("multicall error:");
        // eslint-disable-next-line no-console
        console.error(e);
        // eslint-disable-next-line no-console
        console.groupEnd();

        const rpcUrl = getFallbackRpcUrl(this.chainId);

        if (!rpcUrl) {
          throw e;
        }

        const fallbackClient = createPublicClient({
          transport: http(rpcUrl, {
            // retries works strangely in viem, so we disable them
            retryCount: 0,
            retryDelay: 10000000,
            batch: BATCH_CONFIGS[this.chainId].http,
          }),
          chain: CHAIN_BY_CHAIN_ID[this.chainId],
          batch: BATCH_CONFIGS[this.chainId].client,
        });

        // eslint-disable-next-line no-console
        console.log(`using multicall fallback for chain ${this.chainId}`);

        return fallbackClient.multicall({ contracts: encodedPayload as any });
      })
      .catch((e) => {
        // eslint-disable-next-line no-console
        console.groupCollapsed("multicall error:");
        // eslint-disable-next-line no-console
        console.error(e);
        // eslint-disable-next-line no-console
        console.groupEnd();

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
  }
}

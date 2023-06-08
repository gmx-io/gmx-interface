import { JsonRpcProvider, Web3Provider } from "@ethersproject/providers";
import Multicall3 from "abis/Multicall.json";
import { CHAIN_NAMES_MAP, getRpcUrl } from "config/chains";
import { ethers } from "ethers";
import { MulticallRequestConfig, MulticallResult } from "./types";

import { getContract } from "config/contracts";
import { getFallbackProvider } from "lib/rpc";
import { sleep } from "lib/sleep";

export const MAX_TIMEOUT = 20000;

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
  multicallContract: ethers.Contract;
  contracts: { [address: string]: { contract: ethers.Contract } };

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
    this.multicallContract = new ethers.Contract(getContract(chainId, "Multicall"), Multicall3.abi, provider);
    this.contracts = {};
  }

  async call(request: MulticallRequestConfig<any>, requireSuccess: boolean, maxTimeout: number) {
    const originalPayload: { contractKey: string; callKey: string; methodName: string; contract: ethers.Contract }[] =
      [];
    const encodedPayload: { target: string; callData: string }[] = [];

    const contractKeys = Object.keys(request);

    contractKeys.forEach((contractKey) => {
      const contractCallConfig = request[contractKey];

      if (!contractCallConfig) {
        return;
      }

      // Cache contracts to avoid creating them on every request
      let contract: ethers.Contract;
      if (this.contracts[contractCallConfig.contractAddress]) {
        contract = this.contracts[contractCallConfig.contractAddress].contract;
      } else {
        contract = new ethers.Contract(contractCallConfig.contractAddress, contractCallConfig.abi);
        this.contracts[contractCallConfig.contractAddress] = { contract };
      }

      Object.keys(contractCallConfig.calls).forEach((callKey) => {
        const call = contractCallConfig.calls[callKey];

        if (!call) return;

        originalPayload.push({
          contractKey,
          callKey,
          methodName: call.methodName,
          contract,
        });

        encodedPayload.push({
          target: contract.address,
          callData: contract.interface.encodeFunctionData(call.methodName, call.params),
        });
      });
    });

    const response = await Promise.race([
      this.multicallContract.callStatic.tryAggregate(requireSuccess, encodedPayload),
      sleep(maxTimeout).then(() => Promise.reject("rpc timeout")),
    ])
      .catch((e) => {
        const fallbackProvider = getFallbackProvider(this.chainId);

        if (!fallbackProvider) {
          throw e;
        }

        // eslint-disable-next-line no-console
        console.log(`using multicall fallback for chain ${this.chainId}`);

        const fallbbackMulticallContract = new ethers.Contract(
          this.multicallContract.address,
          this.multicallContract.interface,
          fallbackProvider
        );

        return fallbbackMulticallContract.callStatic.tryAggregate(requireSuccess, encodedPayload);
      })
      .catch((e) => {
        // eslint-disable-next-line no-console
        console.error("multicall error", e);

        throw e;
      });

    const result: MulticallResult<any> = {
      success: true,
      errors: {},
      data: {},
    };

    response.forEach(([success, res], i) => {
      const { contractKey, callKey, contract, methodName } = originalPayload[i];

      if (success) {
        const values = contract.interface.decodeFunctionResult(methodName, res);

        result.data[contractKey] = result.data[contractKey] || {};
        result.data[contractKey][callKey] = {
          contractKey,
          callKey,
          returnValues: values,
          success,
        };
      } else {
        result.success = false;

        result.errors[contractKey] = result.errors[contractKey] || {};
        result.errors[contractKey][callKey] = res;

        result.data[contractKey] = result.data[contractKey] || {};
        result.data[contractKey][callKey] = {
          contractKey,
          callKey,
          returnValues: [],
          success,
          error: res,
        };
      }
    });

    return result;
  }
}

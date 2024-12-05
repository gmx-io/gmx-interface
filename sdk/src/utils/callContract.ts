import { Abi, Address, encodeFunctionData, PublicClient, withRetry } from "viem";

import {
  GAS_PRICE_BUFFER_MAP,
  GAS_PRICE_PREMIUM_MAP,
  getChain,
  MAX_FEE_PER_GAS_MAP,
  MAX_PRIORITY_FEE_PER_GAS_MAP,
} from "configs/chains";
import { BASIS_POINTS_DIVISOR_BIGINT } from "configs/factors";

import type { GmxSdk } from "../index";
import { bigMath } from "./bigmath";

export async function getGasPrice(client: PublicClient, chainId: number) {
  let maxFeePerGas = MAX_FEE_PER_GAS_MAP[chainId];
  const premium: bigint = GAS_PRICE_PREMIUM_MAP[chainId] || 0n;

  const feeData = await withRetry(
    () =>
      client.estimateFeesPerGas({
        type: "legacy",
        chain: getChain(chainId),
      }),
    {
      delay: 200,
      retryCount: 2,
      shouldRetry: ({ error }) => {
        const isInvalidBlockError = error?.message?.includes("invalid value for value.hash");

        return isInvalidBlockError;
      },
    }
  );

  const gasPrice = feeData.gasPrice;

  if (maxFeePerGas) {
    if (gasPrice !== undefined && gasPrice !== null) {
      maxFeePerGas = bigMath.max(gasPrice, maxFeePerGas);
    }

    // Fetch the latest block to get baseFeePerGas for EIP-1559 fee data
    const block = await client.getBlock({ blockTag: "pending" });
    if (block.baseFeePerGas !== undefined && block.baseFeePerGas !== null) {
      const baseFeePerGas = block.baseFeePerGas;

      const maxPriorityFeePerGas = bigMath.max(MAX_PRIORITY_FEE_PER_GAS_MAP[chainId] ?? 0n, premium);

      // Calculate maxFeePerGas
      const calculatedMaxFeePerGas = baseFeePerGas + maxPriorityFeePerGas + premium;

      return {
        maxFeePerGas: bigMath.max(maxFeePerGas, calculatedMaxFeePerGas),
        maxPriorityFeePerGas: maxPriorityFeePerGas + premium,
      };
    }
  }

  if (gasPrice === null || gasPrice === undefined) {
    throw new Error("Can't fetch gas price");
  }

  const bufferBps: bigint = GAS_PRICE_BUFFER_MAP[chainId] || 0n;
  const buffer = bigMath.mulDiv(gasPrice, bufferBps, BASIS_POINTS_DIVISOR_BIGINT);

  return {
    gasPrice: gasPrice + buffer + premium,
  };
}

export async function getGasLimit(
  client: PublicClient,
  account: Address,
  contractAddress: Address,
  abi: Abi,
  method: string,
  params: any[] = [],
  value?: bigint | number
) {
  const defaultValue = 0n;

  if (value === undefined || value === null) {
    value = defaultValue;
  }

  let gasLimit = 0n;
  const data = encodeFunctionData({
    abi,
    functionName: method,
    args: params,
  });

  try {
    const estimateGasParams = {
      to: contractAddress,
      data,
      value: BigInt(value),
      account,
    };
    gasLimit = await client.estimateGas(estimateGasParams);
  } catch (error) {
    // This call should throw another error instead of the `error`
    const callParams: any = {
      to: contractAddress,
      data,
      value: BigInt(value),
    };
    if (client.account) {
      callParams.account = client.account;
    }
    await client.call(callParams);
    // If not, we throw the original estimateGas error
    throw error;
  }

  if (gasLimit < 22000n) {
    gasLimit = 22000n;
  }

  // Add a 10% buffer to the gas limit
  return (gasLimit * 11n) / 10n;
}

export interface CallContractOpts {
  value?: bigint | number;
  gasLimit?: bigint | number;
}

export async function callContract(
  sdk: GmxSdk,
  contractAddress: Address,
  abi: Abi,
  method: string,
  params: any[],
  opts: CallContractOpts = {}
) {
  const txnOpts: any = {};

  const chain = getChain(sdk.chainId);

  if (opts.value) {
    txnOpts.value = BigInt(opts.value);
  }

  const clients = [sdk.publicClient];

  const data = encodeFunctionData({
    abi,
    functionName: method,
    args: params,
  });

  const txnCalls = clients.map(async (client) => {
    const txnInstance = { ...txnOpts };

    async function retrieveGasLimit() {
      return opts.gasLimit
        ? BigInt(opts.gasLimit)
        : await getGasLimit(
            client,
            sdk.config.account as Address,
            contractAddress,
            abi,
            method,
            params,
            opts.value !== undefined ? BigInt(opts.value) : undefined
          );
    }

    const gasLimitPromise = retrieveGasLimit().then((gasLimit) => {
      txnInstance.gas = gasLimit;
    });

    const gasPriceDataPromise = getGasPrice(sdk.publicClient, sdk.chainId).then((gasPriceData) => {
      if (gasPriceData.gasPrice !== undefined) {
        txnInstance.gasPrice = gasPriceData.gasPrice;
      } else {
        txnInstance.maxFeePerGas = gasPriceData.maxFeePerGas;
        txnInstance.maxPriorityFeePerGas = gasPriceData.maxPriorityFeePerGas;
      }
    });

    await Promise.all([gasLimitPromise, gasPriceDataPromise]);

    return sdk.walletClient.sendTransaction({
      to: contractAddress,
      data,
      chain,
      ...txnInstance,
    });
  });

  const res = await Promise.any(txnCalls).catch((error) => {
    if (error.errors && error.errors.length > 1) {
      // eslint-disable-next-line no-console
      console.error("All transactions failed", ...error.errors);
    }
    throw error.errors ? error.errors[0] : error;
  });

  return res;
}

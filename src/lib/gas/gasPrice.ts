import { JsonRpcProvider } from "ethers";
import { withRetry } from "viem";

import {
  BOTANIX,
  GAS_PRICE_BUFFER_MAP,
  GAS_PRICE_PREMIUM_MAP,
  MAX_FEE_PER_GAS_MAP,
  MAX_PRIORITY_FEE_PER_GAS_MAP,
} from "config/chains";
import { BASIS_POINTS_DIVISOR_BIGINT } from "config/factors";
import { extendError } from "lib/errors";
import { GetFeeDataBlockError } from "lib/metrics";
import { emitMetricCounter } from "lib/metrics/emitMetricEvent";
import { bigMath } from "sdk/utils/bigmath";

export type GasPriceData =
  | {
      gasPrice: bigint;
    }
  // Avalanche
  | {
      maxFeePerGas: bigint;
      maxPriorityFeePerGas: bigint;
    };

export async function getGasPrice(provider: JsonRpcProvider, chainId: number): Promise<GasPriceData> {
  try {
    let maxFeePerGas = MAX_FEE_PER_GAS_MAP[chainId];
    const premium: bigint = GAS_PRICE_PREMIUM_MAP[chainId] ?? 0n;

    const useEip1559 = chainId === BOTANIX;

    const feeData = await withRetry(
      async () => {
        if (useEip1559) {
          const [block, maxPriorityFeePerGasHex] = await Promise.all([
            provider.getBlock("latest"),
            provider.send("eth_maxPriorityFeePerGas", []),
          ]);
          const baseFeePerGas = block?.baseFeePerGas ?? 0n;
          const maxPriorityFeePerGas = BigInt(maxPriorityFeePerGasHex);
          return { gasPrice: baseFeePerGas, maxPriorityFeePerGas };
        } else {
          return provider.getFeeData();
        }
      },
      {
        delay: 200,
        retryCount: 2,
        shouldRetry: ({ error }) => {
          const isInvalidBlockError = error?.message?.includes("invalid value for value.hash");

          if (isInvalidBlockError) {
            emitMetricCounter<GetFeeDataBlockError>({ event: "error.getFeeData.value.hash" });
          }

          return isInvalidBlockError;
        },
      }
    );

    const gasPrice = feeData.gasPrice;

    if (maxFeePerGas !== undefined) {
      if (gasPrice !== undefined && gasPrice !== null) {
        maxFeePerGas = bigMath.max(gasPrice, maxFeePerGas);
      }

      // the wallet provider might not return maxPriorityFeePerGas in feeData
      // in which case we should fallback to the usual getGasPrice flow handled below
      if (feeData && feeData.maxPriorityFeePerGas !== undefined && feeData.maxPriorityFeePerGas !== null) {
        const maxPriorityFeePerGas = bigMath.max(
          feeData.maxPriorityFeePerGas,
          MAX_PRIORITY_FEE_PER_GAS_MAP[chainId] ?? 0n
        );

        return {
          maxFeePerGas,
          maxPriorityFeePerGas: maxPriorityFeePerGas + premium,
        };
      }
    }

    if (gasPrice === null) {
      throw new Error("Can't fetch gas price");
    }

    const bufferBps: bigint = GAS_PRICE_BUFFER_MAP[chainId] ?? 0n;
    const buffer = bigMath.mulDiv(gasPrice, bufferBps, BASIS_POINTS_DIVISOR_BIGINT);

    return {
      gasPrice: gasPrice + buffer + premium,
    };
  } catch (error) {
    throw extendError(error, {
      errorContext: "gasPrice",
    });
  }
}

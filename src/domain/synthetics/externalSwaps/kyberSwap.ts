import { getContract } from "config/contracts";
import { getKyberSwapUrl, KYBER_SWAP_CLIENT_ID, EXCLUDED_KYBER_SWAP_SOURCES } from "config/externalSwaps";
import { USD_DECIMALS } from "config/factors";
import { buildUrl } from "lib/buildUrl";
import { metrics } from "lib/metrics";
import { formatTokenAmount, numberToBigint } from "lib/numbers";
import type { ContractsChainId } from "sdk/configs/chains";
import { convertTokenAddress, getToken } from "sdk/configs/tokens";

type KyberSwapRoutesResponse = {
  code: number;
  message: string;
  data?: {
    routeSummary: KyberSwapRouteSummary;
    routerAddress: string;
  };
};

type KyberSwapRouteSummary = {
  tokenIn: string;
  amountIn: string;
  amountInUsd: string;
  tokenOut: string;
  amountOut: string;
  amountOutUsd: string;
  gas: string;
  gasPrice: string;
  gasUsd: string;
  extraFee: {
    feeAmount: string;
    chargeFeeBy: string;
    isInBps: boolean;
    feeReceiver: string;
  };
  route: unknown[][];
};

type KyberSwapBuildResponse = {
  code: number;
  message: string;
  data?: {
    amountIn: string;
    amountInUsd: string;
    amountOut: string;
    amountOutUsd: string;
    gas: string;
    gasUsd: string;
    outputChange: {
      amount: string;
      percent: number;
      level: number;
    };
    data: string;
    routerAddress: string;
  };
};

export type KyberSwapQuote = {
  to: string;
  data: string;
  value: bigint;
  estimatedGas: bigint;
  usdIn: bigint;
  usdOut: bigint;
  priceIn: bigint;
  priceOut: bigint;
  gasPrice: bigint;
  amountIn: bigint;
  outputAmount: bigint;
};

export async function getKyberSwapTxnData({
  chainId,
  tokenInAddress,
  tokenOutAddress,
  amountIn,
  senderAddress,
  receiverAddress,
  gasPrice,
  slippage,
}: {
  senderAddress: string;
  receiverAddress: string;
  chainId: ContractsChainId;
  tokenInAddress: string;
  tokenOutAddress: string;
  amountIn: bigint;
  gasPrice: bigint;
  slippage: number;
}): Promise<KyberSwapQuote | undefined> {
  const baseUrl = getKyberSwapUrl(chainId);
  const tokenIn = getToken(chainId, tokenInAddress);
  const tokenOut = getToken(chainId, tokenOutAddress);

  const wrappedTokenIn = convertTokenAddress(chainId, tokenInAddress, "wrapped");
  const wrappedTokenOut = convertTokenAddress(chainId, tokenOutAddress, "wrapped");

  const excludedSources = EXCLUDED_KYBER_SWAP_SOURCES[chainId]?.join(",");

  // Step 1: Get route
  const routeUrl = buildUrl(baseUrl, "/api/v1/routes", {
    tokenIn: wrappedTokenIn,
    tokenOut: wrappedTokenOut,
    amountIn: amountIn.toString(),
    gasPrice: gasPrice.toString(),
    excludedSources,
  });

  try {
    const routeRes = await fetch(routeUrl, {
      headers: { "x-client-id": KYBER_SWAP_CLIENT_ID },
    });

    if (routeRes.status === 403) {
      throw new Error(`IP is banned ${await routeRes.text()}`);
    }

    const routeData = (await routeRes.json()) as KyberSwapRoutesResponse;

    if (!routeData.data?.routeSummary || routeData.code !== 0) {
      throw new Error(`Failed to get route: ${routeData.code} ${routeData.message}`);
    }

    const { routeSummary, routerAddress } = routeData.data;

    if (routerAddress !== getContract(chainId, "KyberSwapRouter")) {
      throw new Error(`Invalid KyberSwapRouter address: ${routerAddress}`);
    }

    // Step 2: Build transaction
    const buildUrl_ = buildUrl(baseUrl, "/api/v1/route/build");

    const buildRes = await fetch(buildUrl_, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-client-id": KYBER_SWAP_CLIENT_ID,
      },
      body: JSON.stringify({
        routeSummary,
        sender: senderAddress,
        recipient: receiverAddress,
        slippageTolerance: slippage,
      }),
    });

    const buildData = (await buildRes.json()) as KyberSwapBuildResponse;

    if (!buildData.data || buildData.code !== 0) {
      throw new Error(`Failed to build transaction: ${buildData.code} ${buildData.message}`);
    }

    if (buildData.data.routerAddress !== getContract(chainId, "KyberSwapRouter")) {
      throw new Error(`Invalid KyberSwapRouter address in build response: ${buildData.data.routerAddress}`);
    }

    const amountInBigint = BigInt(routeSummary.amountIn);
    const amountOutBigint = BigInt(buildData.data.amountOut);
    const usdIn = numberToBigint(parseFloat(buildData.data.amountInUsd), USD_DECIMALS);
    const usdOut = numberToBigint(parseFloat(buildData.data.amountOutUsd), USD_DECIMALS);

    const priceIn = calcTokenPrice(amountInBigint, buildData.data.amountInUsd, tokenIn.decimals);
    const priceOut = calcTokenPrice(amountOutBigint, buildData.data.amountOutUsd, tokenOut.decimals);

    return {
      to: buildData.data.routerAddress,
      data: buildData.data.data,
      value: 0n,
      estimatedGas: BigInt(buildData.data.gas),
      usdIn,
      usdOut,
      priceIn,
      priceOut,
      gasPrice,
      amountIn: amountInBigint,
      outputAmount: amountOutBigint,
    };
  } catch (e) {
    (e as Error).message += ` URL: ${routeUrl.replace(receiverAddress, "...")}`;
    metrics.pushError(e, "externalSwap.getKyberSwapTxnData");
    return undefined;
  }
}

function calcTokenPrice(amount: bigint, usdValue: string, decimals: number): bigint {
  if (amount <= 0n) return 0n;

  const formattedAmount = formatTokenAmount(amount, decimals, undefined, { showAllSignificant: true }) ?? "0";

  return numberToBigint(parseFloat(usdValue) / parseFloat(formattedAmount), USD_DECIMALS);
}

import { getContract } from "config/contracts";
import { DISABLED_OPEN_OCEAN_DEXES, getOpenOceanUrl, OPEN_OCEAN_REFERRER } from "config/externalSwaps";
import { USD_DECIMALS } from "config/factors";
import { buildUrl } from "lib/buildUrl";
import { metrics } from "lib/metrics";
import { formatTokenAmount, numberToBigint } from "lib/numbers";
import { convertTokenAddress, getToken } from "sdk/configs/tokens";

type OpenOceanTxnResponse = {
  code: number;
  error?: string;
  data?: {
    inToken: {
      address: string;
      decimals: number;
      symbol: string;
      name: string;
      usd: string;
      volume: string;
    };
    outToken: {
      address: string;
      decimals: number;
      symbol: string;
      name: string;
      usd: string;
      volume: string;
    };
    inAmount: string;
    outAmount: string;
    minOutAmount: string;
    estimatedGas: string;
    value: string;
    gasPrice: string;
    to: string;
    data: string;
    price_impact: string;
  };
};

export type OpenOceanQuote = {
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

export async function getOpenOceanTxnData({
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
  chainId: number;
  tokenInAddress: string;
  tokenOutAddress: string;
  amountIn: bigint;
  gasPrice: bigint;
  slippage: number;
}): Promise<OpenOceanQuote | undefined> {
  const disabledDexIds = DISABLED_OPEN_OCEAN_DEXES[chainId] ?? [];
  const tokenIn = getToken(chainId, tokenInAddress);

  const gweiGasPrice = formatTokenAmount(gasPrice, 18 - 9, undefined, { displayDecimals: 8 });

  const url = buildUrl(getOpenOceanUrl(chainId), "/swap_quote", {
    inTokenAddress: convertTokenAddress(chainId, tokenInAddress, "wrapped"),
    outTokenAddress: convertTokenAddress(chainId, tokenOutAddress, "wrapped"),
    amount: formatTokenAmount(amountIn, tokenIn.decimals, undefined, {
      showAllSignificant: true,
      isStable: tokenIn.isStable,
    }),
    gasPrice: gweiGasPrice,
    slippage: (slippage / 100).toString(),
    sender: senderAddress,
    account: receiverAddress,
    referrer: OPEN_OCEAN_REFERRER,
    disabledDexIds: disabledDexIds.join(","),
  });

  try {
    const res = await fetch(url);

    if (res.status === 403) {
      throw new Error(`IP is banned ${await res.text()}`);
    }

    const parsed = (await res.json()) as OpenOceanTxnResponse;

    if (!parsed.data || parsed.code !== 200) {
      throw new Error(`Failed to build transaction: ${parsed.code} ${parsed.error}`);
    }

    if (parsed.data.to !== getContract(chainId, "OpenOceanRouter")) {
      throw new Error(`Invalid OpenOceanRouter address: ${parsed.data.to}`);
    }

    return {
      to: parsed.data.to as string,
      data: parsed.data.data as string,
      value: BigInt(parsed.data.value),
      estimatedGas: BigInt(parsed.data.estimatedGas),
      usdIn: numberToBigint(parseFloat(parsed.data.inToken.volume), USD_DECIMALS),
      usdOut: numberToBigint(parseFloat(parsed.data.outToken.volume), USD_DECIMALS),
      priceIn: numberToBigint(parseFloat(parsed.data.inToken.usd), USD_DECIMALS),
      priceOut: numberToBigint(parseFloat(parsed.data.outToken.usd), USD_DECIMALS),
      gasPrice: BigInt(parsed.data.gasPrice),
      amountIn,
      outputAmount: BigInt(parsed.data.minOutAmount),
    };
  } catch (e) {
    e.message += ` URL: ${url.replace(receiverAddress, "...")}`;
    metrics.pushError(e, "externalSwap.getOpenOceanTxnData");
    return undefined;
  }
}

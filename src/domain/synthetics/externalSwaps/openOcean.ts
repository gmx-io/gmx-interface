import { DISABLED_OPEN_OCEAN_DEXES, getOpenOceanUrl } from "config/externalSwaps";
import { buildUrl } from "lib/buildUrl";
import { formatTokenAmount } from "lib/numbers";
import { convertTokenAddress, getToken } from "sdk/configs/tokens";

type OpenOceanQuoteResponse = {
  code: number;
  data: {
    inToken: {
      address: string;
      decimals: number;
      symbol: string;
      name: string;
      usd: string;
      volume: number;
    };
    outToken: {
      address: string;
      decimals: number;
      symbol: string;
      name: string;
      usd: string;
      volume: number;
    };
    inAmount: string;
    outAmount: string;
    estimatedGas: string;
    price_impact: string;
  };
};

export async function getOpenOceanPriceQuote({
  chainId,
  fromTokenAddress,
  toTokenAddress,
  fromTokenAmount,
  gasPrice,
  slippage,
}: {
  chainId: number;
  fromTokenAddress: string;
  toTokenAddress: string;
  fromTokenAmount: bigint;
  gasPrice: bigint;
  slippage: number;
}) {
  const disabledDexIds = DISABLED_OPEN_OCEAN_DEXES[chainId] ?? [];

  const fromToken = getToken(chainId, fromTokenAddress);

  const url = buildUrl(getOpenOceanUrl(chainId), "/quote", {
    inTokenAddress: convertTokenAddress(chainId, fromTokenAddress, "wrapped"),
    outTokenAddress: convertTokenAddress(chainId, toTokenAddress, "wrapped"),
    amount: formatTokenAmount(fromTokenAmount, fromToken.decimals, undefined, { displayDecimals: 8 }),
    gasPrice: gasPrice.toString(),
    slippage: slippage.toString(),
    disabledDexIds: disabledDexIds.join(","),
  });

  try {
    const res = await fetch(url);

    const parsedRes = (await res.json()) as OpenOceanQuoteResponse;

    return {
      outAmount: BigInt(parsedRes.data.outAmount),
      estimatedGas: BigInt(parsedRes.data.estimatedGas),
    };
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error("Error fetching external swap quote", e);
    return undefined;
  }
}

export async function getOpenOceanBuildTx({
  chainId,
  tokenInAddress,
  tokenOutAddress,
  tokenInAmount,
  senderAddress,
  receiverAddress,
  slippage,
}: {
  senderAddress: string;
  receiverAddress: string;
  chainId: number;
  tokenInAddress: string;
  tokenOutAddress: string;
  tokenInAmount: bigint;
  slippage: number;
}) {
  const disabledDexIds = DISABLED_OPEN_OCEAN_DEXES[chainId] ?? [];
  const tokenIn = getToken(chainId, tokenInAddress);

  const url = buildUrl(getOpenOceanUrl(chainId), "/swap_quote", {
    inTokenAddress: tokenInAddress,
    outTokenAddress: tokenOutAddress,
    amount: formatTokenAmount(tokenInAmount, tokenIn.decimals, undefined, { displayDecimals: 8 }),
    gasPrice: "0.13000000",
    slippage: slippage.toString(),
    sender: senderAddress,
    account: receiverAddress,
    disabledDexIds: disabledDexIds.join(","),
  });

  try {
    const res = await fetch(url);
    const data = await res.json();

    if (!data.data || data.code !== 200) {
      throw new Error(data.message || "Failed to build transaction");
    }

    return {
      to: data.data.to as string,
      data: data.data.data as string,
      value: BigInt(data.data.value || "0"),
      estimatedGas: BigInt(data.data.estimatedGas || "0"),
      gasPrice: BigInt(data.data.gasPrice || "0"),
      outputAmount: BigInt(data.data.outputAmount || "0"),
    };
  } catch (e) {
    return undefined;
  }
}

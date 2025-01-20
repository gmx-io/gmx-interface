import { ARBITRUM } from "config/chains";
import { buildUrl } from "lib/buildUrl";
import { formatTokenAmount } from "lib/numbers";
import { AVALANCHE } from "sdk/configs/chains";
import { getToken } from "sdk/configs/tokens";

const OPEN_OCEAN_BASE_URL = "https://open-api.openocean.finance/v3";

const OPEN_OCEAN_API_URL = {
  [ARBITRUM]: `${OPEN_OCEAN_BASE_URL}/arbitrum`,
  [AVALANCHE]: `${OPEN_OCEAN_BASE_URL}/avax`,
};

const DISABLED_OPEN_OCEAN_DEXES = {
  /**
   *  @see https://open-api.openocean.finance/v3/arbitrum/dexList
   */
  [ARBITRUM]: [8, 54],
  /**
   *  @see https://open-api.openocean.finance/v3/avax/dexList
   */
  [AVALANCHE]: [
    18, // GMX
  ],
};

export function getOpenOceanUrl(chainId: number) {
  const url = OPEN_OCEAN_API_URL[chainId];

  if (!url) {
    throw new Error("Unsupported open ocean network");
  }

  return url;
}

export async function getOpenOceanPriceQuote({
  chainId,
  tokenInAddress,
  tokenOutAddress,
  tokenInAmount,
  slippage,
}: {
  chainId: number;
  tokenInAddress: string;
  tokenOutAddress: string;
  tokenInAmount: bigint;
  gasPrice: bigint;
  slippage: number;
}) {
  const disabledDexIds = DISABLED_OPEN_OCEAN_DEXES[chainId] ?? [];

  const tokenIn = getToken(chainId, tokenInAddress);

  const url = buildUrl(getOpenOceanUrl(chainId), "/quote", {
    inTokenAddress: tokenInAddress,
    outTokenAddress: tokenOutAddress,
    amount: formatTokenAmount(tokenInAmount, tokenIn.decimals, undefined, { displayDecimals: 8 }),
    gasPrice: "1",
    slippage,
    disabledDexIds: disabledDexIds.join(","),
  });

  try {
    const res = await fetch(url);

    const parsedRes = await res.json();

    const outAmount = BigInt(parsedRes.data.outAmount);

    return {
      outAmount,
    };
  } catch (e) {
    // TODO: metrics
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

  console.log("url", url);

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

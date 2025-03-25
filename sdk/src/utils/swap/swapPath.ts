import { convertTokenAddress, getWrappedToken, NATIVE_TOKEN_ADDRESS } from "configs/tokens";
import { MarketsInfoData } from "types/markets";
import { FindSwapPath, MarketsGraph, SwapEstimator, SwapRoute } from "types/trade";

import { findAllPaths, getBestSwapPath } from "./swapRouting";
import { getSwapPathStats } from "./swapStats";
import { getSwapPathComparator } from "./swapValues";

export const getWrappedAddress = (chainId: number, address: string | undefined) => {
  return address ? convertTokenAddress(chainId, address, "wrapped") : undefined;
};

export const findAllSwapPaths = (params: {
  chainId: number;
  fromTokenAddress: string | undefined;
  toTokenAddress: string | undefined;
  marketsInfoData: MarketsInfoData;
  graph: MarketsGraph | undefined;
  wrappedFromAddress: string | undefined;
  wrappedToAddress: string | undefined;
}) => {
  const { chainId, fromTokenAddress, toTokenAddress, marketsInfoData, graph, wrappedFromAddress, wrappedToAddress } =
    params;

  if (!marketsInfoData) return undefined;

  const wrappedToken = getWrappedToken(chainId);
  const isWrap = fromTokenAddress === NATIVE_TOKEN_ADDRESS && toTokenAddress === wrappedToken.address;
  const isUnwrap = fromTokenAddress === wrappedToken.address && toTokenAddress === NATIVE_TOKEN_ADDRESS;
  const isSameToken = fromTokenAddress === toTokenAddress;

  if (!graph || !wrappedFromAddress || !wrappedToAddress || isWrap || isUnwrap || isSameToken) {
    return undefined;
  }

  return findAllPaths(marketsInfoData, graph, wrappedFromAddress, wrappedToAddress)?.sort((a, b) =>
    b.liquidity - a.liquidity > 0 ? 1 : -1
  );
};

export const createFindSwapPath = (params: {
  chainId: number;
  fromTokenAddress: string | undefined;
  toTokenAddress: string | undefined;
  marketsInfoData: MarketsInfoData | undefined;
  estimator: SwapEstimator | undefined;
  allPaths: SwapRoute[] | undefined;
}): FindSwapPath => {
  const { chainId, fromTokenAddress, toTokenAddress, marketsInfoData, estimator, allPaths } = params;
  const wrappedToken = getWrappedToken(chainId);

  const findSwapPath: FindSwapPath = (usdIn: bigint, opts: { order?: ("liquidity" | "length")[] }) => {
    if (!allPaths?.length || !estimator || !marketsInfoData || !fromTokenAddress) {
      return undefined;
    }

    let swapPath: string[] | undefined = undefined;
    const sortedPaths = opts.order ? [...allPaths].sort(getSwapPathComparator(opts.order ?? [])) : allPaths;

    if (opts.order) {
      swapPath = sortedPaths[0].path;
    } else {
      swapPath = getBestSwapPath(allPaths, usdIn, estimator);
    }

    if (!swapPath) {
      return undefined;
    }

    return getSwapPathStats({
      marketsInfoData,
      swapPath,
      initialCollateralAddress: fromTokenAddress,
      wrappedNativeTokenAddress: wrappedToken.address,
      shouldUnwrapNativeToken: toTokenAddress === NATIVE_TOKEN_ADDRESS,
      shouldApplyPriceImpact: true,
      usdIn,
    });
  };

  return findSwapPath;
};

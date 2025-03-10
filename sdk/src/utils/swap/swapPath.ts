import { convertTokenAddress, getWrappedToken, NATIVE_TOKEN_ADDRESS } from "configs/tokens";
import { MarketsInfoData } from "types/markets";
import { createSwapEstimator, findAllPaths, getBestSwapPath, getMarketsGraph } from "./swapRouting";
import { getSwapPathStats } from "./swapStats";
import { getSwapPathComparator } from "./swapValues";
import { FindSwapPath } from "types/trade";

const getWrappedFromAddress = (chainId: number, fromTokenAddress: string | undefined) => {
  const wrappedFromAddress = fromTokenAddress ? convertTokenAddress(chainId, fromTokenAddress, "wrapped") : undefined;
  return wrappedFromAddress;
};

const getWrappedToAddress = (chainId: number, toTokenAddress: string | undefined) => {
  const wrappedToAddress = toTokenAddress ? convertTokenAddress(chainId, toTokenAddress, "wrapped") : undefined;
  return wrappedToAddress;
};

const findAllSwapPaths = (params: {
  chainId: number;
  fromTokenAddress: string | undefined;
  toTokenAddress: string | undefined;
  marketsInfoData: MarketsInfoData;
}) => {
  const { chainId, fromTokenAddress, toTokenAddress, marketsInfoData } = params;

  if (!marketsInfoData) return undefined;

  const graph = getMarketsGraph(Object.values(marketsInfoData));
  const wrappedFromAddress = getWrappedFromAddress(chainId, fromTokenAddress);
  const wrappedToAddress = getWrappedToAddress(chainId, toTokenAddress);

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
  marketsInfoData: MarketsInfoData;
}): FindSwapPath => {
  const { chainId, fromTokenAddress, toTokenAddress, marketsInfoData } = params;

  const wrappedToken = getWrappedToken(chainId);
  const allPaths = findAllSwapPaths(params);
  const estimator = createSwapEstimator(marketsInfoData);

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

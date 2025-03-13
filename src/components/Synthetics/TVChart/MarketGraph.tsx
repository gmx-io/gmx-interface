import { Fragment, memo, useMemo, useState } from "react";

import { selectChainId, selectMarketsInfoData } from "context/SyntheticsStateContext/selectors/globalSelectors";
import {
  selectTradeboxCollateralToken,
  selectTradeboxFindSwapPath,
  selectTradeboxFromToken,
  selectTradeboxFromTokenAmount,
} from "context/SyntheticsStateContext/selectors/tradeboxSelectors";
import { useSelector } from "context/SyntheticsStateContext/utils";
import { SwapPathStats, findAllPaths, getSwapPathStats } from "domain/synthetics/trade";
import { formatUsd } from "lib/numbers";
import { NATIVE_TOKEN_ADDRESS, getTokensMap, getWrappedToken } from "sdk/configs/tokens";
import { convertToUsd } from "sdk/utils/tokens";

function MarketGraph() {
  const chainId = useSelector(selectChainId);
  const marketsInfoData = useSelector(selectMarketsInfoData);
  const fromToken = useSelector(selectTradeboxFromToken);
  const fromTokenAddress = fromToken?.address;
  const toToken = useSelector(selectTradeboxCollateralToken);
  const toTokenAddress = toToken?.address;
  const amountIn = useSelector(selectTradeboxFromTokenAmount);

  const findSwapPath = useSelector(selectTradeboxFindSwapPath);

  const [excludeNonLiquidity, setExcludeNonLiquidity] = useState(false);

  const allRoutes = useMemo(() => {
    if (!marketsInfoData || !fromTokenAddress || !toTokenAddress) {
      return undefined;
    }
    return findAllPaths({ marketsInfoData, from: fromTokenAddress, to: toTokenAddress, chainId });
  }, [marketsInfoData, fromTokenAddress, toTokenAddress, chainId]);

  const tokens = useMemo(() => getTokensMap(chainId), [chainId]);

  const usdIn = useMemo(() => {
    if (amountIn === undefined || !fromToken?.decimals || fromToken?.prices.minPrice === undefined) {
      return undefined;
    }
    return convertToUsd(amountIn, fromToken.decimals, fromToken.prices.minPrice)!;
  }, [amountIn, fromToken?.decimals, fromToken?.prices.minPrice]);

  const swapPathsStats = useMemo(() => {
    if (!allRoutes || !marketsInfoData || !fromTokenAddress || usdIn === undefined) {
      return undefined;
    }

    const wrappedToken = getWrappedToken(chainId);

    return allRoutes
      ?.map((route) => {
        const stats = getSwapPathStats({
          marketsInfoData,
          swapPath: route.path,
          initialCollateralAddress: fromTokenAddress,
          wrappedNativeTokenAddress: wrappedToken.address,
          shouldUnwrapNativeToken: toTokenAddress === NATIVE_TOKEN_ADDRESS,
          shouldApplyPriceImpact: true,
          usdIn,
        });

        return stats;
      })
      .filter((r) => {
        if (r && excludeNonLiquidity && r.swapSteps.some((step) => step.isOutLiquidity || step.isOutCapacity)) {
          return false;
        }

        return r !== undefined;
      }) as SwapPathStats[];
  }, [allRoutes, chainId, excludeNonLiquidity, fromTokenAddress, marketsInfoData, toTokenAddress, usdIn]);

  const bestSwapPathKey = useMemo(() => {
    if (usdIn === undefined) {
      return undefined;
    }
    return findSwapPath(usdIn, {})?.swapPath.join(",");
  }, [findSwapPath, usdIn]);

  return (
    <div className="overflow-auto p-16">
      <div>
        {fromToken?.symbol} - {toToken?.symbol}
      </div>
      <div>{allRoutes?.length} routes</div>
      <div>L - liquidity, C - capacity</div>
      <label>
        <input
          type="checkbox"
          checked={excludeNonLiquidity}
          onChange={() => setExcludeNonLiquidity(!excludeNonLiquidity)}
        />
        Exclude insufficient liquidity or capacity routes
      </label>

      <div className="mt-16 flex flex-col gap-16">
        {swapPathsStats?.map((stats) => (
          <div key={stats.swapPath.join(",")} className="flex justify-between gap-8">
            <div className="flex grow gap-8">
              {stats.swapSteps.map((step, index) => (
                <Fragment key={step.marketAddress}>
                  {index > 0 && <div className="text-slate-100">→</div>}
                  <div>
                    <div className="flex gap-4 rounded-4 bg-slate-600 px-4 py-2">
                      <div>{tokens[step.tokenInAddress].symbol}</div>
                      <div className="text-slate-100">
                        (
                        {marketsInfoData
                          ? tokens[marketsInfoData[step.marketAddress].indexTokenAddress].symbol
                          : step.marketAddress}
                        )
                      </div>
                      <div>{tokens[step.tokenOutAddress].symbol}</div>
                    </div>
                    <div>
                      L: {step.isOutLiquidity ? "🔴" : "✔️"} C: {step.isOutCapacity ? "🔴" : "✔️"}
                    </div>
                  </div>
                </Fragment>
              ))}
            </div>
            <div>
              {bestSwapPathKey === stats.swapPath.join(",") ? "👑" : ""} {formatUsd(stats.usdOut)}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default memo(MarketGraph);

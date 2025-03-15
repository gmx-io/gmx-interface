import cx from "classnames";
import entries from "lodash/entries";
import groupBy from "lodash/groupBy";
import { Fragment, memo, useCallback, useMemo, useState } from "react";

import { selectChainId, selectMarketsInfoData } from "context/SyntheticsStateContext/selectors/globalSelectors";
import {
  selectDebugSwapMarketsConfig,
  selectSetDebugSwapMarketsConfig,
} from "context/SyntheticsStateContext/selectors/settingsSelectors";
import { selectMarketAdjacencyGraph } from "context/SyntheticsStateContext/selectors/tradeSelectors";
import {
  selectTradeboxFindSwapPath,
  selectTradeboxFromToken,
  selectTradeboxFromTokenAmount,
  selectTradeboxSelectSwapToToken,
} from "context/SyntheticsStateContext/selectors/tradeboxSelectors";
import { useSelector } from "context/SyntheticsStateContext/utils";
import { getMarketsForTokenPair, getTokenSwapPaths } from "domain/synthetics/trade";
import { formatUsd } from "lib/numbers";
import { NATIVE_TOKEN_ADDRESS, convertTokenAddress, getTokensMap, getWrappedToken } from "sdk/configs/tokens";
import { getMarketFullName } from "sdk/utils/markets";
import { convertToUsd } from "sdk/utils/tokens";

function DebugMarketGraph() {
  const chainId = useSelector(selectChainId);
  const marketsInfoData = useSelector(selectMarketsInfoData);
  const fromToken = useSelector(selectTradeboxFromToken);
  const fromTokenAddress = fromToken?.address ? convertTokenAddress(chainId, fromToken.address, "wrapped") : undefined;
  const toToken = useSelector(selectTradeboxSelectSwapToToken);
  const toTokenWrappedAddress = toToken?.address ? convertTokenAddress(chainId, toToken.address, "wrapped") : undefined;
  const amountIn = useSelector(selectTradeboxFromTokenAmount);
  const findSwapPath = useSelector(selectTradeboxFindSwapPath);
  const marketAdjacencyGraph = useSelector(selectMarketAdjacencyGraph);
  const debugSwapMarketsConfig = useSelector(selectDebugSwapMarketsConfig);
  const setDebugSwapMarketsConfig = useSelector(selectSetDebugSwapMarketsConfig);

  const [excludeNonLiquidity, setExcludeNonLiquidity] = useState(false);
  const [hideDisabledMarkets, setHideDisabledMarkets] = useState(false);
  const [hideDisabledPaths, setHideDisabledPaths] = useState(false);
  const wrappedToken = getWrappedToken(chainId);
  const isWrap = fromToken?.address === NATIVE_TOKEN_ADDRESS && toTokenWrappedAddress === wrappedToken.address;
  const isUnwrap = fromToken?.address === wrappedToken.address && toTokenWrappedAddress === NATIVE_TOKEN_ADDRESS;
  const isSameToken = fromToken?.address !== undefined && fromToken?.address === toToken?.address;

  const allRouteTypes = useMemo(() => {
    return fromTokenAddress && toTokenWrappedAddress
      ? getTokenSwapPaths(chainId, fromTokenAddress, toTokenWrappedAddress)
      : undefined;
  }, [chainId, fromTokenAddress, toTokenWrappedAddress]);

  const tokens = useMemo(() => getTokensMap(chainId), [chainId]);

  const usdIn = useMemo(() => {
    if (amountIn === undefined || !fromToken?.decimals || fromToken?.prices.minPrice === undefined) {
      return undefined;
    }
    return convertToUsd(amountIn, fromToken.decimals, fromToken.prices.minPrice)!;
  }, [amountIn, fromToken?.decimals, fromToken?.prices.minPrice]);

  const swapPath = useMemo(() => {
    if (usdIn === undefined) {
      return undefined;
    }
    return findSwapPath(usdIn);
  }, [findSwapPath, usdIn]);

  const handleToggleMarket = useCallback(
    (marketAddress: string) => {
      let newVal: string[];
      if (!debugSwapMarketsConfig?.disabledSwapMarkets) {
        newVal = [marketAddress];
      } else {
        newVal = debugSwapMarketsConfig.disabledSwapMarkets.includes(marketAddress)
          ? debugSwapMarketsConfig.disabledSwapMarkets.filter((m) => m !== marketAddress)
          : [...debugSwapMarketsConfig.disabledSwapMarkets, marketAddress];
      }
      setDebugSwapMarketsConfig({
        ...debugSwapMarketsConfig,
        disabledSwapMarkets: newVal,
      });
    },
    [debugSwapMarketsConfig, setDebugSwapMarketsConfig]
  );

  const relatedMarkets = useMemo<{ market: string; name: string }[]>(() => {
    if (!fromTokenAddress || !toTokenWrappedAddress || !allRouteTypes) {
      return [];
    }

    const relatedMarkets = new Set<string>();

    for (const routeType of allRouteTypes) {
      for (let hopIndex = 0; hopIndex <= routeType.length; hopIndex++) {
        const hopFromTokenAddress = hopIndex === 0 ? fromTokenAddress : routeType[hopIndex - 1];
        const hopToTokenAddress = hopIndex === routeType.length ? toTokenWrappedAddress : routeType[hopIndex];

        const hopMarkets = getMarketsForTokenPair(marketAdjacencyGraph, hopFromTokenAddress, hopToTokenAddress);

        for (const market of hopMarkets) {
          relatedMarkets.add(market);
        }
      }
    }

    return Array.from(relatedMarkets)
      .map((market) => ({
        market,
        name: marketsInfoData ? getMarketFullName(marketsInfoData[market]) : market,
      }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [allRouteTypes, fromTokenAddress, marketAdjacencyGraph, marketsInfoData, toTokenWrappedAddress]);

  if (!fromTokenAddress) {
    return <div className="flex justify-center gap-8 overflow-auto p-16">No from token address</div>;
  }
  if (!toTokenWrappedAddress) {
    return <div className="flex justify-center gap-8 overflow-auto p-16">No to token address</div>;
  }
  if (isWrap) {
    return <div className="flex justify-center gap-8 overflow-auto p-16">Its just a wrap</div>;
  }
  if (isUnwrap) {
    return <div className="flex justify-center gap-8 overflow-auto p-16">Its just an unwrap</div>;
  }
  if (isSameToken) {
    return <div className="flex justify-center gap-8 overflow-auto p-16">Its a same token</div>;
  }

  return (
    <div className="flex flex-col gap-8 overflow-auto p-16">
      <div>
        {fromToken?.symbol} - {toToken?.symbol}
      </div>
      <div>{allRouteTypes?.length} route types</div>
      <div>
        Click on <span className="rounded-4 bg-slate-600 px-4 py-2">market label</span> to toggle its filtering. Click
        on the checkbox on the left to disable the specific path. To use this debug tool on swap, stay on MARKET GRAPH
        tab and switch to swap. Settings are being saved in local storage, don't forget to clear it when you are done.
      </div>
      <label className="flex items-center gap-8">
        <input
          type="checkbox"
          checked={excludeNonLiquidity}
          onChange={() => setExcludeNonLiquidity(!excludeNonLiquidity)}
        />
        Exclude insufficient liquidity or capacity routes
      </label>
      <label className="flex items-center gap-8">
        <input
          type="checkbox"
          checked={hideDisabledMarkets}
          onChange={() => setHideDisabledMarkets(!hideDisabledMarkets)}
        />
        Hide routes with disabled markets
      </label>
      <label className="flex items-center gap-8">
        <input type="checkbox" checked={hideDisabledPaths} onChange={() => setHideDisabledPaths(!hideDisabledPaths)} />
        Hide routes with disabled paths
      </label>

      <div>L - liquidity, C - capacity</div>

      {!allRouteTypes?.length && <div>No routes</div>}
      {allRouteTypes?.map((routeType) => (
        <div key={routeType.toString()} className="flex gap-8">
          <div>{tokens[fromTokenAddress].symbol}</div>

          <div>
            → (
            {
              getMarketsForTokenPair(
                marketAdjacencyGraph,
                fromTokenAddress,
                routeType.length === 0 ? toTokenWrappedAddress : routeType[0]
              ).length
            }{" "}
            possibilities) →
          </div>

          {routeType.map((tokenAddress, index) => (
            <Fragment key={tokenAddress}>
              <div>{tokens[tokenAddress].symbol}</div>
              {index < routeType.length - 1 && (
                <div>
                  → ({getMarketsForTokenPair(marketAdjacencyGraph, fromTokenAddress, tokenAddress).length}{" "}
                  possibilities) →
                </div>
              )}
            </Fragment>
          ))}

          {routeType.length > 0 && (
            <div>
              → (
              {
                getMarketsForTokenPair(marketAdjacencyGraph, routeType[routeType.length - 1], toTokenWrappedAddress)
                  .length
              }{" "}
              possibilities) →
            </div>
          )}

          <div>{tokens[toTokenWrappedAddress].symbol}</div>

          <div>
            {[fromTokenAddress, ...routeType, toTokenWrappedAddress].reduce((acc, tokenAddress, index, arr) => {
              if (index === arr.length - 1) {
                return acc;
              }
              return acc * getMarketsForTokenPair(marketAdjacencyGraph, tokenAddress, arr[index + 1]).length;
            }, 1)}{" "}
            possibilities in total
          </div>
        </div>
      ))}

      {swapPath && (
        <div className="flex flex-col gap-8">
          <div>Best swap path</div>
          <div className="flex justify-between gap-8">
            <div className="flex grow items-center gap-8">
              {swapPath.swapSteps.map((step, index) => (
                <Fragment key={`${step.marketAddress}-${index}`}>
                  {index > 0 && <div className="text-slate-100">→</div>}
                  <div>
                    <div className="flex items-center gap-4">
                      <div className="text-body-small text-slate-100">{tokens[step.tokenInAddress].symbol}</div>
                      <button
                        className={cx(
                          "flex cursor-pointer gap-4 rounded-4 px-4 py-2",
                          debugSwapMarketsConfig?.disabledSwapMarkets?.includes(step.marketAddress)
                            ? "bg-red-700"
                            : "bg-slate-600"
                        )}
                        title="Click to toggle market"
                        onClick={() => handleToggleMarket(step.marketAddress)}
                      >
                        {marketsInfoData ? getMarketFullName(marketsInfoData[step.marketAddress]) : step.marketAddress}
                      </button>
                      <div className="text-body-small text-slate-100">{tokens[step.tokenOutAddress].symbol}</div>
                    </div>
                    <div>
                      L: {step.isOutLiquidity ? "🔴" : "✔️"} C: {step.isOutCapacity ? "🔴" : "✔️"}
                    </div>
                  </div>
                </Fragment>
              ))}
            </div>
            <div>{formatUsd(swapPath.usdOut)}</div>
          </div>
        </div>
      )}

      <div className="flex items-start justify-between gap-8 rounded-4 border border-red-700/50 p-8">
        <div className="flex grow flex-col gap-8">
          <div>Disabled markets</div>
          <div className="flex flex-wrap gap-8">
            {!debugSwapMarketsConfig?.disabledSwapMarkets?.length ? (
              <span className="py-2 text-slate-100">No disabled markets</span>
            ) : (
              debugSwapMarketsConfig?.disabledSwapMarkets?.map((m) => (
                <button
                  key={m}
                  className="flex cursor-pointer gap-4 rounded-4 bg-slate-600 px-4 py-2"
                  onClick={() => handleToggleMarket(m)}
                >
                  {marketsInfoData ? getMarketFullName(marketsInfoData[m]) : m}
                </button>
              ))
            )}
          </div>
        </div>
        <button className="rounded-4 bg-slate-600 px-8 py-6" onClick={() => setDebugSwapMarketsConfig({})}>
          Clear debug overrides
        </button>
      </div>

      <div className="flex flex-col gap-8">
        <div>Related markets</div>
        <div className="flex gap-8 overflow-x-scroll">
          {entries(groupBy(relatedMarkets, (m) => m.name[0])).map(([letter, markets], index) => (
            <div key={letter} className="flex min-w-[220px] flex-col gap-8">
              <div
                className="text-slate-100"
                // eslint-disable-next-line react-perf/jsx-no-new-object-as-prop
                style={{
                  gridColumn: `${index + 1} / span 1`,
                }}
              >
                {letter}
              </div>
              {markets.map((m) => (
                <div
                  key={m.market}
                  className="rounded-4 bg-slate-600 px-4 py-2"
                  // eslint-disable-next-line react-perf/jsx-no-new-object-as-prop
                  style={{
                    gridColumn: `${index + 1} / span 1`,
                  }}
                  title="Click to toggle market"
                  onClick={() => handleToggleMarket(m.market)}
                >
                  {m.name}
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default memo(DebugMarketGraph);

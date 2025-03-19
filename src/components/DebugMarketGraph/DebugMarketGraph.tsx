import cx from "classnames";
import entries from "lodash/entries";
import groupBy from "lodash/groupBy";
import { Fragment, memo, useCallback, useMemo } from "react";

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
import { getMarketsForTokenPair, getTokenSwapPathsForTokenPairPrebuilt } from "domain/synthetics/trade";
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

  const isUsingManualPath = debugSwapMarketsConfig?.manualPath !== undefined;

  const wrappedToken = getWrappedToken(chainId);
  const isWrap = fromToken?.address === NATIVE_TOKEN_ADDRESS && toTokenWrappedAddress === wrappedToken.address;
  const isUnwrap = fromToken?.address === wrappedToken.address && toTokenWrappedAddress === NATIVE_TOKEN_ADDRESS;
  const isSameToken = fromToken?.address !== undefined && fromToken?.address === toToken?.address;

  const allRouteTypes = useMemo(() => {
    return fromTokenAddress && toTokenWrappedAddress
      ? getTokenSwapPathsForTokenPairPrebuilt(chainId, fromTokenAddress, toTokenWrappedAddress)
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
    if (isUsingManualPath) {
      return Object.values(marketsInfoData || {})
        .map((market) => ({
          market: market.marketTokenAddress,
          name: getMarketFullName(market),
        }))
        .sort((a, b) => a.name.localeCompare(b.name));
    }

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
        name: marketsInfoData && marketsInfoData[market] ? getMarketFullName(marketsInfoData[market]) : market,
      }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [
    allRouteTypes,
    fromTokenAddress,
    isUsingManualPath,
    marketAdjacencyGraph,
    marketsInfoData,
    toTokenWrappedAddress,
  ]);

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
        Click on <span className="rounded-4 bg-slate-600 px-4 py-2">market label</span> to toggle its filtering. To use
        this debug tool on swap, stay on MARKET GRAPH tab and switch to swap. Settings are being saved in local storage,
        don't forget to clear it when you are done.
      </div>

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

      <label className="flex items-center gap-8">
        <input
          type="checkbox"
          checked={isUsingManualPath}
          onChange={(e) =>
            setDebugSwapMarketsConfig({ ...debugSwapMarketsConfig, manualPath: e.target.checked ? [] : undefined })
          }
        />
        Use manual path
      </label>

      {swapPath && !isUsingManualPath && (
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

      {isUsingManualPath && (
        <div className="flex flex-col gap-8">
          <div>Manual swap path (click on market to remove it)</div>
          <div className="flex justify-between gap-8">
            <div className="flex grow flex-wrap items-center gap-8">
              {debugSwapMarketsConfig?.manualPath?.map((marketAddress, index, arr) => (
                <Fragment key={`${marketAddress}-${index}`}>
                  <div
                    className="flex cursor-pointer items-center gap-4 rounded-4 bg-slate-600 px-4 py-2"
                    onClick={() =>
                      setDebugSwapMarketsConfig({
                        ...debugSwapMarketsConfig,
                        manualPath: debugSwapMarketsConfig?.manualPath?.filter((_, i) => i !== index),
                      })
                    }
                  >
                    {marketsInfoData ? getMarketFullName(marketsInfoData[marketAddress]) : marketAddress}
                  </div>
                  {index < arr.length - 1 && <div className="text-slate-100">→</div>}
                </Fragment>
              ))}
            </div>
            <div>{swapPath ? formatUsd(swapPath.usdOut) : "N/A"}</div>
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
        {isUsingManualPath ? <div>All markets</div> : <div>Related markets</div>}
        <div className="flex gap-8 overflow-x-scroll">
          {entries(groupBy(relatedMarkets, (m) => m.name[0]))
            .sort((a, b) => a[0].localeCompare(b[0]))
            .map(([letter, markets]) => (
              <div key={letter} className="flex flex-col gap-8">
                <div className="text-slate-100">{letter}</div>
                {markets
                  .sort((a, b) => a.name.localeCompare(b.name))
                  .map((m) => (
                    <div key={m.market} className="flex items-center gap-4">
                      <div
                        title="Click to toggle market"
                        onClick={() => handleToggleMarket(m.market)}
                        className="min-w-[220px] rounded-4 bg-slate-600 px-4 py-2"
                      >
                        {m.name}
                      </div>
                      {isUsingManualPath && (
                        <button
                          className="rounded-4 bg-slate-600 px-4 py-2"
                          onClick={() =>
                            setDebugSwapMarketsConfig({
                              ...debugSwapMarketsConfig,
                              manualPath: [...(debugSwapMarketsConfig?.manualPath || []), m.market],
                            })
                          }
                        >
                          Add
                        </button>
                      )}
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

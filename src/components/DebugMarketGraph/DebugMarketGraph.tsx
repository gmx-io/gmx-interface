import cx from "classnames";
import { Fragment, memo, useCallback, useMemo, useState } from "react";

import { selectChainId, selectMarketsInfoData } from "context/SyntheticsStateContext/selectors/globalSelectors";
import {
  selectDebugSwapMarketsConfig,
  selectSetDebugSwapMarketsConfig,
} from "context/SyntheticsStateContext/selectors/settingsSelectors";
import {
  selectTradeboxCollateralToken,
  selectTradeboxFindSwapPath,
  selectTradeboxFromToken,
  selectTradeboxFromTokenAmount,
  selectTradeboxToToken,
  selectTradeboxTradeFlags,
} from "context/SyntheticsStateContext/selectors/tradeboxSelectors";
import { useSelector } from "context/SyntheticsStateContext/utils";
import { SwapPathStats, getMarketsForTokenPair, getSwapPathStats, getTokenSwapRoutes } from "domain/synthetics/trade";
import { formatUsd } from "lib/numbers";
import { NATIVE_TOKEN_ADDRESS, convertTokenAddress, getTokensMap, getWrappedToken } from "sdk/configs/tokens";
import { getMarketFullName } from "sdk/utils/markets";
import { convertToUsd } from "sdk/utils/tokens";
import { bigMath } from "sdk/utils/bigmath";
import { USD_DECIMALS } from "config/factors";

function DebugMarketGraph() {
  const chainId = useSelector(selectChainId);
  const tradeFlags = useSelector(selectTradeboxTradeFlags);
  const marketsInfoData = useSelector(selectMarketsInfoData);
  const fromToken = useSelector(selectTradeboxFromToken);
  const fromTokenAddress = fromToken?.address ? convertTokenAddress(chainId, fromToken.address, "wrapped") : undefined;
  const collateralToken = useSelector(selectTradeboxCollateralToken);
  const toSwapToken = useSelector(selectTradeboxToToken);
  const toToken = tradeFlags.isPosition ? collateralToken : toSwapToken;
  const toTokenAddress = toToken?.address ? convertTokenAddress(chainId, toToken.address, "wrapped") : undefined;
  const amountIn = useSelector(selectTradeboxFromTokenAmount);
  const findSwapPath = useSelector(selectTradeboxFindSwapPath);
  const [excludeNonLiquidity, setExcludeNonLiquidity] = useState(false);
  const [hideDisabledMarkets, setHideDisabledMarkets] = useState(false);
  const [hideDisabledPaths, setHideDisabledPaths] = useState(false);
  const debugSwapMarketsConfig = useSelector(selectDebugSwapMarketsConfig);
  const setDebugSwapMarketsConfig = useSelector(selectSetDebugSwapMarketsConfig);
  const wrappedToken = getWrappedToken(chainId);
  const isWrap = fromToken?.address === NATIVE_TOKEN_ADDRESS && toTokenAddress === wrappedToken.address;
  const isUnwrap = fromToken?.address === wrappedToken.address && toTokenAddress === NATIVE_TOKEN_ADDRESS;
  const isSameToken = fromToken?.address !== undefined && fromToken?.address === toToken?.address;
  // const allRoutes = useMemo(() => {
  //   if (!marketsInfoData || !fromTokenAddress || !toTokenAddress) {
  //     return undefined;
  //   }
  //   // return findAllPaths({ marketsInfoData, from: fromTokenAddress, to: toTokenAddress, chainId });
  // }, [marketsInfoData, fromTokenAddress, toTokenAddress, chainId]);

  const allRouteTypes = useMemo(() => {
    return fromTokenAddress && toTokenAddress
      ? getTokenSwapRoutes(chainId, fromTokenAddress, toTokenAddress)
      : undefined;
  }, [chainId, fromTokenAddress, toTokenAddress]);

  const tokens = useMemo(() => getTokensMap(chainId), [chainId]);

  const usdIn = useMemo(() => {
    if (amountIn === undefined || !fromToken?.decimals || fromToken?.prices.minPrice === undefined) {
      return undefined;
    }
    return convertToUsd(amountIn, fromToken.decimals, fromToken.prices.minPrice)!;
  }, [amountIn, fromToken?.decimals, fromToken?.prices.minPrice]);
  // const swapPathsStats = useMemo(() => {
  //   if (!allRoutes || !marketsInfoData || !fromTokenAddress || usdIn === undefined) {
  //     return undefined;
  //   }
  //   const wrappedToken = getWrappedToken(chainId);
  //   return allRoutes
  //     ?.map((route) => {
  //       const stats = getSwapPathStats({
  //         marketsInfoData,
  //         swapPath: route.path,
  //         initialCollateralAddress: fromTokenAddress,
  //         wrappedNativeTokenAddress: wrappedToken.address,
  //         shouldUnwrapNativeToken: toTokenAddress === NATIVE_TOKEN_ADDRESS,
  //         shouldApplyPriceImpact: true,
  //         usdIn,
  //       });
  //       return stats;
  //     })
  //     .filter((r) => {
  //       if (!r) {
  //         return false;
  //       }
  //       if (excludeNonLiquidity && r.swapSteps.some((step) => step.isOutLiquidity || step.isOutCapacity)) {
  //         return false;
  //       }
  //       let match = true;
  //       if (hideDisabledMarkets && debugSwapMarketsConfig.disabledSwapMarkets) {
  //         const hasDisabledMarkets = r?.swapPath.some((marketAddress) =>
  //           debugSwapMarketsConfig.disabledSwapMarkets!.includes(marketAddress)
  //         );
  //         match = match && !hasDisabledMarkets;
  //       }
  //       if (hideDisabledPaths && debugSwapMarketsConfig.disabledPaths) {
  //         const hasDisabledPath = debugSwapMarketsConfig.disabledPaths.some(
  //           (p) => p.toString() === r?.swapPath.toString()
  //         );
  //         match = match && !hasDisabledPath;
  //       }
  //       return match;
  //     })
  //     .sort((a, b) => {
  //       if (a!.usdOut === b!.usdOut) {
  //         return 0;
  //       }
  //       return a!.usdOut > b!.usdOut ? -1 : 1;
  //     }) as SwapPathStats[];
  // }, [
  //   allRoutes,
  //   marketsInfoData,
  //   fromTokenAddress,
  //   usdIn,
  //   chainId,
  //   toTokenAddress,
  //   excludeNonLiquidity,
  //   hideDisabledMarkets,
  //   debugSwapMarketsConfig.disabledSwapMarkets,
  //   debugSwapMarketsConfig.disabledPaths,
  //   hideDisabledPaths,
  // ]);

  const roughUsdIn = usdIn ? bigMath.divRound(usdIn, 10n ** BigInt(USD_DECIMALS)) * 10n ** BigInt(USD_DECIMALS) : 0n;
  const swapPath = useMemo(() => {
    if (usdIn === undefined) {
      return undefined;
    }
    return findSwapPath(usdIn, {});
    // Safety: usdIn changes even when price is only slightly changed.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [findSwapPath, roughUsdIn]);

  const handleToggleMarket = useCallback(
    (marketAddress: string) => {
      let newVal: string[];
      if (!debugSwapMarketsConfig.disabledSwapMarkets) {
        newVal = [marketAddress];
      } else {
        newVal = debugSwapMarketsConfig.disabledSwapMarkets.includes(marketAddress)
          ? debugSwapMarketsConfig.disabledSwapMarkets.filter((m) => m !== marketAddress)
          : [...debugSwapMarketsConfig.disabledSwapMarkets, marketAddress];
      }
      setDebugSwapMarketsConfig({
        disabledPaths: [],
        ...debugSwapMarketsConfig,
        disabledSwapMarkets: newVal,
      });
    },
    [debugSwapMarketsConfig, setDebugSwapMarketsConfig]
  );
  const handleTogglePath = useCallback(
    (path: string[]) => {
      if (!debugSwapMarketsConfig.disabledPaths) {
        setDebugSwapMarketsConfig({
          disabledSwapMarkets: [],
          ...debugSwapMarketsConfig,
          disabledPaths: [path],
        });
        return;
      }
      let index = debugSwapMarketsConfig.disabledPaths.findIndex((p) => p.toString() === path.toString());
      if (index === -1) {
        setDebugSwapMarketsConfig({
          disabledSwapMarkets: [],
          ...debugSwapMarketsConfig,
          disabledPaths: [...debugSwapMarketsConfig.disabledPaths, path],
        });
      } else {
        const newPaths = [...debugSwapMarketsConfig.disabledPaths];
        newPaths.splice(index, 1);
        setDebugSwapMarketsConfig({
          disabledSwapMarkets: [],
          ...debugSwapMarketsConfig,
          disabledPaths: newPaths,
        });
      }
    },
    [debugSwapMarketsConfig, setDebugSwapMarketsConfig]
  );
  const disabledPathsStr = useMemo(() => {
    if (!debugSwapMarketsConfig.disabledPaths) {
      return [];
    }
    return debugSwapMarketsConfig.disabledPaths.map((p) => p.toString());
  }, [debugSwapMarketsConfig.disabledPaths]);
  if (!fromTokenAddress) {
    return <div className="flex justify-center gap-8 overflow-auto p-16">No from token address</div>;
  }
  if (!toTokenAddress) {
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
      <div className="flex items-start justify-between gap-8 rounded-4 border border-red-700/50 p-8">
        <div className="flex grow flex-col gap-8">
          <div>Disabled markets</div>
          <div className="flex flex-wrap gap-8">
            {!debugSwapMarketsConfig.disabledSwapMarkets?.length ? (
              <span className="py-2 text-slate-100">No disabled markets</span>
            ) : (
              debugSwapMarketsConfig.disabledSwapMarkets?.map((m) => (
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
          <div>Disabled paths</div>
          <div className="flex flex-wrap gap-8">
            {!debugSwapMarketsConfig.disabledPaths?.length ? (
              <span className="py-2 text-slate-100">No disabled paths</span>
            ) : (
              debugSwapMarketsConfig.disabledPaths?.map((p) => (
                <button
                  key={p.toString()}
                  className="flex cursor-pointer gap-4 rounded-4 bg-slate-600 px-4 py-2"
                  onClick={() => handleTogglePath(p)}
                >
                  {p.map((m) => (marketsInfoData ? getMarketFullName(marketsInfoData[m]) : m)).join(" → ")}
                </button>
              ))
            )}
          </div>
        </div>
        <button className="rounded-4 bg-slate-600 px-8 py-6" onClick={() => setDebugSwapMarketsConfig({})}>
          Clear debug overrides
        </button>
      </div>
      <div>L - liquidity, C - capacity</div>
      {/* <div className="flex flex-col "> */}
      {/* {swapPathsStats?.map((stats) => (
          <div
            key={stats.swapPath.toString()}
            className={cx(
              "flex justify-between gap-8 rounded-4 py-8",
              disabledPathsStr.includes(stats.swapPath.toString()) && "bg-red-700"
            )}
          >
            <div className="flex grow items-center gap-8">
              <label>
                <input
                  type="checkbox"
                  checked={disabledPathsStr.includes(stats.swapPath.toString())}
                  onChange={() => handleTogglePath(stats.swapPath)}
                />
              </label>
              {stats.swapSteps.map((step, index) => (
                <Fragment key={step.marketAddress}>
                  {index > 0 && <div className="text-slate-100">→</div>}
                  <div>
                    <button
                      className={cx(
                        "flex cursor-pointer gap-4 rounded-4 px-4 py-2",
                        debugSwapMarketsConfig.disabledSwapMarkets?.includes(step.marketAddress)
                          ? "bg-red-700"
                          : "bg-slate-600"
                      )}
                      title="Click to toggle market"
                      onClick={() => handleToggleMarket(step.marketAddress)}
                    >
                      <div>{tokens[step.tokenInAddress].symbol}</div>
                      <div className="text-slate-100">
                        (
                        {marketsInfoData
                          ? tokens[marketsInfoData[step.marketAddress].indexTokenAddress].symbol
                          : step.marketAddress}
                        )
                      </div>
                      <div>{tokens[step.tokenOutAddress].symbol}</div>
                    </button>
                    <div>
                      L: {step.isOutLiquidity ? "🔴" : "✔️"} C: {step.isOutCapacity ? "🔴" : "✔️"}
                    </div>
                  </div>
                </Fragment>
              ))}
            </div>
            <div>
              {bestSwapPathKey === stats.swapPath.toString() ? "👑" : ""} {formatUsd(stats.usdOut)}
            </div>
          </div>
        ))} */}

      {!allRouteTypes?.length && <div>No routes</div>}
      {allRouteTypes?.map((routeType) => (
        <div key={routeType.toString()} className="flex gap-8">
          {/* starting token name is always from token name. its not included in the path */}
          <div>{tokens[fromTokenAddress].symbol}</div>

          {/* arrow */}
          <div>
            → (
            {
              getMarketsForTokenPair(chainId, fromTokenAddress, routeType.length === 0 ? toTokenAddress : routeType[0])
                .length
            }{" "}
            possibilities) →
          </div>

          {routeType.map((tokenAddress, index) => (
            <Fragment key={tokenAddress}>
              <div>{tokens[tokenAddress].symbol}</div>
              {index < routeType.length - 1 && (
                <div>→ ({getMarketsForTokenPair(chainId, fromTokenAddress, tokenAddress).length} possibilities) →</div>
              )}
            </Fragment>
          ))}

          {routeType.length > 0 && (
            <div>
              → ({getMarketsForTokenPair(chainId, routeType[routeType.length - 1], toTokenAddress).length}{" "}
              possibilities) →
            </div>
          )}

          {/* last token name is always to token name */}
          <div>{tokens[toTokenAddress].symbol}</div>

          <div>
            {/* total number of possibilies */}
            {[fromTokenAddress, ...routeType, toTokenAddress].reduce((acc, tokenAddress, index, arr) => {
              if (index === arr.length - 1) {
                return acc;
              }
              return acc * getMarketsForTokenPair(chainId, tokenAddress, arr[index + 1]).length;
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
                    <button
                      className={cx(
                        "flex cursor-pointer gap-4 rounded-4 px-4 py-2",
                        debugSwapMarketsConfig.disabledSwapMarkets?.includes(step.marketAddress)
                          ? "bg-red-700"
                          : "bg-slate-600"
                      )}
                      title="Click to toggle market"
                      onClick={() => handleToggleMarket(step.marketAddress)}
                    >
                      <div>{tokens[step.tokenInAddress].symbol}</div>
                      <div className="text-slate-100">
                        (
                        {marketsInfoData
                          ? tokens[marketsInfoData[step.marketAddress].indexTokenAddress].symbol
                          : step.marketAddress}
                        )
                      </div>
                      <div>{tokens[step.tokenOutAddress].symbol}</div>
                    </button>
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
    </div>
  );
}

export default memo(DebugMarketGraph);

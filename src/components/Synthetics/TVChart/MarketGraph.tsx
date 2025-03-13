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
} from "context/SyntheticsStateContext/selectors/tradeboxSelectors";
import { useSelector } from "context/SyntheticsStateContext/utils";
import { SwapPathStats, findAllPaths, getSwapPathStats } from "domain/synthetics/trade";
import { formatUsd } from "lib/numbers";
import { NATIVE_TOKEN_ADDRESS, getTokensMap, getWrappedToken } from "sdk/configs/tokens";
import { getMarketFullName } from "sdk/utils/markets";
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
  const [hideDisabledMarkets, setHideDisabledMarkets] = useState(false);
  const [hideDisabledPaths, setHideDisabledPaths] = useState(false);
  const debugSwapMarketsConfig = useSelector(selectDebugSwapMarketsConfig);
  const setDebugSwapMarketsConfig = useSelector(selectSetDebugSwapMarketsConfig);

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
        if (!r) {
          return false;
        }
        if (excludeNonLiquidity && r.swapSteps.some((step) => step.isOutLiquidity || step.isOutCapacity)) {
          return false;
        }

        let match = true;

        if (hideDisabledMarkets && debugSwapMarketsConfig.disabledSwapMarkets) {
          const hasDisabledMarkets = r?.swapPath.some((marketAddress) =>
            debugSwapMarketsConfig.disabledSwapMarkets!.includes(marketAddress)
          );
          match = match && !hasDisabledMarkets;
        }

        if (hideDisabledPaths && debugSwapMarketsConfig.disabledPaths) {
          const hasDisabledPath = debugSwapMarketsConfig.disabledPaths.some(
            (p) => p.toString() === r?.swapPath.toString()
          );
          match = match && !hasDisabledPath;
        }

        return match;
      }) as SwapPathStats[];
  }, [
    allRoutes,
    marketsInfoData,
    fromTokenAddress,
    usdIn,
    chainId,
    toTokenAddress,
    excludeNonLiquidity,
    hideDisabledMarkets,
    debugSwapMarketsConfig.disabledSwapMarkets,
    debugSwapMarketsConfig.disabledPaths,
    hideDisabledPaths,
  ]);

  const bestSwapPathKey = useMemo(() => {
    if (usdIn === undefined) {
      return undefined;
    }
    return findSwapPath(usdIn, {})?.swapPath.join(",");
  }, [findSwapPath, usdIn]);

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

  return (
    <div className="flex flex-col gap-8 overflow-auto p-16">
      <div>
        {fromToken?.symbol} - {toToken?.symbol}
      </div>
      <div>{allRoutes?.length} routes</div>
      <div>Click on market to toggle it</div>
      <div>L - liquidity, C - capacity</div>
      <label>
        <input
          type="checkbox"
          checked={excludeNonLiquidity}
          onChange={() => setExcludeNonLiquidity(!excludeNonLiquidity)}
        />
        Exclude insufficient liquidity or capacity routes
      </label>

      <label>
        <input
          type="checkbox"
          checked={hideDisabledMarkets}
          onChange={() => setHideDisabledMarkets(!hideDisabledMarkets)}
        />
        Hide routes with disabled markets
      </label>

      <label>
        <input type="checkbox" checked={hideDisabledPaths} onChange={() => setHideDisabledPaths(!hideDisabledPaths)} />
        Hide routes with disabled paths
      </label>

      <div className="flex flex-col gap-8 rounded-4 border border-red-700/50 p-8">
        <div>Disabled markets</div>
        <div className="flex flex-wrap gap-8">
          {!debugSwapMarketsConfig.disabledSwapMarkets?.length
            ? "No disabled markets"
            : debugSwapMarketsConfig.disabledSwapMarkets?.map((m) => (
                <button
                  key={m}
                  className="flex cursor-pointer gap-4 rounded-4 bg-slate-600 px-4 py-2"
                  onClick={() => handleToggleMarket(m)}
                >
                  {marketsInfoData ? getMarketFullName(marketsInfoData[m]) : m}
                </button>
              ))}
        </div>
      </div>

      <div className=" flex flex-col gap-16">
        {swapPathsStats?.map((stats) => (
          <div
            key={stats.swapPath.join(",")}
            className={cx(
              "flex justify-between gap-8 rounded-4",
              disabledPathsStr.includes(stats.swapPath.toString()) && "bg-red-700"
            )}
          >
            <div className="flex grow items-center gap-8">
              <label>
                <input
                  type="checkbox"
                  checked={debugSwapMarketsConfig.disabledPaths?.includes(stats.swapPath)}
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
              {bestSwapPathKey === stats.swapPath.join(",") ? "👑" : ""} {formatUsd(stats.usdOut)}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default memo(MarketGraph);

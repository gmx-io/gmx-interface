/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unsafe-return */

import '@/components/Exchange/TVChart/components/ChartVirtualOrderBookCard.scss';
import '@/components/Exchange/TVChart/TVChart.scss';
import TpDecrease from '@/components/ExchangeNew/ExchangeList/PositionList/components/TpDecrease';
import SlDecrease from '@/components/ExchangeNew/ExchangeList/PositionList/components/SlDecrease';
import { TV_CHART_REFRESH_INTERVAL } from '@/config/ui';
import { formatMarketName } from '@/components/TradeBoxNew/utils/formatMarketName';
import {
  getGmw334Enabled,
  getGmw379Enabled,
  getGmw383Enabled,
  getGmw391Enabled,
  getGmw409Enabled,
} from '@/config/featureFlagEnable';
import { selectSwapChartToken } from '@/selectors/chart/selectSwapChartToken';
import { getNormalizedTokenSymbol } from '@/utils/token/getNormalizedTokenSymbol';
import { Datafeed } from '@/utils/tvChart/datafeed';
import { useAppStore } from '@/zustand/useAppStore';
import { t } from '@lingui/macro';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useMedia, useLocalStorage } from 'react-use';
import { LoadingDots } from '@/components/Common/Loader/LoadingDots';

import {
  ChartingLibraryWidgetOptions,
  IChartingLibraryWidget,
  ResolutionString,
  widget,
  ChartData
} from '../../../../public/charting_library';
import {
  defaultChartProps,
  disabledFeaturesOnMobile,
  enabledFeatures,
  setCurrentChartResolution,
} from './constants';
import { SaveLoadAdapter } from "./SaveLoadAdapter";
import { useChartSettings } from './hooks/useChartSettings';
import { GMX_SOLANA_TOKENS_RAW } from '@/config/program';
import { useShallow } from 'zustand/react/shallow';
import {
  formatPriceUsd,
  formatParseUsdToBN
} from '@/utils/legacy/format';
import { BN } from '@coral-xyz/anchor';
import { isLimitSwapOrderType } from '@/utils/order/isOrderType';
import { getTriggerNameByOrderType } from '@/utils/order/getTriggerNameByOrderType';
import { useTriggerCancelOrder } from '@/hooks/triggerHooks/useTriggerCancelOrder';
import type { TokenType } from '@/selectors/token/types';
import { OrderType } from '@/selectors/order/types';

const chartFrameCssProperties = {
  '--dark-blue-bg': '#181818',
  '--color-primary-600': '#FA7B4E',
  '--color-primary-600-active': '#FA7B4E',
  '--color-primary-600-hover': '#FA7B4E',
  '--color-fill-surfaceHover': '#A3A3A31A',
  '--color-slate-100': '#A3A3A3',
  '--color-slate-800': '#1F1F1F',
  '--themed-color-brand': '#FA7B4E',
  '--themed-color-brand-hover': '#FA7B4E',
  '--themed-color-brand-active': '#FA7B4E',
  '--themed-color-link': '#FA7B4E',
  '--themed-color-link-primary-default': '#FA7B4E',
  '--themed-color-link-primary-hover': '#FA7B4E',
  '--themed-color-link-primary-active': '#FA7B4E',
  '--themed-color-control-intent-primary': '#FA7B4E',
  '--themed-color-control-highlight-intent-primary': '#FA7B4E',
  '--tv-color-pane-background': '#181818',
  '--tv-color-platform-background': '#181818',
  '--tv-color-pane-background-secondary': '#181818',
  '--tv-color-toolbar-button-background-hover': '#A3A3A31A',
  '--tv-color-toolbar-toggle-button-background-active': '#FA7B4E',
  '--tv-color-toolbar-toggle-button-background-active-hover': '#FA7B4E',
  '--tv-color-toolbar-button-background-expanded': '#FA7B4E',
  '--themed-color-toolbar-button-text-active': '#FA7B4E',
  '--themed-color-toolbar-toggle-button-background-active': '#FA7B4E',
  '--themed-color-toolbar-toggle-button-background-active-hover': '#FA7B4E',
  '--tv-color-popup-background': '#1F1F1F',
  '--tv-color-popup-element-background-hover': '#181818',
  '--themed-color-bg-primary': '#1F1F1F',
  '--themed-color-chart-page-bg': '#181818',
  '--themed-color-pane-bg': '#181818',
  '--themed-color-background-hover': '#181818',
  '--themed-color-item-row-bg-hover': '#181818',
  '--themed-color-common-tooltip-bg': '#1F1F1F',
  '--themed-color-btn-brand-primary-default-bg': '#FA7B4E',
  '--themed-color-btn-brand-primary-default-border': '#FA7B4E',
  '--themed-color-btn-brand-primary-hover-bg': '#FA7B4E',
  '--themed-color-btn-brand-primary-hover-border': '#FA7B4E',
  '--themed-color-btn-brand-primary-active-bg': '#FA7B4E',
  '--themed-color-btn-brand-primary-active-border': '#FA7B4E',
  '--themed-color-btn-brand-secondary-default-border': '#FA7B4E',
  '--themed-color-btn-brand-secondary-default-content': '#FA7B4E',
  '--themed-color-text-btn-content-brand': '#FA7B4E',
  '--themed-color-text-btn-content-active-brand': '#FA7B4E',
  '--themed-color-container-fill-primary-accent': '#FA7B4E',
  '--themed-color-container-fill-primary-accent-semi-bold': '#FA7B4E',
  '--themed-color-container-fill-primary-accent-bold': '#FA7B4E',
  '--themed-color-popup-element-background-active': '#FA7B4E',
  '--themed-color-item-active-bg': '#FA7B4E',
  '--themed-color-drawer-item-active-bg': '#FA7B4E',
  '--themed-color-active-switch-bg': '#FA7B4E',
  '--themed-color-radio-checked': '#FA7B4E',
  '--themed-color-checkbox-focused': '#FA7B4E',
  '--themed-color-checkbox-checked': '#FA7B4E',
  '--themed-color-checkbox-checked-hover': '#FA7B4E',
  '--themed-color-checkbox-active': '#FA7B4E',
  '--ui-lib-checkbox-color-accent': '#FA7B4E',
  '--themed-color-range-slider-middle-bg': '#FA7B4E',
  '--themed-color-chart-active-outline': '#FA7B4E',
  '--themed-color-drop-target-border': '#FA7B4E',
  '--tv-spinner-color': '#FA7B4E',
  '--priceScaleModeButtons-background-activated': '#A3A3A31A',
  '--themed-color-background-selected': '#A3A3A31A',
  '--themed-color-active-tab-text-color': '#ffffff',
  '--themed-color-hover-tab-text-color': '#ffffff',
  '--themed-color-background-special-secondary': '#A3A3A31A',
};

const applyChartFrameColors = (chart: IChartingLibraryWidget | null) => {
  if (!chart) return;

  Object.entries(chartFrameCssProperties).forEach(([name, value]) => {
    chart.setCSSCustomProperty(name, value);
  });
};

export function TVChart() {
  const isGmw334Enabled = getGmw334Enabled();
  const isGmw391Enabled = getGmw391Enabled();
  const isGmw383Enabled = getGmw383Enabled();
  const swapChartToken = useAppStore(selectSwapChartToken);
  const selectSwapReceiveToken = useAppStore((state) => state.swap.selectSwapReceiveToken);
  const { marketDirection } = useAppStore((state) => state.TradeboxNew);
  const { indexToken } = useAppStore((state) => state.indexTokens);
  const { positions } = useAppStore(
    useShallow((state) => ({
      positions: state.positionState.positions
    }))
  );
  const { orders } = useAppStore(
    useShallow((state) => ({
      orders: state.orderState.orders,
    }))
  );
  const { shouldShowPositionLines } = useAppStore((state) => state.settings);

  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartingLibraryWidget | null>(null);
  const datafeedRef = useRef<Datafeed | null>(null);
  const refreshIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const refreshCountRef = useRef<number>(0);
  const isMountedRef = useRef(true);
  const pendingTimersRef = useRef<Set<ReturnType<typeof setTimeout>>>(new Set());
  const positionLinesRef = useRef<any[]>([]);
  const intervalChangedHandlerRef = useRef<
    ((interval: ResolutionString) => void) | null
  >(null);

  const scheduleTimeout = useCallback((fn: () => void, delay: number) => {
    const timerId = setTimeout(() => {
      pendingTimersRef.current.delete(timerId);
      if (isMountedRef.current) {
        fn();
      }
    }, delay);
    pendingTimersRef.current.add(timerId);
    return timerId;
  }, []);

  const clearPendingTimers = useCallback(() => {
    pendingTimersRef.current.forEach((timerId) => clearTimeout(timerId));
    pendingTimersRef.current.clear();
  }, []);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      clearPendingTimers();
    };
  }, [clearPendingTimers]);
  const [currentOrder, setCurrentOrder] = useState(null)
  const [showTpDecrease, setShowTpDecrease] = useState<boolean>(false);
  const [showSlDecrease, setShowSlDecrease] = useState<boolean>(false);
  const [, setIsLoading] = useState(false);
  const [chartIsLoading, setChartIsLoading] = useState(false);
  const mobileView = 'chart';

  // Use custom Hook to manage chart settings
  const TV_SAVE_LOAD_CHARTS_KEY = "tv-save-load-charts";
  const { saveChartSettings, applyChartSettings, getChartSettings } = useChartSettings(chartRef);
  const [tvCharts, setTvCharts] = useLocalStorage<ChartData[] | undefined>(TV_SAVE_LOAD_CHARTS_KEY, []);
  const tvChartsRef = useRef(tvCharts);
  tvChartsRef.current = tvCharts;
  const tradePageVersion = 1;

  const isMobile = useMedia('(max-width: 550px)');
  const isSmallScreen = useMedia('(max-width: 900px)');
  const swapChartTokenAddress = isGmw383Enabled
    ? swapChartToken?.tokenAddress
    : selectSwapReceiveToken?.tokenAddress;
  const swapChartTokenSymbol = isGmw383Enabled
    ? swapChartToken?.tokenSymbol
    : selectSwapReceiveToken?.tokenName;
  const swapChartTokenAddressDependency = isGmw383Enabled
    ? swapChartToken?.tokenAddress
    : undefined;

  const symbol = useMemo(() => {
    if (!marketDirection) return 'SOL/USD';

    const isSwapMode = marketDirection.toLowerCase() === 'swap';

    const tokenSymbol = isSwapMode
      ? swapChartTokenSymbol
      : GMX_SOLANA_TOKENS_RAW[indexToken]?.symbol;

    if (!tokenSymbol) return 'SOL/USD';

    const normalizedSymbol = getNormalizedTokenSymbol(tokenSymbol);
    return `${normalizedSymbol}/USD`;
  }, [marketDirection, indexToken, swapChartTokenSymbol]);

  const tokenType = useMemo<TokenType>(() => {
    const isSwapMode = marketDirection?.toLowerCase() === 'swap';
    const tokenAddress = isSwapMode
      ? swapChartTokenAddress
      : indexToken;
    if (!tokenAddress) return 'crypto';

    return isSwapMode && isGmw383Enabled
      ? swapChartToken?.tokenType ?? 'crypto'
      : GMX_SOLANA_TOKENS_RAW[tokenAddress]?.type ?? 'crypto';
  }, [
    indexToken,
    isGmw383Enabled,
    marketDirection,
    swapChartTokenAddress,
    swapChartToken?.tokenType,
  ]);

  const { trigger: triggerCancelOrder } = useTriggerCancelOrder();
  const onCancelOrder = useCallback(
    async (orderAddress: string, skipPreflight?: boolean) => {
      if (!orderAddress) return;
      await triggerCancelOrder({
        skipPreflight: skipPreflight || false,
        orderAddress,
      });
    },
    [triggerCancelOrder]
  );

  // Legacy refresh behavior retained while GMW-391 is Nightly-only.
  const refreshChartData = useCallback(() => {
    if (chartRef.current && datafeedRef.current) {
      try {
        if (isGmw334Enabled) {
          datafeedRef.current.unsubscribeAllBars();
        } else {
          datafeedRef.current.unsubscribeBars('');
        }

        let chart;
        try {
          chart = chartRef?.current?.chart();
        } catch {
          return;
        }

        if (!chart) return;

        chart.resetData();
        refreshCountRef.current += 1;
        chart.executeActionById('chartReset');

        if (!isGmw334Enabled) {
          scheduleTimeout(() => {
            applyChartSettings();
          }, 300);
        }
      } catch (err) {
        console.error(
          'Error in refreshChartData:',
          err instanceof Error ? err.message : 'Unknown error'
        );
      }
    }
  }, [applyChartSettings, isGmw334Enabled, scheduleTimeout]);

  useEffect(() => {
    if (!datafeedRef.current) {
      datafeedRef.current = new Datafeed(tokenType);
    }
    datafeedRef.current.setTokenType(tokenType);

    if (isGmw391Enabled) return;

    refreshCountRef.current = 0;
    scheduleTimeout(() => {
      refreshChartData();
    }, 2000);
    refreshIntervalRef.current = setInterval(() => {
      refreshChartData();
    }, TV_CHART_REFRESH_INTERVAL);

    return () => {
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current);
      }
    };
  }, [isGmw391Enabled, refreshChartData, scheduleTimeout, tokenType]);

  useEffect(() => {
    if (!containerRef.current || !symbol || !datafeedRef.current) return;

    const initializeNewChart = () => {
      setIsLoading(true);

      if (chartRef.current) {
        const chart = datafeedRef?.current;
        if (!chart) return;
        chart.clearCache();
        try {
          // Safely try to save current settings
          try {
            saveChartSettings();
          } catch (error) {
            console.error(
              'Error saving chart settings before setting symbol:',
              error
            );
          }

          void chartRef?.current?.setSymbol(
            symbol,
            (getChartSettings().resolution as ResolutionString) ||
            ('5' as ResolutionString),
            () => {
              // Apply saved settings after symbol is set successfully
              scheduleTimeout(() => {
                try {
                  applyChartSettings();
                } catch (error) {
                  console.error(
                    'Error applying chart settings after setting symbol:',
                    error
                  );
                }
                if (isMountedRef.current) {
                  setIsLoading(false);
                }
              }, 100);
            }
          );
        } catch (error) {
          console.error('Error setting symbol:', error);
          setIsLoading(false);
        }
        return;
      }

      setChartIsLoading(true);
      // const timeId = setTimeout(() => {
      //   clearTimeout(timeId);
      //   setChartIsLoading(false);
      // }, 1000 * 2);

      const widgetOptions: ChartingLibraryWidgetOptions = {
        symbol: symbol,
        datafeed: datafeedRef.current,
        theme: defaultChartProps.theme,
        library_path: defaultChartProps.library_path,
        locale: defaultChartProps.locale,
        container: containerRef.current,
        interval:
          (getChartSettings().resolution as ResolutionString) ||
          ('5' as ResolutionString),
        enabled_features: enabledFeatures,
        loading_screen: defaultChartProps.loading_screen,
        custom_css_url: getGmw409Enabled()
          ? '/tradingview-chart-gmw-409.css'
          : defaultChartProps.custom_css_url,
        custom_formatters: defaultChartProps.custom_formatters,
        disabled_features: isMobile
          ? defaultChartProps.disabled_features.concat(disabledFeaturesOnMobile)
          : defaultChartProps.disabled_features,
        overrides: defaultChartProps.overrides,
        settings_overrides: defaultChartProps.settings_overrides,
        fullscreen: defaultChartProps.fullscreen,
        user_id: defaultChartProps.user_id,
        client_id: defaultChartProps.client_id,
        auto_save_delay: 1,
        load_last_chart: true,
        save_load_adapter: new SaveLoadAdapter(
          tvChartsRef.current,
          setTvCharts,
          tradePageVersion
        ),
        autosize: defaultChartProps.autosize,
        favorites: defaultChartProps.favorites,
        enableRedo: true,
        enableUndo: true,
        settings_adapter: {
          initialSettings: {},
          setValue: () => {
            // setChartIsLoading(false);
            // console.log('215', chartIsLoading, new Date().getTime());
          },
          removeValue: () => { },
        }
      };

      setCurrentChartResolution(widgetOptions.interval as string);

      chartRef.current = new widget(widgetOptions);
      void chartRef.current.onChartReady(() => {
        if (!isMountedRef.current || !chartRef.current) {
          return;
        }

        applyChartFrameColors(chartRef.current);
        chartRef.current.subscribe('onAutoSaveNeeded', saveChartSettings);
        console.log('chart Ready success');
        // Apply saved settings after chart initialization
        applyChartSettings();
        chartRef.current.applyOverrides(
          defaultChartProps.overrides as Parameters<
            IChartingLibraryWidget['applyOverrides']
          >[0]
        );
        applyChartFrameColors(chartRef.current);
        try {
          const chart = chartRef.current.chart();
          if (chart) {
            setCurrentChartResolution(chart.resolution());
          }
        } catch (error) {
          console.error('Error reading chart resolution:', error);
        }
        setIsLoading(false);
        setChartIsLoading(false);

        const onIntervalChanged = (interval: ResolutionString) => {
          if (!isMountedRef.current || !chartRef.current) {
            return;
          }

          setCurrentChartResolution(interval as string);
          const priceScale = chartRef.current
            ?.activeChart()
            .getPanes()
            .at(0)
            ?.getMainSourcePriceScale();
          if (priceScale) {
            priceScale.setAutoScale(true);
          }
        };
        intervalChangedHandlerRef.current = onIntervalChanged;
        chartRef.current
          .activeChart()
          .onIntervalChanged()
          .subscribe(null, onIntervalChanged);

        if (!isGmw391Enabled) {
          scheduleTimeout(() => {
            refreshChartData();
          }, 500);
        }
      });
    };

    void initializeNewChart();

    return () => {
      clearPendingTimers();

      const widget = chartRef.current;
      if (widget) {
        chartRef.current = null;

        if (getGmw379Enabled()) {
          intervalChangedHandlerRef.current = null;
        } else {
          try {
            if (intervalChangedHandlerRef.current) {
              widget
                .activeChart()
                .onIntervalChanged()
                .unsubscribe(null, intervalChangedHandlerRef.current);
              intervalChangedHandlerRef.current = null;
            }
          } catch (error) {
            console.error('Error unsubscribing interval change during cleanup:', error);
          }

          try {
            widget.unsubscribe('onAutoSaveNeeded', saveChartSettings);
          } catch (error) {
            console.error('Error unsubscribing auto save during cleanup:', error);
          }
        }

        try {
          saveChartSettings();
        } catch (error) {
          console.error('Error saving chart settings during cleanup:', error);
        }

        try {
          widget.remove();
        } catch (error) {
          console.error('Error removing chart during cleanup:', error);
        }
      }

      if (datafeedRef.current) {
        try {
          if (isGmw334Enabled) {
            datafeedRef.current.unsubscribeAllBars();
          } else {
            datafeedRef.current.unsubscribeBars('');
          }
        } catch (error) {
          console.error('Error unsubscribing bars during cleanup:', error);
        }
      }
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current);
        refreshIntervalRef.current = null;
      }
    };
  }, [
    symbol,
    swapChartTokenAddressDependency,
    isMobile,
    isGmw391Enabled,
    refreshChartData,
    saveChartSettings,
    applyChartSettings,
    getChartSettings,
    scheduleTimeout,
    clearPendingTimers,
    isGmw334Enabled,
    setTvCharts,
  ]);

  useEffect(() => {
    if (!chartRef.current || chartIsLoading) return;
    let chart;
    try {
      chart = chartRef?.current?.chart();
    } catch (error) {
      console.error('Error accessing chart for position lines:', error);
      return;
    }
    if (!chart) return;

    if (!shouldShowPositionLines) {
      positionLinesRef.current.forEach((line) => {
        try {
          line.remove();
        } catch (error) {
          console.error('Error removing position line during cleanup:', error);
        }
      });
      positionLinesRef.current = [];
      return;
    }

    const applyCommonLineStyle = (line: any) => {
      return line
        .setLineStyle(1)
        .setLineLength(1)
        .setBodyFont(`normal 12pt "Relative", sans-serif`)
        .setBodyTextColor('#fff')
        .setLineColor('#323232')
        .setBodyBackgroundColor('#323232')
        .setBodyBorderColor('#323232');
    };

    const getPrice = (decimals: number, raw?: string | number | undefined) => {
      return formatPriceUsd(
        formatParseUsdToBN('1', decimals).mul(new BN(raw?.toString() || '0')),
        { fallbackToZero: true, showDollarSign: false, useCommas: false }
      );
    };
    const drawLines = () => {
      const lines: any[] = [];
      try {
        const validPositions = Object.values(positions).filter(
          (item) =>
            item.marketInfo?.indexToken === indexToken &&
            item.entry_price &&
            item.liquidation_price
        );

        validPositions.forEach((item) => {
          const decimals = GMX_SOLANA_TOKENS_RAW[item.marketInfo?.indexToken]?.decimals ?? 6;
          const entryPrice = getPrice(decimals, item.entry_price);
          const lqPrice = getPrice(decimals, item.liquidation_price);

          if (Number(entryPrice) && Number(lqPrice)) {
            const entryLine = applyCommonLineStyle(chart.createPositionLine())
              .setText(`Open ${item.isLong ? t`Long` : t`Short`} - ${formatMarketName(item.marketInfo?.indexToken)}`)
              .setQuantity('')
              .setExtendLeft(false)
              .setPrice(Number(entryPrice))
              .setLineLength(10, 'pixel');

            const lqLine = applyCommonLineStyle(chart.createPositionLine())
              .setText(`Liq. ${item.isLong ? t`Long` : t`Short`} - ${formatMarketName(item.marketInfo?.indexToken)}`)
              .setQuantity('')
              .setExtendLeft(false)
              .setPrice(Number(lqPrice))
              .setLineLength(10, 'pixel');

            lines.push(entryLine, lqLine);
          }
        });

        const validOrders = Object.values(orders).filter(
          (item) =>
            !isLimitSwapOrderType(item.orderType) &&
            item.marketInfo?.indexToken === indexToken
        );

        validOrders.forEach((item) => {
          const decimals = GMX_SOLANA_TOKENS_RAW[item?.marketInfo?.indexToken]?.decimals ?? 6;
          const triggerPrice = getPrice(decimals, item?.triggerPrice?.toString());

          if (Number(triggerPrice)) {
            const orderLine = applyCommonLineStyle(chart.createOrderLine({ disableUndo: true }))
              .setPrice(Number(triggerPrice))
              .setModifyTooltip(t`Edit Order`)
              .setCancelTooltip(t`Cancel order`)
              .onModify(() => {
                switch (item.orderType) {
                  case OrderType.LimitDecrease:
                    setCurrentOrder(item);
                    setShowTpDecrease(true);
                    break;
                  case OrderType.StopLossDecrease:
                    setCurrentOrder(item);
                    setShowSlDecrease(true);
                    break;
                  default:
                    break;
                }
              })
              .onCancel(() => {
                void onCancelOrder(item?.orderAddress?.toBase58());
              })
              .setText(
                `${getTriggerNameByOrderType(item?.orderType, true)} - ${item.isLong ? t`Long` : t`Short`
                } - ${formatMarketName(item?.marketInfo?.indexToken)}`
              )
              .setQuantity('\u270E')
              .setEditable(true)
              .setQuantityFont(`normal 16pt "Relative", sans-serif`)
              .setQuantityBackgroundColor('#181818')
              .setQuantityBorderColor('#9295ad')
              .setLineColor('#323232')
              .setCancelButtonIconColor('#ffffff')
              .setCancelButtonBorderColor('#9295ad')
              .setCancelButtonBackgroundColor('#181818')
              .setLineLength(80, 'pixel');

            lines.push(orderLine);
          }
        });
        positionLinesRef.current.forEach((line) => {
          try {
            line.remove();
          } catch (error) {
            console.error('Error removing previous position line:', error);
          }
        });
        positionLinesRef.current = lines;
      } catch (error) {
        console.error('error creating lines', error);
      }
    };

    const timer = setTimeout(drawLines, 0);

    return () => {
      clearTimeout(timer);
    };
  }, [chartIsLoading, shouldShowPositionLines, positions, orders, indexToken, onCancelOrder]);


  return (
    <div className="ExchangeChart tv">
      <div className='block xl:hidden'>
        {/* <TVChartHeader /> */}
      </div>

      <div className="ExchangeChart-bottom">
        <div className="ExchangeChart-split-container">
          <div
            className={`ExchangeChart-left-area ${isSmallScreen && mobileView !== 'chart' ? 'hidden' : ''}`}
          >
            <div
              style={{
                opacity: chartIsLoading ? 0 : 1,
              }}
              className={`ExchangeChart-container`}
              ref={containerRef}
            />
            {chartIsLoading ? (
              <div className="position-absolute left-0 top-0 flex h-full w-full items-center justify-center">
                <LoadingDots size={20} />
              </div>
            ) : (
              ''
            )}
          </div>
        </div>
      </div>
      <TpDecrease
        order={currentOrder}
        indexTokenAddress={indexToken}
        isVisible={showTpDecrease}
        onClose={() => setShowTpDecrease(false)}
      />
      <SlDecrease
        order={currentOrder}
        indexTokenAddress={indexToken}
        isVisible={showSlDecrease}
        onClose={() => setShowSlDecrease(false)}
      />
    </div>
  );
}

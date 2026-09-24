import '@/components/ExchangeNew/TVChartSide/components/ChartSwapsCard.scss';
import '@/components/ExchangeNew/TVChartSide/TVChartSide.scss';

import ChartTradesCard from '@/components/ExchangeNew/TVChartSide/components/ChartTradesCard';
import { ChartSwapsCard } from '@/components/ExchangeNew/TVChartSide/components/ChartSwapsCard';
import { ChartVirtualOrderBookCard } from '@/components/ExchangeNew/TVChartSide/components/ChartVirtualOrderBookCard';
import Tooltip from '@/components/Common/Tooltip/Tooltip';
import { getGmw400Enabled } from '@/config/featureFlagEnable';
import { useAppStore } from '@/zustand/useAppStore';
import { Trans } from '@lingui/macro';
import classNames from 'classnames';
import { useEffect, useMemo, useState } from 'react';
import tooltipIconPng from '@/components/ExchangeNew/assets/icons/tooltip.png';

export function TVChartSide({
  isShowHeader = true,
  isFullScreen = false,
  defaultActiveTab = 'VOB',
}: {
  isShowHeader?: boolean;
  isFullScreen?: boolean;
  defaultActiveTab?: 'trades' | 'swaps' | 'VOB';
}) {
  const { marketDirection } = useAppStore((state) => state.TradeboxNew);
  const [isSwap, setIsSwap] = useState(false);
  const [activeTab, setActiveTab] = useState<'trades' | 'swaps' | 'VOB'>(
    defaultActiveTab
  );

  useEffect(() => {
    const isSwapMode = marketDirection?.toLocaleLowerCase() === 'swap';
    setActiveTab(
      isSwapMode ? 'swaps' : activeTab === 'swaps' ? 'VOB' : activeTab
    );
    setIsSwap(isSwapMode);
  }, [marketDirection]);

  const handleChartSidebar = (type: 'trades' | 'swaps' | 'VOB') => {
    setActiveTab(type);
  };

  const cachedTradesCard = useMemo(() => <ChartTradesCard />, []);
  const cachedSwapsCard = useMemo(
    () => <ChartSwapsCard isFullScreen={isFullScreen} />,
    [isFullScreen]
  );
  const cachedVobCard = useMemo(() => <ChartVirtualOrderBookCard />, []);

  return (
    <>
      <div
        className={classNames('ExchangeChart-trade', {
          '!w-full': isFullScreen,
        })}
      >
        {isShowHeader && (
          <div className="ExchangeChart-tabs">
            {!isSwap && (
              <>
                <div
                  className={classNames(
                    'ExchangeChart-tab flex justify-center p-[2rem]',
                    {
                      active: activeTab === 'VOB',
                    }
                  )}
                  onClick={() => handleChartSidebar('VOB')}
                >
                  <Trans>VOB</Trans>
                  <Tooltip
                    position="bottom"
                    content={
                      <div>
                        {getGmw400Enabled() ? (
                          <Trans>
                            VOB (Virtual Order Book) shows estimated
                            execution prices for different trade sizes based
                            on GMTrade liquidity. For markets with zero
                            price impact, different trade sizes execute at
                            the same price.
                          </Trans>
                        ) : (
                          <Trans>
                            VOB(Virtual Order Book) shows estimated execution
                            prices for different trade sizes based on GMTrade
                            liquidity.
                          </Trans>
                        )}
                      </div>
                    }
                    disableHandleStyle
                    preventDefault={false}
                  >
                    <img
                      src={tooltipIconPng}
                      alt="tooltip"
                      className="vob-title-icon"
                      style={{
                        marginLeft: 4,
                        width: 16,
                        height: 16,
                        verticalAlign: 'middle',
                      }}
                    />
                  </Tooltip>
                </div>
                <div
                  className={classNames(
                    'ExchangeChart-tab flex justify-center p-[2rem]',
                    {
                      active: activeTab === 'trades',
                    }
                  )}
                  onClick={() => handleChartSidebar('trades')}
                >
                  <Trans>Trades</Trans>
                </div>
              </>
            )}
            {isSwap && (
              <div
                className={classNames('ExchangeChart-tab justify-center', {
                  active: activeTab === 'swaps',
                })}
                onClick={() => handleChartSidebar('swaps')}
              >
                <Trans>Swaps</Trans>
              </div>
            )}
          </div>
        )}

        <div className="ExchangeChart-tab-content">
          {activeTab === 'trades' && cachedTradesCard}
          {activeTab === 'VOB' && cachedVobCard}
          {isSwap && activeTab === 'swaps' && cachedSwapsCard}
        </div>
      </div>
    </>
  );
}

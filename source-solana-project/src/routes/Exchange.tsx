import './Exchange.scss';
import {
  getGmw235Enabled,
  getGmw307Enabled,
  getGmw400Enabled,
  getGmw404Enabled,
} from '@/config/featureFlagEnable';
import { TVChart } from '@/components/Exchange/TVChart/TVChart';
import TradeBoxNew from '@/components/TradeBoxNew/TradeBox';
import { usePayerSwapList } from '@/components/TradeBoxNew/Hooks/usePayerSwapList';
import ExchangeNewCom from '@/components/ExchangeNew/index';
import { useMarketsData } from '@/hooks/fetchHooks/useMarketsData';
import { useReferralDetails } from '@/hooks/fetchHooks/useReferralDetails';
import { useAppStore } from '@/zustand/useAppStore';
import { Trans } from '@lingui/macro';
import { useWallet } from '@solana/wallet-adapter-react';
import { ReactNode, Suspense, lazy, useEffect, useState } from 'react';
import Header from '@/components/NewHeader/Header';
import TradeHeader from '@/components/TradeHeader/Header';
import rightIcon from '@/img/common-right.svg';
import { useMedia } from 'react-use';
import { useLocation } from 'react-router-dom'
import { useTradeMarketRoute } from '@/hooks/routeHooks/useTradeMarketRoute';
import OfficialSiteModal from '@/components/Common/OfficialSiteModal/OfficialSiteModal';
import { BlockUsIpModal } from '@/components/BlockUsIpModal';
import tooltipIconPng from '@/components/ExchangeNew/assets/icons/tooltip.png';
import Tooltip from '@/components/Common/Tooltip/Tooltip';
import { LoadingDots } from '@/components/Common/Loader/LoadingDots';
import { isTradePathname } from '@/utils/market/marketSlug';
import ReferralModal from '@/components/Referrals/Referral/ReferralModal';

const TVFunding = lazy(() =>
  import('@/components/ExchangeNew/TVFunding/TVFunding').then((module) => ({
    default: module.TVFunding,
  }))
);
const TVChartSide = lazy(() =>
  import('@/components/ExchangeNew/TVChartSide/TVChartSide').then((module) => ({
    default: module.TVChartSide,
  }))
);
const ChartVirtualOrderBookCard = lazy(() =>
  import(
    '@/components/ExchangeNew/TVChartSide/components/ChartVirtualOrderBookCard'
  ).then((module) => ({
    default: module.ChartVirtualOrderBookCard,
  }))
);

function withPanelSuspense(node: ReactNode) {
  return <Suspense fallback={
    <div className="flex items-center justify-center h-full w-full">
      <LoadingDots size={16} />
    </div>
  }>{node}</Suspense>;
}

interface ReferralLinkProps {
  code?: string
}

export default function Exchange() {
  useTradeMarketRoute();
  useMarketsData();
  usePayerSwapList();
  const location = useLocation();
  const { code } = location.state as ReferralLinkProps || {};
  const { publicKey } = useWallet();
  const userKey = publicKey?.toBase58() ?? null;
  const { referralDetails, isLoading: isReferralDetailsLoading } =
    useReferralDetails(userKey);

  const { tvChartSidebarOpen, setTvChartSidebarOpen } = useAppStore(
    (state) => state.settings
  );
  const [selectedTab, setSelectedTab] = useState<
    'Price' | 'Funding' | 'Trades' | 'Swaps' | 'VOB'
  >('Price');
  const { marketDirection } = useAppStore((state) => state.TradeboxNew);
  const [isShowReferral, setIsShowReferral] = useState(false);
  const openReferralModal = useAppStore(
    (state) => state.referralState.openReferralModal
  );
  const isGmw404Enabled = getGmw404Enabled();
  // const isScreenSmall = useMedia('(max-width: 1140px)');
  const isScreen1280 = useMedia('(max-width: 1280px)');
  const isScreen1024 = useMedia('(max-width: 1024px)');
  const isBetaTradeSite = getGmw235Enabled()
    ? typeof window !== 'undefined' &&
      window.location.hostname === 'beta.gmxsol.io' &&
      isTradePathname(window.location.pathname)
    : typeof window !== 'undefined' &&
      window.location.href === 'https://beta.gmxsol.io/trade';
  const [showOfficialSiteModal, setShowOfficialSiteModal] = useState(isBetaTradeSite);
  const tvChartSidebarNode =
    tvChartSidebarOpen && (
      <div className="Exchange-center">
        {withPanelSuspense(
          <TVChartSide
            isShowHeader={!isScreen1280}
            isFullScreen={!!isScreen1280}
            defaultActiveTab={'VOB'}
          />
        )}
      </div>
    )
  const isSwap = marketDirection === 'Swap';

  useEffect(() => {
    if (!code) return;
    if (isReferralDetailsLoading) return;
    if (referralDetails?.hasReferrer) return;
    if (isGmw404Enabled) {
      openReferralModal(code);
    } else {
      setIsShowReferral(true);
    }
  }, [
    code,
    isGmw404Enabled,
    isReferralDetailsLoading,
    openReferralModal,
    referralDetails?.hasReferrer,
  ])

  useEffect(() => {
    if (isGmw404Enabled || !referralDetails?.hasReferrer) return;
    setIsShowReferral(false);
  }, [isGmw404Enabled, referralDetails?.hasReferrer]);

  useEffect(() => {
    if (!isScreen1280) {
      setSelectedTab(prev => prev !== 'Price' ? 'Price' : prev);
      if (!tvChartSidebarOpen) setTvChartSidebarOpen(true);
    } else if (tvChartSidebarOpen) {
      setTvChartSidebarOpen(false);
      setSelectedTab(isSwap ? 'Swaps' : 'Price');
    }
  }, [isScreen1280, tvChartSidebarOpen, setTvChartSidebarOpen, isSwap]);

  useEffect(() => {
    if (!isScreen1280) return;
    setSelectedTab(prev => {
      if (isSwap && (prev === 'VOB' || prev === 'Trades')) return 'Price';
      if (!isSwap && prev === 'Swaps') return 'Price';
      return prev;
    });
  }, [isSwap, isScreen1280]);

  const isGmw307Enabled = getGmw307Enabled();

  return (
    <div className={`Exchange page-layout${isGmw307Enabled ? ' feature-gmw-307' : ''}`}>
      {showOfficialSiteModal ? (
        <OfficialSiteModal
          isVisible={showOfficialSiteModal}
          setIsVisible={setShowOfficialSiteModal}
        />
      ) : (
        // isMobile ? (
        //   <div className='h-screen flex items-center justify-center'>
        //     <ComingSoonPage isShowHeader={false} />
        //   </div>
        // ) : (
        <>
          <Header isTrade={true}>{!isScreen1024 && <TradeHeader />}</Header>
          <BlockUsIpModal />
          {!isScreen1024 && (
            <div className="Exchange-content">
              <div className="Exchange-left">
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: tvChartSidebarOpen
                      ? '1fr auto'
                      : '1fr',
                    gap: tvChartSidebarOpen && !isScreen1280 ? '0.8rem' : '0',
                  }}
                >
                  <div className="chart">
                    <div className="Exchange-lists-tabs">
                      <div className="Exchange-lists-left">
                        <span
                          className={selectedTab === 'Price' ? 'selected' : ''}
                          onClick={() => setSelectedTab('Price')}
                        >
                          <Trans>Price</Trans>
                        </span>
                        {!isSwap && isScreen1280 && (
                          <span
                            className={selectedTab === 'VOB' ? 'selected flex items-center !pb-[15px]' : 'flex items-center !pb-[15px]'}
                            onClick={() => setSelectedTab('VOB')}
                          >
                            <Trans>VOB</Trans>
                            <Tooltip
                              position="right"
                              style={{ padding: '0' }}
                              className="vob-tooltip"
                              content={
                                <div>
                                  {getGmw400Enabled() ? (
                                    <Trans>
                                      VOB (Virtual Order Book) shows estimated
                                      execution prices for different trade sizes
                                      based on GMTrade liquidity. For markets
                                      with zero price impact, different trade
                                      sizes execute at the same price.
                                    </Trans>
                                  ) : (
                                    <Trans>
                                      VOB(Virtual Order Book) shows estimated
                                      execution prices for different trade sizes
                                      based on GMTrade liquidity.
                                    </Trans>
                                  )}
                                </div>
                              }
                              disableHandleStyle
                              preventDefault={false}
                            >
                              <img src={tooltipIconPng} alt="tooltip" style={{ marginLeft: 4, width: 16, height: 16, verticalAlign: 'middle' }} />
                            </Tooltip>
                          </span>
                        )}
                        {isScreen1280 && (
                          <span
                            className={
                              selectedTab === (isSwap ? 'Swaps' : 'Trades')
                                ? 'selected'
                                : ''
                            }
                            onClick={() => {
                              setSelectedTab(isSwap ? 'Swaps' : 'Trades');
                            }}
                          >
                            {isSwap ? (
                              <Trans>Swaps</Trans>
                            ) : (
                              <Trans>Trades</Trans>
                            )}
                          </span>
                        )}
                      </div>
                      {!tvChartSidebarOpen && !isScreen1280 && (
                        <div
                          className="Exchange-lists-right"
                          onClick={() => {
                            setTvChartSidebarOpen(true);
                          }}
                        >
                          <img
                            src={rightIcon}
                            className="ExchangeChart-tab-icon"
                            alt="View in explorer"
                            width={16}
                            height={16}
                          />
                        </div>
                      )}
                    </div>
                    <div className="Exchange-lists-content">
                      <div hidden={selectedTab !== 'Price'}>
                        <TVChart />
                      </div>
                      {selectedTab === 'Funding' && (
                        <div>
                          {withPanelSuspense(<TVFunding />)}
                        </div>
                      )}
                      {selectedTab === 'Trades' && isScreen1280 && (
                        <div>
                          {withPanelSuspense(
                            <TVChartSide
                              isShowHeader={!isScreen1280}
                              isFullScreen={!!isScreen1280}
                              defaultActiveTab="trades"
                            />
                          )}
                        </div>
                      )}
                      {selectedTab === 'Swaps' && isScreen1280 && (
                        <div>
                          {withPanelSuspense(
                            <TVChartSide
                              isShowHeader={!isScreen1280}
                              isFullScreen={!!isScreen1280}
                              defaultActiveTab="swaps"
                            />
                          )}
                        </div>
                      )}
                      {selectedTab === 'VOB' && isScreen1280 && (
                        <div style={{ height: '58rem' }}>
                          {withPanelSuspense(<ChartVirtualOrderBookCard />)}
                        </div>
                      )}
                    </div>
                  </div>
                  {!isScreen1280 && <>{tvChartSidebarNode}</>}
                </div>
                <ExchangeNewCom />
              </div>
              <div className="Exchange-right">
                <div className="Exchange-swap-box">
                  <TradeBoxNew />
                </div>
              </div>
            </div>
          )}
          {isScreen1024 && (
            <div className="Exchange-content">
              <div className="Exchange-left">
                <div className="chart bg-[#181818] rounded-[8px] text-[#A3A3A3]">
                  <div className="Exchange-lists-tabs">
                    <div className="Exchange-lists-left font-medium">
                      <span
                        className={selectedTab === 'Price' ? 'selected' : ''}
                        onClick={() => setSelectedTab('Price')}
                      >
                        <Trans>Price</Trans>
                      </span>

                      {!isSwap && (
                        <span
                          className={`${selectedTab === 'VOB' ? 'selected' : ''} flex items-center`}
                          onClick={() => setSelectedTab('VOB')}
                        >
                          <Trans>VOB</Trans>
                          <Tooltip
                            position="bottom"
                            style={{ padding: '0' }}
                            className="vob-tooltip"
                            content={
                              <div>
                                {getGmw400Enabled() ? (
                                  <Trans>
                                    VOB (Virtual Order Book) shows estimated
                                    execution prices for different trade sizes
                                    based on GMTrade liquidity. For markets with
                                    zero price impact, different trade sizes
                                    execute at the same price.
                                  </Trans>
                                ) : (
                                  <Trans>
                                    VOB(Virtual Order Book) shows estimated
                                    execution prices for different trade sizes
                                    based on GMTrade liquidity.
                                  </Trans>
                                )}
                              </div>
                            }
                            disableHandleStyle
                            preventDefault={false}
                          >
                            <img src={tooltipIconPng} alt="tooltip" style={{ marginLeft: 4, width: 16, height: 16, verticalAlign: 'middle' }} />
                          </Tooltip>
                        </span>
                      )}
                      <span
                        className={
                          selectedTab === (isSwap ? 'Swaps' : 'Trades')
                            ? 'selected'
                            : ''
                        }
                        onClick={() => {
                          setSelectedTab(isSwap ? 'Swaps' : 'Trades');
                        }}
                      >
                        <Trans>{isSwap ? 'Swaps' : 'Trades'}</Trans>
                      </span>
                    </div>
                  </div>
                  <div className="Exchange-lists-content">
                    <div hidden={selectedTab !== 'Price'}>
                      <TVChart />
                    </div>
                    {selectedTab === 'Funding' && (
                      <div>
                        {withPanelSuspense(<TVFunding />)}
                      </div>
                    )}
                    {selectedTab === 'VOB' && (
                      <div>
                        {withPanelSuspense(<ChartVirtualOrderBookCard />)}
                      </div>
                    )}
                    {selectedTab === 'Trades' && (
                      <div>
                        {withPanelSuspense(
                          <TVChartSide
                            isShowHeader={false}
                            isFullScreen={true}
                            defaultActiveTab="trades"
                          />
                        )}
                      </div>
                    )}
                    {selectedTab === 'Swaps' && (
                      <div>
                        {withPanelSuspense(
                          <TVChartSide
                            isShowHeader={false}
                            isFullScreen={true}
                            defaultActiveTab="swaps"
                          />
                        )}
                      </div>
                    )}
                  </div>
                </div>
                <ExchangeNewCom />
              </div>
            </div>
          )}
        </>
      )}
      {!isGmw404Enabled && (
        <ReferralModal
          showModal={isShowReferral}
          onClose={() => setIsShowReferral(false)}
          initReferralCode={code}
        />
      )}
    </div>
  );
}

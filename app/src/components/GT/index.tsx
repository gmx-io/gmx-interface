import { useState, useEffect, useMemo, startTransition, useRef } from 'react';
import { useShallow } from 'zustand/react/shallow';
import Overview from './Overview/Overview';
import GTWallet from './Wallet/GTWallet';
import Leaderboard from './Leaderboard/Leaderboard';
import './index.scss';
import Button from '@/components/Common/Button/Button';
import { isNativeToken } from '@/utils/token/isNativeToken';
import { BN_ZERO, ONE_USD } from '@/config/constants';
import {
  GMX_SOLANA_GLV_TOKENS,
} from '@/config/program';
import { selectMarketTokensData } from '@/selectors/token/selectMarketTokensData';
import {
  useGlvMarkets,
  useGtGlobalDetails,
  useGtUserDetails,
  useTokenMetadatasForGlv,
} from '@/hooks/fetchHooks';
import { useAppStore } from '@/zustand/useAppStore';
import { useSWRConfig } from 'swr';
import { STORE_KEY } from '@/hooks/fetchHooks/useStoreAccount';
import { DEFAULT_SWR_REFRESH_INTERVAL_15S } from '@/config/ui';
import { Trans } from '@lingui/macro';
import { useMedia } from 'react-use';
import { DEFAULT_DOCS_ENV } from '@/config/env';
// import GTHeader from './GTHeader';
// import useMedia from 'react-use';
type TabType = 'overview' | 'wallet' | 'leaderboard' | 'buyback';

const tabs = [
  { id: 'overview' as TabType, label: <Trans>Overview</Trans> },
  { id: 'wallet' as TabType, label: <Trans>GT Wallet</Trans> },
  { id: 'leaderboard' as TabType, label: <Trans>GT Leaderboard</Trans> },
  // { id: 'buyback' as TabType, label: <Trans>GT Buyback</Trans> },
];

function GTPage() {
  const saved = localStorage.getItem('gt_active_tab');
  const isScreen1024 = useMedia('(max-width: 1024px)');
  const activeTabRef = useRef<HTMLButtonElement | null>(null);
  const initialTab: TabType =
    saved === 'overview' ||
      saved === 'wallet' ||
      saved === 'leaderboard' ||
      saved === 'buyback'
      ? saved
      : 'overview';
  const [activeTab, setActiveTab] = useState<TabType>(initialTab);

  useEffect(() => {
    if (activeTabRef.current) {
      activeTabRef.current.scrollIntoView({
        behavior: 'smooth',
        block: 'nearest',
        inline: 'center',
      });
    }
  }, [activeTab]);

  const renderTabContent = useMemo(() => {
    switch (activeTab) {
      case 'overview':
        return <Overview />;
      case 'wallet':
        return <GTWallet linkBuyBack={() => startTransition(() => setActiveTab('buyback'))} />;
      case 'leaderboard':
        return <Leaderboard />;
      // case 'buyback':
      //   return <Buyback claimableValue={claimableValueBN} claimRewards={claimRewards} isClaimingRewards={isClaimingRewards} progress={progress} />;
      default:
        return <Overview />;
    }
  }, [activeTab]);
  const isMobile = useMedia('(max-width: 768px)');
  return (
    // isScreen1024 ? <ComingSoonPage/>:
    <div className="gt-page">
      <div className="gt-container">
        {/* Header */}
        {/* {isMobile && <div className="header-left"><GTHeader /></div>} */}
        <div className="gt-header">
          <div className="gt-info">
            <div className={`title ${isMobile || isScreen1024 ? '' : '!mt-[0]'}`}><Trans>GT Points</Trans></div>
            <p className="font-[500]">
              <span><Trans>Build long-term upside through the growing GT ecosystem.</Trans></span>
              <span className="font-semibold learnMore ml-2 hover:text-white" style={isMobile ? { fontSize: '1rem' } : {}} onClick={() => window.open(`${DEFAULT_DOCS_ENV}about/gt_point_system`, '_blank')}> <Trans>Learn more →</Trans></span>
            </p>
          </div>
          <div className="gt-tabs">
            {tabs.map((tab) => (
              <Button
                variant="primary"
                type="button"
                key={tab.id}
                buttonRef={activeTab === tab.id ? activeTabRef : undefined}
                className={`gt-tab font-[500] ${activeTab === tab.id ? 'active' : ''}`}
                onClick={() => {
                  startTransition(() => {
                    setActiveTab(tab.id);
                    try {
                      localStorage.setItem('gt_active_tab', tab.id);
                    } catch (e) {
                      console.log(e);
                    }
                  });
                }}
              >
                {tab.label}
              </Button>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="gt-content">
          <div className="tab-content">{renderTabContent}</div>
          {activeTab === 'overview' && <OverviewBootstrap />}
          {activeTab === 'wallet' && <WalletBootstrap />}
          {activeTab === 'leaderboard' && <LeaderboardBootstrap />}
          {/* {activeTab === 'buyback' && <BuybackBootstrap />} */}
        </div>
      </div>
    </div>
  );
}

const useFetchGtUserDetails = () => {
  const { setUserDetails, setIsLoading } = useAppStore(
    useShallow((state) => ({
      setUserDetails: state.gtState.setUserDetails,
      setIsLoading: state.gtState.setIsLoading,
    }))
  );

  const { gtDetails, isLoading } = useGtUserDetails();
  useEffect(() => {
    setIsLoading(isLoading);
    setUserDetails(gtDetails ?? null);
  }, [isLoading, gtDetails, setIsLoading, setUserDetails]);
};

const useFetchGtGlobalDetails = () => {
  const { mutate } = useSWRConfig();
  const { setGlobalDetails, setIsLoading } = useAppStore(
    useShallow((state) => ({
      setGlobalDetails: state.gtState.setGlobalDetails,
      setIsLoading: state.gtState.setIsLoading,
    }))
  );

  const { gtGlobalDetails, isLoading } = useGtGlobalDetails();
  useEffect(() => {
    setIsLoading(isLoading);
    setGlobalDetails(gtGlobalDetails ?? null);
  }, [isLoading, setIsLoading, gtGlobalDetails, setGlobalDetails]);

  // Periodically revalidate store data for GT Stats
  useEffect(() => {
    const interval = setInterval(() => {
      void mutate(
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        (key: any) => key?.key === STORE_KEY
      );
    }, DEFAULT_SWR_REFRESH_INTERVAL_15S);
    return () => clearInterval(interval);
  }, [mutate]);
};

const useFetchGlvMarkets = () => {
  const glvTokens = GMX_SOLANA_GLV_TOKENS;
  const setGlvs = useAppStore((state) => state.glvState.setGlvs);
  const setIsLoading = useAppStore((state) => state.glvState.setIsLoading);

  const { glvs, isLoading } = useGlvMarkets(glvTokens);

  useEffect(() => {
    setIsLoading(isLoading);
  }, [isLoading, setIsLoading]);

  useEffect(() => {
    setGlvs(glvs);
  }, [glvs, setGlvs]);
};

const useFetchGlvTokenMetadatas = () => {
  const glvTokens = GMX_SOLANA_GLV_TOKENS;
  const { tokenMetadatas, isLoading } = useTokenMetadatasForGlv(glvTokens);
  const setIsLoading = useAppStore((state) => state.glvState.setIsLoading);
  const setGlvTokenMetadata = useAppStore(
    (state) => state.glvState.setGlvTokenMetadata
  );

  useEffect(() => {
    setIsLoading(isLoading);
  }, [isLoading, setIsLoading]);

  useEffect(() => {
    for (const address in tokenMetadatas) {
      setGlvTokenMetadata(address, tokenMetadatas[address]);
    }
  }, [setGlvTokenMetadata, tokenMetadatas]);
};

const useFetchGlvTokenPrices = () => {
  const glvs = useAppStore(useShallow((state) => state.glvState.glvs));
  const marketTokensData = useAppStore(selectMarketTokensData);
  const glvTokensMetadata = useAppStore(
    useShallow((state) => state.glvState.glvTokenMetadatas)
  );
  const setGlvTokenPrice = useAppStore(
    (state) => state.glvState.setGlvTokenPrice
  );

  useEffect(() => {
    for (const glvAddress in glvs) {
      const glv = glvs[glvAddress];
      if (!Array.isArray(glv?.markets)) continue;

      let totalValue = BN_ZERO;

      // Calculate total value across all markets
      for (const market of glv.markets) {
        if (isNativeToken(market.marketTokenAddress)) {
          continue;
        }
        const marketTokenAddress = market.marketTokenAddress.toBase58();
        const marketPrice =
          marketTokensData[marketTokenAddress]?.prices?.maxPrice;
        const gmBalance = market.gmBalance;
        if (marketPrice && gmBalance) {
          const marketValue = marketPrice.mul(gmBalance).div(ONE_USD);
          totalValue = totalValue.add(marketValue);
        }
      }

      // Calculate GLV token price
      const glvTokenAddress = glv.glvTokenAddress?.toBase58();
      const glvSupply =
        glvTokenAddress && glvTokensMetadata[glvTokenAddress]?.totalSupply
          ? glvTokensMetadata[glvTokenAddress].totalSupply
          : BN_ZERO;
      let glvPrice = BN_ZERO;

      if (glvSupply.gt(BN_ZERO)) {
        glvPrice = totalValue.mul(ONE_USD).div(glvSupply);
      } else if (totalValue.gt(BN_ZERO)) {
        glvPrice = ONE_USD;
      }

      setGlvTokenPrice(glvAddress, glvPrice);
    }
  }, [glvs, marketTokensData, glvTokensMetadata, setGlvTokenPrice]);
};

// Bootstrap components to load data only for active tabs
const OverviewBootstrap = () => {
  const [enabled, setEnabled] = useState(false);
  useEffect(() => {
    const id = requestAnimationFrame(() => setEnabled(true));
    return () => cancelAnimationFrame(id);
  }, []);
  return enabled ? <OverviewBootstrapInner /> : null;
};

const OverviewBootstrapInner = () => {
  useFetchGtGlobalDetails();
  useFetchGlvMarkets();
  useFetchGlvTokenMetadatas();
  useFetchGlvTokenPrices();
  return null;
};

const WalletBootstrap = () => {
  const [enabled, setEnabled] = useState(false);
  useEffect(() => {
    const id = requestAnimationFrame(() => setEnabled(true));
    return () => cancelAnimationFrame(id);
  }, []);
  return enabled ? <WalletBootstrapInner /> : null;
};

const WalletBootstrapInner = () => {
  useFetchGtUserDetails();
  useFetchGtGlobalDetails();
  return null;
};

const LeaderboardBootstrap = () => {
  // Add leaderboard-specific bootstraps here if needed
  return null;
};

export default GTPage;

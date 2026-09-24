import { useTotalStats } from '@/hooks/statsHooks/useTotalStats';
import { getGmw248Enabled } from '@/config/featureFlagEnable';
import { useTokenMarketCap } from '@/hooks/fetchHooks/useTokenMarketCap';
import { formatUsd, formatUsdToKMB } from '@/utils/legacy/format';
import { useNavigate } from 'react-router-dom';
import { useAppStore } from '@/zustand/useAppStore';
import { selectIsTermsAccepted } from '@/selectors/setting/baseSelectors';
import { TermsModal } from '@/components/TermsModal/TermsModal';
import { useCallback, useEffect, useState, useMemo } from 'react';
import { getIconUrlPath } from '@/utils/lib/icon';
import { AnimatedTitle } from '@/routes/AnimatedTitle';
import ExternalLink from '@/components/Common/Link/ExternalLink';
import OfficialSiteModal from '@/components/Common/OfficialSiteModal/OfficialSiteModal';
// import logo_new from '@/img/logo_new.png';
import logo_new from '@/img/landing-logo.svg';
import logo from '@/img/logo_gmx_solana_40.svg';
import './Landing.scss';
import { useMedia } from 'react-use';
import arrow from '@/img/landing/arrow.svg';
import Unread from '@/img/landing/Unread.svg';
import gear1 from '@/img/landing/gear.svg';
import safety from '@/img/landing/safety.svg';
import shield1 from '@/img/landing/shield.svg';
import NavigationLink from './NavigationLink';
import { LandingFooter } from './LandingFooter';

const TERMS_DISMISS_KEY = 'terms_modal_dismiss_until';
import Burger from '@/img/Burger.svg';
import MdichevronDown from '@/img/landing/MdiChevronDown.svg?react';
import { BN } from '@coral-xyz/anchor';
import { useIndexTokensData } from '@/components/TradeBoxNew/Hooks/useIndexTokensData';
import { formatGmxSymbol } from '@/components/TradeBoxNew/utils/formatGmxSymbol';
import { DEFAULT_SWR_REFRESH_INTERVAL_5M } from '@/config/ui';
import { DEFAULT_DOCS_ENV } from '@/config/env';

export default function Landing() {
  useIndexTokensData();
  const { totalStats, isLoading } = useTotalStats();
  const navigate = useNavigate();
  const isTermsAccepted = useAppStore(selectIsTermsAccepted);
  const [showTermsModal, setShowTermsModal] = useState(false);
  const isBetaSite =
    typeof window !== 'undefined' &&
    window.location.href === 'https://beta.gmxsol.io/';
  const [showOfficialSiteModal, setShowOfficialSiteModal] =
    useState(isBetaSite);
  const [showSecondText, setShowSecondText] = useState(false);
  const [marketTokenSymbols, setMarketTokenSymbols] = useState([]);

  const [showNav, setShowNav] = useState(false);
  const isScreen768 = useMedia('(max-width: 768px)');
  const isMobile = useMedia('(max-width: 375px)');
  const isScreen640 = useMedia('(max-width: 640px)');
  const isScreen480 = useMedia('(max-width: 480px)');
  const isScreen1024 = useMedia('(max-width: 1024px)');
  const isScreen1280 = useMedia('(max-width: 1280px)');

  const { sortedIndexTokens } = useAppStore((state) => state.indexTokens);
  const { markets } = useAppStore((state) => state.markets);
  const [liquidity, setLiquidity] = useState('...');

  const uniqueTokenSymbols = useMemo(() => {
    if (!sortedIndexTokens || sortedIndexTokens.length === 0) {
      return [];
    }
    const tokenMapping: { [key: string]: string } = {
      wsol: 'sol',
      wpump: 'pump',
    };

    const symbols = Array.from(
      new Set(
        sortedIndexTokens
          .filter((token) => token.symbol || token.indexToken)
          .map((token) => {
            const symbol =
              token?.symbol === 'WGMX'
                ? 'GMX'
                : token?.symbol || formatGmxSymbol(token?.indexToken || '');

            const lowerSymbol = symbol?.toLowerCase();
            const mappedSymbol = tokenMapping[lowerSymbol] || lowerSymbol;

            return mappedSymbol;
          })
          .filter(Boolean)
      )
    );

    return symbols;
  }, [sortedIndexTokens]);

  // const { data, loading, error } = useTokenMarketCap(
  //   uniqueTokenSymbols || [],
  //   DEFAULT_SWR_REFRESH_INTERVAL_5M
  // );
  const { data, loading, error } = useTokenMarketCap(
    sortedIndexTokens || [],
    DEFAULT_SWR_REFRESH_INTERVAL_5M
  );

  useEffect(() => {
    if (!data.length) {
      setMarketTokenSymbols(uniqueTokenSymbols);
    } else if (data.length) {
      const symbols = data.map((item) => item.symbol);
      setMarketTokenSymbols(symbols);
    }
  }, [uniqueTokenSymbols, data, sortedIndexTokens]);

  // console.log('uniqueTokenSymbols',uniqueTokenSymbols);

  // const uniqueTokenSymbols = useMemo(() => {
  //   return Array.from(
  //     new Set(
  //       indexTokens
  //         .filter((token) => token.symbol)
  //         .map((token) => token.symbol?.toLowerCase())
  //     )
  //   );
  // }, [indexTokens.length]);

  const isDismissedFor30Days = useCallback(() => {
    try {
      const dismissUntil = localStorage.getItem(TERMS_DISMISS_KEY);
      if (!dismissUntil) return false;

      const dismissDate = new Date(dismissUntil);
      const now = new Date();

      return now < dismissDate;
    } catch (error) {
      localStorage.removeItem(TERMS_DISMISS_KEY);
      return false;
    }
  }, []);

  const handleLaunchApp = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      if (isTermsAccepted || isDismissedFor30Days()) {
        navigate('/trade');
      } else {
        setShowTermsModal(true);
      }
    },
    [isTermsAccepted, navigate, isDismissedFor30Days]
  );

  const handleTradeNow = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      handleLaunchApp(e);
    },
    [handleLaunchApp]
  );

  useEffect(() => {
    if (isTermsAccepted && showTermsModal) {
      setShowTermsModal(false);
      navigate('/trade');
    }
  }, [isTermsAccepted, showTermsModal, navigate]);

  const handleCloseTermsModal = useCallback(() => {
    setShowTermsModal(false);
  }, []);

  const handleNavigationClick = useCallback(() => {
    setShowNav(true);
  }, []);
  useEffect(() => {
    try {
      if (!markets || !Array.isArray(markets)) {
        throw new Error("'markets' is not a valid array.");
      }

      let total: any;
      if (getGmw248Enabled()) {
        total = markets.reduce(
          (sum: BN, item: any) =>
            sum
              .add(new BN(item.lpLong || 0))
              .add(new BN(item.lpShort || 0))
              .add(new BN(item.longOpenInterest || 0))
              .add(new BN(item.shortOpenInterest || 0)),
          new BN(0)
        );
      } else {
        const uniqueMarkets: any[] = Array.from(
          markets
            .reduce((map, item) => {
              const totalLp = new BN(item.lpLong).add(new BN(item.lpShort));
              const existing: any = map.get(item.indexToken);
              if (!existing || totalLp.gt(existing.total)) {
                map.set(item.indexToken, {
                  ...item,
                  total: totalLp,
                });
              }
              return map;
            }, new Map())
            .values()
        );

        total = uniqueMarkets.reduce(
          (sum, item) => sum.add(item.total),
          new BN(0)
        );
      }

      const liquidityTotal = formatUsdToKMB(total, {
        displayDecimals: 1,
      });

      !total?.isZero() && setLiquidity(liquidityTotal);
    } catch (error) {
      console.error('An error occurred while calculating liquidity:', error);
      setLiquidity('$0.00');
    }
  }, [markets]);

  // Format stats
  const formatLiquidity = () => {
    if (isLoading) {
      return '...';
    }
    const formatted = liquidity;
    return formatted.replace(/([bmk])$/i, (m) => m.toUpperCase());
  };

  const formatTraders = () => {
    if (isLoading || totalStats?.totalUsers?.isZero()) {
      return '...';
    }
    return totalStats.totalUsers.toString();
  };

  const formatTotalVolume = () => {
    if (isLoading || totalStats?.totalVolume?.isZero()) {
      return '...';
    }
    const formatted = formatUsdToKMB(totalStats.totalVolume, {
      displayDecimals: 1,
    });
    return formatted.replace(/([bmk])$/i, (m) => m.toUpperCase());
  };

  return (
    <>
      {showOfficialSiteModal ? (
        <OfficialSiteModal
          isVisible={showOfficialSiteModal}
          setIsVisible={setShowOfficialSiteModal}
        />
      ) : (
        <>
          <div className="landing-page">
            {/* Landing Header */}
            <header className="landing-header">
              <div className="landing-header-container">
                <div className="landing-header-left">
                  <img src={logo_new} alt="GMTrade" className="landing-logo" />
                </div>
                <nav className="landing-header-nav">
                  {!isScreen768 && (
                    <>
                      <ExternalLink
                        href="https://github.com/gmsol-labs/"
                        className="landing-nav-link"
                      >
                        Protocol
                      </ExternalLink>
                      <ExternalLink
                        href={`${DEFAULT_DOCS_ENV}`}
                        className="landing-nav-link"
                      >
                        Docs
                      </ExternalLink>
                    </>
                  )}
                  <button
                    className="landing-open-app-btn"
                    onClick={handleLaunchApp}
                  >
                    Open App
                  </button>
                  {isScreen768 && (
                    <img
                      src={Burger}
                      alt="burger"
                      onClick={handleNavigationClick}
                    />
                  )}
                </nav>
              </div>
            </header>

            {/* Hero Section */}
            <div className="landing-hero">
              <div className="landing-hero-container">
                <h1
                  className="landing-hero-title"
                  style={{ height: isScreen640 ? '120px' : '210px' }}
                >
                  <div className="relative flex h-full w-full flex-col justify-end">
                    <div
                      className="sm:border-b-1/2  w-full border-b-0 border-b-slate-600"
                      style={{
                        fontWeight: '500',
                        letterSpacing: isScreen640 ? '-2.6px' : '-5.2px',
                      }}
                    >
                      <div
                        className="float-left"
                        style={{
                          letterSpacing: isScreen640 ? '-2.6px' : '-5.2px',
                        }}
                      >
                        Trade
                      </div>
                      <AnimatedTitle />
                      from your wallet
                    </div>
                  </div>
                </h1>
                {!isScreen1024 ? (
                  <div className="landing-hero-bottom">
                    <div className="landing-hero-content">
                      <button
                        className="landing-trade-now-btn"
                        onClick={handleTradeNow}
                      >
                        <div className="landing-trade-now-btn-row landing-trade-now-btn-row-top">
                          <img
                            src={arrow}
                            alt=""
                            className="landing-trade-now-btn-arrow"
                          />
                        </div>
                        <div className="landing-trade-now-btn-row landing-trade-now-btn-row-bottom">
                          Trade Now
                        </div>
                      </button>
                      <p className="landing-hero-description">
                        Decentralised permissionless on-chain exchange powered
                        by GMX V2 model
                      </p>
                    </div>
                    <div className="landing-hero-stats">
                      <div className="landing-stat-item">
                        <span className="landing-stat-label">Liquidity</span>
                        <span className="landing-stat-value">
                          {formatLiquidity()}
                        </span>
                      </div>
                      <div className="landing-stat-item">
                        <span className="landing-stat-label">Traders</span>
                        <span className="landing-stat-value">
                          {formatTraders()}
                        </span>
                      </div>
                      <a
                        // href="https://dune.com/gmx_solana/gmxsol-analytics"
                        href="https://dune.com/gmtrade/gmtrade-analytics"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="landing-stat-item"
                      >
                        <span
                          className="landing-stat-label"
                          style={{ display: 'flex' }}
                        >
                          Total Volume
                          <MdichevronDown className="landing-right" />
                        </span>
                        <span className="landing-stat-value">
                          {formatTotalVolume()}
                        </span>
                      </a>
                    </div>
                  </div>
                ) : (
                  <>
                    <div>
                      <p className="landing-hero-description">
                        Decentralised permissionless on-chain exchange powered
                        by GMX V2 model
                      </p>
                    </div>
                    <div>
                      <button
                        className="landing-trade-now-btn"
                        onClick={handleTradeNow}
                        // style={{ width: isMobile ? '100%' : '20rem' }}
                      >
                        <div className="landing-trade-now-btn-row landing-trade-now-btn-row-top">
                          <img
                            src={arrow}
                            alt=""
                            className="landing-trade-now-btn-arrow"
                          />
                        </div>
                        <div className="landing-trade-now-btn-row landing-trade-now-btn-row-bottom">
                          Trade Now
                        </div>
                      </button>
                    </div>

                    <div className="landing-hero-content">
                      <div className="landing-hero-bottom">
                        <div className="landing-hero-stats">
                          <div className="landing-stat-item">
                            <span className="landing-stat-label">
                              Liquidity
                            </span>
                            <span className="landing-stat-value">
                              {formatLiquidity()}
                            </span>
                          </div>
                          <div className="landing-stat-item">
                            <span className="landing-stat-label">Traders</span>
                            <span className="landing-stat-value">
                              {formatTraders()}
                            </span>
                          </div>
                          <a
                            // href="https://dune.com/gmx_solana/gmxsol-analytics"
                            href="https://dune.com/gmtrade/gmtrade-analytics"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="landing-stat-item"
                          >
                            <span
                              className="landing-stat-label"
                              style={{ display: 'flex', whiteSpace: 'nowrap' }}
                            >
                              Total Volume
                              <MdichevronDown className="landing-right" />
                            </span>
                            <span className="landing-stat-value">
                              {formatTotalVolume()}
                            </span>
                          </a>
                        </div>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Features Section */}
            {!isScreen1280 ? (
              <div className="landing-features">
                <div className="landing-features-container">
                  <div className="landing-features-left-column">
                    {/* Guaranteed Liquidity */}
                    <div className="landing-feature-card landing-feature-card-guaranteed">
                      <div className="landing-feature-icon-box">
                        <div className="gear">
                          <img src={gear1} alt="Gear icon" />
                        </div>
                        <div className="guaranteed-liquidity">
                          <div className="landing-feature-tag">
                            TRADE WITH CONFIDENCE
                          </div>
                          <div className="landing-feature-title">
                            Guaranteed Liquidity
                          </div>
                        </div>
                      </div>
                      <div className="landing-feature-content">
                        <p
                          className="landing-feature-description"
                          style={{ borderTop: '1px solid #3C4067' }}
                        >
                          Benefit from up to 500x leverage, and guaranteed
                          on-chain liquidity that's not dependent on order book
                          depth
                        </p>
                      </div>
                    </div>

                    {/* Stay Safe from Liquidations */}
                    <div
                      className="landing-feature-card landing-feature-card-shield"
                      style={{ padding: '0 0 2.8rem 2.8rem' }}
                    >
                      <div className="landing-feature-icon-large">
                        <img src={shield1} alt="Shield icon" />
                      </div>
                      <div
                        className="landing-feature-content"
                        style={{ paddingRight: '2.8rem' }}
                      >
                        <h3
                          className="landing-feature-title"
                          style={{ fontSize: '2.8rem' }}
                        >
                          Stay Safe <br />
                          from Liquidations
                        </h3>
                        <p
                          className="landing-feature-description"
                          style={{
                            color: '#ffffff',
                            overflowWrap: 'break-word',
                            paddingTop: '0rem',
                          }}
                        >
                          Avoid price wicks with transparent, <br />
                          sub-second Chainlink oracles tailor-made for GMTrade
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="landing-features-right-grid">
                    <div className="landing-feature-card landing-feature-card-assets">
                      <div
                        className="landing-feature-content"
                        style={{ padding: '0 2rem', gap: '0rem' }}
                      >
                        <h3
                          className="landing-feature-title"
                          style={{ fontSize: '2.8rem' }}
                        >
                          {/* Support for <br />
                          Numerous Assets */}
                          FX, commodities & stocks
                        </h3>
                        <p
                          className="landing-feature-description"
                          style={{ paddingTop: '1.1rem' }}
                        >
                          {/* Use your preferred token to pay and collateralize your
                          positions */}
                          Trade traditional markets on-chain with up to 500x
                          leverage, low entry barriers, and minimal trading
                          fees.
                        </p>
                      </div>
                      <div className="landing-feature-tokens">
                        {marketTokenSymbols.length > 0 &&
                          marketTokenSymbols.slice(0, 24).map((symbol) => {
                            if (!symbol) return null;
                            // const displaySymbol = symbol === 'wgmx' ? 'gmx' : symbol;
                            const iconPath = getIconUrlPath(symbol, 24);
                            return iconPath ? (
                              <div key={symbol} className="landing-token-icon">
                                <img
                                  src={iconPath}
                                  alt={symbol}
                                  width={40}
                                  height={40}
                                  onError={(e) => {
                                    (
                                      e.target as HTMLImageElement
                                    ).style.display = 'none';
                                  }}
                                />
                              </div>
                            ) : null;
                          })}
                      </div>
                    </div>

                    {/* Save on Costs */}
                    <div className="landing-feature-card landing-feature-card-costs">
                      <div className="landing-feature-icon-box">
                        <div className="gear">
                          <img src={safety} alt="Gear icon" />
                        </div>
                        <div className="guaranteed-liquidity">
                          <div className="landing-feature-tag">
                            KEEP MORE OF WHAT YOU EARN
                          </div>
                          <div className="landing-feature-title">
                            Save on Costs
                          </div>
                        </div>
                      </div>
                      <div className="landing-feature-content">
                        <p
                          className="landing-feature-description"
                          style={{ borderTop: '1px solid #3C4067' }}
                        >
                          Trade at scale without worrying about thin order books
                          or slippage
                        </p>
                      </div>
                    </div>

                    {/* Secure & Permissionless */}
                    <div className="landing-feature-card landing-feature-card-secure">
                      <div className="landing-feature-content">
                        <h3 className="landing-feature-title">
                          Secure <br />& Permissionless
                        </h3>
                        <div className="landing-feature-list">
                          <div className="landing-feature-list-item">
                            <img src={Unread} alt="Unread icon" />
                            <span>No deposits required</span>
                          </div>
                          <div className="landing-feature-list-item">
                            <img src={Unread} alt="Unread icon" />
                            <span>Trade from your wallet</span>
                          </div>
                          <div className="landing-feature-list-item">
                            <img src={Unread} alt="Unread icon" />
                            <span>No loss of fund ownership</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Trade to Mint */}
                    <div
                      className="landing-feature-card landing-feature-card-mint"
                      style={{ padding: '0', paddingLeft: '2.8rem' }}
                    >
                      <div className="landing-feature-content">
                        <h3
                          className="landing-feature-title"
                          style={{ fontSize: '2.8rem' }}
                        >
                          Trade to Mint
                        </h3>
                        <p
                          className="landing-feature-description"
                          style={{ paddingTop: '0rem' }}
                        >
                          Earn GT points from every trade and build long-term
                          <br /> upside through the growing GT ecosystem
                        </p>
                      </div>
                      <div className="landing-feature-mint-right">
                        <button
                          className="landing-feature-trade-btn"
                          onClick={handleTradeNow}
                        >
                          Trade Now
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="landing-features">
                <div className="landing-features-container">
                  {/* Guaranteed Liquidity */}
                  <div className="landing-feature-card landing-feature-card-guaranteed">
                    <div className="landing-feature-icon-box">
                      <div className="gear">
                        <img src={gear1} alt="Gear icon" />
                      </div>
                      <div className="guaranteed-liquidity">
                        <div className="landing-feature-tag">
                          TRADE WITH CONFIDENCE
                        </div>
                        <div className="landing-feature-title">
                          Guaranteed Liquidity
                        </div>
                      </div>
                    </div>
                    <div className="landing-feature-content">
                      <p
                        className="landing-feature-description"
                        style={{ borderTop: '1px solid #3C4067' }}
                      >
                        Benefit from up to 500x leverage, and guaranteed
                        on-chain liquidity that's not dependent on order book
                        depth
                      </p>
                    </div>
                  </div>

                  {/* Stay Safe from Liquidations */}
                  <div
                    className="landing-feature-card landing-feature-card-shield"
                    style={{
                      padding: '0 0 2.8rem 2.8rem',
                      position: 'relative',
                      minHeight: '200px',
                    }}
                  >
                    <div className="landing-feature-icon-large">
                      <img src={shield1} alt="Shield icon" />
                    </div>

                    <div
                      className="landing-feature-content"
                      style={{
                        paddingRight: '2rem',
                        paddingLeft: '2rem',
                        position: 'absolute',
                        top: '60%',
                        left: '50%',
                        transform: 'translate(-50%, -50%)',
                        zIndex: 10,
                        width: '100%',
                        textAlign: 'start',
                      }}
                    >
                      <h3
                        className="landing-feature-title"
                        style={{ fontSize: '2.8rem' }}
                      >
                        Stay Safe from Liquidations
                      </h3>
                      <p
                        className="landing-feature-description"
                        style={{
                          color: '#ffffff',
                          overflowWrap: 'break-word',
                          paddingTop: '0rem',
                        }}
                      >
                        Avoid price wicks with transparent, <br />
                        sub-second Chainlink oracles tailor-made for GMTrade
                      </p>
                    </div>
                  </div>
                  {/* Support for Numerous Assets */}
                  <div className="landing-feature-card landing-feature-card-assets">
                    <div
                      className="landing-feature-content"
                      style={{
                        padding: isScreen1024 ? '0 2rem' : '0 2rem',
                        gap: '0rem',
                      }}
                    >
                      <h3
                        className="landing-feature-title"
                        style={{ fontSize: isScreen1024 ? '2.4rem' : '2.8rem' }}
                      >
                        {/* Support for Numerous Assets */}
                        FX, commodities & stocks
                      </h3>
                      <p
                        className="landing-feature-description"
                        style={{ paddingTop: '1.1rem' }}
                      >
                        {/* Use your preferred token to pay and collateralize your
                        positions */}
                        Trade traditional markets on-chain with up to 500x
                        leverage, low entry barriers, and minimal trading fees.
                      </p>
                    </div>
                    <div className="landing-feature-tokens">
                      {marketTokenSymbols.length > 0 &&
                        marketTokenSymbols.slice(0, 32).map((symbol) => {
                          if (!symbol) return null;
                          // const displaySymbol = symbol === 'wgmx' ? 'gmx' : symbol;
                          const iconPath = getIconUrlPath(symbol, 24);
                          return iconPath ? (
                            <div key={symbol} className="landing-token-icon">
                              <img
                                src={iconPath}
                                alt={symbol}
                                width={40}
                                height={40}
                                onError={(e) => {
                                  (e.target as HTMLImageElement).style.display =
                                    'none';
                                }}
                              />
                            </div>
                          ) : null;
                        })}
                    </div>
                  </div>
                  {/* Secure & Permissionless */}
                  <div className="landing-feature-card landing-feature-card-secure">
                    <div
                      className="landing-feature-content"
                      style={{ gap: '2rem' }}
                    >
                      <h3 className="landing-feature-title">
                        Secure & Permissionless
                      </h3>
                      <div className="landing-feature-list">
                        <div className="landing-feature-list-item">
                          <img src={Unread} alt="Unread icon" />
                          <span>No deposits required</span>
                        </div>
                        <div className="landing-feature-list-item">
                          <img src={Unread} alt="Unread icon" />
                          <span>Trade from your wallet</span>
                        </div>
                        <div className="landing-feature-list-item">
                          <img src={Unread} alt="Unread icon" />
                          <span>No loss of fund ownership</span>
                        </div>
                      </div>
                    </div>
                  </div>
                  {/* Save on Costs */}
                  <div className="landing-feature-card landing-feature-card-costs">
                    <div className="landing-feature-icon-box">
                      <div className="gear">
                        <img src={safety} alt="Gear icon" />
                      </div>
                      <div className="guaranteed-liquidity">
                        <div className="landing-feature-tag">
                          KEEP MORE OF WHAT YOU EARN
                        </div>
                        <div className="landing-feature-title">
                          Save on Costs
                        </div>
                      </div>
                    </div>
                    <div className="landing-feature-content">
                      <p
                        className="landing-feature-description"
                        style={{ borderTop: '1px solid #3C4067' }}
                      >
                        Trade at scale without worrying about thin order books
                        or slippage
                      </p>
                    </div>
                  </div>

                  {!isScreen480 ? (
                    <div
                      className="landing-feature-card landing-feature-card-mint"
                      style={{ padding: '0', paddingLeft: '2.8rem' }}
                    >
                      <div className="landing-feature-content">
                        <h3
                          className="landing-feature-title"
                          style={{ fontSize: '2.8rem' }}
                        >
                          Trade to Mint
                        </h3>
                        <p
                          className="landing-feature-description"
                          style={{ paddingTop: '0rem' }}
                        >
                          Earn GT points from every trade and build long-term
                          upside through the growing GT ecosystem
                        </p>
                      </div>
                      <div className="landing-feature-mint-right">
                        <button
                          className="landing-feature-trade-btn"
                          onClick={handleTradeNow}
                        >
                          Trade Now
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div
                      className="landing-feature-card landing-feature-card-mint"
                      style={{ padding: '2rem', paddingLeft: '2rem' }}
                    >
                      <div className="landing-feature-content">
                        <h3 className="landing-feature-title">Trade to Mint</h3>
                        <p
                          className="landing-feature-description"
                          style={{ paddingTop: '0rem' }}
                        >
                          Earn GT points from every trade and build long-term
                          upside through the growing GT ecosystem
                        </p>
                        <button
                          className="landing-feature-trade-btn"
                          onClick={handleTradeNow}
                          style={{ width: '100%' }}
                        >
                          Trade Now
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
            <LandingFooter />
          </div>

          {showNav && <NavigationLink onClose={() => setShowNav(false)} />}

          {showTermsModal && (
            <div className="fixed left-0 top-0 z-[1000] flex h-full w-full items-center justify-center bg-black/50">
              <TermsModal onClose={handleCloseTermsModal} />
            </div>
          )}
        </>
      )}
    </>
  );
}

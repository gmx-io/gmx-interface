import './Header.scss';

import { HeaderLink } from '@/components/Header/HeaderLink';
import Tooltip from '@/components/Common/Tooltip/Tooltip';
import logoImg from '@/img/logo_gmx_solana_24.svg';
import { Trans } from '@lingui/macro';
import { FiX, FiChevronDown } from 'react-icons/fi';
import { Link, useLocation } from 'react-router-dom';
import { getGmw235Enabled, getGmw431Enabled } from '@/config/featureFlagEnable';
import { isTradePathname } from '@/utils/market/marketSlug';
import { useState, useEffect, useRef } from 'react';
import { t } from '@lingui/macro';
import { useMedia } from 'react-use';

import IconTrader from '@/img/header/trade.svg?react';
import IconCompetition from '@/img/header/competition.svg?react';
import IconDashboard from '@/img/header/dashboard.svg?react';
import IconEarn from '@/img/header/earn.svg?react';
import DataBase from '@/img/header/Database.svg?react';
import IconGt1 from '@/img/header/gt1.svg?react';
import IconReferrals from '@/img/header/referrals.svg?react';
import IconPortfolio from '@/img/header/portfolio.svg?react';
import IconStats from '@/img/header/stats.svg?react';
import IconLeaderboard from '@/img/header/leaderboard.svg?react';

interface Props {
  small?: boolean;
  clickCloseIcon?: () => void;
  openSettings?: () => void;
  collapsed?: boolean;
}

export function AppHeaderLinks({ small, clickCloseIcon, collapsed }: Props) {
  const [isMoreMenuOpen, setIsMoreMenuOpen] = useState(false);
  const isMobile = useMedia('(max-width: 1200px)');
  const moreMenuRef = useRef<HTMLDivElement>(null);
  const location = useLocation();

  const isActiveRoute = (path: string) => {
    if (path === '/pools') {
      return location.pathname.startsWith('/pools');
    }
    if (getGmw431Enabled() && path === '/gt') {
      return location.pathname.startsWith('/gt');
    }
    if (getGmw235Enabled() && path === '/trade') {
      return isTradePathname(location.pathname);
    }
    return location.pathname === path;
  };

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        moreMenuRef.current &&
        !moreMenuRef.current.contains(event.target as Node)
      ) {
        setIsMoreMenuOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const moreLinks = [
    {
      text: 'Dune',
      // href: 'https://dune.com/gmx_solana/gmxsol-analytics',
      href: 'https://dune.com/gmtrade/gmtrade-analytics',
      isExternal: true,
    },
    {
      text: t`Docs`,
      href: 'https://docs.gmxsol.io/',
      isExternal: true,
    },
    {
      text: t`Media Kit`,
      href: 'https://github.com/gmsol-labs/gmx-solana-media-kit',
      isExternal: true,
    },
    {
      text: t`Audit Report`,
      href: 'https://github.com/gmsol-labs/gmx-solana-audits',
      isExternal: true,
    },
    {
      text: t`User Terms`,
      href: 'https://docs.gmtrade.xyz/legal/user_terms',
      isExternal: false,
    },
    {
      text: t`Referral Terms`,
      href: 'https://docs.gmtrade.xyz/legal/referral_terms',
      isExternal: false,
    },
    { text: t`Community`, href: '/community', isExternal: false },
    {
      text: t`Charts by TradingView`,
      href: 'https://www.tradingview.com/',
      isExternal: true,
    },
  ];

  // const handleMoreClick = (event: React.MouseEvent) => {
  //   event.stopPropagation();
  //   setIsMoreMenuOpen(!isMoreMenuOpen);
  // };

  return (
    <div className="App-header-links">
      {small && (
        <div className="App-header-links-header">
          <Link className="App-header-link-main" to="/">
            <img
              src={logoImg}
              alt="GMX Solana Logo"
              className="h-[20px] w-[20px]"
            />
          </Link>
          <div
            className="App-header-menu-icon-block mobile-cross-menu"
            onClick={() => clickCloseIcon && clickCloseIcon()}
          >
            <FiX className="App-header-menu-icon" />
          </div>
        </div>
      )}

      <div
        className={`App-header-link-container ${isActiveRoute('/trade') ? 'active' : ''}`}
      >
        <HeaderLink
          to="/trade"
          onClick={() => clickCloseIcon && clickCloseIcon()}
        >
          <IconTrader
            fill="currentColor"
            style={{
              width: '24px',
              height: '24px',
              color: isActiveRoute('/trade') ? '#fff' : '#A3A3A3',
            }}
          />
          {collapsed && (
            <span className="text">
              <Trans>Trade</Trans>
            </span>
          )}
          {!collapsed && <Trans>Trade</Trans>}
        </HeaderLink>
      </div>
      {/* <div
        className={`App-header-link-container ${isActiveRoute('/competition') ? 'active' : ''}`}
      >
        <HeaderLink to="/competition">
          <IconCompetition
            fill="currentColor"
            style={{
              width: '24px',
              height: '24px',
              color: isActiveRoute('/competition') ? '#fff' : '#A3A3A3',
            }}
          />
          {collapsed && (
            <span className="text">
              <Trans>Competition</Trans>
            </span>
          )}
          {!collapsed && <Trans>Competition</Trans>}
        </HeaderLink>
      </div> */}
      <div
        className={`App-header-link-container ${isActiveRoute('/pools') ? 'active' : ''}`}
      >
        <HeaderLink
          to="/pools"
          onClick={() => clickCloseIcon && clickCloseIcon()}
        >
          <DataBase
            fill="currentColor"
            style={{
              width: '24px',
              height: '24px',
              color: isActiveRoute('/pools') ? '#fff' : '#A3A3A3',
            }}
          />
          {collapsed && (
            <span className="text">
              <Trans>Pools</Trans>
            </span>
          )}
          {!collapsed && <Trans>Pools</Trans>}
        </HeaderLink>
      </div>
      {/* <div
        className={`App-header-link-container ${isActiveRoute('/dashboard') ? 'active' : ''}`}
      >
        <HeaderLink
          to="/dashboard"
          onClick={() => clickCloseIcon && clickCloseIcon()}
        >
          <IconDashboard
            fill="currentColor"
            style={{
              width: '24px',
              height: '24px',
              color: isActiveRoute('/dashboard') ? '#fff' : '#A3A3A3',
            }}
          />
          {collapsed && (
            <span className="text">
              <Trans>Dashboard</Trans>
            </span>
          )}
          {!collapsed && <Trans>Dashboard</Trans>}
        </HeaderLink>
      </div> */}

      <div
        className={`App-header-link-container ${isActiveRoute('/stake') ? 'active' : ''}`}
      >
        <HeaderLink
          to="/stake"
          onClick={() => clickCloseIcon && clickCloseIcon()}
        >
          <IconEarn
            fill="currentColor"
            style={{
              width: '24px',
              height: '24px',
              color: isActiveRoute('/stake') ? '#fff' : '#A3A3A3',
            }}
          />
          {collapsed && (
            <span className="text">
              <Trans>Stake</Trans>
            </span>
          )}
          {!collapsed && <Trans>Stake</Trans>}
        </HeaderLink>
      </div>
      <div
        className={`App-header-link-container ${isActiveRoute('/gt') ? 'active' : ''}`}
      >
        <HeaderLink
          to={getGmw431Enabled() ? '/gt/my' : '/gt'}
          onClick={() => clickCloseIcon && clickCloseIcon()}
        >
          <IconGt1
            style={{
              width: '24px',
              height: '24px',
              color: isActiveRoute('/gt') ? '#fff' : '#A3A3A3',
            }}
          />
          {collapsed && (
            <span className="text">
              <Trans>GT Points</Trans>
            </span>
          )}
          {!collapsed && <Trans>GT Points</Trans>}
        </HeaderLink>
      </div>
      <div
        className={`App-header-link-container ${isActiveRoute('/stats') ? 'active' : ''}`}
      >
        <HeaderLink
          to="/stats"
          onClick={() => clickCloseIcon && clickCloseIcon()}
        >
          <IconStats
            fill="currentColor"
            style={{
              width: '24px',
              height: '24px',
              color: isActiveRoute('/stats') ? '#fff' : '#A3A3A3',
            }}
          />
          {collapsed && (
            <span className="text">
              <Trans>Stats</Trans>
            </span>
          )}

          {!collapsed && <Trans>Stats</Trans>}
        </HeaderLink>
      </div>
      <div
        className={`App-header-link-container ${isActiveRoute('/referrals') ? 'active' : ''}`}
      >
        <HeaderLink
          to="/referrals"
          onClick={() => clickCloseIcon && clickCloseIcon()}
        >
          <IconReferrals
            fill="currentColor"
            style={{
              width: '24px',
              height: '24px',
              color: isActiveRoute('/referrals') ? '#fff' : '#A3A3A3',
            }}
          />
          {collapsed && (
            <span className="text">
              <Trans>Referrals</Trans>
            </span>
          )}
          {!collapsed && <Trans>Referrals</Trans>}
        </HeaderLink>
      </div>
      {/* <div
        className={`App-header-link-container ${isActiveRoute('/leaderboard') ? 'active' : ''}`}
      >
        <HeaderLink
          to="/leaderboard"
          onClick={() => clickCloseIcon && clickCloseIcon()}
        >
          <IconLeaderboard
            fill="currentColor"
            style={{
              width: '24px',
              height: '24px',
              color: isActiveRoute('/leaderboard') ? '#fff' : '#A3A3A3',
            }}
          />
          {collapsed && (
            <span className="text">
              <Trans>Leaderboard</Trans>
            </span>
          )}
          {!collapsed && <Trans>Leaderboard</Trans>}
        </HeaderLink>
      </div> */}
      {/* <div
        className={`App-header-link-container ${isActiveRoute('/portfolio') ? 'active' : ''}`}
      >
        <HeaderLink
          to="/portfolio"
          onClick={() => clickCloseIcon && clickCloseIcon()}
        >
          <IconPortfolio
            fill="currentColor"
            style={{
              width: '24px',
              height: '24px',
              color: isActiveRoute('/portfolio') ? '#fff' : '#A3A3A3',
            }}
          />
          {collapsed && (
            <span className="text">
              <Trans>Portfolio</Trans>
            </span>
          )}

          {!collapsed && <Trans>Portfolio</Trans>}
        </HeaderLink>
      </div> */}

      {/* <div className="App-header-link-container" ref={moreMenuRef}>
        <HeaderLink
          as="button"
          onClick={handleMoreClick}
          aria-expanded={isMoreMenuOpen}
        >
          <div className="flex items-center gap-1">
            <Trans>More</Trans>
            <FiChevronDown
              className={`transition-transform ${isMoreMenuOpen ? 'rotate-180' : ''}`}
            />
          </div>
        </HeaderLink>
        <div className={`dropdown-menu ${isMoreMenuOpen ? 'show' : ''}`}>
          {moreLinks.map((link) => (
            <HeaderLink
              key={link.text}
              to={link.href}
              isExternal={link.isExternal}
              onClick={() => {
                if (!isMobile) {
                  setIsMoreMenuOpen(false);
                } else {
                  clickCloseIcon && clickCloseIcon();
                }
              }}
            >
              {link.text}
            </HeaderLink>
          ))}
        </div>
      </div> */}
    </div>
  );
}

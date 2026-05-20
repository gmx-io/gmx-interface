import { t, Trans } from "@lingui/macro";
import { useLingui } from "@lingui/react";
import cx from "classnames";
import { ReactNode, useCallback, useState } from "react";
import { Link, useLocation } from "react-router-dom";

import { POINTS_NAV_NEW_BADGE_CLICKED_KEY } from "config/localStorage";
import { useTheme } from "context/ThemeContext/ThemeContext";
import { useMegaethPointsActive } from "domain/synthetics/common/useMegaethPointsActive";
import { isIncentivesEnabled } from "domain/synthetics/incentives/constants";
import { useChainId } from "lib/chains";
import { useLocalStorageSerializeKey } from "lib/localStorage";
import { sendPointsPageNavigationEvent } from "lib/userAnalytics/pointsEvents";

import ExternalLink from "components/ExternalLink/ExternalLink";
import ModalWithPortal from "components/Modal/ModalWithPortal";
import LanguageModalContent from "components/NetworkDropdown/LanguageModalContent";

import DashboardIcon from "img/dashboard.svg?react";
import DatabaseIcon from "img/database.svg?react";
import DocsIcon from "img/docs.svg?react";
import EcosystemIcon from "img/ecosystem.svg?react";
import EarnIcon from "img/ic_earn.svg?react";
import ReferralsIcon from "img/ic_referrals.svg?react";
import { IcMultiplier as PointsIcon } from "img/IcMultiplier";
import LeaderboardIcon from "img/leaderboard.svg?react";
import logoIcon from "img/logo-icon.svg";
import LogoText from "img/logo-text.svg?react";
import sparkleIcon from "img/sparkle.svg";
import TradeIcon from "img/trade.svg?react";

import { BottomMenuSection } from "./BottomMenuSection";

import "./NavItem.scss";

function SideNav({ className }: { className?: string }) {
  const [isCollapsed, setIsCollapsed] = useLocalStorageSerializeKey("is-side-nav-collapsed", false);
  const [isLanguageModalOpen, setIsLanguageModalOpen] = useState(false);
  const { theme, setThemeMode } = useTheme();
  const { i18n } = useLingui();

  const handleCollapseToggle = useCallback(() => {
    setIsCollapsed(!isCollapsed);
  }, [isCollapsed, setIsCollapsed]);

  const handleOpenLanguageModal = useCallback(() => {
    setIsLanguageModalOpen(true);
  }, []);

  const handleCloseLanguageModal = useCallback(() => {
    setIsLanguageModalOpen(false);
  }, []);

  const handleThemeToggle = useCallback(() => {
    setThemeMode(theme === "dark" ? "light" : "dark");
  }, [setThemeMode, theme]);

  return (
    <>
      <nav
        className={cx("flex h-full shrink-0 flex-col bg-slate-950", className, {
          "w-[172px] max-xl:w-[144px]": !isCollapsed,
        })}
      >
        <div className={cx("flex w-full", { "justify-center": isCollapsed })}>
          <LogoSection isCollapsed={isCollapsed} />
        </div>

        <div className="flex flex-1 flex-col justify-between">
          <MenuSection isCollapsed={isCollapsed} />

          <BottomMenuSection
            isCollapsed={isCollapsed}
            isDarkTheme={theme === "dark"}
            onCollapseToggle={handleCollapseToggle}
            onLanguageClick={handleOpenLanguageModal}
            onThemeToggle={handleThemeToggle}
          />
        </div>
      </nav>
      <ModalWithPortal
        className="language-popup"
        isVisible={isLanguageModalOpen}
        setIsVisible={setIsLanguageModalOpen}
        label={t`Select language`}
      >
        <LanguageModalContent currentLanguage={i18n.locale} onClose={handleCloseLanguageModal} />
      </ModalWithPortal>
    </>
  );
}

export const DocsNavItem = ({ isCollapsed }: { isCollapsed: boolean | undefined }) => (
  <NavItem icon={<DocsIcon />} label={t`Docs`} isCollapsed={isCollapsed} to="https://docs.gmx.io/" external />
);

export function LogoSection({ isCollapsed }: { isCollapsed: boolean | undefined }) {
  return (
    <Link
      to="/"
      className={cx("flex cursor-pointer items-center justify-center gap-5 pb-16 pt-10 text-typography-primary", {
        "pl-12 pr-20": !isCollapsed,
      })}
    >
      <img src={logoIcon} alt={t`GMX logo`} />
      {!isCollapsed ? <LogoText /> : null}
    </Link>
  );
}

export interface NavItemProps {
  icon: ReactNode;
  label: ReactNode;
  isActive?: boolean;
  isCollapsed: boolean | undefined;
  onClick?: () => void;
  to?: string;
  external?: boolean;
  showNewBadge?: boolean;
}

export function NavItem({
  icon,
  label,
  isActive = false,
  isCollapsed = false,
  onClick,
  to,
  external,
  showNewBadge = false,
}: NavItemProps) {
  const showCollapsedGradient = isCollapsed && showNewBadge;

  const newBadge = showNewBadge ? (
    <>
      {" "}
      <span className="text-body-small rounded-full bg-blue-300/20 px-6 py-1">
        <span className="nav-new-badge inline-block font-medium">
          <Trans>New</Trans>
        </span>
      </span>
    </>
  ) : null;

  const iconWithGradient = (
    <div className="relative flex size-20 shrink-0 items-center justify-center [&>svg]:w-full">
      {showCollapsedGradient && (
        <svg className="nav-icon-gradient-defs" aria-hidden="true" width="0" height="0" focusable="false">
          <defs>
            <linearGradient id="nav-icon-collapsed-gradient" x1="-60%" y1="0%" x2="160%" y2="100%">
              <animateTransform
                attributeName="gradientTransform"
                type="translate"
                values="-0.22 0;0.22 0;-0.22 0"
                dur="4.8s"
                repeatCount="indefinite"
              />
              <stop offset="0%" stopColor="#2D42FC" />
              <stop offset="80%" stopColor="#A4C3F9" />
              <stop offset="100%" stopColor="#A4C3F9" />
            </linearGradient>
          </defs>
        </svg>
      )}
      <span className={cx({ "nav-icon-gradient-collapsed": showCollapsedGradient })}>{icon}</span>
    </div>
  );

  const button = (
    <button className={cx("group cursor-pointer select-none py-1", { "w-full": !isCollapsed })} onClick={onClick}>
      <div
        className={cx(
          `relative flex cursor-pointer items-center gap-8
          rounded-8 px-12 py-10 text-typography-secondary group-hover:bg-blue-400/20 group-hover:text-blue-400
          dark:group-hover:bg-slate-700 dark:group-hover:text-typography-primary`,
          {
            "bg-blue-400/20 !text-blue-400 dark:bg-slate-700 dark:!text-typography-primary": isActive,
            "w-full": !isCollapsed,
          }
        )}
      >
        {iconWithGradient}
        <span className={cx("text-body-medium font-medium tracking-[-1.2%]", { hidden: isCollapsed })}>
          {label}
          {newBadge}
        </span>

        <div
          className={cx(
            `absolute left-0 top-0 z-30 hidden items-center gap-8 rounded-8
            bg-slate-800 text-blue-400 dark:text-typography-primary`,
            { "group-hover:flex": isCollapsed }
          )}
        >
          <div className="flex items-center gap-8 rounded-8 bg-blue-400/20 px-12 py-10 dark:bg-slate-700">
            <div className="flex size-20 shrink-0 items-center justify-center [&>svg]:w-full">{icon}</div>
            <span className={cx("text-body-medium whitespace-nowrap font-medium tracking-[-1.2%]")}>
              {label}
              {newBadge}
            </span>
          </div>
        </div>
      </div>
    </button>
  );

  const content = to ? (
    external ? (
      <ExternalLink className="w-full !no-underline" href={to}>
        {button}
      </ExternalLink>
    ) : (
      <Link to={to}>{button}</Link>
    )
  ) : (
    button
  );

  return <li className="p-0 first:-mt-4">{content}</li>;
}

export function MenuSection({
  isCollapsed,
  onMenuItemClick,
}: {
  isCollapsed: boolean | undefined;
  onMenuItemClick?: () => void;
}) {
  const { chainId } = useChainId();
  const showPoints = isIncentivesEnabled(chainId);
  const [pointsClicked, setPointsClicked] = useLocalStorageSerializeKey(POINTS_NAV_NEW_BADGE_CLICKED_KEY, false);
  const isMegaethPointsActive = useMegaethPointsActive();

  const withMegaethSparkle = (label: string) =>
    isMegaethPointsActive ? (
      <span className="inline-flex items-center gap-4">
        {label}
        <img className="h-10" src={sparkleIcon} alt="" />
      </span>
    ) : (
      label
    );

  const mainNavItems = [
    {
      icon: <TradeIcon className="size-20" />,
      label: withMegaethSparkle(t`Trade`),
      key: "trade",
      to: "/trade",
    },
    { icon: <EarnIcon className="size-20" />, label: t`Earn`, key: "earn", to: "/earn" },
    {
      icon: <DatabaseIcon className="size-20" />,
      label: withMegaethSparkle(t`Pools`),
      key: "pools",
      to: "/pools",
    },
    { icon: <DashboardIcon className="size-20" />, label: t`Stats`, key: "stats", to: "/stats" },
    {
      icon: <ReferralsIcon className="size-20" />,
      label: withMegaethSparkle(t`Referrals`),
      key: "referrals",
      to: "/referrals",
    },
    ...(showPoints
      ? [{ icon: <PointsIcon className="size-20" />, label: t`Points`, key: "points", to: "/points" }]
      : []),
    { icon: <LeaderboardIcon className="size-20" />, label: t`Leaderboard`, key: "leaderboard", to: "/leaderboard" },
    { icon: <EcosystemIcon className="size-20" />, label: t`Ecosystem`, key: "ecosystem", to: "/ecosystem" },
  ];

  const { pathname } = useLocation();

  const handleItemClick = useCallback(
    (key: string) => {
      if (key === "points") {
        sendPointsPageNavigationEvent({ source: "Menu" });

        if (!pointsClicked) {
          setPointsClicked(true);
        }
      }
      onMenuItemClick?.();
    },
    [pointsClicked, setPointsClicked, onMenuItemClick]
  );

  return (
    <ul className="flex list-none flex-col px-0">
      {mainNavItems.map((item) => (
        <NavItem
          key={item.key}
          icon={item.icon}
          label={item.label}
          showNewBadge={item.key === "points" && !pointsClicked}
          isActive={pathname === item.to || pathname.startsWith(`${item.to}/`)}
          isCollapsed={isCollapsed}
          to={item.to}
          onClick={() => handleItemClick(item.key)}
        />
      ))}
    </ul>
  );
}

export default SideNav;

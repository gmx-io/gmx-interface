import { t } from "@lingui/macro";
import cx from "classnames";
import { ReactNode, useCallback, useMemo } from "react";
import { Link, useLocation } from "react-router-dom";

import { useLocalStorageSerializeKey } from "lib/localStorage";

import CollapseIcon from "img/collapse.svg?react";
import DashboardIcon from "img/dashboard.svg?react";
import DatabaseIcon from "img/database.svg?react";
import DocsIcon from "img/docs.svg?react";
import EarnIcon from "img/earn.svg?react";
import EcosystemIcon from "img/ecosystem.svg?react";
import BuyIcon from "img/ic_buy.svg?react";
import LeaderboardIcon from "img/leaderboard.svg?react";
import logoIcon from "img/logo-icon.svg";
import logoText from "img/logo-text.svg";
import ReferralsIcon from "img/referrals.svg?react";
import TradeIcon from "img/trade.svg?react";

import { LanguageNavItem } from "./LanguageNavItem";

function SideNav({ className }: { className?: string }) {
  const [isCollapsed, setIsCollapsed] = useLocalStorageSerializeKey("is-side-nav-collapsed", false);

  const handleCollapseToggle = useCallback(() => {
    setIsCollapsed(!isCollapsed);
  }, [isCollapsed, setIsCollapsed]);

  return (
    <nav
      className={cx("flex h-full shrink-0 flex-col bg-slate-950 pb-8", className, {
        "w-[200px] max-xl:w-[156px]": !isCollapsed,
      })}
    >
      <div className={cx("flex w-full", { "justify-center": isCollapsed })}>
        <LogoSection isCollapsed={isCollapsed} />
      </div>

      <div className="flex flex-1 flex-col justify-between">
        <MenuSection isCollapsed={isCollapsed} />

        <ul className={cx("flex list-none flex-col px-0")}>
          <LanguageNavItem isCollapsed={isCollapsed} NavItem={NavItem} />
          <DocsNavItem isCollapsed={isCollapsed} />
          <NavItem
            icon={<CollapseIcon />}
            label={t`Collapse`}
            isCollapsed={isCollapsed}
            onClick={handleCollapseToggle}
          />
        </ul>
      </div>
    </nav>
  );
}

export const DocsNavItem = ({ isCollapsed }: { isCollapsed: boolean | undefined }) => (
  <NavItem icon={<DocsIcon />} label={t`Docs`} isCollapsed={isCollapsed} to="https://docs.gmx.io" external />
);

export function LogoSection({ isCollapsed }: { isCollapsed: boolean | undefined }) {
  return (
    <Link
      to="/"
      className={cx("flex cursor-pointer items-center justify-center gap-5 pb-16 pt-10", {
        "pl-12 pr-20": !isCollapsed,
      })}
    >
      <img src={logoIcon} alt="GMX Logo" className="h-22" />
      {!isCollapsed && <img src={logoText} alt="GMX" className="h-18" />}
    </Link>
  );
}

interface NavItemProps {
  icon: ReactNode;
  label: ReactNode;
  isActive?: boolean;
  isCollapsed: boolean | undefined;
  onClick?: () => void;
  to?: string;
  external?: boolean;
}

export function NavItem({ icon, label, isActive = false, isCollapsed = false, onClick, to, external }: NavItemProps) {
  const button = (
    <button className={cx("group cursor-pointer py-4", { "w-full": !isCollapsed })} onClick={onClick}>
      <div
        className={cx(
          `relative flex cursor-pointer items-center gap-8
        rounded-8 px-16 py-8 text-slate-100 transition-colors
        group-hover:bg-slate-700 group-hover:text-white`,
          {
            "bg-slate-700 text-white": isActive,
            "w-full": !isCollapsed,
          }
        )}
      >
        <div className="flex size-24 h-24 w-24 shrink-0 items-center justify-center [&>svg]:w-full">{icon}</div>
        <span className={cx("text-body-medium font-medium tracking-[-1.2%]", { hidden: isCollapsed })}>{label}</span>

        <div
          className={cx(
            `absolute left-0 top-0 z-30 hidden items-center gap-8 rounded-8
            bg-slate-700 px-16 py-8 text-white`,
            { "group-hover:flex": isCollapsed }
          )}
        >
          <div className="flex h-24 w-24 shrink-0 items-center justify-center">{icon}</div>
          <span className={cx("text-body-medium font-medium tracking-[-1.2%]")}>{label}</span>
        </div>
      </div>
    </button>
  );

  const content = to ? (
    external ? (
      <a href={to} target="_blank" rel="noopener noreferrer">
        {button}
      </a>
    ) : (
      <Link to={to}>{button}</Link>
    )
  ) : (
    button
  );

  return <li className="p-0 first:-mt-4">{content}</li>;
}

type NavItemType = {
  icon: ReactNode;
  label: string;
  key: string;
  to?: string;
};

export function MenuSection({ isCollapsed }: { isCollapsed: boolean | undefined }) {
  const mainNavItems = useMemo(
    (): NavItemType[] => [
      { icon: <TradeIcon />, label: t`Trade`, key: "trade", to: "/trade" },
      { icon: <DatabaseIcon />, label: t`Pools`, key: "pools", to: "/pools" },
      { icon: <EarnIcon />, label: t`Stake`, key: "stake", to: "/stake" },
      { icon: <DashboardIcon />, label: t`Stats`, key: "stats", to: "/stats" },
      { icon: <BuyIcon />, label: t`Buy`, key: "buy", to: "/buy" },
      { icon: <ReferralsIcon />, label: t`Referrals`, key: "referrals", to: "/referrals" },
      { icon: <LeaderboardIcon />, label: t`Leaderboard`, key: "leaderboard", to: "/leaderboard" },
      { icon: <EcosystemIcon />, label: t`Ecosystem`, key: "ecosystem", to: "/ecosystem" },
    ],
    []
  );

  const { pathname } = useLocation();

  return (
    <ul className={cx("flex list-none flex-col px-0")}>
      {mainNavItems.map((item) => (
        <NavItem
          key={item.key}
          icon={item.icon}
          label={item.label}
          isActive={pathname === item.to}
          isCollapsed={isCollapsed}
          to={item.to}
        />
      ))}
    </ul>
  );
}

export default SideNav;

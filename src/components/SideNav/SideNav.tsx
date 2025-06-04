import { t } from "@lingui/macro";
import cx from "classnames";
import { ReactNode, useCallback, useMemo, useState } from "react";
import { Link, useLocation } from "react-router-dom";

import CollapseIcon from "img/collapse.svg?react";
import DashboardIcon from "img/dashboard.svg?react";
import DatabaseIcon from "img/database.svg?react";
import DocsIcon from "img/docs.svg?react";
import EarnIcon from "img/earn.svg?react";
import EcosystemIcon from "img/ecosystem.svg?react";
import LeaderboardIcon from "img/leaderboard.svg?react";
import logoIcon from "img/logo-icon.svg";
import logoText from "img/logo-text.svg";
import ReferralsIcon from "img/referrals.svg?react";
import TradeIcon from "img/trade.svg?react";

function SideNav() {
  const [isCollapsed, setIsCollapsed] = useState(false);

  const handleCollapseToggle = useCallback(() => {
    setIsCollapsed((prev) => !prev);
  }, []);

  return (
    <nav
      className={cx("flex shrink-0 flex-col bg-new-slate-900", {
        "w-[164px]": !isCollapsed,
      })}
    >
      <div className={cx("flex w-full", { "justify-center": isCollapsed })}>
        <LogoSection isCollapsed={isCollapsed} />
      </div>

      <div className="flex flex-1 flex-col justify-between">
        <MenuSection isCollapsed={isCollapsed} />

        <ul className={cx("flex list-none flex-col gap-8 px-0")}>
          <NavItem icon={<DocsIcon />} label={t`Docs`} isCollapsed={isCollapsed} to="https://docs.gmx.io" external />
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

function LogoSection({ isCollapsed }: { isCollapsed: boolean }) {
  return (
    <Link
      to="/"
      className={cx("flex cursor-pointer items-center justify-center gap-5 pb-16 pl-12 pt-10", {
        "px-20": !isCollapsed,
      })}
    >
      <img src={logoIcon} alt="GMX Logo" />
      {!isCollapsed && <img src={logoText} alt="GMX" className="" />}
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

function NavItem({ icon, label, isActive = false, isCollapsed = false, onClick, to, external }: NavItemProps) {
  const button = (
    <button
      className={cx(
        `flex cursor-pointer items-center gap-8
        rounded-8 px-16 py-8 text-slate-100 transition-colors
        hover:bg-new-gray-200 hover:text-white`,
        {
          "bg-new-gray-200 text-white": isActive,
          "w-full": !isCollapsed,
        }
      )}
      onClick={onClick}
    >
      <div className="flex h-24 w-24 shrink-0 items-center justify-center">{icon}</div>
      {!isCollapsed ? <span className="text-body-medium font-medium tracking-[-1.2%]">{label}</span> : null}
    </button>
  );

  return (
    <li className="p-0">
      {to ? (
        external ? (
          <a href={to} target="_blank" rel="noopener noreferrer">
            {button}
          </a>
        ) : (
          <Link to={to}>{button}</Link>
        )
      ) : (
        button
      )}
    </li>
  );
}

type NavItemType = {
  icon: ReactNode;
  label: string;
  key: string;
  to?: string;
};

function MenuSection({ isCollapsed }: { isCollapsed: boolean }) {
  const mainNavItems = useMemo(
    (): NavItemType[] => [
      { icon: <TradeIcon />, label: t`Trade`, key: "trade", to: "/trade" },
      { icon: <DatabaseIcon />, label: t`Pools`, key: "pools", to: "/pools" },
      { icon: <EarnIcon />, label: t`Earn`, key: "earn", to: "/earn" },
      { icon: <DashboardIcon />, label: t`Stats`, key: "stats", to: "/stats" },
      { icon: <ReferralsIcon />, label: t`Referrals`, key: "referrals", to: "/referrals" },
      { icon: <LeaderboardIcon />, label: t`Leaderboard`, key: "leaderboard", to: "/leaderboard" },
      { icon: <EcosystemIcon />, label: t`Ecosystem`, key: "ecosystem", to: "/ecosystem" },
    ],
    []
  );

  const { pathname } = useLocation();

  return (
    <ul className={cx("flex list-none flex-col gap-8 px-0")}>
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

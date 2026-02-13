import { autoUpdate, flip, offset, shift, useFloating } from "@floating-ui/react";
import { Popover } from "@headlessui/react";
import { t } from "@lingui/macro";
import { useLingui } from "@lingui/react";
import cx from "classnames";
import { ReactNode, useCallback, useState } from "react";
import { Link, useLocation } from "react-router-dom";

import { useTheme } from "context/ThemeContext/ThemeContext";
import { useLocalStorageSerializeKey } from "lib/localStorage";

import ExternalLink from "components/ExternalLink/ExternalLink";
import ModalWithPortal from "components/Modal/ModalWithPortal";
import LanguageModalContent from "components/NetworkDropdown/LanguageModalContent";

import CollapseIcon from "img/collapse.svg?react";
import DashboardIcon from "img/dashboard.svg?react";
import DatabaseIcon from "img/database.svg?react";
import DocsIcon from "img/docs.svg?react";
import EcosystemIcon from "img/ecosystem.svg?react";
import EarnIcon from "img/ic_earn.svg?react";
import LanguageIcon from "img/ic_language.svg?react";
import MenuDotsIcon from "img/ic_menu_dots.svg?react";
import MoonIcon from "img/ic_moon.svg?react";
import SunIcon from "img/ic_sun.svg?react";
import LeaderboardIcon from "img/leaderboard.svg?react";
import logoIcon from "img/logo-icon.svg";
import LogoText from "img/logo-text.svg?react";
import ReferralsIcon from "img/referrals.svg?react";
import TradeIcon from "img/trade.svg?react";

import { SettingsNavItem } from "./SettingsNavItem";
import { SupportChatNavItem } from "./SupportChatNavItem";

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
        label={t`Select Language`}
      >
        <LanguageModalContent currentLanguage={i18n.locale} onClose={handleCloseLanguageModal} />
      </ModalWithPortal>
    </>
  );
}

function BottomMenuSection({
  isCollapsed,
  isDarkTheme,
  onCollapseToggle,
  onLanguageClick,
  onThemeToggle,
}: {
  isCollapsed: boolean | undefined;
  isDarkTheme: boolean;
  onCollapseToggle: () => void;
  onLanguageClick: () => void;
  onThemeToggle: () => void;
}) {
  return (
    <div>
      <ul className="flex list-none flex-col px-0">
        <SettingsNavItem isCollapsed={isCollapsed} />
        <SupportChatNavItem isCollapsed={isCollapsed} />
      </ul>

      <div className={cx("mt-4 border-t-1/2 border-slate-600", { "mx-12": isCollapsed })} />

      {!isCollapsed ? (
        <div className="pl-8 pt-4">
          <div className="flex items-center justify-between">
            <IconActionButton
              icon={<CollapseIcon className="size-16" />}
              label={t`Collapse`}
              onClick={onCollapseToggle}
            />
            <IconActionButton
              icon={isDarkTheme ? <MoonIcon className="size-16" /> : <SunIcon className="size-16" />}
              label={t`Dark Theme`}
              onClick={onThemeToggle}
            />
            <IconActionButton
              icon={<DocsIcon className="size-16" />}
              label={t`Docs`}
              to="https://docs.gmx.io"
              external
            />
            <IconActionButton
              icon={<LanguageIcon className="size-16" />}
              label={t`Language`}
              onClick={onLanguageClick}
            />
          </div>
        </div>
      ) : (
        <div className="pt-8">
          <ul className="flex list-none flex-col px-0">
            <li className="p-0 first:-mt-4">
              <CollapsedMoreMenu
                onLanguageClick={onLanguageClick}
                onThemeToggle={onThemeToggle}
                isDarkTheme={isDarkTheme}
              />
            </li>
            <li className="p-0">
              <IconActionButton
                icon={<CollapseIcon className="size-16 rotate-180" />}
                label={t`Expand`}
                onClick={onCollapseToggle}
                compact
              />
            </li>
          </ul>
        </div>
      )}
    </div>
  );
}

function CollapsedMoreMenu({
  onLanguageClick,
  onThemeToggle,
  isDarkTheme,
  floating,
}: {
  onLanguageClick: () => void;
  onThemeToggle: () => void;
  isDarkTheme: boolean;
  floating?: boolean;
}) {
  const { refs, floatingStyles } = useFloating({
    placement: "right-end",
    whileElementsMounted: autoUpdate,
    middleware: [offset(8), flip(), shift({ padding: 8 })],
  });

  return (
    <Popover className="relative">
      {({ close, open }) => (
        <>
          <div ref={refs.setReference}>
            <Popover.Button
              className={cx("group relative cursor-pointer select-none")}
              type="button"
              aria-label={t`More`}
            >
              <div
                className={cx(
                  "flex h-32 w-44 items-center justify-center rounded-8 text-typography-secondary hover:bg-blue-400/20 hover:text-blue-400 dark:hover:bg-slate-700 dark:hover:text-typography-primary",
                  {
                    "w-32": floating,
                  },
                  {
                    "bg-blue-400/20 !text-blue-400 dark:bg-slate-700 dark:!text-typography-primary": open,
                  }
                )}
              >
                <MenuDotsIcon className="size-16" />
              </div>
            </Popover.Button>
          </div>
          <Popover.Panel
            ref={refs.setFloating}
            style={floatingStyles}
            className="z-40 w-[160px] rounded-8 border border-slate-600 bg-slate-800 p-4 shadow-2xl"
          >
            <div className="flex flex-col gap-2">
              <DropdownActionRow
                icon={<LanguageIcon className="size-16" />}
                label={t`Language`}
                onClick={() => {
                  onLanguageClick();
                  close();
                }}
              />
              <ExternalLink className="!block !no-underline" href="https://docs.gmx.io">
                <DropdownActionRow icon={<DocsIcon className="size-16" />} label={t`Docs`} />
              </ExternalLink>
              <DropdownActionRow
                icon={isDarkTheme ? <MoonIcon className="size-16" /> : <SunIcon className="size-16" />}
                label={t`Dark Theme`}
                onClick={() => {
                  onThemeToggle();
                  close();
                }}
              />
            </div>
          </Popover.Panel>
        </>
      )}
    </Popover>
  );
}

function DropdownActionRow({ icon, label, onClick }: { icon: ReactNode; label: ReactNode; onClick?: () => void }) {
  const content = (
    <div className="flex items-center gap-8 rounded-8 px-8 py-7 text-typography-secondary hover:bg-blue-400/20 hover:text-blue-400 dark:hover:bg-slate-700 dark:hover:text-typography-primary">
      <div className="flex size-16 shrink-0 items-center justify-center">{icon}</div>
      <span className="text-body-medium whitespace-nowrap font-medium tracking-[-1.2%]">{label}</span>
    </div>
  );

  if (!onClick) {
    return content;
  }

  return (
    <button className="cursor-pointer text-left" type="button" onClick={onClick}>
      {content}
    </button>
  );
}

function IconActionButton({
  icon,
  label,
  onClick,
  to,
  external,
  compact,
  className,
}: {
  icon: ReactNode;
  label: ReactNode;
  onClick?: () => void;
  to?: string;
  external?: boolean;
  compact?: boolean;
  className?: string;
}) {
  const button = (
    <button
      className={cx("group relative cursor-pointer select-none", className)}
      type="button"
      onClick={onClick}
      aria-label={typeof label === "string" ? label : undefined}
    >
      <div
        className={cx(
          "flex items-center justify-center rounded-8 text-typography-secondary hover:bg-blue-400/20 hover:text-blue-400 dark:hover:bg-slate-700 dark:hover:text-typography-primary",
          compact ? "h-32 w-44" : "h-32 w-32"
        )}
      >
        {icon}
      </div>
    </button>
  );

  if (!to) {
    return button;
  }

  if (external) {
    return (
      <ExternalLink className="!no-underline" href={to}>
        {button}
      </ExternalLink>
    );
  }

  return <Link to={to}>{button}</Link>;
}

export const DocsNavItem = ({ isCollapsed }: { isCollapsed: boolean | undefined }) => (
  <NavItem icon={<DocsIcon />} label={t`Docs`} isCollapsed={isCollapsed} to="https://docs.gmx.io" external />
);

export function LogoSection({ isCollapsed }: { isCollapsed: boolean | undefined }) {
  return (
    <Link
      to="/"
      className={cx("flex cursor-pointer items-center justify-center gap-5 pb-16 pt-10 text-typography-primary", {
        "pl-12 pr-20": !isCollapsed,
      })}
    >
      <img src={logoIcon} alt="GMX Logo" />
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
}

export function NavItem({ icon, label, isActive = false, isCollapsed = false, onClick, to, external }: NavItemProps) {
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
        <div className="flex size-20 shrink-0 items-center justify-center [&>svg]:w-full">{icon}</div>
        <span className={cx("text-body-medium font-medium tracking-[-1.2%]", { hidden: isCollapsed })}>{label}</span>

        <div
          className={cx(
            `absolute left-0 top-0 z-30 hidden items-center gap-8 rounded-8
            bg-slate-800 text-blue-400 dark:text-typography-primary`,
            { "group-hover:flex": isCollapsed }
          )}
        >
          <div className="flex items-center gap-8 rounded-8 bg-blue-400/20 px-12 py-10 dark:bg-slate-700">
            <div className="flex size-20 shrink-0 items-center justify-center">{icon}</div>
            <span className={cx("text-body-medium whitespace-nowrap font-medium tracking-[-1.2%]")}>{label}</span>
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
  const mainNavItems = [
    { icon: <TradeIcon className="size-20" />, label: t`Trade`, key: "trade", to: "/trade" },
    { icon: <EarnIcon className="size-20" />, label: t`Earn`, key: "earn", to: "/earn" },
    { icon: <DatabaseIcon className="size-20" />, label: t`Pools`, key: "pools", to: "/pools" },
    { icon: <DashboardIcon className="size-20" />, label: t`Stats`, key: "stats", to: "/stats" },
    { icon: <ReferralsIcon className="size-20" />, label: t`Referrals`, key: "referrals", to: "/referrals" },
    { icon: <LeaderboardIcon className="size-20" />, label: t`Leaderboard`, key: "leaderboard", to: "/leaderboard" },
    { icon: <EcosystemIcon className="size-20" />, label: t`Ecosystem`, key: "ecosystem", to: "/ecosystem" },
  ];

  const { pathname } = useLocation();

  return (
    <ul className="flex list-none flex-col px-0">
      {mainNavItems.map((item) => (
        <NavItem
          key={item.key}
          icon={item.icon}
          label={item.label}
          isActive={pathname === item.to || pathname.startsWith(`${item.to}/`)}
          isCollapsed={isCollapsed}
          to={item.to}
          onClick={onMenuItemClick}
        />
      ))}
    </ul>
  );
}

export default SideNav;

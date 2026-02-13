import { autoUpdate, flip, offset, shift, useFloating } from "@floating-ui/react";
import { Popover } from "@headlessui/react";
import { t } from "@lingui/macro";
import cx from "classnames";
import { ReactNode } from "react";
import { Link } from "react-router-dom";

import ExternalLink from "components/ExternalLink/ExternalLink";

import CollapseIcon from "img/collapse.svg?react";
import DocsIcon from "img/docs.svg?react";
import LanguageIcon from "img/ic_language.svg?react";
import MenuDotsIcon from "img/ic_menu_dots.svg?react";
import MoonIcon from "img/ic_moon.svg?react";
import SunIcon from "img/ic_sun.svg?react";

import { SettingsNavItem } from "./SettingsNavItem";
import { SupportChatNavItem } from "./SupportChatNavItem";

interface BottomMenuSectionProps {
  isCollapsed: boolean | undefined;
  isDarkTheme: boolean;
  onCollapseToggle: () => void;
  onLanguageClick: () => void;
  onThemeToggle: () => void;
}

export function BottomMenuSection({
  isCollapsed,
  isDarkTheme,
  onCollapseToggle,
  onLanguageClick,
  onThemeToggle,
}: BottomMenuSectionProps) {
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
}: {
  onLanguageClick: () => void;
  onThemeToggle: () => void;
  isDarkTheme: boolean;
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

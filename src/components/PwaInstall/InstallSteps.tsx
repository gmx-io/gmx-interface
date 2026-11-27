import { Trans } from "@lingui/macro";
import cx from "classnames";
import { ReactNode, useState } from "react";

import { AlertInfoCard } from "components/AlertInfo/AlertInfoCard";

import BurgerMenuIcon from "img/ic_burger_menu.svg?react";
import ChevronDownIcon from "img/ic_chevron_down.svg?react";
import MenuDotsIcon from "img/ic_menu_dots.svg?react";

import { getIosSharePlace, PwaPlatform } from "./pwaPlatform";

export type InstallStep = { text: ReactNode; icon?: ReactNode };

/** The iOS Share glyph (a box with an arrow up), so people recognise the button they look for. */
function IosShareIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 16 16" fill="none" aria-hidden>
      <path d="M8 1.75v8.5M5.25 4.5 8 1.75l2.75 2.75" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
      <path
        d="M5.5 6.75H4.25A1.25 1.25 0 0 0 3 8v5a1.25 1.25 0 0 0 1.25 1.25h7.5A1.25 1.25 0 0 0 13 13V8a1.25 1.25 0 0 0-1.25-1.25H10.5"
        stroke="currentColor"
        strokeWidth="1.3"
        strokeLinecap="round"
      />
    </svg>
  );
}

const shareIcon = <IosShareIcon className="size-16" />;
const menuDotsIcon = <MenuDotsIcon className="size-16" />;

/** Install steps per platform. Shared by the install sheet and the download page, so both always say the same. */
export function getInstallSteps(platform: PwaPlatform, iosVersion: number | undefined): InstallStep[] {
  switch (platform) {
    case "iphone-chrome":
      return [
        { text: <Trans>Tap Share in the address bar</Trans>, icon: shareIcon },
        { text: <Trans>Scroll down and tap Add to Home Screen</Trans> },
        { text: <Trans>Tap Add</Trans> },
      ];
    case "iphone-other":
      return [
        { text: <Trans>Open the browser menu and tap Share</Trans>, icon: shareIcon },
        { text: <Trans>Scroll down and tap Add to Home Screen</Trans> },
        { text: <Trans>Tap Add</Trans> },
      ];
    case "android-chrome":
    case "android-other":
      return [
        { text: <Trans>Tap ⋮ in the browser bar</Trans>, icon: menuDotsIcon },
        { text: <Trans>Tap Install app or Add to home screen</Trans> },
        { text: <Trans>Tap Install</Trans> },
      ];
    case "desktop-chromium":
    case "desktop-other":
      return [
        { text: <Trans>Open the browser menu ⋮</Trans>, icon: menuDotsIcon },
        { text: <Trans>Choose Cast, save and share, then Install page as app</Trans> },
        { text: <Trans>Click Install</Trans> },
      ];
    case "desktop-safari":
      return [
        { text: <Trans>In the menu bar, click File</Trans> },
        { text: <Trans>Choose Add to Dock</Trans> },
        { text: <Trans>Click Add</Trans> },
      ];
    default:
      return [
        getIphoneSafariShareStep(iosVersion),
        { text: <Trans>Scroll down and tap Add to Home Screen</Trans> },
        { text: <Trans>Tap Add</Trans> },
      ];
  }
}

/** First iPhone Safari step: where Share sits depends on the iOS version (getIosSharePlace). */
function getIphoneSafariShareStep(iosVersion: number | undefined): InstallStep {
  switch (getIosSharePlace(iosVersion)) {
    case "page-menu":
      return {
        text: <Trans>Tap ≡ in the address bar, then Share</Trans>,
        icon: (
          <span className="flex gap-4">
            <BurgerMenuIcon className="size-16" />
            {shareIcon}
          </span>
        ),
      };
    case "more-menu":
      return {
        text: <Trans>Tap ••• next to the address bar, then Share</Trans>,
        icon: (
          <span className="flex gap-4">
            <MenuDotsIcon className="size-16 rotate-90" />
            {shareIcon}
          </span>
        ),
      };
    default:
      return { text: <Trans>Tap Share in the toolbar</Trans>, icon: shareIcon };
  }
}

function KeyIcon({ children }: { children: ReactNode }) {
  return (
    <span className="inline-flex h-32 min-w-32 shrink-0 items-center justify-center rounded-8 border-1/2 border-slate-600 bg-slate-800 px-8 text-typography-primary">
      {children}
    </span>
  );
}

export function InstallStepsList({ steps }: { steps: InstallStep[] }) {
  return (
    <ol className="m-0 flex list-none flex-col gap-12 p-0">
      {steps.map((step, index) => (
        <li key={index} className="flex min-h-32 items-center gap-12 p-0">
          <span className="text-body-small flex size-24 shrink-0 items-center justify-center rounded-full bg-slate-700 text-typography-secondary">
            {index + 1}
          </span>
          <span className="text-body-medium grow text-typography-primary">{step.text}</span>
          {step.icon ? <KeyIcon>{step.icon}</KeyIcon> : null}
        </li>
      ))}
    </ol>
  );
}

/** iPhone only: the installed app doesn't share the browser's session, so the person connects once more. */
export function HomeScreenNote({ platform }: { platform: PwaPlatform }) {
  const browserName = platform === "iphone-chrome" ? "Chrome" : "Safari";

  return (
    <AlertInfoCard type="info" hideClose>
      <Trans>
        Then open GMX from the Home Screen. You'll connect once there, since {browserName} and the app don't share a
        session.
      </Trans>
    </AlertInfoCard>
  );
}

export function IphoneInstallHelp() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="flex flex-col gap-12">
      <button
        type="button"
        className="text-body-medium flex items-center gap-6 self-start text-typography-secondary hover:text-typography-primary"
        onClick={() => setIsOpen((open) => !open)}
        aria-expanded={isOpen}
      >
        <Trans>I don't see Add to Home Screen</Trans>
        <ChevronDownIcon className={cx("size-16 transition-transform", { "rotate-180": isOpen })} />
      </button>
      {isOpen ? (
        <div className="flex flex-col gap-12 rounded-8 bg-slate-800 p-12">
          <HelpItem title={<Trans>You're in a private tab</Trans>}>
            <Trans>Add to Home Screen is hidden in private browsing. Open GMX in a normal tab.</Trans>
          </HelpItem>
          <HelpItem title={<Trans>You're in a wallet or messenger app</Trans>}>
            <Trans>These browsers can't add apps to the Home Screen. Open GMX in Safari or Chrome.</Trans>
          </HelpItem>
          <HelpItem title={<Trans>It's not in the Share menu</Trans>}>
            <Trans>Scroll to the bottom of the Share menu, tap Edit Actions, then add Add to Home Screen</Trans>
          </HelpItem>
        </div>
      ) : null}
    </div>
  );
}

function HelpItem({ title, children }: { title: ReactNode; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-4">
      <div className="text-body-medium font-medium text-typography-primary">{title}</div>
      <div className="text-body-small text-typography-secondary">{children}</div>
    </div>
  );
}

import { t, Trans } from "@lingui/macro";
import cx from "classnames";
import { ReactNode, useCallback } from "react";
import { useCopyToClipboard } from "react-use";

import { useConnectModal } from "context/ConnectModalContext/ConnectModalContext";
import { useGmxAccountModalOpen } from "context/GmxAccountContext/hooks";
import { useSettings } from "context/SettingsContext/SettingsContextProvider";

import Button from "components/Button/Button";

import BellIcon from "img/ic_bell.svg?react";
import CheckIcon from "img/ic_check.svg?react";
import CloseIcon from "img/ic_close.svg?react";
import CopyIcon from "img/ic_copy.svg?react";
import DownloadIcon from "img/ic_download2.svg?react";
import LinkIcon from "img/ic_new_link_20.svg?react";

import {
  closeNotificationsOnCard,
  closeWelcomeCard,
  dismissInstallCard,
  dismissNotificationsOffer,
  startInstall,
  turnOnNotifications,
} from "./pwaActions";
import { PwaCardHeader, PwaFloatingCard } from "./PwaCard";
import { getIsAndroidUserAgent, PwaPlatform } from "./pwaPlatform";
import { PwaEnvironment } from "./usePwaEnvironment";

export function InstallCard({ platform }: { platform: PwaPlatform }) {
  const isIphone = platform.startsWith("iphone");

  return (
    <PwaFloatingCard qa="pwa-install-card">
      <PwaCardHeader
        icon={<DownloadIcon className="size-20" />}
        title={isIphone ? <Trans>Add GMX to your Home Screen</Trans> : <Trans>Install the GMX app</Trans>}
        description={
          isIphone ? (
            <Trans>
              Full-screen charts, one tap to open, and notifications for Limit, Stop Market and TP/SL orders and
              liquidations on Arbitrum
            </Trans>
          ) : (
            <Trans>Full-screen charts and one tap to open from your home screen</Trans>
          )
        }
        onClose={dismissInstallCard}
      />
      <Button variant="primary" size="medium" className="w-full" onClick={() => startInstall(platform, "card")}>
        {isIphone ? <Trans>Add to Home Screen</Trans> : <Trans>Install</Trans>}
      </Button>
    </PwaFloatingCard>
  );
}

/** Wallet and messenger browsers can't install. Instead of the install card, they get a link to open GMX in a browser. */
export function CopyLinkCard({ onClose }: { onClose: () => void }) {
  const [copyState, copyToClipboard] = useCopyToClipboard();
  const link = window.location.href;
  const isCopied = copyState.value === link && !copyState.error;
  const isAndroid = getIsAndroidUserAgent();

  return (
    <PwaFloatingCard qa="pwa-copy-link-card">
      <PwaCardHeader
        icon={<LinkIcon className="size-20" />}
        title={<Trans>Open GMX in your browser to install</Trans>}
        description={
          isAndroid ? (
            <Trans>Wallet and messenger browsers can't install apps. Open GMX in Chrome.</Trans>
          ) : (
            <Trans>
              Wallet and messenger browsers can't add apps to the Home Screen. Open GMX in Safari or Chrome.
            </Trans>
          )
        }
        onClose={onClose}
      />
      {copyState.error ? (
        <div className="text-body-small select-all break-all rounded-8 bg-slate-700 px-12 py-8 text-typography-primary">
          {link}
        </div>
      ) : (
        <Button
          variant="secondary"
          size="medium"
          className="w-full"
          onClick={() => copyToClipboard(link)}
          showExternalLinkArrow={false}
        >
          <span className="flex items-center justify-center gap-6">
            {isCopied ? <CheckIcon className="size-16 text-green-500" /> : <CopyIcon className="size-16" />}
            {isCopied ? <Trans>Link copied</Trans> : <Trans>Copy link</Trans>}
          </span>
        </Button>
      )}
    </PwaFloatingCard>
  );
}

export function NotificationsOfferCard() {
  return (
    <PwaFloatingCard qa="pwa-notifications-offer">
      <PwaCardHeader
        icon={<BellIcon className="size-20" />}
        title={<Trans>Get notified on this device</Trans>}
        description={
          <Trans>Know when a Limit, Stop Market or TP/SL order executes, or a position is liquidated on Arbitrum</Trans>
        }
        onClose={dismissNotificationsOffer}
      />
      <Button variant="primary" size="medium" className="w-full" onClick={turnOnNotifications}>
        <Trans>Turn on notifications</Trans>
      </Button>
    </PwaFloatingCard>
  );
}

export function NotificationsOnCard() {
  const { setIsSettingsVisible } = useSettings();

  // Build task: open Settings on the Notifications tab (openSettingsTab("notifications")).
  const handleOpenSettings = useCallback(() => {
    closeNotificationsOnCard();
    setIsSettingsVisible(true);
  }, [setIsSettingsVisible]);

  return (
    <PwaFloatingCard qa="pwa-notifications-on">
      <PwaCardHeader
        icon={<CheckIcon className="size-20" />}
        iconClassName="!text-green-500"
        title={<Trans>Notifications are on</Trans>}
        description={
          <Trans>
            GMX sent a notification to this device. If it doesn't arrive, check your system's notification settings.
          </Trans>
        }
        onClose={closeNotificationsOnCard}
      />
      <Button variant="secondary" size="medium" className="w-full" onClick={handleOpenSettings}>
        <Trans>Notification settings</Trans>
      </Button>
    </PwaFloatingCard>
  );
}

type WelcomeStep = {
  key: string;
  title: ReactNode;
  description: ReactNode;
  isDone: boolean;
  action: ReactNode;
};

/** Shown on the first launch of the installed app only. Each step ticks off when done. */
export function WelcomeCard({ env }: { env: PwaEnvironment }) {
  const { openConnectModal } = useConnectModal();
  const [, setGmxAccountModalOpen] = useGmxAccountModalOpen();
  const { setIsSettingsVisible } = useSettings();
  const isIphone = env.platform.startsWith("iphone");

  const steps: WelcomeStep[] = [
    {
      key: "connect",
      title: <Trans>Connect wallet</Trans>,
      description: isIphone ? (
        <Trans>A wallet connected in Safari doesn't carry over to the app. A passkey keeps you signed in.</Trans>
      ) : (
        <Trans>Connect your wallet or use a passkey</Trans>
      ),
      isDone: env.isSignedIn,
      action: (
        <Button variant="primary" size="small" onClick={() => openConnectModal?.()}>
          <Trans>Connect wallet</Trans>
        </Button>
      ),
    },
    {
      key: "fund",
      title: <Trans>Add funds</Trans>,
      description: <Trans>Deposit to start trading</Trans>,
      isDone: env.isFunded,
      action: (
        <Button variant="primary" size="small" onClick={() => setGmxAccountModalOpen("deposit")}>
          <Trans>Deposit</Trans>
        </Button>
      ),
    },
    {
      key: "one-click",
      title: <Trans>Turn on One-Click Trading</Trans>,
      description: <Trans>Trade without signing every order</Trans>,
      isDone: env.isOneClickOn,
      action: (
        <Button variant="primary" size="small" onClick={() => setIsSettingsVisible(true)}>
          <Trans>Turn on</Trans>
        </Button>
      ),
    },
  ];

  const currentStepKey = steps.find((step) => !step.isDone)?.key;

  return (
    <PwaFloatingCard qa="pwa-welcome-card">
      <div className="flex items-start justify-between gap-12">
        <div className="text-h3 font-medium text-typography-primary">
          <Trans>You're in the GMX app</Trans>
        </div>
        <button
          type="button"
          aria-label={t`Close`}
          className="-mr-4 -mt-4 shrink-0 p-4 text-typography-secondary hover:text-typography-primary"
          onClick={closeWelcomeCard}
        >
          <CloseIcon className="size-20" />
        </button>
      </div>
      <ol className="m-0 flex list-none flex-col gap-12 p-0">
        {steps.map((step, index) => {
          const isCurrent = step.key === currentStepKey;

          return (
            <li key={step.key} className="flex items-start gap-12 p-0">
              <div
                className={cx(
                  "text-body-small flex size-24 shrink-0 items-center justify-center rounded-full",
                  step.isDone ? "bg-green-500/20 text-green-500" : "bg-slate-700 text-typography-secondary"
                )}
              >
                {step.isDone ? <CheckIcon className="size-14" /> : index + 1}
              </div>
              <div className="flex min-w-0 grow flex-col gap-4">
                <div
                  className={cx(
                    "text-body-medium font-medium",
                    step.isDone ? "text-typography-secondary" : "text-typography-primary"
                  )}
                >
                  {step.title}
                </div>
                {!step.isDone ? (
                  <div className="text-body-small text-typography-secondary">{step.description}</div>
                ) : null}
                {isCurrent ? <div className="mt-4 flex">{step.action}</div> : null}
              </div>
            </li>
          );
        })}
      </ol>
    </PwaFloatingCard>
  );
}

/** Someone who arrives already connected, funded and with One-Click on gets one quiet line instead of the steps. */
export function WelcomeBanner() {
  return (
    <PwaFloatingCard qa="pwa-welcome-banner" isSlim>
      <CheckIcon className="size-16 shrink-0 text-green-500" />
      <div className="text-body-medium grow text-typography-primary">
        <Trans>You're in the GMX app. Everything carried over.</Trans>
      </div>
      <button
        type="button"
        aria-label={t`Close`}
        className="shrink-0 p-4 text-typography-secondary hover:text-typography-primary"
        onClick={closeWelcomeCard}
      >
        <CloseIcon className="size-16" />
      </button>
    </PwaFloatingCard>
  );
}

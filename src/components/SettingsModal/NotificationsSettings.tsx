import { t, Trans } from "@lingui/macro";
import cx from "classnames";
import { useEffect, useState } from "react";
import { useCopyToClipboard } from "react-use";

import { useConnectModal } from "context/ConnectModalContext/ConnectModalContext";
import {
  type NotificationsStatus,
  useNotificationsContext,
} from "context/NotificationsContext/NotificationsContextProvider";
import { getBlockedNotificationsPlatform, getIsBrave } from "domain/notifications/notificationsBrowser";
import { helperToast } from "lib/helperToast";
import { shortenAddressOrEns } from "lib/wallets";
import useWallet from "lib/wallets/useWallet";

import Button from "components/Button/Button";
import ToggleSwitch from "components/ToggleSwitch/ToggleSwitch";

import BellIcon from "img/ic_bell.svg?react";
import ChevronDownIcon from "img/ic_chevron_down.svg?react";
import WarnIcon from "img/ic_warn.svg?react";

type CardState = Exclude<NotificationsStatus, "unsupported"> | "notSupported";

type CardIcon = "on" | "neutral" | "warning";

const CARD_ICON: Record<CardState, CardIcon> = {
  on: "on",
  off: "neutral",
  notAsked: "neutral",
  noWallet: "neutral",
  blocked: "warning",
  notSupported: "neutral",
  iosNotInstalled: "neutral",
  turningOn: "neutral",
  turningOff: "on",
  turnOnFailed: "warning",
  walletSwitchFailed: "warning",
  limitReached: "warning",
};

const WALLET_LENGTH = 13;

function getCardState({
  status,
  isTurnedOn,
  receivingAccount,
  pendingAccount,
}: {
  status: NotificationsStatus;
  isTurnedOn: boolean;
  receivingAccount: string | undefined;
  pendingAccount: string | undefined;
}): CardState {
  if (status === "unsupported") {
    return "notSupported";
  }

  if (status === "limitReached" && isTurnedOn && pendingAccount !== receivingAccount) {
    return "walletSwitchFailed";
  }

  return status;
}

export function NotificationsSettings({ isSettingsVisible }: { isSettingsVisible: boolean }) {
  const { status, isTurnedOn, receivingAccount, pendingAccount, turnOn, turnOff, retry } = useNotificationsContext();
  const state = getCardState({ status, isTurnedOn, receivingAccount, pendingAccount });

  // The confirmation line shows from a turn-on in this tab until the Settings modal closes.
  const [isTurningOnHere, setIsTurningOnHere] = useState(false);
  const [isConfirmationSent, setIsConfirmationSent] = useState(false);

  useEffect(() => {
    if (!isSettingsVisible) {
      setIsConfirmationSent(false);
    }
  }, [isSettingsVisible]);

  useEffect(() => {
    if (isTurningOnHere && status !== "turningOn") {
      setIsTurningOnHere(false);
      setIsConfirmationSent(status === "on");
    }
  }, [isTurningOnHere, status]);

  const handleToggle = (isChecked: boolean) => {
    if (isChecked) {
      setIsTurningOnHere(true);
      turnOn();
    } else {
      setIsConfirmationSent(false);
      turnOff();
    }
  };

  const handleRetry = () => {
    // Only a turn-on sends the confirmation; a retried wallet switch does not.
    setIsTurningOnHere(state === "turnOnFailed" || state === "limitReached");
    retry();
  };

  return (
    <div className="flex flex-col gap-20 pb-20">
      <DeviceSwitchCard
        state={state}
        receivingAccount={receivingAccount}
        pendingAccount={pendingAccount}
        isConfirmationSent={isConfirmationSent && state === "on"}
        onToggle={handleToggle}
        onRetry={handleRetry}
      />
      <GoodToKnow />
    </div>
  );
}

function DeviceSwitchCard({
  state,
  receivingAccount,
  pendingAccount,
  isConfirmationSent,
  onToggle,
  onRetry,
}: {
  state: CardState;
  receivingAccount: string | undefined;
  pendingAccount: string | undefined;
  isConfirmationSent: boolean;
  onToggle: (isChecked: boolean) => void;
  onRetry: () => void;
}) {
  const { openConnectModal } = useConnectModal();
  const { account } = useWallet();
  const [, copyToClipboard] = useCopyToClipboard();

  const hasToggle = ["on", "off", "notAsked", "walletSwitchFailed", "turningOn", "turningOff"].includes(state);
  // The switch keeps its position until the request settles.
  const isToggleOn = state === "on" || state === "walletSwitchFailed" || state === "turningOff";
  const isBusy = state === "turningOn" || state === "turningOff";
  // The types are dimmed whenever notifications don't reach this device.
  const typeClassName = cx({ "opacity-[0.35]": !isToggleOn });

  // The share sheet can hand the page straight to another browser; in-app browsers without it get a copy.
  const canShareLink = typeof navigator.share === "function";

  const handleShareLink = async () => {
    const url = window.location.href;

    if (canShareLink) {
      try {
        await navigator.share({ url });
        return;
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") {
          return;
        }
      }
    }

    copyToClipboard(url);
    helperToast.success(t`Link copied to clipboard`);
  };

  return (
    <div className="flex flex-col gap-12 rounded-8 bg-slate-800 p-16">
      <div className="flex items-start gap-12">
        <CardIconBox icon={CARD_ICON[state]} />
        <div className="flex min-w-0 grow flex-col gap-4">
          <div className="text-body-medium font-medium text-typography-primary">
            <Trans>Notifications on this device</Trans>
          </div>
          <div className="flex flex-col gap-4 text-13 leading-[1.3] text-typography-secondary">
            <p>
              <CardDescription state={state} receivingAccount={receivingAccount} pendingAccount={pendingAccount} />
            </p>
            {isConfirmationSent && (
              <p>
                <Trans>
                  GMX sent a notification to this device. If it doesn't arrive, check your system's notification
                  settings.
                </Trans>
              </p>
            )}
            <p>
              <Trans>Notifications cover positions and orders on Arbitrum only</Trans>
            </p>
          </div>
        </div>
        {hasToggle && (
          <ToggleSwitch className="!w-auto shrink-0" isChecked={isToggleOn} setIsChecked={onToggle} disabled={isBusy} />
        )}
      </div>

      {state === "blocked" && (
        <StepsBox>
          <BlockedSteps />
        </StepsBox>
      )}

      {state === "iosNotInstalled" && (
        <StepsBox>
          <Trans>Tap Share → Add to Home Screen, then open GMX from the Home Screen</Trans>
        </StepsBox>
      )}

      {(state === "noWallet" || (state === "limitReached" && !account)) && openConnectModal && (
        <Button variant="primary" size="medium" className="w-full" onClick={openConnectModal}>
          <Trans>Connect wallet</Trans>
        </Button>
      )}

      {state === "notSupported" && (
        <Button variant="primary" size="medium" className="w-full" onClick={handleShareLink}>
          {canShareLink ? <Trans>Share link</Trans> : <Trans>Copy link</Trans>}
        </Button>
      )}

      {state === "turnOnFailed" && getIsBrave() && (
        <StepsBox>
          <Trans>
            In Brave, turn on "Use Google services for push messaging" in Settings → Privacy and security. Then try
            again.
          </Trans>
        </StepsBox>
      )}

      {(state === "turnOnFailed" ||
        state === "walletSwitchFailed" ||
        (state === "limitReached" && Boolean(account))) && (
        <Button variant="primary" size="medium" className="w-full" onClick={onRetry}>
          <Trans>Try again</Trans>
        </Button>
      )}

      <div className="border-t-1/2 border-slate-600" />
      <NotificationType
        className={typeClassName}
        title={<Trans>Position liquidated</Trans>}
        description={<Trans>When your position is liquidated</Trans>}
      />
      <NotificationType
        className={typeClassName}
        title={<Trans>Order executed</Trans>}
        description={<Trans>When your Limit, Take-Profit, Stop-Loss or Stop Market order executes</Trans>}
      />
    </div>
  );
}

function CardDescription({
  state,
  receivingAccount,
  pendingAccount,
}: {
  state: CardState;
  receivingAccount: string | undefined;
  pendingAccount: string | undefined;
}) {
  const receivingWallet = receivingAccount ? shortenAddressOrEns(receivingAccount, WALLET_LENGTH) : "";
  const newWallet = pendingAccount ? shortenAddressOrEns(pendingAccount, WALLET_LENGTH) : "";

  switch (state) {
    case "on":
      return <Trans>Receiving as {receivingWallet}. Turning off won't affect your other devices.</Trans>;
    case "off":
      return <Trans>Turn them on to get liquidation and order notifications on this device.</Trans>;
    case "notAsked":
      return (
        <Trans>
          Turn them on to get liquidation and order notifications on this device. Your browser will ask you to allow
          them.
        </Trans>
      );
    case "noWallet":
      return <Trans>Connect a wallet to get liquidation and order notifications on this device.</Trans>;
    case "blocked":
      return <Trans>You blocked notifications for GMX in this browser, so GMX can't ask again.</Trans>;
    case "notSupported":
      return <Trans>This browser can't show notifications. Open GMX in your phone's or computer's browser.</Trans>;
    case "iosNotInstalled":
      return <Trans>On iPhone and iPad, notifications only work when GMX is on the Home Screen.</Trans>;
    case "turningOn":
      return <Trans>Turning on...</Trans>;
    case "turningOff":
      return <Trans>Turning off...</Trans>;
    case "turnOnFailed":
      return <Trans>Couldn't turn them on: the notification service didn't answer.</Trans>;
    case "limitReached":
      return <Trans>This wallet already gets notifications on 10 devices. Adding this one needs its signature.</Trans>;
    case "walletSwitchFailed":
      return (
        <Trans>
          Notifications didn't move to your new wallet {newWallet}. They still go to {receivingWallet}.
        </Trans>
      );
  }
}

function BlockedSteps() {
  switch (getBlockedNotificationsPlatform()) {
    case "iosApp":
      return <Trans>Open Settings → Notifications → GMX → Allow Notifications</Trans>;
    case "androidChrome":
      return <Trans>Tap the icon to the left of the address bar → Permissions → Notifications</Trans>;
    case "desktopChrome":
      return <Trans>Click the icon to the left of the address bar → Notifications → Allow</Trans>;
    case "other":
      return <Trans>Allow notifications for this site in your browser's settings</Trans>;
  }
}

function StepsBox({ children }: { children: React.ReactNode }) {
  return <div className="rounded-8 bg-slate-700 p-12 text-12 leading-[1.25] text-typography-primary">{children}</div>;
}

function CardIconBox({ icon }: { icon: CardIcon }) {
  return (
    <div
      className={cx("flex size-36 shrink-0 items-center justify-center rounded-8", {
        "bg-green-900 text-green-500": icon === "on",
        "bg-slate-700 text-typography-secondary": icon === "neutral",
        "bg-yellow-300/[0.12] text-yellow-300": icon === "warning",
      })}
    >
      {icon === "warning" ? <WarnIcon className="size-16" /> : <BellIcon className="size-16" />}
    </div>
  );
}

function NotificationType({
  title,
  description,
  className,
}: {
  title: React.ReactNode;
  description: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cx("flex flex-col gap-4", className)}>
      <div className="text-body-medium font-medium text-typography-primary">{title}</div>
      <div className="text-13 leading-[1.3] text-typography-secondary">{description}</div>
    </div>
  );
}

function GoodToKnow() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="flex flex-col gap-12 text-12 leading-[1.25]">
      <p className="text-typography-disabled">
        <Trans>Delivery isn't guaranteed. Don't rely on notifications as your only risk control.</Trans>
      </p>
      <div className="border-t-1/2 border-slate-600" />
      <button
        type="button"
        className="flex items-center justify-between gap-8 font-medium text-typography-secondary hover:text-typography-primary"
        aria-expanded={isOpen}
        onClick={() => setIsOpen((value) => !value)}
      >
        <Trans>Good to know</Trans>
        <ChevronDownIcon className={cx("size-16 transition-transform", { "rotate-180": isOpen })} />
      </button>
      {isOpen && (
        <div className="flex flex-col gap-12 text-typography-secondary">
          <p>
            <Trans>Notifications stop after 30 days without opening GMX on this device</Trans>
          </p>
          <p>
            <Trans>On a computer, the browser must be running, but no GMX tab needs to be open</Trans>
          </p>
          <p>
            <Trans>Disconnecting the wallet doesn't stop notifications</Trans>
          </p>
          <p>
            <Trans>Do Not Disturb can silence or delay notifications</Trans>
          </p>
          <p>
            <Trans>Notifications aren't saved, so there's no history</Trans>
          </p>
        </div>
      )}
    </div>
  );
}

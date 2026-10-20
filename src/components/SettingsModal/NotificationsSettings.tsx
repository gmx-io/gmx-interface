import { Trans } from "@lingui/macro";
import cx from "classnames";

import Button from "components/Button/Button";
import ToggleSwitch from "components/ToggleSwitch/ToggleSwitch";

import BellIcon from "img/ic_bell.svg?react";
import WarnIcon from "img/ic_warn.svg?react";

import { useNotificationsTesterState } from "./tester/notificationsTester"; // rewards-tester

// UI proposal only: no push subscription, browser permission or wallet logic yet.
export const NOTIFICATIONS_STATES = [
  "on",
  "off",
  "notAsked",
  "noWallet",
  "blocked",
  "notSupported",
  "turnOnFailed",
  "walletSwitchFailed",
] as const;

export type NotificationsState = (typeof NOTIFICATIONS_STATES)[number];

// Placeholder wallets for the proposal.
const RECEIVING_WALLET = "0x1f4a…8ac2";
const NEW_WALLET = "0x7c2e…41d9";

type CardIcon = "on" | "neutral" | "warning";

const CARD_ICON: Record<NotificationsState, CardIcon> = {
  on: "on",
  off: "neutral",
  notAsked: "neutral",
  noWallet: "neutral",
  blocked: "warning",
  notSupported: "neutral",
  turnOnFailed: "warning",
  walletSwitchFailed: "warning",
};

export function NotificationsSettings() {
  const [state, setState] = useNotificationsTesterState(); // rewards-tester (was: useState<NotificationsState>("on"))

  const isReceiving = state === "on" || state === "walletSwitchFailed";

  return (
    <div className="flex flex-col gap-20 pb-20">
      <DeviceSwitchCard state={state} onStateChange={setState} />

      <div className={cx("flex flex-col gap-20", { "opacity-[0.35]": !isReceiving })}>
        <NotificationType
          title={<Trans>Liquidation</Trans>}
          description={<Trans>Your position was liquidated.</Trans>}
        />
        <NotificationType
          title={<Trans>Order executed</Trans>}
          description={<Trans>Limit, Take-Profit, Stop-Loss and Stop Market.</Trans>}
        />
        <div className="border-t-1/2 border-slate-600" />
      </div>

      <GoodToKnow showTurnOffNote={state === "off"} />
    </div>
  );
}

function DeviceSwitchCard({
  state,
  onStateChange,
}: {
  state: NotificationsState;
  onStateChange: (state: NotificationsState) => void;
}) {
  const hasToggle = state === "on" || state === "off" || state === "notAsked" || state === "walletSwitchFailed";
  const isToggleOn = state === "on" || state === "walletSwitchFailed";

  return (
    <div className="flex flex-col gap-12 rounded-8 bg-slate-800 p-16">
      <div className="flex items-start gap-12">
        <CardIconBox icon={CARD_ICON[state]} />
        <div className="flex min-w-0 grow flex-col gap-4">
          <div className="text-body-medium font-medium text-typography-primary">
            <Trans>Notifications on this device</Trans>
          </div>
          <div className="text-13 leading-[1.3] text-typography-secondary">
            <CardDescription state={state} />
          </div>
        </div>
        {hasToggle && (
          <ToggleSwitch
            className="!w-auto shrink-0"
            isChecked={isToggleOn}
            setIsChecked={(isChecked) => onStateChange(isChecked ? "on" : "off")}
          />
        )}
      </div>

      {state === "blocked" && (
        <div className="rounded-8 bg-slate-700 p-12 text-12 leading-[1.25] text-typography-primary">
          <Trans>Click the icon to the left of the address bar → Notifications → Allow</Trans>
        </div>
      )}

      {state === "noWallet" && (
        <Button variant="primary" size="medium" className="w-full" onClick={() => onStateChange("notAsked")}>
          <Trans>Connect wallet</Trans>
        </Button>
      )}

      {state === "notSupported" && (
        <Button variant="primary" size="medium" className="w-full">
          <Trans>Copy link</Trans>
        </Button>
      )}

      {(state === "turnOnFailed" || state === "walletSwitchFailed") && (
        <Button variant="primary" size="medium" className="w-full" onClick={() => onStateChange("on")}>
          <Trans>Try again</Trans>
        </Button>
      )}
    </div>
  );
}

function CardDescription({ state }: { state: NotificationsState }) {
  switch (state) {
    case "on":
      return <Trans>Receiving as {RECEIVING_WALLET}. Turning off won't affect your other devices.</Trans>;
    case "off":
      return <Trans>Turn them on to get liquidation and order alerts on this device.</Trans>;
    case "notAsked":
      return (
        <Trans>
          Turn them on to get liquidation and order alerts on this device. Your browser will ask you to allow them.
        </Trans>
      );
    case "noWallet":
      return <Trans>Connect a wallet to get liquidation and order alerts on this device.</Trans>;
    case "blocked":
      return <Trans>You blocked notifications for GMX in this browser, so GMX can't ask again.</Trans>;
    case "notSupported":
      return <Trans>This browser can't show notifications. Open GMX in your computer's browser.</Trans>;
    case "turnOnFailed":
      return <Trans>Couldn't turn them on: the notification service didn't answer.</Trans>;
    case "walletSwitchFailed":
      return (
        <Trans>
          Notifications didn't move to your new wallet {NEW_WALLET}. They still go to {RECEIVING_WALLET}.
        </Trans>
      );
  }
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

function NotificationType({ title, description }: { title: React.ReactNode; description: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-4">
      <div className="text-body-medium font-medium text-typography-primary">{title}</div>
      <div className="text-13 leading-[1.3] text-typography-secondary">{description}</div>
    </div>
  );
}

function GoodToKnow({ showTurnOffNote }: { showTurnOffNote: boolean }) {
  return (
    <div className="flex flex-col gap-12 text-12 leading-[1.25] text-typography-secondary">
      <div className="font-medium uppercase">
        <Trans>Good to know</Trans>
      </div>
      <p>
        <Trans>
          Delivery isn't guaranteed. No web notification can be marked time sensitive, so Do Not Disturb will hold back
          a margin call. Don't rely on an alert as your only risk control.
        </Trans>
      </p>
      <p>
        <Trans>Alerts cover Arbitrum positions and orders only.</Trans>
      </p>
      <p>
        <Trans>
          Notifications aren't saved. There's no history to look back at — only what arrives on your device.
        </Trans>
      </p>
      <p>
        <Trans>On a computer, alerts need the browser to be running. No GMX tab has to be open.</Trans>
      </p>
      <p>
        <Trans>Notifications stop after 30 days without opening GMX on this device.</Trans>
      </p>
      <p>
        <Trans>Disconnecting the wallet doesn’t stop notifications.</Trans>
      </p>
      {showTurnOffNote && (
        <p>
          <Trans>Turning off only affects this device.</Trans>
        </p>
      )}
    </div>
  );
}

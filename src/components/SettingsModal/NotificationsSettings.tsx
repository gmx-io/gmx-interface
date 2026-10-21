import { Trans } from "@lingui/macro";
import cx from "classnames";

import Button from "components/Button/Button";
import ToggleSwitch from "components/ToggleSwitch/ToggleSwitch";

import BellIcon from "img/ic_bell.svg?react";
import ChevronDownIcon from "img/ic_chevron_down.svg?react";
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

  return (
    <div className="flex flex-col gap-20 pb-20">
      <DeviceSwitchCard state={state} onStateChange={setState} />
      <GoodToKnow />
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
  // The types are dimmed whenever notifications don't reach this device.
  const typeClassName = cx({ "opacity-[0.35]": !isToggleOn });

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

function CardDescription({ state }: { state: NotificationsState }) {
  switch (state) {
    case "on":
      return <Trans>Receiving as {RECEIVING_WALLET}. Turning off won't affect your other devices.</Trans>;
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
            <Trans>Notifications cover positions and orders on Arbitrum only</Trans>
          </p>
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

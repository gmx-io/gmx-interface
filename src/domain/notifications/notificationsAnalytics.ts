import type { NotificationsStatus } from "context/NotificationsContext/NotificationsContextProvider";
import { userAnalytics } from "lib/userAnalytics";

export type NotificationsTabEntry = "settings" | "walletMenu" | "gmxAccountModal";

export type NotificationsTurnOnResult =
  | "on"
  | "permissionRefused"
  | "promptClosed"
  | "signatureRefused"
  // At the device limit with no connected wallet that could sign.
  | "limitNoWallet"
  | "failed";

export type NotificationTapType = "orderExecuted" | "positionLiquidated" | "confirmation" | "other";

type NotificationsActionEvent = {
  event: "NotificationsAction";
  data:
    | { action: "TabOpen"; entry: NotificationsTabEntry; state: NotificationsStatus }
    | { action: "TurnOnResult"; result: NotificationsTurnOnResult; isRetry: boolean }
    | { action: "TurnOff" }
    | { action: "Tap"; notificationType: NotificationTapType; isColdStart: boolean }
    | { action: "DailyState"; state: NotificationsStatus };
};

const TAP_TYPES = new Map<string, NotificationTapType>([
  ["order.executed", "orderExecuted"],
  ["position.liquidated", "positionLiquidated"],
  // The API's type for the confirmation sent after a turn-on.
  ["test", "confirmation"],
]);

function sendNotificationsEvent(data: NotificationsActionEvent["data"], options?: { dedupKey: string }) {
  userAnalytics.pushEvent<NotificationsActionEvent>({ event: "NotificationsAction", data }, options);
}

export function sendNotificationsTabOpenEvent(entry: NotificationsTabEntry, state: NotificationsStatus) {
  sendNotificationsEvent({ action: "TabOpen", entry, state });
}

export function sendNotificationsTurnOnResultEvent(result: NotificationsTurnOnResult, isRetry: boolean) {
  sendNotificationsEvent({ action: "TurnOnResult", result, isRetry });
}

export function sendNotificationsTurnOffEvent() {
  sendNotificationsEvent({ action: "TurnOff" });
}

/** `type` is the push payload's `data.type`, which anyone opening the app with a crafted URL can set. */
export function sendNotificationTapEvent(type: string | null | undefined, isColdStart: boolean) {
  sendNotificationsEvent({ action: "Tap", notificationType: (type && TAP_TYPES.get(type)) || "other", isColdStart });
}

export function sendNotificationsDailyStateEvent(state: NotificationsStatus) {
  // The dedup window is a day, so this goes out at the first app open in 24 hours.
  sendNotificationsEvent({ action: "DailyState", state }, { dedupKey: "notificationsDailyState" });
}

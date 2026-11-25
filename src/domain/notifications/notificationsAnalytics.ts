import { NOTIFICATIONS_DAILY_STATE_SENT_AT_KEY } from "config/localStorage";
import type { NotificationsStatus } from "context/NotificationsContext/NotificationsContextProvider";
import type { SettingsTabSource } from "context/SettingsContext/SettingsContextProvider";
import { DAY_MS } from "lib/dates";
import { readLocalStorageItem, writeLocalStorageItem } from "lib/localStorage";
import { runExclusiveAcrossTabs } from "lib/runExclusiveAcrossTabs";
import { sleep } from "lib/sleep";
import { userAnalytics } from "lib/userAnalytics";

export type NotificationsTabEntry = "settings" | SettingsTabSource;

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

const ANALYTICS_SETUP_WAIT_MS = 10_000;
const ANALYTICS_SETUP_POLL_MS = 500;

function sendNotificationsEvent(data: NotificationsActionEvent["data"]) {
  userAnalytics.pushEvent<NotificationsActionEvent>({ event: "NotificationsAction", data });
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
export function sendNotificationTapEvent(type: string | undefined, isColdStart: boolean) {
  sendNotificationsEvent({ action: "Tap", notificationType: (type && TAP_TYPES.get(type)) || "other", isColdStart });
}

/** Sends at the first app open in 24 hours. */
export function sendNotificationsDailyStateEvent(state: NotificationsStatus) {
  // Tabs opened together would each read the old timestamp before any of them sends.
  return runExclusiveAcrossTabs(NOTIFICATIONS_DAILY_STATE_SENT_AT_KEY, () => sendDailyStateOnce(state));
}

async function sendDailyStateOnce(state: NotificationsStatus) {
  const sentAt = readLocalStorageItem(NOTIFICATIONS_DAILY_STATE_SENT_AT_KEY, { deserializer: Number });
  if (sentAt !== undefined && Date.now() - sentAt < DAY_MS) {
    return;
  }

  // Counted as sent only after the request: an event queued until the analytics setup is lost on a reload in those
  // seconds, while the analytics dedup would already skip it for a day.
  for (let waited = 0; !userAnalytics.getIsCommonParamsInited() && waited < ANALYTICS_SETUP_WAIT_MS; ) {
    await sleep(ANALYTICS_SETUP_POLL_MS);
    waited += ANALYTICS_SETUP_POLL_MS;
  }

  try {
    await userAnalytics.pushEvent<NotificationsActionEvent>(
      { event: "NotificationsAction", data: { action: "DailyState", state } },
      { instantSend: true }
    );
  } catch {
    return;
  }

  writeLocalStorageItem(NOTIFICATIONS_DAILY_STATE_SENT_AT_KEY, Date.now(), { serializer: String });
}

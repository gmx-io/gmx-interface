import { getAddress, sha256, toBytes } from "viem";

import { NOTIFICATIONS_CHAIN_ID } from "config/notifications";
import { isIOS } from "lib/headlessUiIsMobile";
import { getIsInstalledApp } from "lib/pwa/getIsInstalledApp";
import { sleep } from "lib/sleep";

import type { PushSubscriptionPayload } from "./notificationsApi";

const SERVICE_WORKER_READY_TIMEOUT_MS = 10_000;

export type NotificationsSupport = "supported" | "iosNotInstalled" | "unsupported";

export function getNotificationsSupport(): NotificationsSupport {
  // iOS and iPadOS give web push only to an app opened from the Home Screen. Wallets' in-app browsers can't add one
  // and have no service workers.
  if (isIOS() && !getIsInstalledApp()) {
    return "serviceWorker" in navigator ? "iosNotInstalled" : "unsupported";
  }

  return "serviceWorker" in navigator && "PushManager" in window && "Notification" in window
    ? "supported"
    : "unsupported";
}

export function getNotificationPermission(): NotificationPermission {
  return "Notification" in window ? Notification.permission : "denied";
}

export async function getServiceWorkerRegistration(): Promise<ServiceWorkerRegistration> {
  // `ready` never settles where no worker is registered: dev builds, or while the PWA is switched off.
  const registration = await Promise.race([
    navigator.serviceWorker.ready,
    sleep(SERVICE_WORKER_READY_TIMEOUT_MS).then(() => undefined),
  ]);

  if (!registration) {
    throw new Error("Service worker is not available");
  }

  return registration;
}

export async function getExistingPushSubscription(): Promise<PushSubscription | null> {
  const registration = await navigator.serviceWorker.getRegistration();

  return (await registration?.pushManager.getSubscription()) ?? null;
}

function base64UrlToBytes(value: string): Uint8Array {
  const base64 = value
    .replace(/-/g, "+")
    .replace(/_/g, "/")
    .padEnd(Math.ceil(value.length / 4) * 4, "=");

  return Uint8Array.from(atob(base64), (char) => char.charCodeAt(0));
}

function isSameKey(key: ArrayBuffer, expected: Uint8Array) {
  const bytes = new Uint8Array(key);

  return bytes.length === expected.length && bytes.every((byte, index) => byte === expected[index]);
}

export async function getOrCreatePushSubscription(
  registration: ServiceWorkerRegistration,
  vapidPublicKey: string
): Promise<{ subscription: PushSubscription; replacedEndpoint?: string }> {
  const applicationServerKey = base64UrlToBytes(vapidPublicKey);
  const existing = await registration.pushManager.getSubscription();
  const existingKey = existing?.options.applicationServerKey;

  // Browsers that do not expose the key keep their subscription: replacing it on every open would spend the API's
  // daily budget for new endpoints.
  if (existing && (!existingKey || isSameKey(existingKey, applicationServerKey))) {
    return { subscription: existing };
  }

  // A subscription made with another VAPID key gets none of our pushes.
  await existing?.unsubscribe().catch(() => false);

  const subscription = await registration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey,
  });

  return { subscription, replacedEndpoint: existing?.endpoint };
}

export function getPushSubscriptionPayload(subscription: PushSubscription): PushSubscriptionPayload {
  const { endpoint, keys, expirationTime } = subscription.toJSON();

  if (!endpoint || !keys?.p256dh || !keys.auth) {
    throw new Error("Push subscription has no keys");
  }

  return { endpoint, keys: { p256dh: keys.p256dh, auth: keys.auth }, expirationTime };
}

// The API checks these exact bytes. A Safe publishes every text it signs, so the text carries only the hash of the
// endpoint, the one secret of a device.
export function getDeviceRegistrationMessage(account: string, endpoint: string, timestamp: number) {
  return [
    "GMX Notifications Device",
    `account: ${getAddress(account)}`,
    `chainId: ${NOTIFICATIONS_CHAIN_ID}`,
    `timestamp: ${timestamp}`,
    `endpointHash: ${sha256(toBytes(endpoint)).slice(2)}`,
  ].join("\n");
}

import { NOTIFICATIONS_DEVICE_KEY } from "config/localStorage";
import { DAY_MS } from "lib/dates";
import { readLocalStorageItem, writeLocalStorageItem } from "lib/localStorage";

import {
  fetchNotificationsConfig,
  INVALID_SIGNATURE,
  NotificationsApiError,
  registerNotificationsDevice,
  REGISTRATION_LIMIT_REACHED,
} from "./notificationsApi";
import {
  getDeviceRegistrationMessage,
  getOrCreatePushSubscription,
  getPushSubscriptionPayload,
  getServiceWorkerRegistration,
} from "./pushSubscription";

// The API accepts a signature for 24 hours; the margin keeps a slow request from arriving with an expired one.
const SIGNATURE_REUSE_MS = DAY_MS - 10 * 60 * 1000;

export type DeviceSignature = {
  account: string;
  endpoint: string;
  timestamp: number;
  signature: string;
};

export type StoredNotificationsDevice = {
  enabled: boolean;
  /** The wallet that gets notifications on this device; kept after turning off, so turning on works with no wallet. */
  account?: string;
  /** The endpoint the API has for this device. */
  endpoint?: string;
  /** Left by a turn-off whose unregister request failed, so the next app open can retry it. */
  unregisterEndpoint?: string;
  /** Reused for retries after a device-limit answer, so the wallet is not asked again. */
  signature?: DeviceSignature;
};

const DEFAULT_STORED_DEVICE: StoredNotificationsDevice = { enabled: false };

export function readStoredNotificationsDevice(): StoredNotificationsDevice {
  return (
    readLocalStorageItem<StoredNotificationsDevice>(NOTIFICATIONS_DEVICE_KEY, { deserializer: JSON.parse }) ??
    DEFAULT_STORED_DEVICE
  );
}

export function writeStoredNotificationsDevice(device: StoredNotificationsDevice) {
  writeLocalStorageItem(NOTIFICATIONS_DEVICE_KEY, device, { serializer: JSON.stringify });
}

/** Calls `onChange` when another tab stores the device. */
export function watchStoredNotificationsDevice(onChange: (device: StoredNotificationsDevice) => void) {
  const handleStorage = (event: StorageEvent) => {
    if (event.key === JSON.stringify(NOTIFICATIONS_DEVICE_KEY)) {
      onChange(readStoredNotificationsDevice());
    }
  };

  window.addEventListener("storage", handleStorage);
  return () => window.removeEventListener("storage", handleStorage);
}

export function getIsRegistrationLimitError(error: unknown) {
  return error instanceof NotificationsApiError && error.status === 409 && error.code === REGISTRATION_LIMIT_REACHED;
}

export function getIsInvalidSignatureError(error: unknown) {
  return error instanceof NotificationsApiError && error.status === 401 && error.code === INVALID_SIGNATURE;
}

function getReusableSignature(signature: DeviceSignature | undefined, account: string, endpoint: string) {
  if (
    signature?.account === account &&
    signature.endpoint === endpoint &&
    Date.now() - signature.timestamp * 1000 < SIGNATURE_REUSE_MS
  ) {
    return signature;
  }

  return undefined;
}

/**
 * Registers this device's push subscription for `account`, creating the subscription when it is missing.
 * Past the API's device limit it sends a signature: the stored one while it is fresh, else one from `sign` if given.
 */
export async function registerThisDevice({
  account,
  stored,
  sign,
  onSigned,
}: {
  account: string;
  stored: StoredNotificationsDevice;
  sign?: (message: string) => Promise<string>;
  /** Called before the signed request, so a retry after a "try again later" answer can reuse the signature. */
  onSigned?: (signature: DeviceSignature) => void;
}): Promise<{ endpoint: string }> {
  const { vapidPublicKey } = await fetchNotificationsConfig();
  const registration = await getServiceWorkerRegistration();
  const { subscription, replacedEndpoint } = await getOrCreatePushSubscription(registration, vapidPublicKey);
  const payload = getPushSubscriptionPayload(subscription);
  const previousEndpoint = stored.endpoint ?? replacedEndpoint;
  const request = {
    account,
    subscription: payload,
    oldEndpoint: previousEndpoint !== payload.endpoint ? previousEndpoint : undefined,
  };

  try {
    await registerNotificationsDevice(request);
    return { endpoint: payload.endpoint };
  } catch (error) {
    if (!getIsRegistrationLimitError(error)) {
      throw error;
    }
  }

  let signature = getReusableSignature(stored.signature, account, payload.endpoint);

  if (!signature) {
    if (!sign) {
      throw new NotificationsApiError("Sign to add this device", 409, REGISTRATION_LIMIT_REACHED);
    }

    const timestamp = Math.floor(Date.now() / 1000);
    const message = getDeviceRegistrationMessage(account, payload.endpoint, timestamp);
    signature = { account, endpoint: payload.endpoint, timestamp, signature: await sign(message) };
    onSigned?.(signature);
  }

  await registerNotificationsDevice({ ...request, timestamp: signature.timestamp, signature: signature.signature });

  return { endpoint: payload.endpoint };
}

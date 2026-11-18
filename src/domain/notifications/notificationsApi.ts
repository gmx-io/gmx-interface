import { NOTIFICATIONS_API_URL } from "config/notifications";

const REQUEST_TIMEOUT_MS = 15_000;

export const REGISTRATION_LIMIT_REACHED = "REGISTRATION_LIMIT_REACHED";
export const INVALID_SIGNATURE = "INVALID_SIGNATURE";

export class NotificationsApiError extends Error {
  /** Undefined when the request got no answer. */
  status: number | undefined;
  code: string | undefined;

  constructor(message: string, status?: number, code?: string) {
    super(message);
    this.name = "NotificationsApiError";
    this.status = status;
    this.code = code;
  }
}

export type NotificationsConfig = {
  vapidPublicKey: string;
};

export type PushSubscriptionPayload = {
  endpoint: string;
  keys: { p256dh: string; auth: string };
  expirationTime?: number | null;
};

export type RegisterDeviceRequest = {
  account: string;
  subscription: PushSubscriptionPayload;
  oldEndpoint?: string;
  timestamp?: number;
  signature?: string;
};

async function request(path: string, body?: object): Promise<Response> {
  if (!NOTIFICATIONS_API_URL) {
    throw new NotificationsApiError("Notifications API is not configured");
  }

  let response: Response;
  try {
    response = await fetch(`${NOTIFICATIONS_API_URL}/v1/notifications${path}`, {
      method: body ? "POST" : "GET",
      headers: body ? { "content-type": "application/json" } : undefined,
      body: body ? JSON.stringify(body) : undefined,
      cache: "no-store",
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
  } catch (error) {
    throw new NotificationsApiError(error instanceof Error ? error.message : "Network error");
  }

  if (!response.ok) {
    const data = await response.json().catch(() => undefined);
    throw new NotificationsApiError(
      typeof data?.message === "string" ? data.message : `Request failed with status ${response.status}`,
      response.status,
      typeof data?.code === "string" ? data.code : undefined
    );
  }

  return response;
}

export async function fetchNotificationsConfig(): Promise<NotificationsConfig> {
  const data = await (await request("/config")).json();

  if (typeof data?.vapidPublicKey !== "string" || !data.vapidPublicKey) {
    throw new NotificationsApiError("Notifications config has no VAPID key");
  }

  return { vapidPublicKey: data.vapidPublicKey };
}

export async function registerNotificationsDevice(body: RegisterDeviceRequest): Promise<void> {
  await request("/register", body);
}

export async function unregisterNotificationsDevice(endpoint: string): Promise<void> {
  await request("/unregister", { endpoint });
}

export async function sendTestNotification(endpoint: string): Promise<void> {
  await request("/test", { endpoint });
}

import { ARBITRUM } from "config/chains";
import { isDevelopment } from "config/env";
import { getApiUrl } from "sdk/configs/api";

// Only the production Arbitrum API serves notifications, so the test API flag and the selected chain must not reroute them.
export const NOTIFICATIONS_API_URL = getApiUrl(ARBITRUM, "production");
export const NOTIFICATIONS_CHAIN_ID = ARBITRUM;

// Both mirror public/sw.js.
export const NOTIFICATION_CLICK_MESSAGE_TYPE = "gmx-notification-click";
export const NOTIFICATION_ROUTE_SEARCH_PARAM = "notification";

// Debug controls only until the Notifications tab ships: app.gmx.io sends no notification requests yet.
export function getIsNotificationsEnabled() {
  return isDevelopment();
}

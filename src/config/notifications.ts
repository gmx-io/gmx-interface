import { ARBITRUM } from "config/chains";
import { getApiUrl } from "sdk/configs/api";

// Only the production Arbitrum API serves notifications, so the test API flag and the selected chain must not reroute them.
export const NOTIFICATIONS_API_URL = getApiUrl(ARBITRUM, "production");
export const NOTIFICATIONS_CHAIN_ID = ARBITRUM;

// All mirror public/sw.js.
export const NOTIFICATION_CLICK_MESSAGE_TYPE = "gmx-notification-click";
export const NOTIFICATION_ROUTE_SEARCH_PARAM = "notification";
// Marks a tap still to count: the service worker and a network-switch reload set it; the app removes it once counted.
export const NOTIFICATION_TYPE_SEARCH_PARAM = "notificationType";

// Marks a tap on an open app that the reload of a network switch carries over; the service worker never sets it.
export const NOTIFICATION_WARM_TAP_SEARCH_PARAM = "notificationWarm";

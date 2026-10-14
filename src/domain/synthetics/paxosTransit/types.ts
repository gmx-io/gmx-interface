import type { GmxApiSdk } from "sdk/clients/v2";

export type TransitApi = Pick<
  GmxApiSdk,
  | "fetchTransitRoutes"
  | "fetchTransitFeeTier"
  | "fetchTransitQuote"
  | "fetchTransitAuthorization"
  | "fetchTransitOrder"
  | "fetchTransitOrders"
>;

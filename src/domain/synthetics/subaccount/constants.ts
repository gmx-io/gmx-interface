import { hashString } from "lib/hash";

export const MAX_ALLOWED_SUBACCOUNT_ACTION_COUNT = hashString("MAX_ALLOWED_SUBACCOUNT_ACTION_COUNT");
export const SUBACCOUNT_ACTION_COUNT = hashString("SUBACCOUNT_ACTION_COUNT");
export const SUBACCOUNT_AUTO_TOP_UP_AMOUNT = hashString("SUBACCOUNT_AUTO_TOP_UP_AMOUNT");
export const SUBACCOUNT_ORDER_ACTION = hashString("SUBACCOUNT_ORDER_ACTION");

export const STRING_FOR_SIGNING = "Generate a GMX subaccount. Only sign this message on a trusted website.";
export const SUBACCOUNT_DOCS_URL = "https://docs.gmx.io/docs/trading/v2/#one-click-trading";

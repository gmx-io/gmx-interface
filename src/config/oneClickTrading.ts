import { periodToSeconds } from "sdk/utils/time";

// SDK integrators keep the shorter defaults from sdk/configs/express
export const DEFAULT_ONE_CLICK_SESSION_DURATION = periodToSeconds(30, "1d");
export const DEFAULT_ONE_CLICK_SESSION_MAX_ACTIONS = 400;

// Upper bounds for limits typed before signing; larger values overflow the signed approval.
export const MAX_ONE_CLICK_SESSION_DAYS = 3650;
export const MAX_ONE_CLICK_SESSION_ACTIONS = 1_000_000;

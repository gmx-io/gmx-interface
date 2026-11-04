import { periodToSeconds } from "sdk/utils/time";

// SDK integrators keep the shorter defaults from sdk/configs/express
export const DEFAULT_ONE_CLICK_SESSION_DURATION = periodToSeconds(30, "1d");
export const DEFAULT_ONE_CLICK_SESSION_MAX_ACTIONS = 400;

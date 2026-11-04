export const TOAST_AUTO_CLOSE_TIME = 7000;
export const WS_LOST_FOCUS_TIMEOUT = 60_000;
export const TRADE_LOST_FOCUS_TIMEOUT = 15_000;

export const PERCENTAGE_SUGGESTIONS = [10, 25, 50, 75];

export const TRADE_HISTORY_PER_PAGE = 25;
export const CLAIMS_HISTORY_PER_PAGE = 25;
export const UI_FEE_RECEIVER_ACCOUNT = import.meta.env.VITE_APP_UI_FEE_RECEIVER || null;

export const DEFAULT_TOOLTIP_POSITION = "bottom-start";

export const TOOLTIP_OPEN_DELAY = 100; // ms
export const TOOLTIP_CLOSE_DELAY = 100; // ms

// Tooltip standard
export const TOOLTIP_STANDARD_OPEN_DELAY = 200; // ms
export const TOOLTIP_GROUP_TIMEOUT = 300; // ms after a tooltip closes, the next one in the group still opens instantly
// Tooltip motion: TooltipMotion.tsx passes these to Tooltip.scss as CSS variables
export const TOOLTIP_ENTER_DURATION = 200; // ms
export const TOOLTIP_EXIT_DURATION = 120; // ms
export const TOOLTIP_ENTER_SCALE = 0.94;
export const TOOLTIP_ENTER_OFFSET = 4; // px the tooltip moves away from its trigger as it opens
export const TOOLTIP_EASING = "cubic-bezier(0.23, 1, 0.32, 1)";

export const GMX_PRICE_DECIMALS = 2;

export const DATA_LOAD_TIMEOUT_FOR_METRICS = 10000;

export const MAX_FEEDBACK_LENGTH = 500;

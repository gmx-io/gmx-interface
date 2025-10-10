import { i18n } from "@lingui/core";
import { t } from "@lingui/macro";
import type { Locale as DateLocale } from "date-fns";
import format from "date-fns/format";
import formatISO from "date-fns/formatISO";
import formatRelative from "date-fns/formatRelative";
import dateEn from "date-fns/locale/en-US";
import { BytesLike, ethers } from "ethers";
import words from "lodash/words";

import { abis } from "sdk/abis";
import { TradeActionType } from "sdk/types/tradeHistory";

import { LOCALE_DATE_LOCALE_MAP } from "components/DateRangeSelect/DateRangeSelect";

import { CustomErrorName } from "./CustomErrorName";

export function getOrderActionText(eventName: TradeActionType) {
  let actionText = "";

  if (eventName === TradeActionType.OrderCreated) {
    actionText = t`Create`;
  }

  if (eventName === TradeActionType.OrderCancelled) {
    actionText = t`Cancel`;
  }

  if (eventName === TradeActionType.OrderExecuted) {
    actionText = t`Execute`;
  }

  if (eventName === TradeActionType.OrderUpdated) {
    actionText = t`Update`;
  }

  if (eventName === TradeActionType.OrderFrozen) {
    actionText = t`Freeze`;
  }

  return actionText;
}
export type TooltipState = "success" | "error" | "muted" | undefined;
export type TooltipString =
  | undefined
  | string
  | {
      text: string | undefined;
      state?: TooltipState;
    };

export function numberToState(value: bigint | undefined): TooltipState {
  if (value === undefined) {
    return undefined;
  }

  if (value > 0) {
    return "success";
  }
  if (value < 0) {
    return "error";
  }

  return undefined;
}
export type Line =
  | TooltipString
  | TooltipString[]
  | {
      key: string;
      value: TooltipString;
    };
export type TooltipContent = Line[];
export function lines(...args: TooltipContent): TooltipContent {
  return args;
}
export function infoRow(key: string, value: TooltipString): Line {
  return {
    key,
    value,
  };
}

export type RowDetails = {
  action: string;
  actionComment?: TooltipContent;
  isActionError?: boolean;
  timestamp: string;
  timestampISO: string;
  market: string;
  fullMarket?: string;
  indexName?: string;
  poolName?: string;
  fullMarketNames?: {
    indexName: string;
    poolName: string;
  }[];
  size: string;
  price: string;
  priceComment: TooltipContent | null;
  pnl?: string;
  pnlState?: TooltipState;
  isLong?: boolean;
  indexTokenSymbol?: string;
  swapFromTokenSymbol?: string;
  swapFromTokenAmount?: string;
  swapToTokenSymbol?: string;
  swapToTokenAmount?: string;
  //#region CSV fields
  marketPrice?: string;
  executionPrice?: string;
  acceptablePrice?: string;
  priceImpact?: string;
  triggerPrice?: string;
  //#endregion
};

const CUSTOM_DATE_LOCALES = Object.fromEntries(
  Object.entries(LOCALE_DATE_LOCALE_MAP).map(([locale, dateLocale]) => {
    const originalFormatRelative = dateLocale.formatRelative;

    const customDateLocale = {
      ...dateLocale,
      formatRelative: (...args) => {
        const token = args[0];
        // @see docs for patterns https://date-fns.org/v3.6.0/docs/format

        if (token === "other" || !originalFormatRelative) {
          return "dd MMM yyyy, HH:mm";
        }

        if (token === "lastWeek") {
          return "eeee, HH:mm";
        }

        return originalFormatRelative(...args);
      },
    };

    return [locale, customDateLocale];
  })
);

/**
 * This format is understandable by the Google Sheets
 */
export function formatTradeActionTimestamp(timestamp: number, relativeTimestamp = true) {
  const localeStr = i18n.locale;

  const locale: DateLocale = CUSTOM_DATE_LOCALES[localeStr] ?? dateEn;

  if (!relativeTimestamp) {
    return format(new Date(timestamp * 1000), "yyyy-MM-dd HH:mm:ss", {
      locale,
    });
  }

  return formatRelative(new Date(timestamp * 1000), new Date(), {
    locale,
  });
}

export function formatTradeActionTimestampISO(timestamp: number) {
  return formatISO(new Date(timestamp * 1000), { representation: "complete" });
}

export type MakeOptional<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;

const customErrors = new ethers.Contract(ethers.ZeroAddress, abis.CustomErrors);

export function tryGetError(reasonBytes: BytesLike): ReturnType<typeof customErrors.interface.parseError> | undefined {
  let error: ReturnType<typeof customErrors.interface.parseError> | undefined;

  try {
    error = customErrors.interface.parseError(reasonBytes);
  } catch (error) {
    return undefined;
  }

  return error;
}

export function getErrorTooltipTitle(errorName: string, isMarketOrder: boolean) {
  if (errorName === CustomErrorName.OrderNotFulfillableAtAcceptablePrice && !isMarketOrder) {
    return t`The execution price didn't meet acceptable price. The order will fill when the condition is met.`;
  } else if (errorName === CustomErrorName.OrderNotFulfillableAtAcceptablePrice && isMarketOrder) {
    return t`The execution price didn't meet the acceptable price.`;
  } else if (errorName === CustomErrorName.InsufficientReserveForOpenInterest && !isMarketOrder) {
    return t`Insufficient available liquidity. The order will fill when there is liquidity available.`;
  } else if (errorName === CustomErrorName.InsufficientReserveForOpenInterest && isMarketOrder) {
    return t`Insufficient available liquidity.`;
  } else if (errorName === CustomErrorName.InsufficientSwapOutputAmount && !isMarketOrder) {
    return t`Insufficient available liquidity.`;
  } else if (errorName === CustomErrorName.InsufficientSwapOutputAmount && isMarketOrder) {
    return t`Insufficient available liquidity.`;
  }

  return t`Reason: ${words(errorName).join(" ").toLowerCase()}`;
}

const DOUBLE_NON_BREAKING_SPACE = String.fromCharCode(160) + String.fromCharCode(160);
export const INEQUALITY_GT = ">" + DOUBLE_NON_BREAKING_SPACE;
export const INEQUALITY_LT = "<" + DOUBLE_NON_BREAKING_SPACE;

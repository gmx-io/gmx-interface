import { i18n } from "@lingui/core";
import { t } from "@lingui/macro";
import type { Locale as DateLocale } from "date-fns";
import format from "date-fns/format";
import formatRelative from "date-fns/formatRelative";
import { BigNumber, ethers } from "ethers";

import dateDe from "date-fns/locale/de";
import dateEn from "date-fns/locale/en-US";
import dateEs from "date-fns/locale/es";
import dateFr from "date-fns/locale/fr";
import dateJa from "date-fns/locale/ja";
import dateKo from "date-fns/locale/ko";
import dateRu from "date-fns/locale/ru";
import dateZh from "date-fns/locale/zh-CN";

import { TradeActionType } from "domain/synthetics/tradeHistory";
import { locales } from "lib/i18n";

import CustomErrors from "abis/CustomErrors.json";

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
      text: string;
      state?: TooltipState;
    };

export function numberToState(value: BigNumber | undefined): TooltipState {
  if (!value) {
    return undefined;
  }

  if (value.gt(0)) {
    return "success";
  }
  if (value.lt(0)) {
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
  timestamp: string;
  market: string;
  fullMarket?: string;
  size: string;
  price: string;
  priceComment: TooltipContent;
  //#region CSV fields
  marketPrice?: string;
  executionPrice?: string;
  acceptablePrice?: string;
  priceImpact?: string;
  triggerPrice?: string;
  //#endregion
};

export const dateLocaleMap: Record<keyof typeof locales, DateLocale> = {
  en: dateEn,
  es: dateEs,
  zh: dateZh,
  ko: dateKo,
  ru: dateRu,
  ja: dateJa,
  fr: dateFr,
  de: dateDe,
  pseudo: dateEn,
};

Object.values(dateLocaleMap).forEach((locale) => {
  const originalFormatRelative = locale.formatRelative;

  locale.formatRelative = (...args) => {
    const token = args[0];
    if (token === "other" || !originalFormatRelative) {
      return "dd MMM yyyy, HH:mm";
    }
    return originalFormatRelative(...args);
  };
});

export function formatTradeActionTimestamp(timestamp: number, relativeTimestamp = true) {
  const localeStr = i18n.locale;

  const locale: DateLocale = dateLocaleMap[localeStr] || dateEn;

  if (!relativeTimestamp) {
    return format(new Date(timestamp * 1000), "yyyy-MM-dd HH:mm:ss", {
      locale,
    });
  }

  return formatRelative(new Date(timestamp * 1000), new Date(), {
    locale: locale,
  });
}

export type MakeOptional<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;

const customErrors = new ethers.Contract(ethers.constants.AddressZero, CustomErrors.abi);

export function tryGetError(
  reasonBytes: ethers.utils.Bytes
): ReturnType<typeof customErrors.interface.parseError> | undefined {
  let error: ReturnType<typeof customErrors.interface.parseError> | undefined;

  try {
    error = customErrors.interface.parseError(reasonBytes);
  } catch {
    return undefined;
  }

  return error;
}

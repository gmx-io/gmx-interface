import { i18n } from "@lingui/core";
import { t } from "@lingui/macro";
import formatRelative from "date-fns/formatRelative";
import { BigNumber } from "ethers";
import type { Locale as DateLocale } from "date-fns";
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
export type TooltipState = "success" | "error" | undefined;
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
export type Line = TooltipString | TooltipString[];
export type TooltipContent = Line[];
export function lines(...args: TooltipContent): TooltipContent {
  return args;
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

export function formatTradeActionTimestamp(timestamp: number) {
  const localeStr = i18n.locale;

  const locale: DateLocale = dateLocaleMap[localeStr] || dateEn;

  return formatRelative(new Date(timestamp * 1000), new Date(), {
    locale: locale,
  });
}

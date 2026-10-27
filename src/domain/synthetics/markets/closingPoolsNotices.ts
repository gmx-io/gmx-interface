import { plural, t } from "@lingui/macro";
import partition from "lodash/partition";
import uniq from "lodash/uniq";

import {
  formatMarketClosingDate,
  getIsSizeIncreasePendingOrder,
  getMarketClosingState,
} from "domain/synthetics/markets/closingMarkets";
import type { MarketsInfoData } from "domain/synthetics/markets/types";
import { getMarketBaseName } from "domain/synthetics/markets/utils";
import type { OrdersInfoData } from "domain/synthetics/orders/types";
import type { PositionsData } from "domain/synthetics/positions/types";
import { DAY_MS } from "lib/dates";
import { formatShortList } from "lib/i18n";
import { getByKey } from "lib/objects";

export type ClosingMarketExposure = {
  marketAddress: string;
  name: string;
  closingDate: number;
  isClosed: boolean;
  isLastDay: boolean;
  hasPosition: boolean;
  orderKeys: string[];
  exposureUsd: bigint;
};

export type ClosingNoticeStage = "intro" | "lastDay" | "closed";

export type ClosingNoticeSeenStages = Record<string, ClosingNoticeStage[]>;

export type ClosingPoolsNotice = {
  isClosed: boolean;
  title: string;
  bodyText: string | undefined;
  ordersCount: number;
  ordersLeadText: string;
  ordersActionText: string;
  ordersMarketAddresses: string[];
  seenStages: ClosingNoticeSeenStages;
};

type DueItem = {
  exposure: ClosingMarketExposure;
  stage: ClosingNoticeStage;
  isReminder: boolean;
};

export function getClosingMarketsExposure(p: {
  chainId: number;
  positionsData: PositionsData | undefined;
  ordersInfoData: OrdersInfoData | undefined;
  marketsInfoData: MarketsInfoData | undefined;
  now: number;
}): ClosingMarketExposure[] {
  const exposures = new Map<string, ClosingMarketExposure>();

  const getExposure = (marketAddress: string) => {
    const existing = exposures.get(marketAddress);

    if (existing) {
      return existing;
    }

    const marketInfo = getByKey(p.marketsInfoData, marketAddress);
    const closingState = getMarketClosingState(p.chainId, marketAddress, p.now);

    if (!marketInfo || marketInfo.isDisabled || !closingState) {
      return undefined;
    }

    const exposure: ClosingMarketExposure = {
      marketAddress,
      name: getMarketBaseName(marketInfo),
      closingDate: closingState.closingDate,
      isClosed: closingState.isClosed,
      isLastDay: !closingState.isClosed && p.now >= closingState.closingDate - DAY_MS,
      hasPosition: false,
      orderKeys: [],
      exposureUsd: 0n,
    };

    exposures.set(marketAddress, exposure);

    return exposure;
  };

  for (const position of Object.values(p.positionsData ?? {})) {
    const exposure = getExposure(position.marketAddress);

    if (exposure) {
      exposure.hasPosition = true;
      exposure.exposureUsd += position.sizeInUsd;
    }
  }

  for (const order of Object.values(p.ordersInfoData ?? {})) {
    const exposure = getIsSizeIncreasePendingOrder(order) ? getExposure(order.marketAddress) : undefined;

    if (exposure) {
      exposure.orderKeys.push(order.key);
      exposure.exposureUsd += order.sizeDeltaUsd;
    }
  }

  return Array.from(exposures.values()).sort((a, b) =>
    a.exposureUsd === b.exposureUsd ? 0 : a.exposureUsd > b.exposureUsd ? -1 : 1
  );
}

function getSeenStagesKey(exposure: ClosingMarketExposure) {
  return `${exposure.marketAddress}-${exposure.closingDate}`;
}

function getDueItem(exposure: ClosingMarketExposure, seenStages: ClosingNoticeStage[]): DueItem | undefined {
  const hasOrders = exposure.orderKeys.length > 0;

  if (!exposure.hasPosition && !hasOrders) {
    return undefined;
  }

  if (exposure.isClosed) {
    if (seenStages.includes("closed")) {
      return undefined;
    }

    if (seenStages.includes("intro")) {
      return hasOrders ? { exposure, stage: "closed", isReminder: true } : undefined;
    }

    return { exposure, stage: "closed", isReminder: false };
  }

  if (!seenStages.includes("intro")) {
    return { exposure, stage: "intro", isReminder: false };
  }

  if (exposure.isLastDay && hasOrders && !seenStages.includes("lastDay")) {
    return { exposure, stage: "lastDay", isReminder: true };
  }

  return undefined;
}

export function getClosingPoolsNotices(
  exposures: ClosingMarketExposure[],
  seenStages: Partial<ClosingNoticeSeenStages>
): ClosingPoolsNotice[] {
  const dueItems = exposures
    .map((exposure) => getDueItem(exposure, seenStages[getSeenStagesKey(exposure)] ?? []))
    .filter((item): item is DueItem => item !== undefined);

  const [closedItems, closingItems] = partition(dueItems, (item) => item.exposure.isClosed);

  return [closedItems, closingItems]
    .filter((items) => items.length > 0)
    .map((items) => getClosingPoolsNotice(items, seenStages));
}

function getClosingPoolsNotice(items: DueItem[], seenStages: Partial<ClosingNoticeSeenStages>): ClosingPoolsNotice {
  const isClosed = items[0].exposure.isClosed;
  const markets = formatShortList(items.map((item) => item.exposure.name));
  const isIntro = items.some((item) => !item.isReminder);
  const ordersCount = items.reduce((count, item) => count + item.exposure.orderKeys.length, 0);
  const closingDates = uniq(items.map((item) => item.exposure.closingDate));
  const date = closingDates.length === 1 ? formatMarketClosingDate(closingDates[0]) : undefined;

  const nextSeenStages: ClosingNoticeSeenStages = {};

  for (const item of items) {
    const key = getSeenStagesKey(item.exposure);
    const stages: ClosingNoticeStage[] =
      item.stage === "intro" && item.exposure.isLastDay ? ["intro", "lastDay"] : [item.stage];

    nextSeenStages[key] = uniq([...(seenStages[key] ?? []), ...stages]);
  }

  const ordersActionText = plural(ordersCount, {
    one: "Cancel and re-place it in the USDG pools.",
    other: "Cancel and re-place them in the USDG pools.",
  });

  if (isClosed) {
    return {
      isClosed,
      title: t`${markets} trading has moved to USDG pools`,
      bodyText: isIntro
        ? t`Your current positions stay open: hold, add margin, reduce or close any time. New positions open in the USDG pools.`
        : undefined,
      ordersCount,
      ordersLeadText: plural(ordersCount, {
        one: "# pending order can't fill.",
        other: "# pending orders can't fill.",
      }),
      ordersActionText,
      ordersMarketAddresses: items.map((item) => item.exposure.marketAddress),
      seenStages: nextSeenStages,
    };
  }

  let bodyText: string | undefined = undefined;

  if (isIntro) {
    bodyText = date
      ? t`The new USDG pools have more room. Your current positions stay open: hold, add margin, reduce or close any time. Adding size is limited now and stops on ${date}.`
      : t`The new USDG pools have more room. Your current positions stay open: hold, add margin, reduce or close any time. Adding size is limited now and stops soon.`;
  }

  return {
    isClosed,
    title: t`${markets} trading is moving to USDG pools`,
    bodyText,
    ordersCount,
    ordersLeadText: date
      ? plural(ordersCount, {
          one: `# pending order won't fill after ${date}.`,
          other: `# pending orders won't fill after ${date}.`,
        })
      : plural(ordersCount, {
          one: "# pending order will stop filling soon.",
          other: "# pending orders will stop filling soon.",
        }),
    ordersActionText,
    ordersMarketAddresses: items.map((item) => item.exposure.marketAddress),
    seenStages: nextSeenStages,
  };
}

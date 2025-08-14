import { t } from "@lingui/macro";
import cx from "classnames";
import { useMemo } from "react";
import { Link } from "react-router-dom";

import { useLeaderboardPageKey } from "context/SyntheticsStateContext/hooks/leaderboardHooks";
import { LeaderboardPageKey, LeaderboardTimeframe } from "domain/synthetics/leaderboard";
import { LEADERBOARD_PAGES, LEADERBOARD_PAGES_ORDER } from "domain/synthetics/leaderboard/constants";
import { mustNeverExist } from "lib/types";

import { BodyScrollFadeContainer } from "components/TableScrollFade/TableScrollFade";

type LeaderboardNavigationItem = {
  key: string;
  label: string;
  chip: "live" | "soon" | "over" | "none";
  isSelected: boolean;
  isCompetition: boolean;
  chainId?: number;
  href: string;
  timeframe: LeaderboardTimeframe;
};

const sortingPoints: Record<LeaderboardNavigationItem["chip"], number> = {
  over: 3,
  soon: 2,
  live: 1,
  none: 0,
};

function getChip(pageKey: LeaderboardPageKey): LeaderboardNavigationItem["chip"] {
  if (pageKey === "leaderboard") return "none";

  const timeframe = LEADERBOARD_PAGES[pageKey].timeframe;
  const isStartInFuture = timeframe.from > Date.now() / 1000;
  const isEndInFuture = timeframe.to === undefined || timeframe.to > Date.now() / 1000;

  if (isStartInFuture) return "soon";
  if (isEndInFuture) return "live";
  return "over";
}

function getLabel(pageKey: LeaderboardPageKey) {
  switch (pageKey) {
    case "leaderboard":
      return t`Global`;

    case "march_13-20_2024":
      return t`EIP-4844`;

    case "march_20-27_2024":
      return t`EIP-4844`;

    default:
      throw mustNeverExist(pageKey);
  }
}

function getTimeframeLabel(timeframe: LeaderboardTimeframe): string | null {
  if (!timeframe.to) return null;

  const fmt = new Intl.DateTimeFormat("en", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

  return fmt.formatRange(new Date(timeframe.from * 1000), new Date(timeframe.to * 1000));
}

export function LeaderboardNavigation() {
  const pageKey = useLeaderboardPageKey();
  const navigationItems = useMemo(() => {
    const allItems: LeaderboardNavigationItem[] = LEADERBOARD_PAGES_ORDER.map((key) => LEADERBOARD_PAGES[key])
      .filter((page) => !page.isCompetition || page.enabled)
      .map((page) => {
        return {
          key: page.key,
          label: getLabel(page.key),
          chip: getChip(page.key),
          isSelected: page.key === pageKey,
          isCompetition: page.key !== "leaderboard",
          href: page.href,
          timeframe: page.timeframe,
        };
      });

    const isCurrentPageConcluded = pageKey !== "leaderboard" && getChip(pageKey) === "over";

    let filteredItems = allItems;
    if (isCurrentPageConcluded) {
      filteredItems = allItems.filter((item) => item.chip === "over");
    } else {
      const nonConcludedItems = allItems.filter((item) => item.chip !== "over");
      const concludedItems = allItems.filter((item) => item.chip === "over").toReversed();

      const concludedTab: LeaderboardNavigationItem | null =
        concludedItems.length > 0
          ? {
              key: "concluded",
              label: t`Concluded`,
              chip: "none",
              isSelected: false,
              isCompetition: false,
              href: concludedItems[0].href,
              timeframe: { from: 0, to: undefined },
            }
          : null;

      filteredItems = [...nonConcludedItems];
      if (concludedTab) {
        filteredItems.push(concludedTab);
      }
    }

    // Sort items
    return filteredItems.sort((a, b) => {
      // Special case for "Concluded" tab - always put it last
      if (a.key === "concluded") return 1;
      if (b.key === "concluded") return -1;

      const sortingPointA = sortingPoints[a.chip];
      const sortingPointB = sortingPoints[b.chip];

      if (sortingPointA === sortingPointB) {
        return b.timeframe.from - a.timeframe.from;
      }

      return sortingPointA - sortingPointB;
    });
  }, [pageKey]);

  return (
    <BodyScrollFadeContainer className="flex gap-20">
      {navigationItems.map((item) => (
        <NavigationItem item={item} key={item.key} />
      ))}
    </BodyScrollFadeContainer>
  );
}

function NavigationItem({ item }: { item: LeaderboardNavigationItem }) {
  const timeframeLabel = getTimeframeLabel(item.timeframe);
  return (
    <Link
      to={item.href}
      className={cx(
        "text-h1 inline-flex items-center gap-8 whitespace-nowrap leading-[1] text-slate-100 hover:text-white",
        {
          "text-white": item.isSelected,
          "border-l-stroke border-l-slate-600 pl-18": item.key === "concluded",
        }
      )}
    >
      {item.label}

      {timeframeLabel && (
        <div className="text-body-small inline-flex h-fit whitespace-nowrap rounded-full bg-slate-700 px-8 py-6 text-slate-100">
          {timeframeLabel}
        </div>
      )}
    </Link>
  );
}

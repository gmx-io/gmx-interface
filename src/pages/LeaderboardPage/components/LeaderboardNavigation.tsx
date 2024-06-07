import { Trans, t } from "@lingui/macro";
import cx from "classnames";
import { getIcon } from "config/icons";
import { useLeaderboardPageKey } from "context/SyntheticsStateContext/hooks/leaderboardHooks";
import { LeaderboardPageKey, LeaderboardTimeframe } from "domain/synthetics/leaderboard";
import { LEADERBOARD_PAGES, LEADERBOARD_PAGES_ORDER } from "domain/synthetics/leaderboard/constants";
import { mustNeverExist } from "lib/types";
import { useMemo } from "react";
import { Link } from "react-router-dom";

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
      return t`Global Leaderboard`;

    case "march_13-20_2024":
      return t`EIP-4844, 13-20 Mar`;

    case "march_20-27_2024":
      return t`EIP-4844, 20-27 Mar`;

    default:
      throw mustNeverExist(pageKey);
  }
}

export function LeaderboardNavigation() {
  const pageKey = useLeaderboardPageKey();
  const navigationItems = useMemo(() => {
    const items: LeaderboardNavigationItem[] = LEADERBOARD_PAGES_ORDER.map((key) => LEADERBOARD_PAGES[key])
      .filter((page) => !page.isCompetition || page.enabled)
      .map((page) => {
        return {
          key: page.key,
          label: getLabel(page.key),
          chip: getChip(page.key),
          isSelected: page.key === pageKey,
          isCompetition: page.key !== "leaderboard",
          href: page.href,
          chainId: page.isCompetition ? page.chainId : undefined,
          timeframe: page.timeframe,
        };
      })
      .sort((a, b) => {
        const sortingPointA = sortingPoints[a.chip];
        const sortingPointB = sortingPoints[b.chip];

        if (sortingPointA === sortingPointB) {
          return b.timeframe.from - a.timeframe.from;
        }

        return sortingPointA - sortingPointB;
      });

    return items;
  }, [pageKey]);

  return (
    <div className="LeaderboardNavigation default-container-mobile-one-sided">
      {navigationItems.map((item) => (
        <NavigationItem item={item} key={item.key} />
      ))}
    </div>
  );
}

function NavigationItem({ item }: { item: LeaderboardNavigationItem }) {
  const chip = useMemo(() => {
    switch (item.chip) {
      case "live":
        return (
          <div className="LeaderboardNavigation__chip LeaderboardNavigation__chip_live">
            <span className="LeaderboardNavigation__chip-circle" />
            <Trans>LIVE</Trans>
          </div>
        );

      case "soon":
        return (
          <div className="LeaderboardNavigation__chip LeaderboardNavigation__chip_soon">
            <Trans>SOON</Trans>
          </div>
        );

      case "over":
        return (
          <div className="LeaderboardNavigation__chip LeaderboardNavigation__chip_over">
            <Trans>CONCLUDED</Trans>
          </div>
        );

      case "none":
        return null;

      default:
        throw mustNeverExist(item.chip);
    }
  }, [item.chip]);

  return (
    <Link
      to={item.href}
      className={cx("LeaderboardHeader__item button secondary center", {
        LeaderboardHeader__item_selected: item.isSelected,
      })}
    >
      {chip} {item.label}
      {item.chainId ? (
        <>
          <img className="LeaderboardHeader__network-icon" alt={t`Chain Icon`} src={getIcon(item.chainId, "network")} />
        </>
      ) : undefined}
    </Link>
  );
}

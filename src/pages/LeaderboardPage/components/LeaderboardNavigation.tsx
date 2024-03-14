import { t } from "@lingui/macro";
import cx from "classnames";
import { getIcon } from "config/icons";
import { useLeaderboardPageKey } from "context/SyntheticsStateContext/hooks/leaderboardHooks";
import { LeaderboardPageKey } from "domain/synthetics/leaderboard";
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
};

function getChip(pageKey: LeaderboardPageKey) {
  if (pageKey === "leaderboard") return "none";

  const timeframe = LEADERBOARD_PAGES[pageKey].timeframe;
  const isStartInFuture = timeframe.from > Date.now() / 1000;
  const isEndInFuture = timeframe.to === undefined || timeframe.to > Date.now() / 1000;

  if (isStartInFuture) return "soon";
  if (isEndInFuture) return "live";
  return "over";
}

export function LeaderboardNavigation() {
  const pageKey = useLeaderboardPageKey();
  const navigationItems = useMemo(() => {
    const items: LeaderboardNavigationItem[] = LEADERBOARD_PAGES_ORDER.map((key) => LEADERBOARD_PAGES[key])
      .filter((page) => !page.isCompetition || page.enabled)
      .map((page) => {
        return {
          key: page.key,
          label: page.label,
          chip: getChip(page.key),
          isSelected: page.key === pageKey,
          isCompetition: page.key !== "leaderboard",
          href: page.href,
          chainId: page.isCompetition ? page.chainId : undefined,
        };
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
            LIVE
          </div>
        );

      case "soon":
        return <div className="LeaderboardNavigation__chip LeaderboardNavigation__chip_soon">SOON</div>;

      case "over":
        return <div className="LeaderboardNavigation__chip LeaderboardNavigation__chip_over">OVER</div>;

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

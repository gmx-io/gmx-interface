import { lazy, Suspense } from "react";
import { useLocation } from "react-router-dom";

import { RedirectWithQuery } from "components/RedirectWithQuery/RedirectWithQuery";

import { RewardsPageLoadingShell } from "./RewardsPageShell";
import { getRewardsPathFromPointsPath } from "./rewardsRoutes";

export const INCENTIVES_ROUTE_PATHS = ["/points/:tab?", "/rewards/:tab?"];

const LazyRewardsPage = lazy(() =>
  import("pages/RewardsPage/RewardsPage").then((module) => ({ default: module.RewardsPage }))
);

export function IncentivesRoute() {
  const { pathname } = useLocation();

  if (pathname.startsWith("/points")) {
    return <RedirectWithQuery to={getRewardsPathFromPointsPath(pathname)} />;
  }

  return (
    <Suspense fallback={<RewardsPageLoadingShell />}>
      <LazyRewardsPage />
    </Suspense>
  );
}

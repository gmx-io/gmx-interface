import { t, Trans } from "@lingui/macro";
import { ReactNode, useMemo } from "react";
import { useLocation } from "react-router-dom";

import AppPageLayout from "components/AppPageLayout/AppPageLayout";
import { BreadcrumbItem, Breadcrumbs } from "components/Breadcrumbs/Breadcrumbs";
import Button from "components/Button/Button";
import { ChainContentHeader } from "components/ChainContentHeader/ChainContentHeader";
import ErrorBoundary from "components/Errors/ErrorBoundary";
import "components/GtPoints/tester/gtPointsTesterBootstrap"; // rewards-tester
import { GtPointsTesterPanel } from "components/GtPoints/tester/GtPointsTesterPanel"; // rewards-tester
import PageTitle from "components/PageTitle/PageTitle";

import { GT_POINTS_BUYBACK_PATH, GT_POINTS_GLOBAL_PATH, GT_POINTS_MY_PATH } from "./gtPointsTypes";

export function GtPointsPageLayout({ children }: { children?: ReactNode }) {
  const { pathname } = useLocation();

  const tabOptions = useMemo(
    () => [
      { path: GT_POINTS_MY_PATH, label: <Trans>My</Trans> },
      { path: GT_POINTS_GLOBAL_PATH, label: <Trans>Global</Trans> },
      { path: GT_POINTS_BUYBACK_PATH, label: <Trans>Buyback</Trans> },
    ],
    []
  );

  return (
    <AppPageLayout title={t`GT Points`} header={<ChainContentHeader />}>
      <GtPointsTesterPanel /* rewards-tester */ />
      <PageTitle title={t`GT Points`} subtitle={t`Earn GT by trading, staking and referring`} isTop />

      <div className="mt-12 flex grow flex-col gap-8">
        <div className="overflow-x-auto scrollbar-hide">
          <div className="flex gap-8">
            {tabOptions.map((tab) => (
              <Button
                key={tab.path}
                variant={pathname.startsWith(tab.path) ? "primary" : "secondary"}
                to={tab.path}
                className="shrink-0"
              >
                {tab.label}
              </Button>
            ))}
          </div>
        </div>

        {children ? (
          <ErrorBoundary id="GtPointsPageLayout" variant="block" wrapperClassName="rounded-t-8">
            <div className="flex grow flex-col gap-8">{children}</div>
          </ErrorBoundary>
        ) : null}
      </div>
    </AppPageLayout>
  );
}

// A page under GT Points (Stake): back link + "Solana data" in the header, the same pattern as pool details.
export function GtPointsSubpageLayout({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children?: ReactNode;
}) {
  const breadcrumbs = (
    <Breadcrumbs>
      <BreadcrumbItem to={GT_POINTS_MY_PATH} back>
        <Trans>GT Points</Trans>
      </BreadcrumbItem>
      <BreadcrumbItem active>{title}</BreadcrumbItem>
    </Breadcrumbs>
  );

  return (
    <AppPageLayout title={title} header={<ChainContentHeader breadcrumbs={breadcrumbs} />}>
      <GtPointsTesterPanel /* rewards-tester */ />
      <PageTitle title={title} subtitle={subtitle} isTop />
      <div className="mt-12 flex grow flex-col gap-8">
        <ErrorBoundary id="GtPointsSubpageLayout" variant="block" wrapperClassName="rounded-t-8">
          <div className="flex grow flex-col gap-8">{children}</div>
        </ErrorBoundary>
      </div>
    </AppPageLayout>
  );
}

// Main column + FAQ column. Below 1280 px the FAQ moves under the content, like Earn › Distributions.
export function GtPointsColumns({ main, side }: { main: ReactNode; side: ReactNode }) {
  return (
    <div className="flex gap-8 max-xl:flex-col">
      <div className="flex min-w-0 grow flex-col gap-8">{main}</div>
      <div className="flex w-[400px] shrink-0 flex-col gap-8 max-xl:w-full">{side}</div>
    </div>
  );
}

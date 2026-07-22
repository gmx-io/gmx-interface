import { t, Trans } from "@lingui/macro";

import AppPageLayout from "components/AppPageLayout/AppPageLayout";
import { ChainContentHeader } from "components/ChainContentHeader/ChainContentHeader";
import Loader from "components/Loader/Loader";
import PageTitle from "components/PageTitle/PageTitle";

export function RewardsPageLayout({ children }: { children: React.ReactNode }) {
  return (
    <AppPageLayout title={t`Rewards`} header={<ChainContentHeader />} contentClassName="!max-w-none">
      <PageTitle
        title={t`Rewards`}
        subtitle={<Trans>Track indexed esGMX accruals and GT allocations from eligible trading activity.</Trans>}
        isTop
      />
      {children}
    </AppPageLayout>
  );
}

export function RewardsPageLoadingShell() {
  return (
    <RewardsPageLayout>
      <div
        className="mt-12 flex min-h-[280px] grow items-center justify-center rounded-8 bg-slate-900"
        data-testid="rewards-loading-shell"
      >
        <Loader />
      </div>
    </RewardsPageLayout>
  );
}

import { t, Trans } from "@lingui/macro";

import AppPageLayout from "components/AppPageLayout/AppPageLayout";
import { ChainContentHeader } from "components/ChainContentHeader/ChainContentHeader";
import Loader from "components/Loader/Loader";
import PageTitle from "components/PageTitle/PageTitle";

export function RewardsPageLayout({ children }: { children: React.ReactNode }) {
  return (
    <AppPageLayout title={t`Rewards`} header={<ChainContentHeader hideChainData />} contentClassName="!max-w-none">
      <PageTitle
        title={t`Rewards`}
        subtitle={<Trans>Stake GMX, trade, and earn rewards worth up to 120% of your fees.</Trans>}
        isTop
      />
      {children}
    </AppPageLayout>
  );
}

export function RewardsPageLoadingContent() {
  return (
    <div className="flex min-h-[280px] grow items-center justify-center rounded-8 bg-slate-900">
      <Loader />
    </div>
  );
}

export function RewardsPageLoadingShell() {
  return (
    <RewardsPageLayout>
      <div className="mt-12 flex grow flex-col">
        <RewardsPageLoadingContent />
      </div>
    </RewardsPageLayout>
  );
}

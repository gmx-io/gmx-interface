import { Trans, t } from "@lingui/macro";
import { useMedia } from "react-use";
import { isAddress } from "viem";

import { SyntheticsStateContextProvider } from "context/SyntheticsStateContext/SyntheticsStateContextProvider";
import { useChainId } from "lib/chains";

import AddressView from "components/AddressView/AddressView";
import AppPageLayout from "components/AppPageLayout/AppPageLayout";
import { ChainContentHeader } from "components/ChainContentHeader/ChainContentHeader";
import PageTitle from "components/PageTitle/PageTitle";

import { DailyAndCumulativePnL } from "./DailyAndCumulativePnL";
import { GeneralPerformanceDetails } from "./GeneralPerformanceDetails";
import { HistoricalLists } from "./HistoricalLists";
import { usePageParams } from "./usePageParams";
import { VersionNetworkSwitcherRow } from "./VersionNetworkSwitcherRow";

export function AccountDashboard() {
  const { chainId: initialChainId } = useChainId();
  const isMobile = useMedia("(max-width: 600px)");

  const { chainId, version, account } = usePageParams(initialChainId);

  const header = <ChainContentHeader chainId={chainId} />;

  if (!isAddress(account!)) {
    return (
      <AppPageLayout title={t`GMX Account`} header={header}>
        <div className="default-container page-layout">
          <PageTitle title={t`GMX Account`} className="p-12" />
          <div className="text-center text-red-500">
            <Trans>Invalid Ethereum address</Trans>
          </div>
        </div>
      </AppPageLayout>
    );
  }

  return (
    <AppPageLayout title={t`GMX Account`} header={header}>
      <div className="default-container page-layout flex flex-col gap-8">
        <PageTitle
          title={t`GMX Account`}
          subtitle={
            <>
              <div className="text-body-medium mb-20 flex flex-wrap items-center gap-4 font-medium">
                <Trans>Account</Trans>
                <AddressView noLink address={account} size={20} breakpoint={isMobile ? "XL" : undefined} />
              </div>
              <VersionNetworkSwitcherRow account={account} chainId={chainId} version={version} />
            </>
          }
        />

        {version === 2 && (
          <SyntheticsStateContextProvider overrideChainId={chainId} pageType="accounts" skipLocalReferralCode={false}>
            <div className="flex flex-col gap-8">
              <div className="flex flex-row flex-wrap gap-8">
                <div className="max-w-full grow-[2] *:size-full">
                  <GeneralPerformanceDetails chainId={chainId} account={account} />
                </div>
                <div className="grow *:size-full">
                  <DailyAndCumulativePnL chainId={chainId} account={account} />
                </div>
              </div>
              <HistoricalLists chainId={chainId} account={account} />
            </div>
          </SyntheticsStateContextProvider>
        )}
      </div>
    </AppPageLayout>
  );
}

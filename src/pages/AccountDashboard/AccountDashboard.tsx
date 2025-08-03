import { Trans, t } from "@lingui/macro";
import { useMedia } from "react-use";
import { isAddress } from "viem";

import { SyntheticsStateContextProvider } from "context/SyntheticsStateContext/SyntheticsStateContextProvider";
import { useChainId } from "lib/chains";

import AddressView from "components/AddressView/AddressView";
import AppPageLayout from "components/AppPageLayout/AppPageLayout";
import PageTitle from "components/PageTitle/PageTitle";

import { DailyAndCumulativePnL } from "./DailyAndCumulativePnL";
import { GeneralPerformanceDetails } from "./GeneralPerformanceDetails";
import { HistoricalLists, HistoricalListsV1 } from "./HistoricalLists";
import { usePageParams } from "./usePageParams";
import { VersionNetworkSwitcherRow } from "./VersionNetworkSwitcherRow";

export function AccountDashboard() {
  const { chainId: initialChainId } = useChainId();
  const isMobile = useMedia("(max-width: 600px)");

  const { chainId, version, account } = usePageParams(initialChainId);

  const versionName = version === 2 ? "V2" : "V1";

  if (!isAddress(account!)) {
    return (
      <AppPageLayout>
        <div className="default-container page-layout">
          <PageTitle title={t`GMX ${versionName} Account`} chainId={chainId} />
          <div className="text-center text-red-500">
            <Trans>Invalid address. Please make sure you have entered a valid Ethereum address</Trans>
          </div>
        </div>
      </AppPageLayout>
    );
  }

  return (
    <AppPageLayout>
      <div className="default-container page-layout flex flex-col gap-8">
        <PageTitle
          chainId={chainId}
          title={t`GMX ${versionName} Account`}
          subtitle={
            <>
              <div className="text-body-medium mb-20 flex flex-wrap items-center gap-4 font-medium">
                <Trans>GMX information for account</Trans>
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

        {version === 1 && <HistoricalListsV1 account={account} chainId={chainId} />}
      </div>
    </AppPageLayout>
  );
}

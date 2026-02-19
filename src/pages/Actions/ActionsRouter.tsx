import { Trans, t } from "@lingui/macro";
import { useMemo } from "react";

import { ContractsChainId, getChainName } from "config/chains";
import { getIsV1Supported } from "config/features";
import { SyntheticsStateContextProvider } from "context/SyntheticsStateContext/SyntheticsStateContextProvider";
import { useChainId } from "lib/chains";
import { usePageParams } from "pages/AccountDashboard/usePageParams";
import { VersionNetworkSwitcherRow } from "pages/AccountDashboard/VersionNetworkSwitcherRow";

import AppPageLayout from "components/AppPageLayout/AppPageLayout";
import PageTitle from "components/PageTitle/PageTitle";

import SyntheticsActions from "./SyntheticsActions";

export function AccountsRouter() {
  const { chainId: initialChainId } = useChainId();
  const { chainId, version } = usePageParams(initialChainId);

  const isV1Supported = useMemo(() => chainId !== undefined && getIsV1Supported(chainId), [chainId]);

  if (version === 1 && !isV1Supported) {
    const chainName = getChainName(chainId! as ContractsChainId);

    return (
      <AppPageLayout title={t`GMX V1 Actions`}>
        <div className="default-container page-layout">
          <PageTitle
            isTop
            title={t`GMX V1 actions`}
            subtitle={<VersionNetworkSwitcherRow chainId={chainId} version={1} />}
          />
          <div className="text-center text-yellow-300">
            <Trans>V1 unsupported on {chainName}. Switch to Arbitrum to use V1.</Trans>
          </div>
        </div>
      </AppPageLayout>
    );
  }

  return (
    <SyntheticsStateContextProvider overrideChainId={chainId} pageType="accounts" skipLocalReferralCode>
      <AppPageLayout title={t`GMX V2 Actions`}>
        <SyntheticsActions />
      </AppPageLayout>
    </SyntheticsStateContextProvider>
  );
}

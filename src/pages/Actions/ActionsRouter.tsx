import { Trans, t } from "@lingui/macro";
import { useMemo } from "react";

import { CHAIN_NAMES_MAP } from "config/chains";
import { getIsV1Supported } from "config/features";
import { SyntheticsStateContextProvider } from "context/SyntheticsStateContext/SyntheticsStateContextProvider";
import { useChainId } from "lib/chains";
import { usePageParams } from "pages/AccountDashboard/usePageParams";

import PageTitle from "components/PageTitle/PageTitle";
import { VersionNetworkSwitcherRow } from "pages/AccountDashboard/VersionNetworkSwitcherRow";
import ActionsPageV1 from "./ActionsV1/ActionsV1";
import SyntheticsActions from "./SyntheticsActions";

export function AccountsRouter() {
  const { chainId: initialChainId } = useChainId();
  const { chainId, version } = usePageParams(initialChainId);

  const isV1Supported = useMemo(() => chainId !== undefined && getIsV1Supported(chainId), [chainId]);

  if (version === 1 && !isV1Supported) {
    const chainName = CHAIN_NAMES_MAP[chainId!];

    return (
      <div className="default-container page-layout">
        <PageTitle
          isTop
          title={t`GMX V1 Actions`}
          subtitle={<VersionNetworkSwitcherRow chainId={chainId} version={1} />}
        />
        <div className="text-center text-yellow-500">
          <Trans>V1 is not supported on {chainName}. Please switch to Arbitrum to use V1.</Trans>
        </div>
      </div>
    );
  }

  if (version === 1) {
    return <ActionsPageV1 chainId={chainId} />;
  }

  return (
    <SyntheticsStateContextProvider overrideChainId={chainId} pageType="accounts" skipLocalReferralCode>
      <SyntheticsActions />
    </SyntheticsStateContextProvider>
  );
}

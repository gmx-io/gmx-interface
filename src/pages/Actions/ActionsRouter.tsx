import { Trans, t } from "@lingui/macro";
import { useMemo } from "react";

import { CHAIN_NAMES_MAP } from "config/chains";
import { getIsV1Supported } from "config/features";
import { SyntheticsStateContextProvider } from "context/SyntheticsStateContext/SyntheticsStateContextProvider";
import useSearchParams from "lib/useSearchParams";
import useWallet from "lib/wallets/useWallet";
import { VERSION_QUERY_PARAM } from "pages/AccountDashboard/constants";

import PageTitle from "components/PageTitle/PageTitle";
import ActionsPageV1 from "./ActionsV1/ActionsV1";
import SyntheticsActions from "./SyntheticsActions";

export function AccountsRouter() {
  const { chainId } = useWallet();

  // We must ensure v1 is not on unsupported chains
  const { [VERSION_QUERY_PARAM]: v } = useSearchParams<{ [VERSION_QUERY_PARAM]: string }>();

  const isV1Supported = useMemo(() => chainId !== undefined && getIsV1Supported(chainId), [chainId]);

  if (v === "1" && !isV1Supported) {
    const chainName = CHAIN_NAMES_MAP[chainId!];

    return (
      <div className="default-container page-layout">
        <PageTitle isTop title={t`GMX V1 Actions`} />
        <div className="text-center text-yellow-500">
          <Trans>V1 is not supported on {chainName}. Please switch to Arbitrum to use V1.</Trans>
        </div>
      </div>
    );
  }

  if (v === "1") {
    return <ActionsPageV1 />;
  }

  return (
    <SyntheticsStateContextProvider pageType="accounts" skipLocalReferralCode>
      <SyntheticsActions />
    </SyntheticsStateContextProvider>
  );
}

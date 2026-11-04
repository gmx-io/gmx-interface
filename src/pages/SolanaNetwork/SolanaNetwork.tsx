import { Trans, t } from "@lingui/macro";
import type { ReactNode } from "react";
import { Link } from "react-router-dom";

import { selectMarketsInfoError } from "context/SyntheticsStateContext/selectors/globalSelectors";
import { useSelector } from "context/SyntheticsStateContext/utils";

import { AlertInfo } from "components/AlertInfo/AlertInfo";
import AppPageLayout from "components/AppPageLayout/AppPageLayout";

function SolanaNetworkMessage({ title, children }: { title: string; children: ReactNode }) {
  return (
    <AppPageLayout title={title}>
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-12 px-16 text-center">
        <h2 className="text-h2 text-typography-primary">{title}</h2>
        <div className="text-14 text-typography-secondary">{children}</div>
      </div>
    </AppPageLayout>
  );
}

export function EvmNetworksOnlyNotice() {
  return (
    <SolanaNetworkMessage title={t`EVM networks only`}>
      <Trans>
        This page is available on EVM networks only. Switch the network in the header, or go to{" "}
        <Link to="/trade" className="text-typography-primary underline">
          Trade
        </Link>
        .
      </Trans>
    </SolanaNetworkMessage>
  );
}

// Solana markets come only from gmx-api's Solana host and GMX's oracle keeper, with no RPC fallback,
// so a failed or stale response is shown instead of an empty trade page.
export function SolanaMarketsUnavailableNotice() {
  const marketsInfoError = useSelector(selectMarketsInfoError);

  if (!marketsInfoError) {
    return null;
  }

  return (
    <div className="px-16 pt-16">
      <AlertInfo type="warning" noMargin textColor="text-yellow-300">
        <Trans>Solana market data is unavailable right now. Prices and positions will appear once it is back.</Trans>
      </AlertInfo>
    </div>
  );
}

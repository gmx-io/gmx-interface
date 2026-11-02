import { Trans, t } from "@lingui/macro";
import type { ReactNode } from "react";
import { Link } from "react-router-dom";

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

export function SolanaTradePlaceholder() {
  return (
    <SolanaNetworkMessage title={t`Solana`}>
      <Trans>Trading on Solana is coming soon.</Trans>
    </SolanaNetworkMessage>
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

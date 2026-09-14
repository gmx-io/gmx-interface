import { Trans } from "@lingui/macro";
import { useEffect, useState } from "react";

import { useIsWalletInitializing } from "lib/wallets/useIsWalletInitializing";

import Loader from "components/Loader/Loader";

export function WalletReadyContent({ children }: { children: React.ReactNode }) {
  const isWalletInitializing = useIsWalletInitializing();
  const [hasWalletInitialized, setHasWalletInitialized] = useState(!isWalletInitializing);

  useEffect(() => {
    if (!isWalletInitializing) {
      setHasWalletInitialized(true);
    }
  }, [isWalletInitializing]);

  if (isWalletInitializing && !hasWalletInitialized) {
    return (
      <div className="flex min-h-screen w-full items-center justify-center" role="status">
        <Loader />
        <span className="sr-only">
          <Trans>Loading...</Trans>
        </span>
      </div>
    );
  }

  return children;
}

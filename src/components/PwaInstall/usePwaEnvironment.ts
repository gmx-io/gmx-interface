import { useMemo } from "react";

import useWallet from "lib/wallets/useWallet";

import { detectIosVersion, detectPwaPlatform, getIsInstalledApp, PwaPlatform } from "./pwaPlatform";

export type PwaEnvironment = {
  platform: PwaPlatform;
  /** iOS major version on iPhone and iPad, used to pick the first install step. */
  iosVersion: number | undefined;
  isInstalled: boolean;
  /** The connected account; nudges reset when it changes. */
  account: string | undefined;
  /**
   * Welcome card steps. Placeholders for the build task:
   * - signed in: the EVM wallet here; on Solana, read it from useSolanaWalletSession();
   * - funded: a GMX Account balance or collateral in the wallet (the Deposit button opens the GMX Account deposit);
   * - One-Click: Boolean(subaccount && getIsSubaccountActive(subaccount)), as in the Trading settings.
   */
  isSignedIn: boolean;
  isFunded: boolean;
  isOneClickOn: boolean;
};

export function usePwaEnvironment(): PwaEnvironment {
  const { account } = useWallet();
  const platform = useMemo(detectPwaPlatform, []);
  const iosVersion = useMemo(detectIosVersion, []);
  const isInstalled = useMemo(getIsInstalledApp, []);

  const env: PwaEnvironment = {
    platform,
    iosVersion,
    isInstalled,
    account,
    isSignedIn: Boolean(account),
    isFunded: false,
    isOneClickOn: false,
  };

  return env;
}

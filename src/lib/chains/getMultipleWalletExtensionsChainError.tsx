import { t, Trans } from "@lingui/macro";
import { ConnectedWallet, useWallets } from "@privy-io/react-auth";
import { useMemo } from "react";
import { isAddressEqual } from "viem";
import { useAccount } from "wagmi";

import { getChainName } from "config/chains";
import { ValidationResult } from "domain/synthetics/trade/utils/validation";
import { useChainId as useDisplayedChainId } from "lib/chains";
import useWallet from "lib/wallets/useWallet";

export function getChainIdFromPrivyWallet(wallet: ConnectedWallet): number {
  return Number(wallet.chainId.split(":")[1]);
}

/**
 * Multiple wallet extensions report different chains for the same address.
 * Signing may use the wrong extension even when wagmi shows the expected chain.
 */
export function useSuspiciousWallets(): {
  suspiciousWallets: ConnectedWallet[];
  isSuspicious: boolean;
} {
  const { account } = useWallet();
  const { ready, wallets } = useWallets();

  const suspiciousWallets = useMemo(() => {
    if (!ready) {
      return [];
    }

    const chainIds = new Set<number>();
    const suitableWallets = wallets.filter((wallet) => {
      return wallet.type === "ethereum" && account && isAddressEqual(wallet.address, account);
    });

    for (const wallet of suitableWallets) {
      chainIds.add(getChainIdFromPrivyWallet(wallet));
    }

    if (chainIds.size > 1) {
      return suitableWallets;
    }

    return [];
  }, [account, ready, wallets]);

  return {
    suspiciousWallets,
    isSuspicious: suspiciousWallets.length > 0,
  };
}

export function getMultipleWalletExtensionsChainError({
  requiredChainId,
  isSuspicious,
  isConnected,
}: {
  requiredChainId: number | undefined;
  isSuspicious: boolean;
  isConnected: boolean;
}): ValidationResult {
  if (!isConnected || requiredChainId === undefined || !isSuspicious) {
    return {};
  }

  const requiredChainName = getChainName(requiredChainId);

  return {
    buttonErrorMessage: t`Transaction blocked`,
    buttonTooltipMessage: (
      <Trans>
        Multiple wallet extensions for this account are on different networks. GMX cannot reliably tell which extension
        will show the signing prompt.
        <br />
        <br />
        To avoid signing on the wrong network and risking funds, switch all connected wallet extensions to{" "}
        {requiredChainName}, or disconnect the extra extension.
      </Trans>
    ),
  };
}

export function useMultipleWalletExtensionsChainError(): ValidationResult {
  const { chainId, srcChainId } = useDisplayedChainId();
  const { isConnected } = useAccount();
  const { isSuspicious } = useSuspiciousWallets();
  const requiredChainId = srcChainId ?? chainId;

  return useMemo(
    () =>
      getMultipleWalletExtensionsChainError({
        requiredChainId,
        isSuspicious,
        isConnected,
      }),
    [requiredChainId, isSuspicious, isConnected]
  );
}

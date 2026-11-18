import { useEffect } from "react";

import { ARBITRUM } from "config/chains";
import { USD_DECIMALS } from "config/factors";
import { getCollateralCloseDestinationKey } from "config/localStorage";
import { useSettings } from "context/SettingsContext/SettingsContextProvider";
import {
  selectIsGmxAccountBalancesLoaded,
  selectTokensData,
} from "context/SyntheticsStateContext/selectors/globalSelectors";
import { useSelector } from "context/SyntheticsStateContext/utils";
import { convertToUsd, getMidPrice } from "domain/synthetics/tokens";
import { TokensData } from "domain/synthetics/tokens/types";
import { useChainId } from "lib/chains";
import { hasStoredLocalStorageValue } from "lib/localStorage";
import { getByKey } from "lib/objects";
import { AccountType, useAccountType } from "lib/wallets/useAccountType";
import useWallet from "lib/wallets/useWallet";
import { useWalletCanSignTypedData } from "lib/wallets/useWalletSessionChains";
import { getGasPaymentTokens } from "sdk/configs/express";
import { expandDecimals } from "sdk/utils/numbers";

// the GMX Account destination pays Express gas from it too, so tokens that can't pay gas don't count
function getGmxAccountGasPaymentTokensUsd(chainId: number, tokensData: TokensData): bigint {
  let totalUsd = 0n;
  for (const tokenAddress of getGasPaymentTokens(chainId)) {
    const token = getByKey(tokensData, tokenAddress);
    if (token?.gmxAccountBalance === undefined || token.gmxAccountBalance === 0n) {
      continue;
    }
    totalUsd += convertToUsd(token.gmxAccountBalance, token.decimals, getMidPrice(token.prices))!;
  }
  return totalUsd;
}

const USD_THRESHOLD_FOR_ENABLE_GMX_ACCOUNT_CLOSE_DESTINATION = expandDecimals(20, USD_DECIMALS);

export function getDefaultReceiveToGmxAccount({
  accountType,
  canSignTypedData,
  gmxAccountUsd,
}: {
  accountType: AccountType | undefined;
  canSignTypedData: boolean;
  gmxAccountUsd: bigint;
}): boolean {
  const isSmartWallet = accountType === AccountType.SmartAccount && canSignTypedData;

  return isSmartWallet || gmxAccountUsd > USD_THRESHOLD_FOR_ENABLE_GMX_ACCOUNT_CLOSE_DESTINATION;
}

export function useInitCollateralCloseDestination() {
  const { chainId, srcChainId } = useChainId();
  const { account } = useWallet();
  const settings = useSettings();
  const tokensData = useSelector(selectTokensData);
  const isGmxAccountBalancesLoaded = useSelector(selectIsGmxAccountBalancesLoaded);
  const { accountType, isLoading: isAccountTypeLoading } = useAccountType();
  const { canSignTypedData, isLoading: isCanSignLoading } = useWalletCanSignTypedData();

  useEffect(() => {
    if (
      settings.receiveToGmxAccount !== null ||
      chainId !== ARBITRUM ||
      // source-chain closes always go to the GMX Account, so the first direct Arbitrum visit picks the default
      srcChainId !== undefined ||
      !isGmxAccountBalancesLoaded ||
      !tokensData ||
      isAccountTypeLoading ||
      isCanSignLoading
    ) {
      return;
    }

    // settings lag one render behind a switch: after an account switch the null check above skips that render,
    // whose balances are also stale; after a chain switch a stale null passes it, so check storage
    if (hasStoredLocalStorageValue(getCollateralCloseDestinationKey(chainId, account))) {
      return;
    }

    settings.setReceiveToGmxAccount(
      getDefaultReceiveToGmxAccount({
        accountType,
        canSignTypedData,
        gmxAccountUsd: getGmxAccountGasPaymentTokensUsd(chainId, tokensData),
      })
    );
  }, [
    settings,
    chainId,
    srcChainId,
    account,
    isGmxAccountBalancesLoaded,
    tokensData,
    accountType,
    isAccountTypeLoading,
    canSignTypedData,
    isCanSignLoading,
  ]);
}

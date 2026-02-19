import { useEffect } from "react";

import { ARBITRUM } from "config/chains";
import { USD_DECIMALS } from "config/factors";
import { getHadGmxAccountBalanceKey } from "config/localStorage";
import { useSettings } from "context/SettingsContext/SettingsContextProvider";
import {
  selectIsGmxAccountBalancesLoaded,
  selectTokensData,
} from "context/SyntheticsStateContext/selectors/globalSelectors";
import { useSelector } from "context/SyntheticsStateContext/utils";
import { convertToUsd, getMidPrice } from "domain/synthetics/tokens";
import { TokensData } from "domain/synthetics/tokens/types";
import { useChainId } from "lib/chains";
import { useLocalStorageSerializeKey } from "lib/localStorage";
import useWallet from "lib/wallets/useWallet";
import { expandDecimals } from "sdk/utils/numbers";

function getTotalGmxAccountUsd(tokensData: TokensData): bigint {
  let totalUsd = 0n;
  for (const token of Object.values(tokensData)) {
    if (token.gmxAccountBalance === undefined || token.gmxAccountBalance === 0n) {
      continue;
    }
    totalUsd += convertToUsd(token.gmxAccountBalance, token.decimals, getMidPrice(token.prices))!;
  }
  return totalUsd;
}

const USD_THRESHOLD_FOR_ENABLE_GMX_ACCOUNT_CLOSE_DESTINATION = expandDecimals(20, USD_DECIMALS);

export function useInitCollateralCloseDestination() {
  const { chainId } = useChainId();
  const { account } = useWallet();
  const settings = useSettings();
  const tokensData = useSelector(selectTokensData);
  const isGmxAccountBalancesLoaded = useSelector(selectIsGmxAccountBalancesLoaded);

  const [hadGmxAccountBalance, setHadGmxAccountBalance] = useLocalStorageSerializeKey<boolean>(
    getHadGmxAccountBalanceKey(chainId, account),
    false
  );

  const gmxAccountUsd = tokensData && isGmxAccountBalancesLoaded ? getTotalGmxAccountUsd(tokensData) : undefined;

  useEffect(() => {
    if (settings.receiveToGmxAccount !== null || chainId !== ARBITRUM || !isGmxAccountBalancesLoaded || !tokensData)
      return;

    const usd = getTotalGmxAccountUsd(tokensData);

    if (usd > USD_THRESHOLD_FOR_ENABLE_GMX_ACCOUNT_CLOSE_DESTINATION) {
      settings.setReceiveToGmxAccount(true);
    } else {
      settings.setReceiveToGmxAccount(false);
    }
  }, [settings, chainId, isGmxAccountBalancesLoaded, tokensData]);

  useEffect(() => {
    if (chainId !== ARBITRUM || gmxAccountUsd === undefined) return;

    if (gmxAccountUsd > 0n && !hadGmxAccountBalance) {
      setHadGmxAccountBalance(true);
      settings.setReceiveToGmxAccount(true);
    }
  }, [chainId, gmxAccountUsd, hadGmxAccountBalance, setHadGmxAccountBalance, settings]);
}

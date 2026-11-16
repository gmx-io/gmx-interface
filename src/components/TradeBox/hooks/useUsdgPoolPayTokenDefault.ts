import { useEffect, useRef } from "react";

import { getUsdgConversionTokenAddress } from "config/usdgPools";
import {
  selectAccount,
  selectChainId,
  selectTokensData,
} from "context/SyntheticsStateContext/selectors/globalSelectors";
import {
  selectTradeboxCollateralTokenAddress,
  selectTradeboxFormState,
  selectTradeboxFromTokenAddress,
  selectTradeboxMarketAddress,
  selectTradeboxTradeFlags,
} from "context/SyntheticsStateContext/selectors/tradeboxSelectors";
import { useSelector } from "context/SyntheticsStateContext/utils";
import { getBalanceByBalanceType, TokenBalanceType } from "domain/synthetics/tokens";
import { getShouldDefaultToUsdc } from "domain/synthetics/usdgPools/usdcConversion";

/**
 * USDG pools take only USDG, but most traders hold USDC: switch Pay to USDC once per market when there is no USDG
 */
export function useUsdgPoolPayTokenDefault() {
  const chainId = useSelector(selectChainId);
  const account = useSelector(selectAccount);
  const tokensData = useSelector(selectTokensData);
  const { isIncrease } = useSelector(selectTradeboxTradeFlags);
  const marketAddress = useSelector(selectTradeboxMarketAddress);
  const collateralTokenAddress = useSelector(selectTradeboxCollateralTokenAddress);
  const fromTokenAddress = useSelector(selectTradeboxFromTokenAddress);
  const { isFromTokenGmxAccount, setFromTokenAddress } = useSelector(selectTradeboxFormState);
  const checkedForRef = useRef<string>();

  useEffect(
    function defaultPayTokenToUsdc() {
      const usdcAddress = getUsdgConversionTokenAddress(chainId, collateralTokenAddress);

      if (!isIncrease || !usdcAddress || !collateralTokenAddress) {
        return;
      }

      const checkKey = `${account}:${marketAddress}:${isFromTokenGmxAccount}`;

      if (checkedForRef.current === checkKey) {
        return;
      }

      const balanceType = isFromTokenGmxAccount ? TokenBalanceType.GmxAccount : TokenBalanceType.Wallet;
      const usdgBalance = getBalanceByBalanceType(tokensData?.[collateralTokenAddress], balanceType);
      const usdcBalance = getBalanceByBalanceType(tokensData?.[usdcAddress], balanceType);

      if (usdgBalance === undefined || usdcBalance === undefined) {
        return;
      }

      // checked once per market whatever Pay is, so a USDG pick made afterwards is never overridden
      checkedForRef.current = checkKey;

      if (fromTokenAddress === collateralTokenAddress && getShouldDefaultToUsdc({ usdgBalance, usdcBalance })) {
        setFromTokenAddress(usdcAddress);
      }
    },
    [
      account,
      chainId,
      collateralTokenAddress,
      fromTokenAddress,
      isFromTokenGmxAccount,
      isIncrease,
      marketAddress,
      setFromTokenAddress,
      tokensData,
    ]
  );
}

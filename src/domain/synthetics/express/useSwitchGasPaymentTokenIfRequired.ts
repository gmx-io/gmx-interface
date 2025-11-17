import { t } from "@lingui/macro";
import debounce from "lodash/debounce";
import { useEffect } from "react";

import { selectTokensData } from "context/SyntheticsStateContext/selectors/globalSelectors";
import { selectSetGasPaymentTokenAddress } from "context/SyntheticsStateContext/selectors/settingsSelectors";
import { useSelector } from "context/SyntheticsStateContext/utils";
import { convertToTokenAmount, convertToUsd, TokenData } from "domain/tokens";
import { useChainId } from "lib/chains";
import { helperToast } from "lib/helperToast";
import { getByKey } from "lib/objects";
import { getGasPaymentTokens } from "sdk/configs/express";

import { ExpressTxnParams } from "./types";

const notifyGasPaymentTokenSwitched = debounce(
  ({ fromSymbol, toSymbol }: { fromSymbol: string; toSymbol: string }) => {
    helperToast.info(t`Gas payment token switched from ${fromSymbol} to ${toSymbol} due to insufficient balance.`);
  },
  100,
  { leading: false, trailing: true }
);

export function useSwitchGasPaymentTokenIfRequiredFromExpressParams({
  expressParams,
  isGmxAccount,
}: {
  expressParams: Pick<ExpressTxnParams, "gasPaymentValidations" | "gasPaymentParams"> | undefined;
  isGmxAccount: boolean;
}) {
  useSwitchGasPaymentTokenIfRequired({
    isOutGasTokenBalance: expressParams?.gasPaymentValidations.isOutGasTokenBalance,
    gasPaymentToken: expressParams?.gasPaymentParams.gasPaymentToken,
    gasPaymentTokenAmount: expressParams?.gasPaymentParams.gasPaymentTokenAmount,
    isGmxAccount,
  });
}

function useSwitchGasPaymentTokenIfRequired({
  isOutGasTokenBalance,
  gasPaymentToken,
  gasPaymentTokenAmount,
  isGmxAccount,
}: {
  isOutGasTokenBalance: boolean | undefined;
  gasPaymentToken: TokenData | undefined;
  gasPaymentTokenAmount: bigint | undefined;
  isGmxAccount: boolean;
}) {
  const { chainId } = useChainId();
  const setGasPaymentTokenAddress = useSelector(selectSetGasPaymentTokenAddress);
  const tokensData = useSelector(selectTokensData);

  useEffect(
    function switchGasPaymentToken() {
      if (isOutGasTokenBalance && gasPaymentToken && gasPaymentTokenAmount !== undefined) {
        const usdValue = convertToUsd(gasPaymentTokenAmount, gasPaymentToken.decimals, gasPaymentToken.prices.minPrice);

        const anotherGasToken = getGasPaymentTokens(chainId).find((tokenAddress) => {
          const tokenData = getByKey(tokensData, tokenAddress);

          const requiredTokenAmount = convertToTokenAmount(usdValue, tokenData?.decimals, tokenData?.prices.minPrice);

          const balance = isGmxAccount ? tokenData?.gmxAccountBalance : tokenData?.walletBalance;

          if (
            tokenData?.address === gasPaymentToken.address ||
            usdValue === undefined ||
            requiredTokenAmount === undefined ||
            balance === undefined
          ) {
            return false;
          }

          return balance > requiredTokenAmount;
        });

        if (anotherGasToken && anotherGasToken !== gasPaymentToken.address) {
          const newTokenData = getByKey(tokensData, anotherGasToken);
          setGasPaymentTokenAddress(anotherGasToken);
          if (newTokenData) {
            notifyGasPaymentTokenSwitched({ fromSymbol: gasPaymentToken.symbol, toSymbol: newTokenData.symbol });
          }
        }
      }
    },
    [
      chainId,
      gasPaymentToken,
      gasPaymentTokenAmount,
      isGmxAccount,
      isOutGasTokenBalance,
      setGasPaymentTokenAddress,
      tokensData,
    ]
  );
}

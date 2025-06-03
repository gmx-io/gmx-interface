import { useEffect } from "react";

import { selectTokensData } from "context/SyntheticsStateContext/selectors/globalSelectors";
import {
  selectSetExpressTradingGasTokenSwitched,
  selectSetGasPaymentTokenAddress,
  selectSetSettingsWarningDotVisible,
} from "context/SyntheticsStateContext/selectors/settingsSelectors";
import { useSelector } from "context/SyntheticsStateContext/utils";
import { convertToTokenAmount, convertToUsd } from "domain/tokens";
import { useChainId } from "lib/chains";
import { getByKey } from "lib/objects";
import { getGasPaymentTokens } from "sdk/configs/express";

import { ExpressTxnParams } from "./types";

export function useSwitchGasPaymentTokenIfRequired({ expressParams }: { expressParams: ExpressTxnParams | undefined }) {
  const { chainId } = useChainId();
  const setGasPaymentTokenAddress = useSelector(selectSetGasPaymentTokenAddress);
  const tokensData = useSelector(selectTokensData);
  const setSettingsWarningDotVisible = useSelector(selectSetSettingsWarningDotVisible);
  const setExpressTradingGasTokenSwitched = useSelector(selectSetExpressTradingGasTokenSwitched);

  useEffect(
    function switchGasPaymentToken() {
      if (expressParams?.gasPaymentValidations.isOutGasTokenBalance) {
        const { gasPaymentToken, gasPaymentTokenAmount } = expressParams.gasPaymentParams;

        const usdValue = convertToUsd(gasPaymentTokenAmount, gasPaymentToken.decimals, gasPaymentToken.prices.minPrice);

        const anotherGasToken = getGasPaymentTokens(chainId).find((tokenAddress) => {
          const tokenData = getByKey(tokensData, tokenAddress);

          const requiredTokenAmount = convertToTokenAmount(usdValue, tokenData?.decimals, tokenData?.prices.minPrice);

          if (
            tokenData?.address === gasPaymentToken.address ||
            usdValue === undefined ||
            requiredTokenAmount === undefined ||
            tokenData?.balance === undefined
          ) {
            return false;
          }

          return tokenData.balance > requiredTokenAmount;
        });

        if (anotherGasToken && anotherGasToken !== expressParams!.gasPaymentParams.gasPaymentTokenAddress) {
          setSettingsWarningDotVisible(true);
          setGasPaymentTokenAddress(anotherGasToken);
          setExpressTradingGasTokenSwitched(true);
        }
      }
    },
    [
      chainId,
      expressParams,
      setExpressTradingGasTokenSwitched,
      setGasPaymentTokenAddress,
      setSettingsWarningDotVisible,
      tokensData,
    ]
  );
}

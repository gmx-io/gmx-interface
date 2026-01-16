import { useEffect } from "react";

import {
  selectPoolsDetailsFirstTokenAddress,
  selectPoolsDetailsFlags,
  selectPoolsDetailsSecondTokenAmount,
  selectPoolsDetailsSecondTokenAddress,
  selectPoolsDetailsSetFirstTokenAddress,
  selectPoolsDetailsSetFocusedInput,
  selectPoolsDetailsSetSecondTokenAddress,
  selectPoolsDetailsSetSecondTokenInputValue,
} from "context/PoolsDetailsContext/selectors";
import { useSelector } from "context/SyntheticsStateContext/utils";
import type { GlvOrMarketInfo } from "domain/synthetics/markets/types";
import { getTokenPoolType } from "domain/synthetics/markets/utils";
import type { ERC20Address, NativeTokenSupportedAddress, Token } from "domain/tokens";
import { useChainId } from "lib/chains";
import { convertTokenAddress } from "sdk/configs/tokens";

export function useUpdateTokens({
  tokenOptions,
  marketInfo,
}: {
  tokenOptions: Token[];
  marketInfo: GlvOrMarketInfo | undefined;
}) {
  const { chainId } = useChainId();
  const { isPair, isSingle } = useSelector(selectPoolsDetailsFlags);

  const firstTokenAddress = useSelector(selectPoolsDetailsFirstTokenAddress);
  const setFirstTokenAddress = useSelector(selectPoolsDetailsSetFirstTokenAddress);
  const secondTokenAddress = useSelector(selectPoolsDetailsSecondTokenAddress);
  const setSecondTokenAddress = useSelector(selectPoolsDetailsSetSecondTokenAddress);
  const setSecondTokenInputValue = useSelector(selectPoolsDetailsSetSecondTokenInputValue);
  const setFocusedInput = useSelector(selectPoolsDetailsSetFocusedInput);
  const secondTokenAmount = useSelector(selectPoolsDetailsSecondTokenAmount);

  useEffect(
    function updateTokens() {
      if (!tokenOptions.length) return;

      if (secondTokenAddress && !isPair) {
        setSecondTokenAddress(undefined);
        setSecondTokenInputValue("");
        return;
      }

      const isFirstTokenValid = tokenOptions.find((token) => token.address === firstTokenAddress);
      if (!isFirstTokenValid) {
        setFirstTokenAddress(tokenOptions[0].address as ERC20Address | NativeTokenSupportedAddress);
      }

      const moveFromPairToSingleWithPresentSecondToken =
        isSingle && secondTokenAddress && marketInfo && secondTokenAmount !== undefined && secondTokenAmount > 0n;
      if (moveFromPairToSingleWithPresentSecondToken) {
        const secondTokenPoolType = getTokenPoolType(marketInfo, secondTokenAddress);

        setFocusedInput(secondTokenPoolType === "long" ? "first" : "second");
        setSecondTokenAddress(undefined);
        setSecondTokenInputValue("");
        return;
      }

      if (isPair && firstTokenAddress) {
        if (marketInfo?.isSameCollaterals) {
          if (!secondTokenAddress || firstTokenAddress !== secondTokenAddress) {
            setSecondTokenAddress(firstTokenAddress);
          }

          return;
        }

        if (
          !secondTokenAddress ||
          !tokenOptions.find((token) => token.address === secondTokenAddress) ||
          convertTokenAddress(chainId, firstTokenAddress, "wrapped") ===
            convertTokenAddress(chainId, secondTokenAddress, "wrapped")
        ) {
          const secondToken = tokenOptions.find((token) => {
            return (
              convertTokenAddress(chainId, token.address, "wrapped") !==
              convertTokenAddress(chainId, firstTokenAddress, "wrapped")
            );
          });
          setSecondTokenAddress(secondToken?.address as ERC20Address | NativeTokenSupportedAddress | undefined);
        }
      }
    },
    [
      chainId,
      firstTokenAddress,
      isPair,
      isSingle,
      marketInfo,
      secondTokenAddress,
      secondTokenAmount,
      setFirstTokenAddress,
      setFocusedInput,
      setSecondTokenAddress,
      setSecondTokenInputValue,
      tokenOptions,
    ]
  );
}

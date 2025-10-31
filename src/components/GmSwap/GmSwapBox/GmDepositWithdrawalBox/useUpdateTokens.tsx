import { useEffect } from "react";

import { PoolsDetailsState } from "context/PoolsDetailsContext/PoolsDetailsContext";
import { GlvOrMarketInfo } from "domain/synthetics/markets/types";
import { getTokenPoolType } from "domain/synthetics/markets/utils";
import { ERC20Address, NativeTokenSupportedAddress, Token } from "domain/tokens";
import { convertTokenAddress } from "sdk/configs/tokens";

export function useUpdateTokens({
  chainId,
  tokenOptions,
  firstTokenAddress,
  setFirstTokenAddress,
  isSingle,
  isPair,
  secondTokenAddress,
  marketInfo,
  secondTokenAmount,
  setFocusedInput,
  setSecondTokenAddress,
  setSecondTokenInputValue,
}: {
  chainId: number;
  tokenOptions: Token[];
  firstTokenAddress: PoolsDetailsState["firstTokenAddress"];
  setFirstTokenAddress: PoolsDetailsState["setFirstTokenAddress"];
  isSingle: boolean;
  isPair: boolean;
  secondTokenAddress: PoolsDetailsState["secondTokenAddress"];
  marketInfo: GlvOrMarketInfo | undefined;
  secondTokenAmount: bigint | undefined;
  setFocusedInput: PoolsDetailsState["setFocusedInput"];
  setSecondTokenAddress: PoolsDetailsState["setSecondTokenAddress"];
  setSecondTokenInputValue: PoolsDetailsState["setSecondTokenInputValue"];
}) {
  useEffect(
    function updateTokens() {
      if (!tokenOptions.length) return;

      const isFirstTokenValid = tokenOptions.find((token) => token.address === firstTokenAddress);
      if (!isFirstTokenValid) {
        setFirstTokenAddress(tokenOptions[0].address as ERC20Address | NativeTokenSupportedAddress);
      }

      const moveFromPairToSingleWithPresentSecondToken =
        isSingle && secondTokenAddress && marketInfo && secondTokenAmount !== undefined && secondTokenAmount > 0n;
      if (moveFromPairToSingleWithPresentSecondToken) {
        const secondTokenPoolType = getTokenPoolType(marketInfo, secondTokenAddress);

        setFocusedInput(secondTokenPoolType === "long" ? "longCollateral" : "shortCollateral");
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

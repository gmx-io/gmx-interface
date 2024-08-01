import { Dispatch, SetStateAction, useEffect } from "react";
import { convertTokenAddress } from "config/tokens";
import { MarketInfo } from "domain/synthetics/markets/types";
import { getTokenPoolType } from "domain/synthetics/markets/utils";
import { Token } from "domain/tokens";

export function useUpdateTokens({
  tokenOptions,
  firstTokenAddress,
  setFirstTokenAddress,
  isSingle,
  secondTokenAddress,
  marketInfo,
  secondTokenAmount,
  setFocusedInput,
  setSecondTokenAddress,
  setSecondTokenInputValue,
  isPair,
  chainId,
}: {
  tokenOptions: Token[];
  firstTokenAddress: string | undefined;
  setFirstTokenAddress: Dispatch<SetStateAction<string | undefined>>;
  isSingle: boolean;
  secondTokenAddress: string | undefined;
  marketInfo: MarketInfo | undefined;
  secondTokenAmount: bigint | undefined;
  setFocusedInput: Dispatch<SetStateAction<"market" | "longCollateral" | "shortCollateral">>;
  setSecondTokenAddress: Dispatch<SetStateAction<string | undefined>>;
  setSecondTokenInputValue: Dispatch<SetStateAction<string>>;
  isPair: boolean;
  chainId: number;
}) {
  useEffect(
    function updateTokens() {
      if (!tokenOptions.length) return;

      const isFirstTokenValid = tokenOptions.find((token) => token.address === firstTokenAddress);
      if (!isFirstTokenValid) {
        setFirstTokenAddress(tokenOptions[0].address);
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
          setSecondTokenAddress(secondToken?.address);
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

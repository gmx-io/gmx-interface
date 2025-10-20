import { useEffect } from "react";

import { GlvOrMarketInfo } from "domain/synthetics/markets/types";
import { getTokenPoolType } from "domain/synthetics/markets/utils";
import { Token } from "domain/tokens";
import { convertTokenAddress } from "sdk/configs/tokens";

import { FocusedInput } from "./types";

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
  firstTokenAddress: string | undefined;
  setFirstTokenAddress: (address: string | undefined) => void;
  isSingle: boolean;
  isPair: boolean;
  secondTokenAddress: string | undefined;
  marketInfo: GlvOrMarketInfo | undefined;
  secondTokenAmount: bigint | undefined;
  setFocusedInput: (input: FocusedInput) => void;
  setSecondTokenAddress: (address: string | undefined) => void;
  setSecondTokenInputValue: (value: string) => void;
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

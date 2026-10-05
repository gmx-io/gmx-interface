import { useEffect } from "react";

import type { SettlementChainId } from "config/chains";
import {
  selectPoolsDetailsFirstTokenAddress,
  selectPoolsDetailsFlags,
  selectPoolsDetailsLongTokenAddress,
  selectPoolsDetailsPaySource,
  selectPoolsDetailsSecondTokenAmount,
  selectPoolsDetailsSecondTokenAddress,
  selectPoolsDetailsSetFirstTokenAddress,
  selectPoolsDetailsSetFocusedInput,
  selectPoolsDetailsSetSecondTokenAddress,
  selectPoolsDetailsSetSecondTokenInputValue,
  selectPoolsDetailsShortTokenAddress,
} from "context/PoolsDetailsContext/selectors";
import { useSelector } from "context/SyntheticsStateContext/utils";
import { GlvOrMarketInfo } from "domain/synthetics/markets/types";
import { getTokenPoolType } from "domain/synthetics/markets/utils";
import { ERC20Address, NativeTokenSupportedAddress } from "domain/tokens";
import { useChainId } from "lib/chains";
import { convertTokenAddress } from "sdk/configs/tokens";

import type { DisplayToken } from "components/TokenSelector/types";

import { resolveSourceChainPayTokenAddress } from "./resolveSourceChainPayTokenAddress";

export function useUpdateTokens({
  tokenOptions,
  marketInfo,
}: {
  tokenOptions: DisplayToken[];
  marketInfo: GlvOrMarketInfo | undefined;
}) {
  const { chainId, srcChainId } = useChainId();
  const { isPair, isSingle, isDeposit } = useSelector(selectPoolsDetailsFlags);
  const paySource = useSelector(selectPoolsDetailsPaySource);
  const longTokenAddress = useSelector(selectPoolsDetailsLongTokenAddress);
  const shortTokenAddress = useSelector(selectPoolsDetailsShortTokenAddress);

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

      const sourceChainPayTokenAddress =
        isDeposit && paySource === "sourceChain" && srcChainId !== undefined
          ? resolveSourceChainPayTokenAddress({
              chainId: chainId as SettlementChainId,
              srcChainId,
              firstTokenAddress,
              tokenOptions,
              collateralTokenAddresses: [longTokenAddress, shortTokenAddress].filter(
                (tokenAddress): tokenAddress is ERC20Address => tokenAddress !== undefined
              ),
            })
          : undefined;

      if (sourceChainPayTokenAddress !== undefined) {
        if (sourceChainPayTokenAddress !== firstTokenAddress) {
          setFirstTokenAddress(sourceChainPayTokenAddress as ERC20Address | NativeTokenSupportedAddress);
        }
      } else if (!tokenOptions.some((token) => token.address === firstTokenAddress)) {
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
      isDeposit,
      isPair,
      isSingle,
      longTokenAddress,
      marketInfo,
      paySource,
      secondTokenAddress,
      secondTokenAmount,
      setFirstTokenAddress,
      setFocusedInput,
      setSecondTokenAddress,
      setSecondTokenInputValue,
      shortTokenAddress,
      srcChainId,
      tokenOptions,
    ]
  );
}

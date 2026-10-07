import { useEffect } from "react";

import type { SettlementChainId } from "config/chains";
import { getIsUsdgPool } from "config/usdgPools";
import {
  selectPoolsDetailsFirstTokenAddress,
  selectPoolsDetailsFirstTokenInputValue,
  selectPoolsDetailsFlags,
  selectPoolsDetailsGlvOrMarketAddress,
  selectPoolsDetailsIsFirstTokenPinned,
  selectPoolsDetailsLongTokenAddress,
  selectPoolsDetailsMarketOrGlvTokenInputValue,
  selectPoolsDetailsPaySource,
  selectPoolsDetailsSecondTokenAmount,
  selectPoolsDetailsSecondTokenAddress,
  selectPoolsDetailsSetFirstTokenAddress,
  selectPoolsDetailsSetFocusedInput,
  selectPoolsDetailsSetSecondTokenAddress,
  selectPoolsDetailsSetSecondTokenInputValue,
  selectPoolsDetailsShortTokenAddress,
} from "context/PoolsDetailsContext/selectors";
import { useSyntheticsEvents } from "context/SyntheticsEvents";
import { selectAccount, selectIsWalletBalancesLoaded } from "context/SyntheticsStateContext/selectors/globalSelectors";
import { useSelector } from "context/SyntheticsStateContext/utils";
import { GlvOrMarketInfo } from "domain/synthetics/markets/types";
import { getTokenPoolType } from "domain/synthetics/markets/utils";
import { getTransitRouteProgressForMarket } from "domain/synthetics/paxosTransit/transitRouteProgress";
import { ERC20Address, NativeTokenSupportedAddress } from "domain/tokens";
import { useChainId } from "lib/chains";
import { GMX_ACCOUNT_PSEUDO_CHAIN_ID } from "sdk/configs/chains";
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
  const account = useSelector(selectAccount);
  const isWalletBalancesLoaded = useSelector(selectIsWalletBalancesLoaded);

  const { isPair, isSingle, isDeposit } = useSelector(selectPoolsDetailsFlags);
  const paySource = useSelector(selectPoolsDetailsPaySource);
  const glvOrMarketAddress = useSelector(selectPoolsDetailsGlvOrMarketAddress);
  const longTokenAddress = useSelector(selectPoolsDetailsLongTokenAddress);
  const shortTokenAddress = useSelector(selectPoolsDetailsShortTokenAddress);

  const firstTokenAddress = useSelector(selectPoolsDetailsFirstTokenAddress);
  const setFirstTokenAddress = useSelector(selectPoolsDetailsSetFirstTokenAddress);
  const isFirstTokenPinned = useSelector(selectPoolsDetailsIsFirstTokenPinned);
  const firstTokenInputValue = useSelector(selectPoolsDetailsFirstTokenInputValue);
  const marketOrGlvTokenInputValue = useSelector(selectPoolsDetailsMarketOrGlvTokenInputValue);
  const secondTokenAddress = useSelector(selectPoolsDetailsSecondTokenAddress);
  const setSecondTokenAddress = useSelector(selectPoolsDetailsSetSecondTokenAddress);
  const setSecondTokenInputValue = useSelector(selectPoolsDetailsSetSecondTokenInputValue);
  const setFocusedInput = useSelector(selectPoolsDetailsSetFocusedInput);
  const secondTokenAmount = useSelector(selectPoolsDetailsSecondTokenAmount);

  const { transitRouteProgress } = useSyntheticsEvents();

  const transitRouteProgressForMarket = getTransitRouteProgressForMarket(transitRouteProgress, {
    account,
    glvOrMarketAddress,
  });

  const isUsdgPool =
    longTokenAddress !== undefined &&
    shortTokenAddress !== undefined &&
    getIsUsdgPool(chainId, { longTokenAddress, shortTokenAddress });

  const canPickMaxBalanceToken =
    isDeposit &&
    isSingle &&
    isUsdgPool &&
    (account === undefined || isWalletBalancesLoaded) &&
    !isFirstTokenPinned &&
    firstTokenInputValue === "" &&
    marketOrGlvTokenInputValue === "" &&
    transitRouteProgressForMarket === undefined;

  const payTokenChainId = paySource === "gmxAccount" ? GMX_ACCOUNT_PSEUDO_CHAIN_ID : chainId;

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
      } else {
        const maxBalanceTokenAddress = canPickMaxBalanceToken
          ? tokenOptions.find((token) => token.chainId === payTokenChainId)?.address
          : undefined;
        const isFirstTokenInOptions = tokenOptions.some((token) => token.address === firstTokenAddress);

        if (maxBalanceTokenAddress !== undefined) {
          if (maxBalanceTokenAddress !== firstTokenAddress) {
            setFirstTokenAddress(maxBalanceTokenAddress as ERC20Address | NativeTokenSupportedAddress);
          }
        } else if (!isFirstTokenInOptions) {
          setFirstTokenAddress(tokenOptions[0].address as ERC20Address | NativeTokenSupportedAddress);
        }
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
      canPickMaxBalanceToken,
      chainId,
      firstTokenAddress,
      isDeposit,
      isPair,
      isSingle,
      longTokenAddress,
      marketInfo,
      paySource,
      payTokenChainId,
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

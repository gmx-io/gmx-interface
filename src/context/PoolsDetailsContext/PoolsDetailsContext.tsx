import { useCallback, useEffect, useMemo, useState } from "react";

import { SYNTHETICS_MARKET_DEPOSIT_TOKEN_KEY } from "config/localStorage";
import { getAreBothCollateralsCrossChain } from "domain/multichain/areBothCollateralsCrossChain";
import { GlvInfoData, MarketsInfoData, useMarketTokensDataRequest } from "domain/synthetics/markets";
import { isGlvAddress } from "domain/synthetics/markets/glv";
import { GmPaySource } from "domain/synthetics/markets/types";
import { TokensData } from "domain/synthetics/tokens";
import { ERC20Address, NativeTokenSupportedAddress } from "domain/tokens";
import { useChainId } from "lib/chains";
import { useLocalStorageSerializeKeySafe } from "lib/localStorage";
import { getByKey } from "lib/objects";
import { useReactRouterSearchParam } from "lib/useReactRouterSearchParam";
import useRouteQuery from "lib/useRouteQuery";
import { useSafeState } from "lib/useSafeState";
import { isMarketTokenAddress } from "sdk/configs/markets";

import { getGmSwapBoxAvailableModes } from "components/GmSwap/GmSwapBox/getGmSwapBoxAvailableModes";
import { FocusedInput } from "components/GmSwap/GmSwapBox/GmDepositWithdrawalBox/types";
import { Mode, Operation, isMode, isOperation } from "components/GmSwap/GmSwapBox/types";
import {
  useMultichainMarketTokensBalancesRequest,
  useMultichainTokens,
  useMultichainTradeTokensRequest,
} from "components/GmxAccountModal/hooks";

export type PoolsDetailsQueryParams = {
  market: string;
};

function isValidPaySource(paySource: string | undefined): paySource is GmPaySource {
  return (
    (paySource as GmPaySource) === "settlementChain" ||
    (paySource as GmPaySource) === "sourceChain" ||
    (paySource as GmPaySource) === "gmxAccount"
  );
}

function fallbackPaySource({
  operation,
  mode,
  paySource,
  srcChainId,
}: {
  operation: Operation;
  mode: Mode;
  paySource: GmPaySource | undefined;
  srcChainId: number | undefined;
}) {
  if (!isValidPaySource(paySource)) {
    return "gmxAccount";
  } else if (paySource === "sourceChain" && srcChainId === undefined) {
    return "settlementChain";
  } else if (paySource === "settlementChain" && srcChainId !== undefined && operation === Operation.Deposit) {
    return "sourceChain";
  } else if (operation === Operation.Deposit && paySource === "sourceChain" && mode === Mode.Pair) {
    return "gmxAccount";
  }

  return paySource;
}

export type PoolsDetailsState = {
  glvOrMarketAddress: string | undefined;
  selectedMarketForGlv: string | undefined;
  operation: Operation;
  mode: Mode;
  withdrawalMarketTokensData: TokensData | undefined;

  // GM Deposit/Withdrawal Box State
  focusedInput: FocusedInput;
  paySource: GmPaySource;
  firstTokenAddress: NativeTokenSupportedAddress | ERC20Address | undefined;
  secondTokenAddress: NativeTokenSupportedAddress | ERC20Address | undefined;
  firstTokenInputValue: string;
  secondTokenInputValue: string;
  marketOrGlvTokenInputValue: string;
  isMarketForGlvSelectedManually: boolean;
  multichainTokensResult: ReturnType<typeof useMultichainTokens>;

  setOperation: (operation: Operation) => void;
  setMode: (mode: Mode) => void;
  setGlvOrMarketAddress: (glvOrMarketAddress: string) => void;
  setSelectedMarketAddressForGlv: (marketAddress?: string) => void;
  setFocusedInput: (input: FocusedInput) => void;
  setPaySource: (source: GmPaySource) => void;
  setFirstTokenAddress: (address: ERC20Address | NativeTokenSupportedAddress | undefined) => void;
  setSecondTokenAddress: (address: ERC20Address | NativeTokenSupportedAddress | undefined) => void;
  setFirstTokenInputValue: (value: string) => void;
  setSecondTokenInputValue: (value: string) => void;
  setMarketOrGlvTokenInputValue: (value: string) => void;
  setIsMarketForGlvSelectedManually: (value: boolean) => void;
};

export function usePoolsDetailsState({
  enabled,
  marketsInfoData,
  account,
  glvData,
  withGlv,
  multichainMarketTokensBalancesResult,
}: {
  enabled: boolean;
  marketsInfoData: MarketsInfoData | undefined;
  account: string | undefined;
  glvData: GlvInfoData | undefined;
  withGlv: boolean;
  multichainMarketTokensBalancesResult: ReturnType<typeof useMultichainMarketTokensBalancesRequest>;
}): PoolsDetailsState | undefined {
  const searchParams = useRouteQuery();
  const { chainId, srcChainId } = useChainId();

  const [glvOrMarketAddressString, setGlvOrMarketAddress] = useReactRouterSearchParam("market");
  const glvOrMarketAddress =
    glvOrMarketAddressString !== undefined &&
    (isMarketTokenAddress(chainId, glvOrMarketAddressString) || isGlvAddress(chainId, glvOrMarketAddressString))
      ? glvOrMarketAddressString
      : undefined;

  const [operation, setOperation] = useState<Operation>(Operation.Deposit);
  const [mode, setMode] = useState<Mode>(Mode.Single);
  const [selectedMarketForGlv, setSelectedMarketForGlv] = useState<string | undefined>(undefined);

  const { marketTokensData: withdrawalMarketTokensData } = useMarketTokensDataRequest(chainId, srcChainId, {
    isDeposit: false,
    account,
    glvData,
    withGlv,
    enabled,
    multichainMarketTokensBalances: multichainMarketTokensBalancesResult?.tokenBalances,
  });
  const multichainTokensResult = useMultichainTradeTokensRequest(chainId, account);

  // GM Deposit/Withdrawal Box State
  const isDeposit = operation === Operation.Deposit;
  const [focusedInput, setFocusedInput] = useState<FocusedInput>("market");

  let [rawPaySource, setPaySource] = useLocalStorageSerializeKeySafe<GmPaySource>(
    [chainId, SYNTHETICS_MARKET_DEPOSIT_TOKEN_KEY, "paySource"],
    "settlementChain"
  );

  const paySource = fallbackPaySource({ operation, mode, paySource: rawPaySource, srcChainId });

  useEffect(
    function fallbackSourceChainPaySource() {
      const newPaySource = fallbackPaySource({ operation, mode, paySource: rawPaySource, srcChainId });
      if (newPaySource !== rawPaySource) {
        setPaySource(newPaySource);
      }
    },
    [mode, operation, rawPaySource, setPaySource, srcChainId]
  );

  const [inputTokenAddresses, setInputTokenAddresses] = useLocalStorageSerializeKeySafe<
    | {
        first: ERC20Address | NativeTokenSupportedAddress | undefined;
        second: ERC20Address | NativeTokenSupportedAddress | undefined;
      }
    | undefined
  >([chainId, SYNTHETICS_MARKET_DEPOSIT_TOKEN_KEY, isDeposit, glvOrMarketAddress, "inputTokenAddresses"], undefined);

  const firstTokenAddress = inputTokenAddresses?.first;
  const secondTokenAddress =
    inputTokenAddresses?.second === inputTokenAddresses?.first ? undefined : inputTokenAddresses?.second;

  const setFirstTokenAddress = useCallback(
    (address: ERC20Address | NativeTokenSupportedAddress | undefined) => {
      setInputTokenAddresses((prev) => {
        if (!prev) {
          return { first: address, second: undefined };
        }

        const firstTokenAddress = prev.first;
        const secondTokenAddress = prev.second === prev.first ? undefined : prev.second;

        if (secondTokenAddress && secondTokenAddress === address) {
          // Swap
          return { first: address, second: firstTokenAddress };
        }
        return { first: address, second: secondTokenAddress };
      });
    },
    [setInputTokenAddresses]
  );

  const setSecondTokenAddress = useCallback(
    (address: ERC20Address | NativeTokenSupportedAddress | undefined) => {
      setInputTokenAddresses((prev) => {
        if (!prev) {
          return { first: undefined, second: address };
        }

        const firstTokenAddress = prev.first;
        const secondTokenAddress = prev.second === prev.first ? undefined : prev.second;

        if (firstTokenAddress && firstTokenAddress === address) {
          // Swap
          return { first: secondTokenAddress, second: address };
        }
        return { first: firstTokenAddress, second: address };
      });
    },
    [setInputTokenAddresses]
  );

  const [firstTokenInputValue, setFirstTokenInputValue] = useSafeState<string>("");
  const [secondTokenInputValue, setSecondTokenInputValue] = useSafeState<string>("");
  const [marketOrGlvTokenInputValue, setMarketOrGlvTokenInputValue] = useSafeState<string>("");
  const [isMarketForGlvSelectedManually, setIsMarketForGlvSelectedManually] = useState(false);

  useEffect(
    function syncOperationAndModeFromQueryParams() {
      if (!enabled) {
        return;
      }

      const operationFromQueryParams = searchParams.get("operation");
      if (operationFromQueryParams && isOperation(operationFromQueryParams)) {
        setOperation(operationFromQueryParams);
      }

      const modeFromQueryParams = searchParams.get("mode");
      if (modeFromQueryParams && isMode(modeFromQueryParams)) {
        setMode(modeFromQueryParams);
      }
    },
    [searchParams, enabled]
  );

  const areBothCollateralsCrossChain = getAreBothCollateralsCrossChain({
    chainId,
    srcChainId,
    glvOrMarketAddress,
  });

  useEffect(
    function fallbackMode() {
      if (!enabled) {
        return;
      }

      if (!glvOrMarketAddress) {
        return;
      }

      const newAvailableModes = getGmSwapBoxAvailableModes({
        operation,
        market: getByKey(marketsInfoData, glvOrMarketAddress),
        paySource,
        areBothCollateralsCrossChain,
      });

      if (!newAvailableModes.includes(mode)) {
        setMode(newAvailableModes[0]);
      }
    },
    [areBothCollateralsCrossChain, enabled, glvOrMarketAddress, marketsInfoData, mode, operation, paySource]
  );

  const value = useMemo((): PoolsDetailsState | undefined => {
    if (!enabled) {
      return undefined;
    }

    return {
      glvOrMarketAddress,
      operation,
      mode,
      withdrawalMarketTokensData,
      selectedMarketForGlv,

      // GM Deposit/Withdrawal Box State
      focusedInput,
      paySource,
      firstTokenAddress,
      secondTokenAddress,
      firstTokenInputValue,
      secondTokenInputValue,
      marketOrGlvTokenInputValue,
      isMarketForGlvSelectedManually,
      multichainTokensResult,
      // Setters
      setOperation,
      setMode,
      setGlvOrMarketAddress,
      setSelectedMarketAddressForGlv: setSelectedMarketForGlv,
      setFocusedInput,
      setPaySource,
      setFirstTokenAddress,
      setSecondTokenAddress,
      setFirstTokenInputValue,
      setSecondTokenInputValue,
      setMarketOrGlvTokenInputValue,
      setIsMarketForGlvSelectedManually,
    };
  }, [
    enabled,
    glvOrMarketAddress,
    operation,
    mode,
    withdrawalMarketTokensData,
    selectedMarketForGlv,
    focusedInput,
    paySource,
    firstTokenAddress,
    secondTokenAddress,
    firstTokenInputValue,
    secondTokenInputValue,
    marketOrGlvTokenInputValue,
    isMarketForGlvSelectedManually,
    multichainTokensResult,
    setGlvOrMarketAddress,
    setPaySource,
    setFirstTokenAddress,
    setSecondTokenAddress,
    setFirstTokenInputValue,
    setSecondTokenInputValue,
    setMarketOrGlvTokenInputValue,
  ]);

  return value;
}

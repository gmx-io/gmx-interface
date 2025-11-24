import { useEffect, useMemo, useState } from "react";

import { SYNTHETICS_MARKET_DEPOSIT_TOKEN_KEY } from "config/localStorage";
import { GlvInfoData, MarketsInfoData, useMarketTokensDataRequest } from "domain/synthetics/markets";
import { GmPaySource } from "domain/synthetics/markets/types";
import { TokensData } from "domain/synthetics/tokens";
import { ERC20Address, NativeTokenSupportedAddress } from "domain/tokens";
import { useChainId } from "lib/chains";
import { useLocalStorageSerializeKey } from "lib/localStorage";
import { getByKey } from "lib/objects";
import { useReactRouterSearchParam } from "lib/useReactRouterSearchParam";
import useRouteQuery from "lib/useRouteQuery";
import { useSafeState } from "lib/useSafeState";

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
  } else if (paySource === "settlementChain" && srcChainId !== undefined) {
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
  multichainMarketTokensBalancesResult: ReturnType<typeof useMultichainMarketTokensBalancesRequest>;

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

  const [glvOrMarketAddress, setGlvOrMarketAddress] = useReactRouterSearchParam("market");

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

  let [rawPaySource, setPaySource] = useLocalStorageSerializeKey<GmPaySource>(
    [chainId, SYNTHETICS_MARKET_DEPOSIT_TOKEN_KEY, isDeposit, "paySource"],
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

  const [firstTokenAddress, setFirstTokenAddress] = useLocalStorageSerializeKey<
    ERC20Address | NativeTokenSupportedAddress | undefined
  >([chainId, SYNTHETICS_MARKET_DEPOSIT_TOKEN_KEY, isDeposit, glvOrMarketAddress, "first"], undefined);
  const [secondTokenAddress, setSecondTokenAddress] = useLocalStorageSerializeKey<
    ERC20Address | NativeTokenSupportedAddress | undefined
  >([chainId, SYNTHETICS_MARKET_DEPOSIT_TOKEN_KEY, isDeposit, glvOrMarketAddress, "second"], undefined);
  const [firstTokenInputValue, setFirstTokenInputValue] = useSafeState<string>("");
  const [secondTokenInputValue, setSecondTokenInputValue] = useSafeState<string>("");
  const [marketOrGlvTokenInputValue, setMarketOrGlvTokenInputValue] = useSafeState<string>("");
  const [isMarketForGlvSelectedManually, setIsMarketForGlvSelectedManually] = useState(false);

  useEffect(() => {
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
  }, [searchParams, enabled]);

  useEffect(() => {
    if (!enabled) {
      return;
    }

    if (!glvOrMarketAddress) {
      return;
    }

    const newAvailableModes = getGmSwapBoxAvailableModes(operation, getByKey(marketsInfoData, glvOrMarketAddress));

    if (!newAvailableModes.includes(mode)) {
      setMode(newAvailableModes[0]);
    }
  }, [glvOrMarketAddress, marketsInfoData, mode, operation, enabled]);

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
      multichainMarketTokensBalancesResult,
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
    multichainMarketTokensBalancesResult,
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

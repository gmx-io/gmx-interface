import { t } from "@lingui/macro";
import { useCallback, useEffect, useMemo, useState } from "react";

import { getContract } from "config/contracts";
import { useSettings } from "context/SettingsContext/SettingsContextProvider";
import { useTokensData, useUiFeeFactor } from "context/SyntheticsStateContext/hooks/globalsHooks";
import {
  selectChainId,
  selectGasLimits,
  selectGasPrice,
  selectGlvAndMarketsInfoData,
} from "context/SyntheticsStateContext/selectors/globalSelectors";
import { selectShiftAvailableMarkets } from "context/SyntheticsStateContext/selectors/shiftSelectors";
import { useSelector } from "context/SyntheticsStateContext/utils";
import { GlvOrMarketInfo, getGlvOrMarketAddress, getMarketIndexName, isMarketInfo } from "domain/synthetics/markets";
import { isGlvInfo } from "domain/synthetics/markets/glv";
import { useMarketTokensData } from "domain/synthetics/markets/useMarketTokensData";
import { getTokenData } from "domain/synthetics/tokens";
import useSortedPoolsWithIndexToken from "domain/synthetics/trade/useSortedPoolsWithIndexToken";
import { formatAmountFree, formatBalanceAmount, formatUsd } from "lib/numbers";
import { getByKey } from "lib/objects";
import { Mode, Operation } from "../types";

import { useDepositWithdrawalSetFirstTokenAddress } from "../useDepositWithdrawalSetFirstTokenAddress";
import { useGmWarningState } from "../useGmWarningState";
import { useUpdateByQueryParams } from "../useUpdateByQueryParams";
import { useShiftAmounts } from "./useShiftAmounts";
import { useShiftAvailableRelatedMarkets } from "./useShiftAvailableRelatedMarkets";
import { useShiftFees } from "./useShiftFees";
import { useShiftSubmitState } from "./useShiftSubmitState";
import { useUpdateMarkets } from "./useUpdateMarkets";
import { useUpdateTokens } from "./useUpdateTokens";

import { ApproveTokenButton } from "components/ApproveTokenButton/ApproveTokenButton";
import Button from "components/Button/Button";
import BuyInputSection from "components/BuyInputSection/BuyInputSection";
import { ExchangeInfo } from "components/Exchange/ExchangeInfo";
import { PoolSelector } from "components/MarketSelector/PoolSelector";
import { MarketState } from "components/MarketSelector/types";
import { NetworkFeeRow } from "components/Synthetics/NetworkFeeRow/NetworkFeeRow";

import { GmFees } from "../../GmFees/GmFees";
import { GmSwapWarningsRow } from "../GmSwapWarningsRow";
import { Swap } from "../Swap";

export function GmShiftBox({
  selectedMarketAddress,
  onSelectMarket,
  onSelectedMarketForGlv,
  onSetMode,
  onSetOperation,
}: {
  selectedMarketAddress: string | undefined;
  onSelectMarket: (marketAddress: string) => void;
  onSetMode: (mode: Mode) => void;
  onSetOperation: (operation: Operation) => void;
  onSelectedMarketForGlv?: (marketAddress: string) => void;
}) {
  const [toMarketAddress, setToMarketAddress] = useState<string | undefined>(undefined);
  const [selectedMarketText, setSelectedMarketText] = useState("");
  const [toMarketText, setToMarketText] = useState("");
  const [focusedInput, setFocusedInput] = useState<"selectedMarket" | "toMarket" | undefined>(undefined);

  const chainId = useSelector(selectChainId);
  const uiFeeFactor = useUiFeeFactor();
  const gasLimits = useSelector(selectGasLimits);
  const gasPrice = useSelector(selectGasPrice);
  const marketsInfoData = useSelector(selectGlvAndMarketsInfoData);
  const tokensData = useTokensData();
  const { marketTokensData: depositMarketTokensData } = useMarketTokensData(chainId, { isDeposit: true });
  const { marketsInfo: sortedMarketsInfoByIndexToken } = useSortedPoolsWithIndexToken(
    marketsInfoData,
    depositMarketTokensData
  );

  const shiftAvailableMarkets = useSelector(selectShiftAvailableMarkets);
  const shiftAvailableRelatedMarkets = useShiftAvailableRelatedMarkets(
    marketsInfoData,
    sortedMarketsInfoByIndexToken,
    selectedMarketAddress
  );
  const { shouldDisableValidationForTesting } = useSettings();

  const selectedMarketInfo = useMemo(() => {
    const market = getByKey(marketsInfoData, selectedMarketAddress);
    if (isGlvInfo(market)) {
      return undefined;
    }

    return market;
  }, [selectedMarketAddress, marketsInfoData]);
  const selectedIndexName = selectedMarketInfo ? getMarketIndexName(selectedMarketInfo) : "...";
  const selectedToken = getByKey(depositMarketTokensData, selectedMarketAddress);
  const toMarketInfo = useMemo(() => {
    const market = getByKey(marketsInfoData, toMarketAddress);

    if (isGlvInfo(market)) {
      return undefined;
    }

    return market;
  }, [toMarketAddress, marketsInfoData]);
  const toIndexName = toMarketInfo ? getMarketIndexName(toMarketInfo) : "...";
  const toToken = getByKey(depositMarketTokensData, toMarketAddress);

  const amounts = useShiftAmounts({
    selectedMarketInfo,
    selectedToken,
    toMarketInfo,
    toToken,
    selectedMarketText,
    toMarketText,
    focusedInput,
    uiFeeFactor,
  });

  const { fees, executionFee } = useShiftFees({ gasLimits, gasPrice, tokensData, amounts, chainId });

  const {
    isAccepted,
    setIsAccepted,
    consentError,
    shouldShowWarning,
    shouldShowWarningForExecutionFee,
    shouldShowWarningForPosition,
  } = useGmWarningState({
    executionFee,
    fees,
  });

  const noAmountSet = amounts?.fromTokenAmount === undefined;
  const balanceNotEqualToAmount = selectedToken?.balance !== amounts?.fromTokenAmount;
  const hasBalance = selectedToken?.balance !== undefined && selectedToken.balance > 0n;
  const selectedTokenShowMaxButton = hasBalance && (noAmountSet || balanceNotEqualToAmount);

  const selectedTokenDollarAmount =
    amounts?.fromTokenUsd !== undefined && amounts.fromTokenUsd > 0n ? formatUsd(amounts.fromTokenUsd) : "";
  const toTokenShowDollarAmount =
    amounts?.toTokenUsd !== undefined && amounts.toTokenUsd > 0n ? formatUsd(amounts.toTokenUsd) : "";

  const routerAddress = getContract(chainId, "SyntheticsRouter");

  const submitState = useShiftSubmitState({
    selectedMarketInfo,
    selectedToken,
    amounts,
    toMarketInfo,
    toToken,
    fees,
    consentError,
    shouldDisableValidationForTesting,
    tokensData,
    marketTokenUsd: amounts?.fromTokenUsd,
    executionFee,
    routerAddress,
    payTokenAddresses: [selectedToken?.address ?? ""],
  });

  useUpdateMarkets({
    marketsInfoData,
    selectedMarketAddress,
    shiftAvailableMarkets,
    onSelectMarket,
    toMarketAddress,
    toMarketInfo,
    selectedMarketInfo,
    setToMarketAddress,
  });

  useUpdateTokens({ amounts, selectedToken, toToken, focusedInput, setToMarketText, setSelectedMarketText });

  const [glvForShiftAddress, setGlvForShiftAddress] = useState<string | undefined>(undefined);
  const [, setFirstTokenAddressForDeposit] = useDepositWithdrawalSetFirstTokenAddress(true, glvForShiftAddress);

  useUpdateByQueryParams({
    operation: Operation.Shift,
    onSelectMarket,
    setMode: onSetMode,
    setOperation: onSetOperation,
  });

  const handleFormSubmit = useCallback(
    (event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      submitState.onSubmit?.();
    },
    [submitState]
  );

  const handleClearValues = useCallback(() => {
    setSelectedMarketText("");
    setToMarketText("");
  }, []);

  const handleSelectedTokenClickMax = useCallback(() => {
    if (!selectedToken || selectedToken.balance === undefined) return;
    setFocusedInput("selectedMarket");
    setSelectedMarketText(formatAmountFree(selectedToken.balance, selectedToken.decimals));
  }, [selectedToken]);
  const handleSelectedTokenInputValueChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => setSelectedMarketText(event.target.value),
    []
  );
  const handleSelectedTokenFocus = useCallback(() => setFocusedInput("selectedMarket"), []);
  const handleSelectedTokenSelectMarket = useCallback(
    (marketInfo: GlvOrMarketInfo): void => {
      if (isMarketInfo(marketInfo)) {
        onSelectMarket(marketInfo.marketTokenAddress);
      }
      handleClearValues();
    },
    [handleClearValues, onSelectMarket]
  );

  const handleToTokenInputValueChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => setToMarketText(event.target.value),
    []
  );
  const handleToTokenFocus = useCallback(() => setFocusedInput("toMarket"), []);
  const handleToTokenSelectMarket = useCallback(
    (marketInfo: GlvOrMarketInfo): void => {
      if (isGlvInfo(marketInfo)) {
        setGlvForShiftAddress(getGlvOrMarketAddress(marketInfo));
      } else {
        setToMarketAddress(marketInfo.marketTokenAddress);
        handleClearValues();
      }
    },
    [handleClearValues, setToMarketAddress]
  );

  useEffect(() => {
    if (glvForShiftAddress && selectedMarketInfo) {
      onSelectMarket(glvForShiftAddress);
      setFirstTokenAddressForDeposit(selectedMarketInfo.marketTokenAddress);
      onSetOperation(Operation.Deposit);
      onSelectedMarketForGlv?.(selectedMarketInfo.marketTokenAddress);
    }

    return () => {
      if (glvForShiftAddress) {
        setGlvForShiftAddress(undefined);
      }
    };
  }, [
    glvForShiftAddress,
    onSelectedMarketForGlv,
    onSelectMarket,
    onSetOperation,
    selectedMarketInfo,
    setFirstTokenAddressForDeposit,
  ]);

  const getShiftReceiveMarketState = useCallback((marketInfo: GlvOrMarketInfo): MarketState => {
    if (isGlvInfo(marketInfo)) {
      return {
        warning:
          "Shifting From GM to GLV is similar to buying GLV with a GM token. You will be redirected to the buy GLV tab when selected.",
      };
    }

    return {};
  }, []);

  return (
    <>
      <form className="flex flex-col" onSubmit={handleFormSubmit}>
        <BuyInputSection
          topLeftLabel={t`Pay`}
          bottomLeftValue={selectedTokenDollarAmount}
          bottomRightLabel={t`Balance`}
          bottomRightValue={
            selectedToken && selectedToken.balance !== undefined
              ? formatBalanceAmount(selectedToken.balance, selectedToken.decimals)
              : undefined
          }
          onClickBottomRightLabel={handleSelectedTokenClickMax}
          onClickMax={selectedTokenShowMaxButton ? handleSelectedTokenClickMax : undefined}
          inputValue={selectedMarketText}
          onInputValueChange={handleSelectedTokenInputValueChange}
          onFocus={handleSelectedTokenFocus}
        >
          <PoolSelector
            chainId={chainId}
            size="l"
            selectedMarketAddress={selectedMarketAddress}
            markets={shiftAvailableMarkets}
            onSelectMarket={handleSelectedTokenSelectMarket}
            selectedIndexName={selectedIndexName}
            showAllPools
            isSideMenu
            showIndexIcon
            showBalances
            marketTokensData={depositMarketTokensData}
            favoriteKey="gm-token-selector"
          />
        </BuyInputSection>
        <Swap />
        <BuyInputSection
          topLeftLabel={t`Receive`}
          bottomLeftValue={toTokenShowDollarAmount}
          bottomRightLabel={t`Balance`}
          bottomRightValue={
            toToken && toToken.balance !== undefined
              ? formatBalanceAmount(toToken.balance, toToken.decimals)
              : undefined
          }
          inputValue={toMarketText}
          onInputValueChange={handleToTokenInputValueChange}
          onFocus={handleToTokenFocus}
        >
          <PoolSelector
            chainId={chainId}
            size="l"
            selectedMarketAddress={toMarketAddress}
            markets={shiftAvailableRelatedMarkets}
            onSelectMarket={handleToTokenSelectMarket}
            selectedIndexName={toIndexName}
            getMarketState={getShiftReceiveMarketState}
            showAllPools
            isSideMenu
            showIndexIcon
            showBalances
            marketTokensData={depositMarketTokensData}
            favoriteKey="gm-token-selector"
          />
        </BuyInputSection>
        <ExchangeInfo className={shouldShowWarning ? undefined : "mb-10"} dividerClassName="App-card-divider">
          <ExchangeInfo.Group>
            <GmFees
              operation={Operation.Shift}
              totalFees={fees?.totalFees}
              swapPriceImpact={fees?.swapPriceImpact}
              uiFee={fees?.uiFee}
              shiftFee={fees?.shiftFee}
            />
            <NetworkFeeRow rowPadding executionFee={executionFee} />
          </ExchangeInfo.Group>

          <GmSwapWarningsRow
            isSingle={false}
            isAccepted={isAccepted}
            shouldShowWarning={shouldShowWarning}
            shouldShowWarningForPosition={shouldShowWarningForPosition}
            shouldShowWarningForExecutionFee={shouldShowWarningForExecutionFee}
            setIsAccepted={setIsAccepted}
          />
        </ExchangeInfo>

        {submitState.isAllowanceLoaded && submitState.tokensToApprove && submitState.tokensToApprove.length > 0 && (
          <div>
            {submitState.tokensToApprove.map((address) => {
              const token = getTokenData(tokensData, address)!;
              let marketTokenData =
                address === selectedToken?.address && getByKey(marketsInfoData, selectedToken?.address);
              return (
                <div key={address}>
                  <ApproveTokenButton
                    key={address}
                    tokenAddress={address}
                    tokenSymbol={marketTokenData ? `GM: ${marketTokenData.name}` : token.assetSymbol ?? token.symbol}
                    spenderAddress={routerAddress}
                  />
                </div>
              );
            })}
          </div>
        )}

        <Button className="w-full" variant="primary-action" type="submit" disabled={submitState.disabled}>
          {submitState.text}
        </Button>
      </form>
    </>
  );
}

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
  selectSrcChainId,
} from "context/SyntheticsStateContext/selectors/globalSelectors";
import { selectShiftAvailableMarkets } from "context/SyntheticsStateContext/selectors/shiftSelectors";
import { useSelector } from "context/SyntheticsStateContext/utils";
import { GlvOrMarketInfo, getGlvOrMarketAddress, getMarketIndexName } from "domain/synthetics/markets";
import { isGlvInfo } from "domain/synthetics/markets/glv";
import { useMarketTokensData } from "domain/synthetics/markets/useMarketTokensData";
import useSortedPoolsWithIndexToken from "domain/synthetics/trade/useSortedPoolsWithIndexToken";
import { formatAmountFree, formatBalanceAmount, formatUsd } from "lib/numbers";
import { getByKey } from "lib/objects";

import Button from "components/Button/Button";
import BuyInputSection from "components/BuyInputSection/BuyInputSection";
import { PoolSelector } from "components/MarketSelector/PoolSelector";
import { MarketState } from "components/MarketSelector/types";
import { SwitchToSettlementChainButtons } from "components/SwitchToSettlementChain/SwitchToSettlementChainButtons";
import { SwitchToSettlementChainWarning } from "components/SwitchToSettlementChain/SwitchToSettlementChainWarning";
import { ExpandableRow } from "components/Synthetics/ExpandableRow";
import { NetworkFeeRow } from "components/Synthetics/NetworkFeeRow/NetworkFeeRow";

import { GmFees } from "../../GmFees/GmFees";
import { GmSwapWarningsRow } from "../GmSwapWarningsRow";
import { SelectedPool } from "../SelectedPool";
import { Operation } from "../types";
import { useDepositWithdrawalSetFirstTokenAddress } from "../useDepositWithdrawalSetFirstTokenAddress";
import { useGmWarningState } from "../useGmWarningState";
import { useShiftAmounts } from "./useShiftAmounts";
import { useShiftAvailableRelatedMarkets } from "./useShiftAvailableRelatedMarkets";
import { useShiftFees } from "./useShiftFees";
import { useShiftSubmitState } from "./useShiftSubmitState";
import { useUpdateMarkets } from "./useUpdateMarkets";
import { useUpdateTokens } from "./useUpdateTokens";

export function GmShiftBox({
  selectedGlvOrMarketAddress,
  onSelectGlvOrMarket,
  onSelectedMarketForGlv,
  onSetOperation,
}: {
  selectedGlvOrMarketAddress: string | undefined;
  onSelectGlvOrMarket: (glvOrMarketAddress: string) => void;
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
  const glvAndMarketsInfoData = useSelector(selectGlvAndMarketsInfoData);
  const tokensData = useTokensData();
  const srcChainId = useSelector(selectSrcChainId);
  const { marketTokensData: depositMarketTokensData } = useMarketTokensData(chainId, srcChainId, { isDeposit: true });
  const { marketsInfo: sortedMarketsInfoByIndexToken } = useSortedPoolsWithIndexToken(
    glvAndMarketsInfoData,
    depositMarketTokensData
  );

  const shiftAvailableGlvOrMarkets = useSelector(selectShiftAvailableMarkets);
  const shiftAvailableRelatedMarkets = useShiftAvailableRelatedMarkets(
    glvAndMarketsInfoData,
    sortedMarketsInfoByIndexToken,
    selectedGlvOrMarketAddress
  );
  const { shouldDisableValidationForTesting } = useSettings();

  const selectedMarketInfo = useMemo(() => {
    const market = getByKey(glvAndMarketsInfoData, selectedGlvOrMarketAddress);
    if (isGlvInfo(market)) {
      return undefined;
    }

    return market;
  }, [selectedGlvOrMarketAddress, glvAndMarketsInfoData]);
  const selectedToken = getByKey(depositMarketTokensData, selectedGlvOrMarketAddress);
  const toMarketInfo = useMemo(() => {
    const market = getByKey(glvAndMarketsInfoData, toMarketAddress);

    if (isGlvInfo(market)) {
      return undefined;
    }

    return market;
  }, [toMarketAddress, glvAndMarketsInfoData]);
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

  const { shouldShowWarning, shouldShowWarningForExecutionFee, shouldShowWarningForPosition } = useGmWarningState({
    executionFee,
    fees,
  });

  const noAmountSet = amounts?.fromTokenAmount === undefined;
  const balanceNotEqualToAmount = selectedToken?.balance !== amounts?.fromTokenAmount;
  const hasBalance = selectedToken?.balance !== undefined && selectedToken.balance > 0n;
  const selectedTokenShowMaxButton = hasBalance && (noAmountSet || balanceNotEqualToAmount);

  const selectedTokenDollarAmount = formatUsd(
    amounts?.fromTokenUsd !== undefined && amounts.fromTokenUsd > 0n ? amounts.fromTokenUsd : 0n
  );
  const toTokenShowDollarAmount = formatUsd(
    amounts?.toTokenUsd !== undefined && amounts.toTokenUsd > 0n ? amounts.toTokenUsd : 0n
  );

  const routerAddress = getContract(chainId, "SyntheticsRouter");

  const submitState = useShiftSubmitState({
    selectedMarketInfo,
    selectedToken,
    amounts,
    toMarketInfo,
    toToken,
    fees,
    shouldDisableValidationForTesting,
    tokensData,
    marketTokenUsd: amounts?.fromTokenUsd,
    executionFee,
    routerAddress,
    payTokenAddresses: [selectedToken?.address ?? ""],
    glvOrMarketInfoData: glvAndMarketsInfoData,
  });

  useUpdateMarkets({
    glvAndMarketsInfoData,
    selectedGlvOrMarketAddress,
    shiftAvailableGlvOrMarkets,
    onSelectGlvOrMarket,
    toMarketAddress,
    toMarketInfo,
    selectedMarketInfo,
    setToMarketAddress,
  });

  useUpdateTokens({ amounts, selectedToken, toToken, focusedInput, setToMarketText, setSelectedMarketText });

  const [glvForShiftAddress, setGlvForShiftAddress] = useState<string | undefined>(undefined);
  const [, setFirstTokenAddressForDeposit] = useDepositWithdrawalSetFirstTokenAddress(true, glvForShiftAddress);

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

  const handleToTokenInputValueChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => setToMarketText(event.target.value),
    []
  );
  const handleToTokenFocus = useCallback(() => setFocusedInput("toMarket"), []);
  const handleToTokenSelectMarket = useCallback(
    (glvOrMarketInfo: GlvOrMarketInfo): void => {
      if (isGlvInfo(glvOrMarketInfo)) {
        setGlvForShiftAddress(getGlvOrMarketAddress(glvOrMarketInfo));
      } else {
        setToMarketAddress(glvOrMarketInfo.marketTokenAddress);
        handleClearValues();
      }
    },
    [handleClearValues, setToMarketAddress]
  );

  useEffect(() => {
    if (glvForShiftAddress && selectedMarketInfo) {
      onSelectGlvOrMarket(glvForShiftAddress);
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
    onSelectGlvOrMarket,
    onSetOperation,
    selectedMarketInfo,
    setFirstTokenAddressForDeposit,
  ]);

  const getShiftReceiveMarketState = useCallback((glvOrMarketInfo: GlvOrMarketInfo): MarketState => {
    if (isGlvInfo(glvOrMarketInfo)) {
      return {
        warning:
          "Shifting From GM to GLV is similar to buying GLV with a GM token. You will be redirected to the buy GLV tab when selected.",
      };
    }

    return {};
  }, []);

  const [isExecutionDetailsOpen, setIsExecutionDetailsOpen] = useState(false);

  const toggleExecutionDetails = () => {
    setIsExecutionDetailsOpen(!isExecutionDetailsOpen);
  };

  return (
    <>
      <form className="flex flex-col gap-12" onSubmit={handleFormSubmit}>
        <div>
          <div className="bg-slate-900 p-12">
            <div className="flex flex-col gap-4">
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
                <SelectedPool
                  selectedGlvOrMarketAddress={selectedGlvOrMarketAddress}
                  glvAndMarketsInfoData={glvAndMarketsInfoData}
                />
              </BuyInputSection>
              <div>
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
              </div>
            </div>

            <GmSwapWarningsRow
              shouldShowWarning={shouldShowWarning}
              shouldShowWarningForPosition={shouldShowWarningForPosition}
              shouldShowWarningForExecutionFee={shouldShowWarningForExecutionFee}
            />

            <SwitchToSettlementChainWarning topic="liquidity" />
          </div>

          <div className="rounded-b-8 border-t border-slate-600 bg-slate-900 p-12">
            <SwitchToSettlementChainButtons>
              <Button className="w-full" variant="primary-action" type="submit" disabled={submitState.disabled}>
                {submitState.text}
              </Button>
            </SwitchToSettlementChainButtons>
          </div>
        </div>

        <div className="flex flex-col gap-14 rounded-8 bg-slate-900 p-12">
          <GmFees
            operation={Operation.Shift}
            totalFees={fees?.totalFees}
            swapPriceImpact={fees?.swapPriceImpact}
            uiFee={fees?.uiFee}
            shiftFee={fees?.shiftFee}
          />

          <ExpandableRow
            title={t`Execution Details`}
            open={isExecutionDetailsOpen}
            onToggle={toggleExecutionDetails}
            contentClassName="flex flex-col gap-12"
          >
            <NetworkFeeRow rowPadding executionFee={executionFee} />
          </ExpandableRow>
        </div>
      </form>
    </>
  );
}

import { t } from "@lingui/macro";
import { useCallback, useEffect, useMemo, useState } from "react";
import { FaChevronDown } from "react-icons/fa";
import { FaChevronUp } from "react-icons/fa";
import { useAccount } from "wagmi";

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
import { GlvOrMarketInfo, getGlvOrMarketAddress, getMarketIndexName } from "domain/synthetics/markets";
import { isGlvInfo } from "domain/synthetics/markets/glv";
import { useMarketTokensData } from "domain/synthetics/markets/useMarketTokensData";
import useSortedPoolsWithIndexToken from "domain/synthetics/trade/useSortedPoolsWithIndexToken";
import { formatAmountFree, formatBalanceAmount, formatUsd } from "lib/numbers";
import { getByKey } from "lib/objects";

import Button from "components/Button/Button";
import BuyInputSection from "components/BuyInputSection/BuyInputSection";
import { ExchangeInfo } from "components/Exchange/ExchangeInfo";
import { PoolSelector } from "components/MarketSelector/PoolSelector";
import { MarketState } from "components/MarketSelector/types";
import { NetworkFeeRow } from "components/Synthetics/NetworkFeeRow/NetworkFeeRow";
import { SyntheticsInfoRow } from "components/Synthetics/SyntheticsInfoRow";

import { Operation } from "../types";
import { useDepositWithdrawalSetFirstTokenAddress } from "../useDepositWithdrawalSetFirstTokenAddress";
import { useGmWarningState } from "../useGmWarningState";
import { useShiftAmounts } from "./useShiftAmounts";
import { useShiftAvailableRelatedMarkets } from "./useShiftAvailableRelatedMarkets";
import { useShiftFees } from "./useShiftFees";
import { useShiftSubmitState } from "./useShiftSubmitState";
import { useUpdateMarkets } from "./useUpdateMarkets";
import { useUpdateTokens } from "./useUpdateTokens";
import { GmFees } from "../../GmFees/GmFees";
import {
  SwitchToSettlementChainButtons,
  needSwitchToSettlementChain,
} from "../GmDepositWithdrawalBox/SwitchToSettlementChainButtons";
import { SwitchToSettlementChainWarning } from "../GmDepositWithdrawalBox/SwitchToSettlementChainWarning";
import { GmSwapWarningsRow } from "../GmSwapWarningsRow";
import { SelectedPool } from "../SelectedPool";
import { Swap } from "../Swap";

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
  const { chainId: walletChainId } = useAccount();
  const uiFeeFactor = useUiFeeFactor();
  const gasLimits = useSelector(selectGasLimits);
  const gasPrice = useSelector(selectGasPrice);
  const glvAndMarketsInfoData = useSelector(selectGlvAndMarketsInfoData);
  const tokensData = useTokensData();
  const { marketTokensData: depositMarketTokensData } = useMarketTokensData(chainId, { isDeposit: true });
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
      <form className="flex flex-col" onSubmit={handleFormSubmit}>
        <div className="mb-12 flex flex-col gap-2">
          <BuyInputSection
            topLeftLabel={t`Pay`}
            bottomLeftValue={selectedTokenDollarAmount}
            bottomRightLabel={t`Balance`}
            bottomRightValue={
              selectedToken && selectedToken.balance !== undefined
                ? formatBalanceAmount(selectedToken.balance, selectedToken.decimals)
                : undefined
            }
            isBottomLeftValueMuted={amounts?.fromTokenUsd === undefined || amounts.fromTokenUsd === 0n}
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
              isBottomLeftValueMuted={amounts?.toTokenUsd === undefined || amounts.toTokenUsd === 0n}
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

        <SwitchToSettlementChainWarning />

        <div className="w-full border-b border-stroke-primary pb-14">
          {needSwitchToSettlementChain(walletChainId) ? (
            <SwitchToSettlementChainButtons />
          ) : (
            <Button className="w-full" variant="primary-action" type="submit" disabled={submitState.disabled}>
              {submitState.text}
            </Button>
          )}
        </div>

        <ExchangeInfo className={shouldShowWarning ? undefined : "mt-14"} dividerClassName="App-card-divider">
          <div className="flex flex-col gap-14">
            <GmFees
              operation={Operation.Shift}
              totalFees={fees?.totalFees}
              swapPriceImpact={fees?.swapPriceImpact}
              uiFee={fees?.uiFee}
              shiftFee={fees?.shiftFee}
            />
            <SyntheticsInfoRow label={t`Execution Details`} onClick={toggleExecutionDetails}>
              {isExecutionDetailsOpen ? <FaChevronUp size={10} /> : <FaChevronDown size={10} />}
            </SyntheticsInfoRow>
            {isExecutionDetailsOpen && <NetworkFeeRow rowPadding executionFee={executionFee} />}
          </div>
        </ExchangeInfo>
      </form>
    </>
  );
}

import { Trans, t } from "@lingui/macro";
import cx from "classnames";
import BuyInputSection from "components/BuyInputSection/BuyInputSection";
import Checkbox from "components/Checkbox/Checkbox";
import { InfoRow } from "components/InfoRow/InfoRow";
import { LeverageSlider } from "components/LeverageSlider/LeverageSlider";
import { SubmitButton } from "components/SubmitButton/SubmitButton";
import Tab from "components/Tab/Tab";
import TokenSelector from "components/TokenSelector/TokenSelector";
import {
  KEEP_LEVERAGE_FOR_DECREASE_KEY,
  LEVERAGE_ENABLED_KEY,
  LEVERAGE_OPTION_KEY,
  SYNTHETICS_SWAP_COLLATERAL_KEY,
  SYNTHETICS_SWAP_FROM_TOKEN_KEY,
  SYNTHETICS_SWAP_MODE_KEY,
  SYNTHETICS_SWAP_OPERATION_KEY,
  SYNTHETICS_SWAP_TO_TOKEN_KEY,
} from "config/localStorage";
import { NATIVE_TOKEN_ADDRESS, getConvertedTokenAddress } from "config/tokens";
import { useTokenInputState } from "domain/synthetics/exchange";
import { useSwapPath } from "domain/synthetics/exchange/useSwapPath";
import { convertToTokenAmount, convertToUsd, getTokenData, useAvailableTokensData } from "domain/synthetics/tokens";
import { BigNumber } from "ethers";

import { Dropdown, Option } from "components/Dropdown/Dropdown";
import { getMarket, getMarketByTokens, useMarketsData } from "domain/synthetics/markets";
import {
  OrderType,
  getCollateralDeltaUsdForDecreaseOrder,
  getCollateralOutForDecreaseOrder,
  getNextCollateralUsdForDecreaseOrder,
} from "domain/synthetics/orders";
import {
  AggregatedPositionData,
  AggregatedPositionsData,
  formatLeverage,
  getLeverage,
  getLiquidationPrice,
  getPosition,
  getPositionKey,
} from "domain/synthetics/positions";
import { useChainId } from "lib/chains";
import { BASIS_POINTS_DIVISOR, DUST_USD, USD_DECIMALS } from "lib/legacy";
import { useLocalStorageSerializeKey } from "lib/localStorage";
import { bigNumberify, formatAmount, formatTokenAmount, formatUsd, parseValue } from "lib/numbers";
import { useEffect, useState } from "react";
import { IoMdSwap } from "react-icons/io";
import { OrderStatus } from "../../OrderStatus/OrderStatus";
import { ConfirmationBox } from "../ConfirmationBox/ConfirmationBox";
import { MarketCard } from "../MarketCard/MarketCard";
import { TradeFees } from "../TradeFees/TradeFees";
import {
  TradeMode,
  TradeType,
  avaialbleModes,
  getNextTokenAmount,
  getSubmitError,
  tradeModeLabels,
  tradeTypeIcons,
  tradeTypeLabels,
  useAvailableSwapTokens,
  useFeesState,
  useSwapTriggerRatioState,
} from "../utils";

import { useWeb3React } from "@web3-react/core";
import { ValueTransition } from "components/ValueTransition/ValueTransition";
import "./SwapBox.scss";

enum FocusedInput {
  From = "From",
  To = "To",
}

type Props = {
  onConnectWallet: () => void;
  selectedMarketAddress?: string;
  selectedCollateralAddress?: string;
  positionsData: AggregatedPositionsData;
  onSelectMarketAddress: (marketAddress: string) => void;
  onSelectCollateralAddress: (collateralAddress: string) => void;
};

export function SwapBox(p: Props) {
  const { chainId } = useChainId();
  const { account } = useWeb3React();
  const { onSelectMarketAddress } = p;

  const { tokensData } = useAvailableTokensData(chainId);
  const { marketsData } = useMarketsData(chainId);

  const [focusedInput, setFocusedInput] = useState<FocusedInput>();
  const [operationTab, setOperationTab] = useLocalStorageSerializeKey(
    [chainId, SYNTHETICS_SWAP_OPERATION_KEY],
    TradeType.Long
  );
  const [modeTab, setModeTab] = useLocalStorageSerializeKey([chainId, SYNTHETICS_SWAP_MODE_KEY], TradeMode.Market);

  const isLong = operationTab === TradeType.Long;
  const isShort = operationTab === TradeType.Short;
  const isSwap = operationTab === TradeType.Swap;
  const isPosition = !isSwap;
  const isLimit = modeTab === TradeMode.Limit;
  const isMarket = modeTab === TradeMode.Market;
  const isStop = modeTab === TradeMode.Trigger;

  const isTokensAllowed = !isStop;
  const isCloseSizeAllowed = isStop;
  const isTriggerPriceAllowed = !isSwap && (isLimit || isStop);
  const isSwapTriggerRatioAllowed = isSwap && isLimit;
  const isLeverageAllowed = isPosition && !isStop;
  const isSelectCollateralAllowed = isPosition;

  const [isConfirming, setIsConfirming] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  const nativeToken = getTokenData(tokensData, NATIVE_TOKEN_ADDRESS);

  const [savedFromToken, setSavedFromToken] = useLocalStorageSerializeKey<string | undefined>(
    [chainId, SYNTHETICS_SWAP_FROM_TOKEN_KEY],
    undefined
  );

  const [savedToToken, setSavedToToken] = useLocalStorageSerializeKey<string | undefined>(
    [chainId, SYNTHETICS_SWAP_TO_TOKEN_KEY],
    undefined
  );

  const selectedMarket = getMarket(marketsData, p.selectedMarketAddress);
  const marketOptions: Option[] = Object.values(marketsData).map((market) => ({
    label: `${getTokenData(tokensData, market.indexTokenAddress)?.symbol}/${market.perp}`,
    value: market.marketTokenAddress,
  }));

  const [collateralTokenAddress, setCollateralTokenAddress] = useLocalStorageSerializeKey<string | undefined>(
    [chainId, SYNTHETICS_SWAP_COLLATERAL_KEY],
    p.selectedCollateralAddress
  );
  const collateralToken = getTokenData(tokensData, collateralTokenAddress);

  const fromTokenState = useTokenInputState(tokensData, {
    initialTokenAddress: savedFromToken,
    priceType: "minPrice",
  });

  const toTokenState = useTokenInputState(tokensData, {
    initialTokenAddress: savedToToken,
    priceType: isShort ? "minPrice" : "maxPrice",
  });

  const [keepLeverage, setKeepLeverage] = useLocalStorageSerializeKey([chainId, KEEP_LEVERAGE_FOR_DECREASE_KEY], true);
  const [closeSizeInput, setCloseSizeInput] = useState("");
  const closeSizeUsd = parseValue(closeSizeInput || "0", USD_DECIMALS)!;

  const receiveTokenAddress = collateralTokenAddress;
  const receiveToken = getTokenData(tokensData, receiveTokenAddress);

  const { availableFromTokens, availableToTokens, availableCollaterals, infoTokens } = useAvailableSwapTokens({
    isSwap,
    indexTokenAddress: isPosition ? toTokenState.tokenAddress : undefined,
  });

  const [leverageOption, setLeverageOption] = useLocalStorageSerializeKey<number | undefined>(
    [chainId, LEVERAGE_OPTION_KEY],
    2
  );

  const [isLeverageEnabled, setIsLeverageEnabled] = useLocalStorageSerializeKey([chainId, LEVERAGE_ENABLED_KEY], true);
  const leverageMultiplier =
    isLeverageAllowed && isLeverageEnabled && leverageOption
      ? bigNumberify(parseInt(String(Number(leverageOption) * BASIS_POINTS_DIVISOR)))
      : undefined;

  const [triggerPriceValue, setTriggerPriceValue] = useState<string>("");
  const triggerPrice = isTriggerPriceAllowed ? parseValue(triggerPriceValue, USD_DECIMALS) : undefined;

  const entryPrice = triggerPrice?.gt(0) ? triggerPrice : toTokenState.price;
  const markPrice = toTokenState.price;

  const triggerPricePrefix = getTriggerPricePrefix();

  const sizeDeltaUsd =
    toTokenState.token && entryPrice
      ? convertToUsd(toTokenState.tokenAmount, toTokenState.token?.decimals, entryPrice)
      : BigNumber.from(0);

  const positionKey = getPositionKey(
    account || undefined,
    p.selectedMarketAddress,
    collateralTokenAddress,
    operationTab === TradeType.Long
  );

  const existingPosition = getPosition(p.positionsData, positionKey) as AggregatedPositionData | undefined;

  const swapRatio = useSwapTriggerRatioState({
    isAllowed: isSwapTriggerRatioAllowed,
    fromTokenPrice: fromTokenState.price,
    toTokenPrice: toTokenState.price,
  });

  const swapRoute = useSwapPath({
    isSwap,
    fromToken: fromTokenState.tokenAddress,
    toToken: isSwap ? toTokenState.tokenAddress : undefined,
    collateralToken: isPosition ? collateralTokenAddress : undefined,
    indexToken: isPosition ? toTokenState.tokenAddress : undefined,
    amountUsd: isPosition ? fromTokenState.usdAmount : toTokenState.usdAmount,
  });

  const fees = useFeesState({
    isSwap,
    isLong,
    marketAddress: swapRoute?.market,
    sizeDeltaUsd: isStop ? closeSizeUsd : sizeDeltaUsd,
    swapPath: !isStop ? swapRoute?.fullSwapPath : undefined,
    swapFeeUsd: !isStop ? swapRoute?.swapFeesUsd : undefined,
  });

  const isClosing = existingPosition?.sizeInUsd.sub(closeSizeUsd).lt(DUST_USD);

  const nextSizeUsd = isStop
    ? isClosing
      ? BigNumber.from(0)
      : existingPosition?.sizeInUsd.sub(closeSizeUsd)
    : sizeDeltaUsd?.add(existingPosition?.sizeInUsd || BigNumber.from(0));

  const collateralDeltaUsd =
    isStop && existingPosition
      ? getCollateralDeltaUsdForDecreaseOrder({
          isClosing,
          keepLeverage,
          sizeDeltaUsd: closeSizeUsd,
          positionCollateralUsd: existingPosition.collateralUsd,
          positionSizeInUsd: existingPosition.sizeInUsd,
        })
      : BigNumber.from(0);

  const collateralDeltaAmount = convertToTokenAmount(
    collateralDeltaUsd,
    existingPosition?.collateralToken?.decimals,
    existingPosition?.collateralToken?.prices?.maxPrice
  );

  const nextCollateralUsd = isStop
    ? getNextCollateralUsdForDecreaseOrder({
        isClosing,
        collateralUsd: existingPosition?.collateralUsd,
        collateralDeltaUsd,
        sizeDeltaUsd,
        pnl: existingPosition?.pnl,
      })
    : fromTokenState.usdAmount?.add(existingPosition?.collateralUsd || BigNumber.from(0));

  const collateralOutAmount = isStop
    ? getCollateralOutForDecreaseOrder({
        position: existingPosition,
        indexToken: existingPosition?.indexToken,
        collateralToken: existingPosition?.collateralToken,
        sizeDeltaUsd: closeSizeUsd,
        collateralDeltaAmount: collateralDeltaAmount || BigNumber.from(0),
        pnlToken: existingPosition?.pnlToken,
        feesUsd: fees.totalFeeUsd,
        priceImpactUsd: fees.positionPriceImpact?.impact || BigNumber.from(0),
      })
    : undefined;

  const receiveUsd = convertToUsd(collateralOutAmount, collateralToken?.decimals, collateralToken?.prices?.minPrice);
  const receiveTokenAmount = convertToTokenAmount(
    collateralOutAmount,
    collateralToken?.decimals,
    collateralToken?.prices?.minPrice
  );

  const nextLiqPrice = getLiquidationPrice({
    sizeUsd: nextSizeUsd,
    collateralUsd: nextCollateralUsd,
    feesUsd: fees.totalFeeUsd,
    averagePrice: triggerPrice || markPrice,
    isLong: operationTab === TradeType.Long,
  });

  const nextLeverage = !isStop
    ? bigNumberify(leverageMultiplier || 0)
    : getLeverage({
        sizeUsd: nextSizeUsd,
        collateralUsd: nextCollateralUsd,
      });

  function getTriggerPricePrefix() {
    if (!triggerPrice || !markPrice) return "";

    if (isStop) {
      if (isLong) {
        return triggerPrice.gt(markPrice) ? ">" : "<";
      } else {
        return triggerPrice.lt(markPrice) ? ">" : "<";
      }
    } else {
      if (isLong) {
        return triggerPrice.lt(markPrice) ? ">" : "<";
      } else {
        return triggerPrice.gt(markPrice) ? ">" : "<";
      }
    }
  }

  const submitButtonState = getSubmitButtonState();

  function getSubmitButtonState(): { text: string; disabled?: boolean; onClick?: () => void } {
    const error = getSubmitError({
      operationType: operationTab!,
      mode: modeTab!,
      tokensData,
      markPrice: toTokenState.price,
      fromTokenAddress: fromTokenState.tokenAddress,
      toTokenAddress: toTokenState.tokenAddress,
      fromTokenAmount: fromTokenState.tokenAmount,
      swapPath: swapRoute?.swapPath,
      isHighPriceImpact: fees.isHighPriceImpact,
      isHighPriceImpactAccepted: fees.isHighPriceImpactAccepted,
      triggerPrice,
      swapTriggerRatio: swapRatio?.ratio,
      closeSizeUsd,
    });

    if (error) {
      return {
        text: error,
        disabled: true,
      };
    }

    let text = `${tradeTypeLabels[operationTab!]} ${toTokenState.token?.symbol}`;

    if (isStop) {
      text = `Create Trigger order`;
    }

    return {
      text,
      onClick: () => setIsConfirming(true),
    };
  }

  function onSwitchTokens() {
    const fromToken = fromTokenState.tokenAddress;
    const toToken = toTokenState.tokenAddress;

    fromTokenState.setTokenAddress(toToken);
    fromTokenState.setInputValue(toTokenState.inputValue || "");

    toTokenState.setTokenAddress(fromToken);
    toTokenState.setInputValue(fromTokenState.inputValue || "");

    setFocusedInput((old) => (old === FocusedInput.From ? FocusedInput.To : FocusedInput.From));
  }

  function onSelectToToken(tokenAddress: string) {
    toTokenState.setTokenAddress(tokenAddress);

    if (isPosition && collateralTokenAddress) {
      const indexAddress = getConvertedTokenAddress(chainId, tokenAddress, "wrapped");

      const shouldUpdateMarket = !selectedMarket || selectedMarket.indexTokenAddress !== indexAddress;

      if (shouldUpdateMarket) {
        const market = getMarketByTokens(marketsData, indexAddress);

        if (market) {
          p.onSelectMarketAddress(market.marketTokenAddress);
        }
      }
    }
  }

  useEffect(
    // TODO: fees
    function syncInputValuesEff() {
      if (!fromTokenState.token || !toTokenState.token || !toTokenState.price || !fromTokenState.price) return;

      if (focusedInput === FocusedInput.From) {
        // Set toToken value
        const toAmount = getNextTokenAmount({
          fromToken: fromTokenState.token,
          fromTokenAmount: fromTokenState.tokenAmount,
          fromTokenPrice: fromTokenState.price,
          toToken: toTokenState.token,
          toTokenPrice: toTokenState.price,
          triggerPrice,
          isInvertedTriggerPrice: false,
          swapTriggerRatio: swapRatio?.ratio,
          isInvertedTriggerRatio: swapRatio?.biggestSide === "to",
          leverageMultiplier,
          isInvertedLeverage: false,
        });

        toTokenState.setValueByTokenAmount(toAmount);
        return;
      }

      if (focusedInput === FocusedInput.To) {
        // Set fromToken value
        const fromAmount = getNextTokenAmount({
          fromToken: toTokenState.token,
          fromTokenAmount: toTokenState.tokenAmount,
          fromTokenPrice: toTokenState.price,
          toToken: fromTokenState.token,
          toTokenPrice: fromTokenState.price,
          triggerPrice,
          isInvertedTriggerPrice: true,
          swapTriggerRatio: swapRatio?.ratio,
          isInvertedTriggerRatio: swapRatio?.biggestSide === "from",
          leverageMultiplier,
          isInvertedLeverage: true,
        });

        fromTokenState.setValueByTokenAmount(fromAmount);
      }
    },
    [
      focusedInput,
      fromTokenState,
      leverageMultiplier,
      swapRatio,
      swapRatio?.biggestSide,
      swapRatio?.ratio,
      toTokenState,
      triggerPrice,
    ]
  );

  useEffect(
    function updateMode() {
      if (operationTab && modeTab && !avaialbleModes[operationTab].includes(modeTab)) {
        setModeTab(avaialbleModes[operationTab][0]);
      }
    },
    [modeTab, operationTab, setModeTab]
  );

  useEffect(
    function updateTokenInputs() {
      if (isPosition && selectedMarket && toTokenState.tokenAddress) {
        const convetedIndexAddress = getConvertedTokenAddress(chainId, toTokenState.tokenAddress, "wrapped");

        if (selectedMarket.indexTokenAddress !== convetedIndexAddress) {
          toTokenState.setTokenAddress(getConvertedTokenAddress(chainId, selectedMarket.indexTokenAddress, "native"));
        }
      }

      if (fromTokenState.tokenAddress !== savedFromToken) {
        setSavedFromToken(fromTokenState.tokenAddress);
      }

      if (toTokenState.tokenAddress !== savedToToken) {
        setSavedToToken(toTokenState.tokenAddress);
      }

      if (
        availableFromTokens.length &&
        !availableFromTokens.find((token) => token.address === fromTokenState.tokenAddress)
      ) {
        fromTokenState.setTokenAddress(availableFromTokens[0].address);
      }

      if (availableToTokens.length && !availableToTokens.find((token) => token.address === toTokenState.tokenAddress)) {
        toTokenState.setTokenAddress(availableToTokens[0].address);
      }
    },
    [
      availableFromTokens,
      availableToTokens,
      fromTokenState,
      nativeToken,
      savedFromToken,
      savedToToken,
      setSavedFromToken,
      setSavedToToken,
      toTokenState,
      selectedMarket,
      isPosition,
      chainId,
    ]
  );

  useEffect(
    function updateMarket() {
      if (swapRoute?.market && swapRoute.market !== p.selectedMarketAddress) {
        onSelectMarketAddress(swapRoute.market);
      }

      if (!p.selectedMarketAddress && toTokenState.tokenAddress) {
        const market = getMarketByTokens(
          marketsData,
          getConvertedTokenAddress(chainId, toTokenState.tokenAddress, "wrapped"),
          collateralTokenAddress ? getConvertedTokenAddress(chainId, collateralTokenAddress, "wrapped") : undefined
        );

        if (market) {
          onSelectMarketAddress(market.marketTokenAddress);
        }
      }
    },
    [
      chainId,
      collateralTokenAddress,
      marketsData,
      onSelectMarketAddress,
      p.selectedMarketAddress,
      swapRoute?.market,
      toTokenState.tokenAddress,
    ]
  );

  useEffect(
    function updateCollateral() {
      if (!isSelectCollateralAllowed || !availableCollaterals?.length) return;

      if (!collateralTokenAddress || !availableCollaterals.find((token) => token.address === collateralTokenAddress)) {
        if (
          p.selectedCollateralAddress &&
          availableCollaterals.find((token) => token.address === p.selectedCollateralAddress)
        ) {
          setCollateralTokenAddress(p.selectedCollateralAddress);
          return;
        } else {
          p.onSelectCollateralAddress(availableCollaterals[0].address);
          setCollateralTokenAddress(availableCollaterals[0].address);
        }
      }
    },
    [
      availableCollaterals,
      chainId,
      collateralTokenAddress,
      isSelectCollateralAllowed,
      marketsData,
      onSelectMarketAddress,
      p,
      p.selectedCollateralAddress,
      selectedMarket,
      setCollateralTokenAddress,
      toTokenState.tokenAddress,
    ]
  );

  return (
    <>
      <div className={`App-box SwapBox`}>
        <Tab
          icons={tradeTypeIcons}
          options={Object.values(TradeType)}
          optionLabels={tradeTypeLabels}
          option={operationTab}
          onChange={setOperationTab}
          className="SwapBox-option-tabs"
        />

        <Tab
          options={Object.values(avaialbleModes[operationTab!])}
          optionLabels={tradeModeLabels}
          className="SwapBox-asset-options-tabs"
          type="inline"
          option={modeTab}
          onChange={setModeTab}
        />

        <div className={cx("SwapBox-form-layout")}>
          {isTokensAllowed && (
            <>
              <BuyInputSection
                topLeftLabel={t`Pay:`}
                topLeftValue={formatUsd(fromTokenState.usdAmount)}
                topRightLabel={t`Balance:`}
                topRightValue={formatTokenAmount(fromTokenState.balance, fromTokenState.token?.decimals)}
                inputValue={fromTokenState.inputValue}
                onInputValueChange={(e) => {
                  setFocusedInput(FocusedInput.From);
                  fromTokenState.setInputValue(e.target.value);
                }}
                showMaxButton={fromTokenState.isNotMatchBalance}
                onClickMax={() => {
                  setFocusedInput(FocusedInput.From);
                  fromTokenState.setValueByTokenAmount(fromTokenState.balance);
                }}
              >
                {fromTokenState.tokenAddress && (
                  <TokenSelector
                    label={t`Pay`}
                    chainId={chainId}
                    tokenAddress={fromTokenState.tokenAddress}
                    onSelectToken={(token) => fromTokenState.setTokenAddress(token.address)}
                    tokens={availableFromTokens}
                    infoTokens={infoTokens}
                    className="GlpSwap-from-token"
                    showSymbolImage={true}
                    showTokenImgInDropdown={true}
                  />
                )}
              </BuyInputSection>

              <div className="AppOrder-ball-container" onClick={onSwitchTokens}>
                <div className="AppOrder-ball">
                  <IoMdSwap className="Exchange-swap-ball-icon" />
                </div>
              </div>

              <BuyInputSection
                topLeftLabel={operationTab === TradeType.Swap ? t`Receive:` : `${tradeTypeLabels[operationTab!]}:`}
                topLeftValue={formatUsd(sizeDeltaUsd)}
                topRightLabel={operationTab === TradeType.Swap ? t`Balance:` : t`Leverage:`}
                topRightValue={
                  operationTab === TradeType.Swap
                    ? formatTokenAmount(toTokenState.balance, toTokenState.token?.decimals)
                    : `${leverageOption?.toFixed(2)}x`
                }
                inputValue={toTokenState.inputValue}
                onInputValueChange={(e) => {
                  setFocusedInput(FocusedInput.To);
                  toTokenState.setInputValue(e.target.value);
                }}
                showMaxButton={false}
              >
                {toTokenState.tokenAddress && (
                  <TokenSelector
                    label={operationTab === TradeType.Swap ? t`Receive:` : tradeTypeLabels[operationTab!]}
                    chainId={chainId}
                    tokenAddress={toTokenState.tokenAddress}
                    onSelectToken={(token) => onSelectToToken(token.address)}
                    tokens={availableToTokens}
                    infoTokens={infoTokens}
                    className="GlpSwap-from-token"
                    showSymbolImage={true}
                    showBalances={operationTab === TradeType.Swap}
                    showTokenImgInDropdown={true}
                  />
                )}
              </BuyInputSection>
            </>
          )}

          {isCloseSizeAllowed && (
            <BuyInputSection
              topLeftLabel={t`Close`}
              topRightLabel={existingPosition?.sizeInUsd ? `Max:` : undefined}
              topRightValue={existingPosition?.sizeInUsd ? formatUsd(existingPosition.sizeInUsd) : undefined}
              inputValue={closeSizeInput}
              onInputValueChange={(e) => setCloseSizeInput(e.target.value)}
              showMaxButton={existingPosition?.sizeInUsd.gt(0) && !closeSizeUsd?.eq(existingPosition.sizeInUsd)}
              onClickMax={() => setCloseSizeInput(formatAmount(existingPosition?.sizeInUsd, USD_DECIMALS, 2))}
            >
              USD
            </BuyInputSection>
          )}

          {isTriggerPriceAllowed && (
            <BuyInputSection
              topLeftLabel={t`Price`}
              topRightLabel={t`Mark:`}
              topRightValue={formatUsd(toTokenState.price)}
              onClickTopRightLabel={() => {
                setTriggerPriceValue(formatAmount(toTokenState.price, USD_DECIMALS, 2));
              }}
              inputValue={triggerPriceValue}
              onInputValueChange={(e) => {
                setTriggerPriceValue(e.target.value);
              }}
            >
              USD
            </BuyInputSection>
          )}

          {swapRatio && (
            <BuyInputSection
              topLeftLabel={t`Price`}
              topRightValue={formatAmount(swapRatio.markRatio, USD_DECIMALS, 4)}
              onClickTopRightLabel={() => {
                swapRatio.setInputValue(formatAmount(swapRatio.markRatio, USD_DECIMALS, 10));
              }}
              inputValue={swapRatio.inputValue}
              onInputValueChange={(e) => {
                swapRatio.setInputValue(e.target.value);
              }}
            >
              {swapRatio.biggestSide === "from"
                ? `${toTokenState.token?.symbol} per ${fromTokenState.token?.symbol}`
                : `${fromTokenState.token?.symbol} per ${toTokenState.token?.symbol}`}
            </BuyInputSection>
          )}
        </div>

        <div className="SwapBox-info-section">
          {isPosition && (
            <>
              {isLeverageAllowed && (
                <>
                  <div className="Exchange-leverage-slider-settings">
                    <Checkbox isChecked={isLeverageEnabled} setIsChecked={setIsLeverageEnabled}>
                      <span className="muted">
                        <Trans>Leverage slider</Trans>
                      </span>
                    </Checkbox>
                  </div>
                  {isLeverageEnabled && (
                    <LeverageSlider value={leverageOption} onChange={setLeverageOption} isPositive={isLong} />
                  )}
                </>
              )}

              <InfoRow
                label={t`Market`}
                className="SwapBox-info-row SwapBox-market-selector"
                value={
                  isStop ? (
                    <Dropdown
                      selectedOption={
                        p.selectedMarketAddress
                          ? marketOptions.find((o) => o.value === p.selectedMarketAddress)
                          : undefined
                      }
                      placeholder={t`Select a market`}
                      options={marketOptions}
                      onSelect={(option) => {
                        p.onSelectMarketAddress(option.value);
                      }}
                    />
                  ) : selectedMarket ? (
                    `${getTokenData(tokensData, selectedMarket?.indexTokenAddress)?.symbol}/${selectedMarket?.perp}`
                  ) : (
                    "..."
                  )
                }
              />

              {isSelectCollateralAllowed && collateralTokenAddress && availableCollaterals && (
                <InfoRow
                  label={t`Collateral In`}
                  className="SwapBox-info-row"
                  value={
                    <TokenSelector
                      label={t`Collateral In`}
                      className="GlpSwap-from-token"
                      chainId={chainId}
                      tokenAddress={collateralTokenAddress}
                      onSelectToken={(token) => {
                        p.onSelectCollateralAddress(token.address);
                        setCollateralTokenAddress(token.address);
                      }}
                      tokens={availableCollaterals}
                      showTokenImgInDropdown={true}
                    />
                  }
                />
              )}

              {isStop && existingPosition?.leverage && (
                <div className="Exchange-leverage-slider-settings">
                  <Checkbox isChecked={keepLeverage} setIsChecked={setKeepLeverage}>
                    <span className="muted font-sm">
                      <Trans>Keep leverage at {formatLeverage(existingPosition.leverage)} </Trans>
                    </span>
                  </Checkbox>
                </div>
              )}

              <div className="App-card-divider" />
            </>
          )}

          {isPosition && !isStop && (
            <InfoRow
              className="SwapBox-info-row"
              label={t`Leverage`}
              value={leverageOption ? `${leverageOption.toFixed(2)}x` : "..."}
            />
          )}

          {isPosition && isStop && !keepLeverage && existingPosition?.leverage && (
            <InfoRow
              className="SwapBox-info-row"
              label={t`Leverage`}
              value={
                nextSizeUsd?.gt(0) ? (
                  <ValueTransition
                    from={formatLeverage(existingPosition.leverage)}
                    to={nextLeverage ? formatLeverage(nextLeverage) : "..."}
                  />
                ) : (
                  "..."
                )
              }
            />
          )}

          {isPosition && isStop && (
            <InfoRow
              className="SwapBox-info-row"
              label={existingPosition?.sizeInUsd ? t`Size` : t`Decrease size`}
              value={
                existingPosition?.sizeInUsd ? (
                  <ValueTransition from={formatUsd(existingPosition.sizeInUsd)!} to={formatUsd(nextSizeUsd)} />
                ) : closeSizeUsd ? (
                  formatUsd(closeSizeUsd)
                ) : (
                  "..."
                )
              }
            />
          )}

          {isPosition && isStop && existingPosition && (
            <InfoRow
              className="SwapBox-info-row"
              label={t`Collateral (${existingPosition?.collateralToken?.symbol})`}
              value={
                <ValueTransition from={formatUsd(existingPosition.collateralUsd)!} to={formatUsd(nextCollateralUsd)} />
              }
            />
          )}

          {isPosition && isStop && (
            <InfoRow
              className="SwapBox-info-row"
              label={t`Mark Price`}
              value={markPrice ? formatUsd(markPrice) : "..."}
            />
          )}

          {isPosition && isStop && (
            <InfoRow
              className="SwapBox-info-row"
              label={t`Trigger Price`}
              value={triggerPrice ? `${triggerPricePrefix}${formatUsd(triggerPrice)}` : "..."}
            />
          )}

          {isPosition && !isStop && (
            <InfoRow
              className="SwapBox-info-row"
              label={t`Entry Price`}
              value={entryPrice ? formatUsd(entryPrice) : "..."}
            />
          )}

          {isPosition && !isStop && (
            <InfoRow
              className="SwapBox-info-row"
              label={t`Liq. Price`}
              value={
                existingPosition?.liqPrice ? (
                  <ValueTransition
                    from={formatUsd(existingPosition.liqPrice)!}
                    to={nextLiqPrice ? formatUsd(nextLiqPrice) : undefined}
                  />
                ) : nextLiqPrice ? (
                  formatUsd(nextLiqPrice)
                ) : (
                  "..."
                )
              }
            />
          )}

          {isPosition && isStop && existingPosition && (
            <InfoRow
              className="SwapBox-info-row"
              label={t`Liq. Price`}
              value={
                nextSizeUsd?.gt(0) ? (
                  <ValueTransition
                    from={formatUsd(existingPosition.liqPrice)!}
                    to={nextLiqPrice ? formatUsd(nextLiqPrice) : undefined}
                  />
                ) : (
                  "..."
                )
              }
            />
          )}

          <TradeFees fees={fees} />
        </div>

        {fees.isHighPriceImpact && fees.setIsHighPriceImpactAccepted && (
          <div className="SwapBox-warnings">
            <Checkbox asRow isChecked={fees.isHighPriceImpactAccepted} setIsChecked={fees.setIsHighPriceImpactAccepted}>
              <span className="muted font-sm">
                <Trans>I am aware of the high price impact</Trans>
              </span>
            </Checkbox>
          </div>
        )}

        <div className="Exchange-swap-button-container">
          <SubmitButton
            authRequired
            onConnectWallet={p.onConnectWallet}
            onClick={submitButtonState.onClick}
            disabled={submitButtonState.disabled}
          >
            {submitButtonState.text}
          </SubmitButton>
        </div>
      </div>

      <div className="SwapBox-section">
        <MarketCard
          isLong={isLong}
          isSwap={isSwap}
          marketAddress={p.selectedMarketAddress}
          swapPath={swapRoute?.swapPath}
          fromTokenAddress={fromTokenState.tokenAddress}
          toTokenAddress={isPosition ? collateralTokenAddress : toTokenState.tokenAddress}
          indexTokenAddress={toTokenState.tokenAddress}
        />
      </div>

      {isConfirming && (
        <ConfirmationBox
          fromTokenAddress={fromTokenState.tokenAddress!}
          fromTokenAmount={fromTokenState.tokenAmount}
          fromTokenPrice={fromTokenState.price}
          toTokenAddress={toTokenState.tokenAddress!}
          toTokenAmount={toTokenState.tokenAmount}
          toTokenPrice={toTokenState.price}
          collateralTokenAddress={collateralTokenAddress}
          selectedMarketAddress={p.selectedMarketAddress}
          collateralDeltaAmount={collateralDeltaAmount}
          triggerPricePrefix={triggerPricePrefix}
          triggerPrice={triggerPrice}
          entryPrice={entryPrice}
          existingPosition={existingPosition}
          markPrice={markPrice}
          nextLiqPrice={nextLiqPrice}
          swapTriggerRatio={swapRatio?.ratio}
          nextLeverage={nextLeverage}
          keepLeverage={keepLeverage}
          nextSizeUsd={nextSizeUsd}
          nextCollateralUsd={nextCollateralUsd}
          acceptablePrice={toTokenState.price!}
          closeSizeUsd={closeSizeUsd}
          sizeDeltaUsd={sizeDeltaUsd}
          collateralDeltaUsd={collateralDeltaUsd}
          receiveToken={receiveToken}
          receiveTokenAmount={receiveTokenAmount}
          receiveUsd={receiveUsd}
          fees={fees}
          swapRoute={swapRoute}
          mode={modeTab!}
          operationType={operationTab!}
          onSubmitted={() => {
            setIsConfirming(false);
            if (isMarket) {
              setIsProcessing(true);
            }
          }}
          onClose={() => setIsConfirming(false)}
          setKeepLeverage={setKeepLeverage}
        />
      )}

      {isProcessing && (
        <OrderStatus
          orderType={isSwap ? OrderType.MarketSwap : OrderType.MarketIncrease}
          marketAddress={swapRoute?.market}
          initialCollateralAddress={isSwap ? fromTokenState.tokenAddress : undefined}
          initialCollateralAmount={isSwap ? fromTokenState.tokenAmount : undefined}
          toSwapTokenAddress={isSwap ? toTokenState.tokenAddress : undefined}
          sizeDeltaUsd={sizeDeltaUsd}
          isLong={isSwap ? undefined : isLong}
          onClose={() => setIsProcessing(false)}
        />
      )}
    </>
  );
}

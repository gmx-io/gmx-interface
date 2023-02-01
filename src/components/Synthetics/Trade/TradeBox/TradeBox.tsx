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
  SYNTHETICS_TRADE_MODE_KEY,
  SYNTHETICS_TRADE_TYPE_KEY,
  SYNTHETICS_SWAP_TO_TOKEN_KEY,
} from "config/localStorage";
import { convertTokenAddress, getToken } from "config/tokens";
import {
  getIncreaseOrderAmounts,
  getSwapAmounts,
  getTokensRatio,
  useSelectableSwapTokens,
  useTokenInput,
} from "domain/synthetics/exchange";
import {
  TokenData,
  TokensData,
  convertToTokenAmount,
  convertToUsd,
  getTokenData,
  useAvailableTokensData,
} from "domain/synthetics/tokens";
import { BigNumber } from "ethers";
import longImg from "img/long.svg";
import shortImg from "img/short.svg";
import swapImg from "img/swap.svg";
import { Dropdown, DropdownOption } from "components/Dropdown/Dropdown";
import {
  Market,
  MarketsData,
  MarketsPoolsData,
  getMarket,
  getMarketByTokens,
  useMarketsData,
  useMarketsPoolsData,
  useOpenInterestData,
} from "domain/synthetics/markets";
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
import { BASIS_POINTS_DIVISOR, DUST_USD, PRECISION, USD_DECIMALS } from "lib/legacy";
import { useLocalStorageSerializeKey } from "lib/localStorage";
import {
  applyFactor,
  bigNumberify,
  formatAmount,
  formatTokenAmount,
  formatUsd,
  getBasisPoints,
  parseValue,
} from "lib/numbers";
import { useEffect, useMemo, useState } from "react";
import { IoMdSwap } from "react-icons/io";
import { OrderStatus } from "../../OrderStatus/OrderStatus";
import { ConfirmationBox } from "../ConfirmationBox/ConfirmationBox";
import { MarketCard } from "../../MarketCard/MarketCard";

import { useWeb3React } from "@web3-react/core";
import { ValueTransition } from "components/ValueTransition/ValueTransition";
import {
  FeeItem,
  MarketsFeesConfigsData,
  TotalSwapFees,
  TradeFees,
  getExecutionFee,
  getMarketFeesConfig,
  getPriceImpactForPosition,
  getTotalFeeItem,
  getTotalSwapFees,
} from "domain/synthetics/fees";
import { useMarketsFeesConfigs } from "domain/synthetics/fees/useMarketsFeesConfigs";
import { useSwapRoute } from "domain/synthetics/routing/useSwapRoute";
import { SwapCard } from "../../SwapCard/SwapCard";
import { TradeFeesRow } from "components/Synthetics/TradeFeesRow/TradeFeesRow";
import { HIGH_PRICE_IMPACT_BP } from "config/synthetics";

import {
  IncreaseTradeParams,
  SwapTradeParams,
  TokensRatio,
  TradeMode,
  TradeType,
} from "domain/synthetics/exchange/types";

import "./TradeBox.scss";
import { getMostLiquidMarketForPosition } from "domain/synthetics/routing";
import { is } from "date-fns/locale";

type Props = {
  selectedMarketAddress?: string;
  selectedCollateralAddress?: string;
  selectedTradeType?: TradeType;
  existingPosition?: AggregatedPositionData;
  onSelectMarketAddress: (marketAddress: string) => void;
  onSelectCollateralAddress: (collateralAddress: string) => void;
  onSelectTradeType: (tradeType: TradeType) => void;
  onConnectWallet: () => void;
};

function getTradeTypeLabels() {
  return {
    [TradeType.Long]: t`Long`,
    [TradeType.Short]: t`Short`,
    [TradeType.Swap]: t`Swap`,
  };
}

function getTradeModeLabels() {
  return {
    [TradeMode.Market]: t`Market`,
    [TradeMode.Limit]: t`Limit`,
    [TradeMode.Trigger]: t`Trigger`,
  };
}

const tradeTypeIcons = {
  [TradeType.Long]: longImg,
  [TradeType.Short]: shortImg,
  [TradeType.Swap]: swapImg,
};

const avaialbleModes = {
  [TradeType.Long]: [TradeMode.Market, TradeMode.Limit, TradeMode.Trigger],
  [TradeType.Short]: [TradeMode.Market, TradeMode.Limit, TradeMode.Trigger],
  [TradeType.Swap]: [TradeMode.Market, TradeMode.Limit],
};

export function TradeBox(p: Props) {
  const { chainId } = useChainId();
  const { account } = useWeb3React();
  const { tokensData } = useAvailableTokensData(chainId);
  const { marketsData } = useMarketsData(chainId);
  const { poolsData } = useMarketsPoolsData(chainId);
  const { openInterestData } = useOpenInterestData(chainId);
  const { marketsFeesConfigs } = useMarketsFeesConfigs(chainId);

  const [tradeMode, setTradeMode] = useLocalStorageSerializeKey([chainId, SYNTHETICS_TRADE_MODE_KEY], TradeMode.Market);

  const tradeTypeLabels = getTradeTypeLabels();
  const tradeModeLabels = getTradeModeLabels();

  const isLong = p.selectedTradeType === TradeType.Long;
  const isShort = p.selectedTradeType === TradeType.Short;
  const isSwap = p.selectedTradeType === TradeType.Swap;
  const isPosition = !isSwap;
  const isIncrease = isLong || isShort;
  const isLimit = tradeMode === TradeMode.Limit;
  const isTrigger = tradeMode === TradeMode.Trigger;

  const [stage, setStage] = useState<"trade" | "confirmation" | "processing">("trade");
  const [focusedInput, setFocusedInput] = useState<"from" | "to">();

  const [savedFromToken, setSavedFromToken] = useLocalStorageSerializeKey<string | undefined>(
    [chainId, SYNTHETICS_SWAP_FROM_TOKEN_KEY],
    undefined
  );
  const [savedToToken, setSavedToToken] = useLocalStorageSerializeKey<string | undefined>(
    [chainId, SYNTHETICS_SWAP_TO_TOKEN_KEY],
    undefined
  );

  const fromTokenInput = useTokenInput(tokensData, {
    initialTokenAddress: savedFromToken,
    priceType: "minPrice",
  });

  const toTokenInput = useTokenInput(tokensData, {
    initialTokenAddress: savedToToken,
    priceType: isShort ? "minPrice" : "maxPrice",
  });

  const collateralToken = getTokenData(tokensData, p.selectedCollateralAddress);

  const [closeSizeInputValue, setCloseSizeInputValue] = useState("");
  const closeSizeUsd = parseValue(closeSizeInputValue || "0", USD_DECIMALS)!;

  const [triggerPriceInputValue, setTriggerPriceInputValue] = useState<string>("");
  const triggerPrice = parseValue(triggerPriceInputValue, USD_DECIMALS);

  const [triggerRatioInputValue, setTriggerRatioInputValue] = useState<string>("");
  const markRatio = getTokensRatio({ fromToken: fromTokenInput.token, toToken: toTokenInput.token });
  const triggerRatio = useMemo(() => {
    if (!markRatio) return undefined;

    const ratio = parseValue(triggerRatioInputValue, USD_DECIMALS);

    return {
      ratio: ratio?.gt(0) ? ratio : markRatio.ratio,
      primaryAddress: markRatio.primaryAddress,
      secondaryAddress: markRatio.secondaryAddress,
    } as TokensRatio;
  }, [markRatio, triggerRatioInputValue]);

  const [leverageOption, setLeverageOption] = useLocalStorageSerializeKey([chainId, LEVERAGE_OPTION_KEY], 2);
  const [isLeverageEnabled, setIsLeverageEnabled] = useLocalStorageSerializeKey([chainId, LEVERAGE_ENABLED_KEY], true);
  const leverage = bigNumberify(parseInt(String(Number(leverageOption!) * BASIS_POINTS_DIVISOR)));

  const selectedMarket = getMarket(marketsData, p.selectedMarketAddress);
  const marketOptions: DropdownOption[] = Object.values(marketsData).map((market) => ({
    label: `${getTokenData(tokensData, market.indexTokenAddress, "native")?.symbol}/${market.perp}`,
    value: market.marketTokenAddress,
  }));

  const { availableFromTokens, availableToTokens, availableCollaterals, infoTokens } = useSelectableSwapTokens({
    isSwap,
    indexTokenAddress: isPosition ? toTokenInput.tokenAddress : undefined,
  });

  const swapRoute = useSwapRoute({
    initialColltaralAddress: fromTokenInput.tokenAddress,
    targetCollateralAddress: isPosition ? p.selectedCollateralAddress : toTokenInput.tokenAddress,
    isLong: isPosition ? isLong : undefined,
  });

  const { swapParams, increaseParams, fees, nextFromAmount, nextToAmount } = useMemo(() => {
    const tradeParams: {
      swapParams?: SwapTradeParams;
      increaseParams?: IncreaseTradeParams;
      fees?: TradeFees;
      nextFromAmount?: BigNumber;
      nextToAmount?: BigNumber;
      nextMarketAddress?: string;
    } = {};

    if (!fromTokenInput.token?.prices || !toTokenInput.token?.prices) return tradeParams;

    if (isSwap) {
      const swapParams = getSwapAmounts({
        data: {
          marketsData,
          poolsData,
          tokensData,
          feesConfigs: marketsFeesConfigs,
        },
        fromToken: fromTokenInput.token,
        toToken: toTokenInput.token,
        triggerRatio: isLimit ? triggerRatio : undefined,
        fromAmount: focusedInput === "from" ? fromTokenInput.tokenAmount : undefined,
        toAmount: focusedInput === "to" ? toTokenInput.tokenAmount : undefined,
        findSwapPath: swapRoute.findSwapPath,
      });

      if (swapParams) {
        tradeParams.swapParams = swapParams;

        // TODO: less ifs
        if (swapParams?.swapFees) {
          tradeParams.fees = {
            totalFees: swapParams.swapFees.totalFee,
            swapFees: swapParams.swapFees,
          };
        }

        if (focusedInput === "from") {
          tradeParams.nextToAmount = swapParams.toAmount;
        } else {
          tradeParams.nextFromAmount = swapParams.fromAmount;
        }

        return tradeParams;
      }
    }

    if (isIncrease) {
      // todo decompose?
      const increaseParams = getIncreaseOrderAmounts({
        data: {
          marketsData,
          openInterestData,
          poolsData,
          tokensData,
          feesConfigs: marketsFeesConfigs,
        },
        indexToken: toTokenInput.token,
        initialCollateral: fromTokenInput.token,
        targetCollateral: collateralToken,
        initialCollateralAmount: focusedInput === "from" ? fromTokenInput.tokenAmount : undefined,
        indexTokenAmount: focusedInput === "to" ? toTokenInput.tokenAmount : undefined,
        isLong,
        leverage,
        triggerPrice: isLimit ? triggerPrice : undefined,
        findSwapPath: swapRoute.findSwapPath,
      });

      if (increaseParams) {
        tradeParams.increaseParams = increaseParams;

        tradeParams.fees = {
          totalFees: getTotalFeeItem(
            [increaseParams.swapFees?.totalFee, increaseParams.positionFee, increaseParams.priceImpact].filter(
              Boolean
            ) as FeeItem[]
          ),
          swapFees: increaseParams.swapFees,
          positionFee: increaseParams.positionFee,
          positionPriceImpact: increaseParams.priceImpact,
        };

        if (focusedInput === "from") {
          tradeParams.nextToAmount = increaseParams.sizeDeltaAfterFeesInTokens;
        } else {
          tradeParams.nextFromAmount = increaseParams.initialCollateralAmount;
        }

        return tradeParams;
      }
    }

    return tradeParams;
  }, [
    collateralToken,
    focusedInput,
    fromTokenInput.token,
    fromTokenInput.tokenAmount,
    isIncrease,
    isLimit,
    isLong,
    isSwap,
    leverage,
    marketsData,
    marketsFeesConfigs,
    openInterestData,
    poolsData,
    swapRoute.findSwapPath,
    toTokenInput.token,
    toTokenInput.tokenAmount,
    tokensData,
    triggerPrice,
    triggerRatio,
  ]);

  useEffect(
    function updateInputAmounts() {
      if (nextFromAmount) {
        fromTokenInput.setValueByTokenAmount(nextFromAmount);
      }

      if (nextToAmount) {
        toTokenInput.setValueByTokenAmount(nextToAmount);
      }
    },
    [fromTokenInput, nextFromAmount, nextToAmount, toTokenInput]
  );

  useEffect(
    function updateIndexTokenByMarket() {
      if (isPosition && selectedMarket && selectedMarket.indexTokenAddress !== toTokenInput.tokenAddress) {
        toTokenInput.setTokenAddress(convertTokenAddress(chainId, selectedMarket.indexTokenAddress, "native"));
      }
    },
    [chainId, isPosition, selectedMarket, toTokenInput]
  );

  function onSelectIndexToken(tokenAddress: string) {
    if (!selectedMarket || selectedMarket.indexTokenAddress !== tokenAddress) {
      const market = getMostLiquidMarketForPosition(
        marketsData,
        poolsData,
        openInterestData,
        tokensData,
        convertTokenAddress(chainId, tokenAddress, "native"),
        p.selectedCollateralAddress,
        isLong
      );

      if (market) {
        p.onSelectMarketAddress(market.marketTokenAddress);
      }
    }
  }

  function onSwitchTokens() {
    const fromToken = fromTokenInput.tokenAddress;
    const toToken = toTokenInput.tokenAddress;

    fromTokenInput.setTokenAddress(toToken);
    fromTokenInput.setInputValue(toTokenInput.inputValue || "");

    toTokenInput.setTokenAddress(fromToken);
    toTokenInput.setInputValue(fromTokenInput.inputValue || "");

    setFocusedInput((old) => (old === "from" ? "to" : "from"));
  }

  function renderTokenInputs() {
    return (
      <>
        <BuyInputSection
          topLeftLabel={t`Pay:`}
          topLeftValue={formatUsd(fromTokenInput.usdAmount)}
          topRightLabel={t`Balance:`}
          topRightValue={formatTokenAmount(fromTokenInput.balance, fromTokenInput.token?.decimals)}
          inputValue={fromTokenInput.inputValue}
          onInputValueChange={(e) => {
            setFocusedInput("from");
            fromTokenInput.setInputValue(e.target.value);
          }}
          showMaxButton={fromTokenInput.isNotMatchBalance}
          onClickMax={() => {
            setFocusedInput("from");
            fromTokenInput.setValueByTokenAmount(fromTokenInput.balance);
          }}
        >
          {fromTokenInput.tokenAddress && (
            <TokenSelector
              label={t`Pay`}
              chainId={chainId}
              tokenAddress={fromTokenInput.tokenAddress}
              onSelectToken={(token) => fromTokenInput.setTokenAddress(token.address)}
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

        {isSwap && (
          <BuyInputSection
            topLeftLabel={t`Receive:`}
            topLeftValue={formatUsd(toTokenInput.usdAmount)}
            topRightLabel={t`Balance:`}
            topRightValue={formatTokenAmount(toTokenInput.balance, toTokenInput.token?.decimals)}
            inputValue={toTokenInput.inputValue}
            onInputValueChange={(e) => {
              setFocusedInput("to");
              toTokenInput.setInputValue(e.target.value);
            }}
            showMaxButton={false}
          >
            {toTokenInput.tokenAddress && (
              <TokenSelector
                label={t`Receive:`}
                chainId={chainId}
                tokenAddress={toTokenInput.tokenAddress}
                onSelectToken={(token) => toTokenInput.setTokenAddress(token.address)}
                tokens={availableToTokens}
                infoTokens={infoTokens}
                className="GlpSwap-from-token"
                showSymbolImage={true}
                showBalances={true}
                showTokenImgInDropdown={true}
              />
            )}
          </BuyInputSection>
        )}

        {isIncrease && (
          <BuyInputSection
            topLeftLabel={`${tradeTypeLabels[p.selectedTradeType!]}:`}
            topLeftValue={formatUsd(increaseParams?.sizeDeltaAfterFeesUsd)}
            topRightLabel={t`Leverage:`}
            topRightValue={formatLeverage(leverage)}
            inputValue={toTokenInput.inputValue}
            onInputValueChange={(e) => {
              setFocusedInput("to");
              toTokenInput.setInputValue(e.target.value);
            }}
            showMaxButton={false}
          >
            {toTokenInput.tokenAddress && (
              <TokenSelector
                label={tradeTypeLabels[p.selectedTradeType!]}
                chainId={chainId}
                tokenAddress={toTokenInput.tokenAddress}
                onSelectToken={(token) => onSelectIndexToken(token.address)}
                tokens={availableToTokens}
                infoTokens={infoTokens}
                className="GlpSwap-from-token"
                showSymbolImage={true}
                showBalances={false}
                showTokenImgInDropdown={true}
              />
            )}
          </BuyInputSection>
        )}
      </>
    );
  }

  function renderTriggerPriceInput() {
    return (
      <BuyInputSection
        topLeftLabel={t`Price`}
        topRightLabel={t`Mark:`}
        topRightValue={formatUsd(toTokenInput.price)}
        onClickTopRightLabel={() => {
          setTriggerPriceInputValue(formatAmount(toTokenInput.price, USD_DECIMALS, 2));
        }}
        inputValue={triggerPriceInputValue}
        onInputValueChange={(e) => {
          setTriggerPriceInputValue(e.target.value);
        }}
      >
        USD
      </BuyInputSection>
    );
  }

  function renderTriggerRatioInput() {
    return (
      <BuyInputSection
        topLeftLabel={t`Price`}
        topRightValue={formatAmount(markRatio?.ratio, USD_DECIMALS, 4)}
        onClickTopRightLabel={() => {
          setTriggerRatioInputValue(formatAmount(markRatio?.ratio, USD_DECIMALS, 10));
        }}
        inputValue={triggerRatioInputValue}
        onInputValueChange={(e) => {
          setTriggerRatioInputValue(e.target.value);
        }}
      >
        {markRatio && (
          <>
            {getToken(chainId, markRatio.secondaryAddress).symbol} per 
            {getToken(chainId, markRatio.primaryAddress).symbol}
          </>
        )}
      </BuyInputSection>
    );
  }

  function renderPositionControls() {
    return (
      <>
        {isIncrease && (
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
            isTrigger ? (
              <Dropdown
                selectedOption={
                  p.selectedMarketAddress ? marketOptions.find((o) => o.value === p.selectedMarketAddress) : undefined
                }
                placeholder={t`Select a market`}
                options={marketOptions}
                onSelect={(option) => {
                  p.onSelectMarketAddress(option.value);
                }}
              />
            ) : selectedMarket ? (
              `${getTokenData(tokensData, selectedMarket?.indexTokenAddress, "native")?.symbol}/${selectedMarket?.perp}`
            ) : (
              "..."
            )
          }
        />
        {p.selectedCollateralAddress && availableCollaterals && (
          <InfoRow
            label={t`Collateral In`}
            className="SwapBox-info-row"
            value={
              <TokenSelector
                label={t`Collateral In`}
                className="GlpSwap-from-token"
                chainId={chainId}
                tokenAddress={p.selectedCollateralAddress}
                onSelectToken={(token) => {
                  p.onSelectCollateralAddress(token.address);
                }}
                tokens={availableCollaterals}
                showTokenImgInDropdown={true}
              />
            }
          />
        )}

        <div className="App-card-divider" />
      </>
    );
  }

  return (
    <>
      <div className={`App-box SwapBox`}>
        <Tab
          icons={tradeTypeIcons}
          options={Object.values(TradeType)}
          optionLabels={tradeTypeLabels}
          option={p.selectedTradeType}
          onChange={p.onSelectTradeType}
          className="SwapBox-option-tabs"
        />

        <Tab
          options={avaialbleModes[p.selectedTradeType!]}
          optionLabels={tradeModeLabels}
          className="SwapBox-asset-options-tabs"
          type="inline"
          option={tradeMode}
          onChange={setTradeMode}
        />

        {(isSwap || isIncrease) && renderTokenInputs()}
        {isSwap && isLimit && renderTriggerRatioInput()}
        {isPosition && (isLimit || isTrigger) && renderTriggerPriceInput()}

        <div className="SwapBox-info-section">
          {isPosition && renderPositionControls()}
          <TradeFeesRow
            totalFees={fees?.totalFees}
            swapFees={fees?.swapFees}
            positionFee={fees?.positionFee}
            positionPriceImpact={fees?.positionPriceImpact}
          />
        </div>

        <div className="Exchange-swap-button-container">
          <SubmitButton
            authRequired
            onConnectWallet={p.onConnectWallet}
            // onClick={submitButtonState.onClick}
            // disabled={submitButtonState.disabled}
          >
            Submit
          </SubmitButton>
        </div>
      </div>
    </>
  );
}

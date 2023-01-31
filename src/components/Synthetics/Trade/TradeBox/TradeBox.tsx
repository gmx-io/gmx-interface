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
import { convertTokenAddress } from "config/tokens";
import { useSelectableSwapTokens, useTokenInputState } from "domain/synthetics/exchange";
import { convertToTokenAmount, convertToUsd, getTokenData, useAvailableTokensData } from "domain/synthetics/tokens";
import { BigNumber } from "ethers";

import { Dropdown, DropdownOption } from "components/Dropdown/Dropdown";
import {
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
import {
  TradeMode,
  TradeType,
  avaialbleModes,
  getNextTokenAmount,
  getSubmitError,
  tradeModeLabels,
  tradeTypeIcons,
  tradeTypeLabels,
  useSwapTriggerRatioState,
} from "../utils";

import { useWeb3React } from "@web3-react/core";
import { ValueTransition } from "components/ValueTransition/ValueTransition";
import {
  FeeItem,
  getExecutionFee,
  getMarketFeesConfig,
  getPriceImpactForPosition,
  getTotalInvertedSwapFees,
  getTotalSwapFees,
} from "domain/synthetics/fees";
import { useMarketsFeesConfigs } from "domain/synthetics/fees/useMarketsFeesConfigs";
import { useSwapRoute } from "domain/synthetics/routing/useSwapRoute";
import { SwapCard } from "../../SwapCard/SwapCard";
import { TradeFees } from "components/Synthetics/TradeFees/TradeFees";
import { HIGH_PRICE_IMPACT_BP } from "config/synthetics";

type Props = {
  onConnectWallet: () => void;
  selectedMarketAddress?: string;
  selectedCollateralAddress?: string;
  positionsData: AggregatedPositionsData;
  onSelectMarketAddress: (marketAddress: string) => void;
  onSelectCollateralAddress: (collateralAddress: string) => void;
};

function getLayout(p: { tradeType: TradeType; tradeMode: TradeMode }) {
  const isSwap = p.tradeType === TradeType.Swap;
  const isLong = p.tradeType === TradeType.Long;
  const isShort = p.tradeType === TradeType.Short;
  const isPosition = isLong || isShort;
  const isMarket = p.tradeMode === TradeMode.Market;
  const isTrigger = p.tradeMode === TradeMode.Trigger;
  const isLimit = p.tradeMode === TradeMode.Limit;

  if (isSwap) {
    return {
      isSwap,
      isLimit,
      isMarket,
      controls: {
        modes: [TradeMode.Market, TradeMode.Limit],
        swapFromInput: true,
        swapToInput: true,
        triggerRatio: isLimit,
      },
    };
  }

  if (isPosition && !isTrigger) {
    return {
      isPosition,
      isLong,
      isShort,
      isMarket,
      isTrigger,
      isIncrease: isPosition,
      controls: {
        modes: [TradeMode.Market, TradeMode.Limit, TradeMode.Trigger],
        swapFromInput: true,
        indexInput: true,
        triggerPrice: isLimit,
        leverage: true,
        selectCollateral: true,
      },
    };
  }

  return {
    isPosition: true,
    isLong,
    isShort,
    isMarket,
    isTrigger,
    isIncrease: isPosition,
    controls: {
      modes: [TradeMode.Market, TradeMode.Limit, TradeMode.Trigger],
      closeSize: true,
      triggerPrice: true,
      selectMarket: true,
      selectCollateral: true,
    },
  };
}

export function TradeBox(p: Props) {
  const { onSelectMarketAddress } = p;

  const { chainId } = useChainId();
  const { account } = useWeb3React();
  const { tokensData } = useAvailableTokensData(chainId);
  const { marketsData } = useMarketsData(chainId);
  const { poolsData } = useMarketsPoolsData(chainId);
  const { openInterestData } = useOpenInterestData(chainId);
  const { marketsFeesConfigs } = useMarketsFeesConfigs(chainId);

  const [tradeType, setTradeType] = useLocalStorageSerializeKey(
    [chainId, SYNTHETICS_SWAP_OPERATION_KEY],
    TradeType.Long
  );
  const [tradeMode, setTradeMode] = useLocalStorageSerializeKey([chainId, SYNTHETICS_SWAP_MODE_KEY], TradeMode.Market);

  const isLong = tradeType === TradeType.Long;
  const isShort = tradeType === TradeType.Short;
  const isSwap = tradeType === TradeType.Swap;
  const isPosition = !isSwap;
  const isLimit = tradeMode === TradeMode.Limit;
  const isMarket = tradeMode === TradeMode.Market;
  const isTrigger = tradeMode === TradeMode.Trigger;

  const [stage, setStage] = useState<"trade" | "confirming" | "processing">("trade");
  const [focusedInput, setFocusedInput] = useState<"from" | "to">();

  const [savedFromToken, setSavedFromToken] = useLocalStorageSerializeKey<string | undefined>(
    [chainId, SYNTHETICS_SWAP_FROM_TOKEN_KEY],
    undefined
  );
  const [savedToToken, setSavedToToken] = useLocalStorageSerializeKey<string | undefined>(
    [chainId, SYNTHETICS_SWAP_TO_TOKEN_KEY],
    undefined
  );

  const fromTokenInput = useTokenInputState(tokensData, {
    initialTokenAddress: savedFromToken,
    priceType: "minPrice",
  });

  const toTokenInput = useTokenInputState(tokensData, {
    initialTokenAddress: savedToToken,
    priceType: isShort ? "minPrice" : "maxPrice",
  });

  const [closeSizeInputValue, setCloseSizeInputValue] = useState("");
  const closeSizeUsd = parseValue(closeSizeInputValue || "0", USD_DECIMALS)!;

  const [triggerPriceInputValue, setTriggerPriceInputValue] = useState<string>("");
  const triggerPrice = parseValue(triggerPriceInputValue, USD_DECIMALS);

  const [leverageOption, setLeverageOption] = useLocalStorageSerializeKey([chainId, LEVERAGE_OPTION_KEY], 2);
  const [isLeverageEnabled, setIsLeverageEnabled] = useLocalStorageSerializeKey([chainId, LEVERAGE_ENABLED_KEY], true);

  const selectedMarket = getMarket(marketsData, p.selectedMarketAddress);
  const marketOptions: DropdownOption[] = Object.values(marketsData).map((market) => ({
    label: `${getTokenData(tokensData, market.indexTokenAddress, "native")?.symbol}/${market.perp}`,
    value: market.marketTokenAddress,
  }));

  const [collateralTokenAddress, setCollateralTokenAddress] = useLocalStorageSerializeKey<string | undefined>(
    [chainId, SYNTHETICS_SWAP_COLLATERAL_KEY],
    p.selectedCollateralAddress
  );

  const { availableFromTokens, availableToTokens, availableCollaterals, infoTokens } = useSelectableSwapTokens({
    isSwap,
    indexTokenAddress: isPosition ? toTokenInput.tokenAddress : undefined,
  });

  const swapRoute = useSwapRoute({
    initialColltaralAddress: fromTokenInput.tokenAddress,
    targetCollateralAddress: isPosition ? collateralTokenAddress : toTokenInput.tokenAddress,
    isLong: isPosition ? isLong : undefined,
  });

  const swapParams = useMemo(() => {
    const fromToken = fromTokenInput.token;
    const toToken = toTokenInput.token;

    const fromTokenAmount = fromTokenInput.amount;
    const toTokenAmount = toTokenInput.amount;

    return {
      fromToken,
      toToken,
    };
  }, []);

  //   const increaseOrderParams = useMemo(() => {
  //     return {
  //       market,
  //       collateralToken,
  //       sizeDeltaUsd,
  //       sizeDeltaInTokens,
  //       acceptablePrice,
  //       leverage,
  //       nextLeverage,
  //       nextSize,
  //       nextCollateral,
  //       mextLiqPrice,
  //     };
  //   }, []);

  //   const triggerParams = useMemo(() => {
  //     return {
  //       market,
  //       collateralToken,
  //       sizeDeltaUsd,
  //       sizeDeltaInTokens,
  //       acceptablePrice,
  //       leverage,
  //       nextLeverage,
  //       nextSize,
  //       nextCollateral,
  //       nextLiqPrice,
  //     };
  //   }, []);

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

        {/* {isPosition && (

        )} */}
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
          option={tradeType}
          onChange={setTradeType}
          className="SwapBox-option-tabs"
        />

        <Tab
          options={Object.values(layout.controls.modes)}
          optionLabels={tradeModeLabels}
          className="SwapBox-asset-options-tabs"
          type="inline"
          option={tradeMode}
          onChange={setTradeMode}
        />
      </div>
    </>
  );
}

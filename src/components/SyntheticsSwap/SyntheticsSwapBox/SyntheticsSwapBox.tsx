import { t, Trans } from "@lingui/macro";
import BuyInputSection from "components/BuyInputSection/BuyInputSection";
import { SubmitButton } from "components/SubmitButton/SubmitButton";
import Tab from "components/Tab/Tab";
import cx from "classnames";
import TokenSelector from "components/TokenSelector/TokenSelector";
import { getSyntheticsTradeTokens, NATIVE_TOKEN_ADDRESS } from "config/tokens";
import {
  getPositionMarketsPath,
  getSwapPath,
  shouldShowMaxButton,
  useSwapTokenState,
} from "domain/synthetics/exchange";
import {
  adaptToInfoTokens,
  convertFromUsdByPrice,
  formatTokenAmount,
  formatUsdAmount,
  getTokenData,
  TokenData,
  useTokensData,
} from "domain/synthetics/tokens";
import { useChainId } from "lib/chains";
import { useEffect, useMemo, useState } from "react";
import { IoMdSwap } from "react-icons/io";
import Checkbox from "components/Checkbox/Checkbox";
import { useLocalStorageSerializeKey } from "lib/localStorage";
import {
  LEVERAGE_ENABLED_KEY,
  LEVERAGE_OPTION_KEY,
  SYNTHETICS_SWAP_MODE_KEY,
  SYNTHETICS_SWAP_OPERATION_KEY,
} from "config/localStorage";
import longImg from "img/long.svg";
import shortImg from "img/short.svg";
import swapImg from "img/swap.svg";
import { LeverageSlider } from "components/LeverageSlider/LeverageSlider";
import { getMarkets, useMarketsData, useMarketsPoolsData } from "domain/synthetics/markets";
import { Token } from "domain/tokens";
import { expandDecimals, parseValue } from "lib/numbers";
import { USD_DECIMALS } from "lib/legacy";
import { createOrderTxn, OrderType } from "domain/synthetics/exchange/createOrderTxn";
import { useWeb3React } from "@web3-react/core";
import { BigNumber } from "ethers";
import { useUserReferralCode } from "domain/referrals";

import "./SyntheticsSwapBox.scss";

enum Operation {
  Long = "Long",
  Short = "Short",
  Swap = "Swap",
}

enum Mode {
  Market = "Market",
  Limit = "Limit",
  Trigger = "Trigger",
}

const operationTexts = {
  [Operation.Long]: t`Long`,
  [Operation.Short]: t`Short`,
  [Operation.Swap]: t`Swap`,
};

const operationIcons = {
  [Operation.Long]: longImg,
  [Operation.Short]: shortImg,
  [Operation.Swap]: swapImg,
};

const modeTexts = {
  [Mode.Market]: t`Market`,
  [Mode.Limit]: t`Limit`,
  [Mode.Trigger]: t`Trigger`,
};

const avaialbleModes = {
  [Operation.Long]: [Mode.Market, Mode.Limit],
  [Operation.Short]: [Mode.Market, Mode.Limit],
  [Operation.Swap]: [Mode.Market, Mode.Limit],
};

type Props = {
  onConnectWallet: () => void;
};

export function SyntheticsSwapBox(p: Props) {
  const { chainId } = useChainId();
  const { library, account } = useWeb3React();

  const [operationTab, setOperationTab] = useLocalStorageSerializeKey(
    [chainId, SYNTHETICS_SWAP_OPERATION_KEY],
    Operation.Long
  );

  const [modeTab, setModeTab] = useLocalStorageSerializeKey([chainId, SYNTHETICS_SWAP_MODE_KEY], Mode.Market);

  const [leverageOption, setLeverageOption] = useLocalStorageSerializeKey<number | undefined>(
    [chainId, LEVERAGE_OPTION_KEY],
    2
  );

  const [isLeverageEnabled, setIsLeverageEnabled] = useLocalStorageSerializeKey([chainId, LEVERAGE_ENABLED_KEY], true);

  const isLeverageAllowed = [Operation.Long, Operation.Short].includes(operationTab!);

  const isLong = operationTab === Operation.Long;
  const isShort = operationTab === Operation.Short;
  const isSwap = operationTab === Operation.Swap;

  const isMarket = modeTab === Mode.Market;
  const isLimit = modeTab === Mode.Limit;
  const isTrigger = modeTab === Mode.Trigger;

  const [triggerPriceValue, setTriggerPriceValue] = useState<string>("");

  const triggerPrice = parseValue(triggerPriceValue, USD_DECIMALS);

  const isTriggerPriceEnabled = isLimit;

  const marketsData = useMarketsData(chainId);
  const poolsData = useMarketsPoolsData(chainId);

  const referralCodeData = useUserReferralCode(library, chainId, account);

  const tradeTokensAddresses = useMemo(() => {
    const markets = getMarkets(marketsData);

    const tradeTokens = getSyntheticsTradeTokens(chainId).filter((token) => {
      return markets.some((market) =>
        [market.longTokenAddress, market.shortTokenAddress, market.indexTokenAddress].includes(token.address)
      );
    });

    return tradeTokens.map((token) => token.address);
  }, [chainId, marketsData]);

  // todo whitelisted synthetics tokens
  const tokensData = useTokensData(chainId, { tokenAddresses: tradeTokensAddresses });

  const fromTokenState = useSwapTokenState(tokensData);
  const toTokenState = useSwapTokenState(tokensData);

  const { longCollaterals, shortCollaterals, indexTokens, availableFromTokens, availableToTokens } = useMemo(() => {
    const longCollaterals: { [key: string]: TokenData | undefined } = {};
    const shortCollaterals: { [key: string]: TokenData | undefined } = {};
    const indexTokens: { [key: string]: TokenData | undefined } = {};

    const markets = getMarkets(marketsData);

    for (const market of markets) {
      longCollaterals[market.longTokenAddress] = getTokenData(tokensData, market.longTokenAddress);
      shortCollaterals[market.shortTokenAddress] = getTokenData(tokensData, market.shortTokenAddress);
      indexTokens[market.indexTokenAddress] = getTokenData(tokensData, market.indexTokenAddress);
    }

    const availableFromTokens: Token[] = Object.values(longCollaterals)
      .concat(Object.values(shortCollaterals))
      .filter(Boolean) as Token[];

    const availableToTokens: Token[] = isSwap
      ? [...availableFromTokens]
      : (Object.values(indexTokens).filter(Boolean) as Token[]);

    return {
      longCollaterals,
      shortCollaterals,
      indexTokens,
      availableFromTokens,
      availableToTokens,
    };
  }, [isSwap, marketsData, tokensData]);

  const infoTokens = useMemo(() => adaptToInfoTokens(tokensData), [tokensData]);

  const nativeToken = getTokenData(tokensData, NATIVE_TOKEN_ADDRESS);

  const executionFeeUsd = expandDecimals(1, 28);
  const executionFee = nativeToken?.prices
    ? convertFromUsdByPrice(executionFeeUsd, nativeToken.decimals, nativeToken.prices.maxPrice)
    : undefined;

  const submitButtonState = getSubmitButtonState();

  function onSwitchTokens() {
    const fromToken = fromTokenState.tokenAddress;
    const toToken = toTokenState.tokenAddress;

    fromTokenState.setTokenAddress(toToken);
    toTokenState.setTokenAddress(fromToken);
  }

  function getSubmitButtonState(): { text: string; disabled?: boolean; onClick?: () => void } {
    if (isSwap) {
      if (fromTokenState.tokenAddress === toTokenState.tokenAddress) {
        return {
          text: t`Select different tokens`,
          disabled: true,
        };
      }
    }

    if (!fromTokenState.usdAmount.gt(0)) {
      return {
        text: t`Enter an amount`,
        disabled: true,
      };
    }

    return {
      text: `${operationTexts[operationTab!]} ${toTokenState.token?.symbol}`,
      onClick: onSubmit,
    };
  }

  function onSubmit() {
    const price = toTokenState.price;

    if (!account || !fromTokenState.tokenAddress || !toTokenState.tokenAddress || !price) return;

    if (isLong || isShort) {
      const swapPath = getPositionMarketsPath(
        marketsData,
        poolsData,
        fromTokenState.tokenAddress,
        toTokenState.tokenAddress,
        toTokenState.usdAmount
      );

      if (!swapPath) return;

      createOrderTxn(chainId, library, {
        account,
        marketAddress: swapPath[0],
        initialCollateralAddress: fromTokenState.tokenAddress,
        initialCollateralAmount: fromTokenState.tokenAmount,
        swapPath: swapPath,
        sizeDeltaUsd: toTokenState.usdAmount,
        triggerPrice: BigNumber.from(0),
        acceptablePrice: price,
        executionFee: executionFee!,
        isLong: isLong,
        orderType: OrderType.MarketIncrease,
        minOutputAmount: BigNumber.from(0),
        referralCode: referralCodeData?.userReferralCodeString,
      });
    }

    if (isSwap) {
      const swapPath = getSwapPath(
        marketsData,
        poolsData,
        fromTokenState.tokenAddress,
        toTokenState.tokenAddress,
        toTokenState.usdAmount
      );

      if (!swapPath) return;

      createOrderTxn(chainId, library, {
        account,
        marketAddress: swapPath[0],
        initialCollateralAddress: fromTokenState.tokenAddress!,
        initialCollateralAmount: fromTokenState.tokenAmount,
        swapPath: swapPath,
        receiveTokenAddress: toTokenState.tokenAddress,
        sizeDeltaUsd: toTokenState.usdAmount,
        triggerPrice: BigNumber.from(0),
        acceptablePrice: price,
        executionFee: executionFee!,
        isLong: false,
        orderType: OrderType.MarketSwap,
        minOutputAmount: BigNumber.from(0),
        referralCode: referralCodeData?.userReferralCodeString,
      });
    }
  }

  useEffect(
    function syncInputValuesEff() {
      if (fromTokenState.isFocused && fromTokenState.tokenAddress) {
        toTokenState.setValueByUsdAmount(fromTokenState.usdAmount);

        return;
      }

      if (toTokenState.isFocused && toTokenState.tokenAddress) {
        fromTokenState.setValueByUsdAmount(toTokenState.usdAmount);
      }
    },
    [fromTokenState, toTokenState]
  );

  useEffect(
    function initToken() {
      if (!fromTokenState.tokenAddress && nativeToken) {
        fromTokenState.setTokenAddress(nativeToken.address);
      }

      if (!toTokenState.tokenAddress && nativeToken) {
        toTokenState.setTokenAddress(nativeToken.address);
      }
    },
    [fromTokenState, nativeToken, toTokenState]
  );

  useEffect(
    function initMode() {
      if (operationTab && modeTab && !avaialbleModes[operationTab].includes(modeTab)) {
        setModeTab(avaialbleModes[operationTab][0]);
      }
    },
    [modeTab, operationTab, setModeTab]
  );

  return (
    <div className={`App-box SyntheticsSwapBox`}>
      <Tab
        icons={operationIcons}
        options={Object.values(Operation)}
        optionLabels={operationTexts}
        option={operationTab}
        onChange={setOperationTab}
        className="SyntheticsSwapBox-option-tabs"
      />

      <Tab
        options={Object.values(avaialbleModes[operationTab!])}
        optionLabels={modeTexts}
        className="SyntheticsSwapBox-asset-options-tabs"
        type="inline"
        option={modeTab}
        onChange={setModeTab}
      />

      <div className={cx("SyntheticsSwapBox-form-layout")}>
        <BuyInputSection
          topLeftLabel={t`Pay`}
          topRightLabel={t`Balance:`}
          tokenBalance={formatTokenAmount(fromTokenState.balance, fromTokenState.token?.decimals)}
          inputValue={fromTokenState.inputValue}
          onInputValueChange={(e) => {
            fromTokenState.setInputValue(e.target.value);
          }}
          showMaxButton={shouldShowMaxButton(fromTokenState)}
          onClickMax={() => {
            fromTokenState.setValueByTokenAmount(fromTokenState.balance);
          }}
          onFocus={fromTokenState.onFocus}
          onBlur={fromTokenState.onBlur}
          balance={formatUsdAmount(fromTokenState.usdAmount)}
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
          topLeftLabel={operationTab === Operation.Swap ? t`Receive:` : operationTexts[operationTab!]}
          topRightLabel={operationTab === Operation.Swap ? t`Balance:` : t`Leverage:`}
          tokenBalance={formatTokenAmount(toTokenState.balance, toTokenState.token?.decimals)}
          inputValue={toTokenState.inputValue}
          onInputValueChange={(e) => {
            toTokenState.setInputValue(e.target.value);
          }}
          showMaxButton={false}
          onFocus={toTokenState.onFocus}
          onBlur={toTokenState.onBlur}
          balance={formatUsdAmount(toTokenState.usdAmount)}
        >
          {toTokenState.tokenAddress && (
            <TokenSelector
              label={operationTab === Operation.Swap ? t`Receive:` : operationTexts[operationTab!]}
              chainId={chainId}
              tokenAddress={toTokenState.tokenAddress}
              onSelectToken={(token) => toTokenState.setTokenAddress(token.address)}
              tokens={availableToTokens}
              infoTokens={infoTokens}
              className="GlpSwap-from-token"
              showSymbolImage={true}
              showBalances={operationTab === Operation.Swap}
              showTokenImgInDropdown={true}
            />
          )}
        </BuyInputSection>

        {/* <BuyInputSection
          topLeftLabel={t`Price`}
          topRightLabel={t`Mark:`}
          tokenBalance={formatTokenAmount(toTokenState.balance, toTokenState.token?.decimals)}
          inputValue={toTokenState.inputValue}
          onInputValueChange={(e) => {
            toTokenState.setInputValue(e.target.value);
          }}
          showMaxButton={false}
          onFocus={toTokenState.onFocus}
          onBlur={toTokenState.onBlur}
          balance={formatUsdAmount(toTokenState.usdAmount)}
        >
          USD
        </BuyInputSection> */}
      </div>

      {/* <div className="SyntheticsSwapBox-info-section">
        <InfoRow
          label={<Trans>Fees and price impact</Trans>}
          value={
            <Tooltip
              handle={formatFee(fees)}
              position="right-bottom"
              renderContent={() => (
                <div className="text-white">
                  <StatsTooltipRow
                    label={t`Price impact`}
                    value={formatFee(priceImpact?.impact, priceImpact?.basisPoints)}
                    showDollar={false}
                  />
                  <StatsTooltipRow
                    label={t`Execution fee`}
                    value={formatTokenAmount(executionFee, nativeToken?.decimals, nativeToken?.symbol)}
                    showDollar={false}
                  />
                </div>
              )}
            />
          }
        />
      </div> */}

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

      {/* {isConfirming && (
        <MarketPoolSwapConfirmation
          longDelta={longDelta}
          shortDelta={shortDelta}
          marketTokenAmount={marketTokenState.tokenAmount}
          marketTokenAddress={p.selectedMarketAddress!}
          onClose={() => setIsConfirming(false)}
          tokensData={tokensData}
          priceImpact={priceImpact}
          fees={fees}
          executionFee={executionFee}
          operationType={operationTab}
          onSubmitted={() => setIsConfirming(false)}
        />
      )} */}
    </div>
  );
}

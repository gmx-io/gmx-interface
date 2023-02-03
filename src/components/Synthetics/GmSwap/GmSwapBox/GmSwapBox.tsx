import { t, Trans } from "@lingui/macro";
import cx from "classnames";
import BuyInputSection from "components/BuyInputSection/BuyInputSection";
import Tab from "components/Tab/Tab";
import { convertTokenAddress, getToken, getWrappedToken, NATIVE_TOKEN_ADDRESS } from "config/tokens";
import { Market, MarketPoolType } from "domain/synthetics/markets/types";
import { useChainId } from "lib/chains";
import { useEffect, useMemo, useState } from "react";

import { getSubmitError, Mode, modeLabels, Operation, operationLabels, PoolDelta } from "../utils";

import { SubmitButton } from "components/SubmitButton/SubmitButton";
import TokenSelector from "components/TokenSelector/TokenSelector";
import { getMarket, getMarketName, getTokenPoolType } from "domain/synthetics/markets/utils";
import { adaptToInfoTokens } from "domain/synthetics/tokens";
import { BigNumber } from "ethers";
import { IoMdSwap } from "react-icons/io";

import { useTokenInput } from "domain/synthetics/exchange";
import {
  estimateExecuteDepositGasLimit,
  estimateExecuteWithdrawalGasLimit,
  getMinExecutionFee,
  useGasPrice,
} from "domain/synthetics/fees";
import { useMarketsData, useMarketsPoolsData, useMarketTokensData } from "domain/synthetics/markets";
import { GmConfirmationBox } from "../GmConfirmationBox/GmConfirmationBox";

import Checkbox from "components/Checkbox/Checkbox";
import { GmFees } from "components/Synthetics/GmSwap/GmFees/GmFees";
import { useAvailableTokensData } from "domain/synthetics/tokens";

import { Dropdown, DropdownOption } from "components/Dropdown/Dropdown";
import { formatTokenAmount, formatUsd } from "lib/numbers";
import { GmOrderStatus } from "../GmOrderStatus/GmOrderStatus";

import { SYNTHETICS_MARKET_DEPOSIT_TOKEN_KEY } from "config/localStorage";

import { useGasLimitsConfig } from "domain/synthetics/fees/useGasLimitsConfig";
import "./GmSwapBox.scss";
import { HIGH_PRICE_IMPACT_BP } from "config/synthetics";

type Props = {
  selectedMarketAddress?: string;
  markets: Market[];
  onSelectMarket: (marketAddress: string) => void;
  onConnectWallet: () => void;
};

enum FocusedInput {
  firstToken = "firstToken",
  secondToken = "secondToken",
  marketToken = "marketToken",
}

export function GmSwapBox(p: Props) {
  const { chainId } = useChainId();

  const [operationTab, setOperationTab] = useState(Operation.Deposit);
  const [modeTab, setModeTab] = useState(Mode.Single);

  const isDeposit = operationTab === Operation.Deposit;

  const [isConfirming, setIsConfirming] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isHighPriceImpactAccepted, setIsHighPriceImpactAccepted] = useState(false);

  const { tokensData } = useAvailableTokensData(chainId);
  const { marketsData } = useMarketsData(chainId);
  const { marketTokensData } = useMarketTokensData(chainId);
  const { poolsData } = useMarketsPoolsData(chainId);
  const { gasLimits } = useGasLimitsConfig(chainId);
  const { gasPrice } = useGasPrice(chainId);

  const marketsOptions: DropdownOption[] = Object.values(marketsData).map((market) => ({
    label: getMarketName(marketsData, tokensData, market.marketTokenAddress, true, true)!,
    value: market.marketTokenAddress,
  }));

  const market = getMarket(marketsData, p.selectedMarketAddress);

  const availableTokens = useMemo(() => {
    if (!market) return [];

    const wrappedToken = getWrappedToken(chainId);

    const availableAddresses = [market.longTokenAddress, market.shortTokenAddress];

    if (availableAddresses.includes(wrappedToken.address)) {
      availableAddresses.unshift(NATIVE_TOKEN_ADDRESS);
    }

    return availableAddresses.map((address) => getToken(chainId, address));
  }, [chainId, market]);

  const firstTokenState = useTokenInput(tokensData, {
    priceType: isDeposit ? "min" : "max",
    localStorageKey: [chainId, SYNTHETICS_MARKET_DEPOSIT_TOKEN_KEY, isDeposit, p.selectedMarketAddress, "first"],
  });

  const secondTokenState = useTokenInput(tokensData, {
    priceType: isDeposit ? "min" : "max",
    localStorageKey: [chainId, SYNTHETICS_MARKET_DEPOSIT_TOKEN_KEY, isDeposit, p.selectedMarketAddress, "second"],
  });

  const marketTokenState = useTokenInput(marketTokensData, {
    priceType: isDeposit ? "max" : "min",
    localStorageKey: [chainId, SYNTHETICS_MARKET_DEPOSIT_TOKEN_KEY, isDeposit, p.selectedMarketAddress, "market"],
  });

  const [focusedInput, setFocusedInput] = useState<FocusedInput>();

  const longDelta = getDeltaByPoolType(MarketPoolType.Long);
  const shortDelta = getDeltaByPoolType(MarketPoolType.Short);

  // const currentLongUsd = getPoolUsd(
  //   marketsData,
  //   poolsData,
  //   tokensData,
  //   market?.marketTokenAddress,
  //   market?.longTokenAddress,
  //   "midPrice"
  // );

  // const currentShortUsd = getPoolUsd(
  //   marketsData,
  //   poolsData,
  //   tokensData,
  //   market?.marketTokenAddress,
  //   market?.shortTokenAddress,
  //   "midPrice"
  // );

  const priceImpact = undefined as any;

  const isHighPriceImpact = priceImpact?.impactUsd.lt(0) && priceImpact?.basisPoints.gte(HIGH_PRICE_IMPACT_BP);

  const executionFee = useMemo(() => {
    if (!gasLimits || !gasPrice) return undefined;

    if (isDeposit) {
      const estimatedGasLimit = estimateExecuteDepositGasLimit(gasLimits, {
        initialLongTokenAmount: longDelta?.tokenAmount,
        initialShortTokenAmount: shortDelta?.tokenAmount,
      });

      return getMinExecutionFee(chainId, gasLimits, tokensData, estimatedGasLimit, gasPrice);
    } else {
      const estimatedGasLimit = estimateExecuteWithdrawalGasLimit(gasLimits, {});

      return getMinExecutionFee(chainId, gasLimits, tokensData, estimatedGasLimit, gasPrice);
    }
  }, [chainId, gasLimits, gasPrice, isDeposit, longDelta?.tokenAmount, shortDelta?.tokenAmount, tokensData]);

  const feesUsd = BigNumber.from(0)
    .sub(executionFee?.feeUsd || BigNumber.from(0))
    .add(priceImpact?.impactUsd || BigNumber.from(0));

  const tokenSelectorOptionsMap = useMemo(() => adaptToInfoTokens(tokensData), [tokensData]);

  const submitButtonState = getSubmitButtonState();

  function getDeltaByPoolType(poolType: MarketPoolType): PoolDelta | undefined {
    if (!market) return undefined;

    const poolTokenState = [firstTokenState, secondTokenState].find((tokenState) => {
      const tokenPool = getTokenPoolType(marketsData, tokensData, market.marketTokenAddress, tokenState.tokenAddress);

      return tokenPool === poolType;
    });

    if (!poolTokenState?.tokenAddress || !poolTokenState?.token) return undefined;

    return {
      tokenAddress: poolTokenState.tokenAddress,
      poolType,
      token: poolTokenState.token,
      tokenAmount: poolTokenState.tokenAmount,
      usdAmount: poolTokenState.usdAmount,
      // prettier-ignore
      usdDelta: operationTab === Operation.Deposit
        ? poolTokenState.usdAmount
        : BigNumber.from(0).sub(poolTokenState.usdAmount),
    };
  }

  function getSubmitButtonState(): { text: string; disabled?: boolean; onClick?: () => void } {
    const error = getSubmitError({
      operation: operationTab,
      tokensData,
      marketTokensData,
      poolsData,
      market,
      marketTokenAmount: marketTokenState.tokenAmount,
      longDelta,
      shortDelta,
      isHighPriceImpact,
      isHighPriceImpactAccepted,
    });

    if (error) {
      return {
        text: error,
        disabled: true,
      };
    }

    return {
      text: operationTab === Operation.Deposit ? t`Buy GM` : t`Sell GM`,
      onClick: onSubmit,
    };
  }

  function onSwitchOperation() {
    setOperationTab((prev) => (prev === Operation.Deposit ? Operation.Withdrawal : Operation.Deposit));
  }

  function onSubmit() {
    setIsConfirming(true);
  }

  useEffect(
    function updateInputsByMarket() {
      if (p.selectedMarketAddress !== marketTokenState.tokenAddress) {
        marketTokenState.setTokenAddress(p.selectedMarketAddress);
      }

      if (!availableTokens.length) return;

      if (
        !firstTokenState.tokenAddress ||
        !availableTokens.find((token) => token.address === firstTokenState.tokenAddress)
      ) {
        firstTokenState.setTokenAddress(availableTokens[0].address);
      }

      if (
        secondTokenState.tokenAddress &&
        !availableTokens.find((token) => token.address === secondTokenState.tokenAddress)
      ) {
        const secondToken = availableTokens.find((token) => token.address !== firstTokenState.tokenAddress);
        if (secondToken) {
          secondTokenState.setTokenAddress(secondToken.address);
        }
      }
    },
    [availableTokens, firstTokenState, marketTokenState, p.selectedMarketAddress, secondTokenState]
  );

  useEffect(
    function updateInputsByMode() {
      const firstConvertedAddress = firstTokenState.tokenAddress
        ? convertTokenAddress(chainId, firstTokenState.tokenAddress, "wrapped")
        : undefined;

      const secondConvertedAddress = secondTokenState.tokenAddress
        ? convertTokenAddress(chainId, secondTokenState.tokenAddress, "wrapped")
        : undefined;

      if (modeTab === Mode.Pair && (!secondConvertedAddress || firstConvertedAddress === secondConvertedAddress)) {
        const secondToken = availableTokens.filter(
          (token) => convertTokenAddress(chainId, token.address, "wrapped") !== firstConvertedAddress
        )[0];

        if (secondToken) {
          secondTokenState.setTokenAddress(secondToken.address);
        }
      } else if (modeTab === Mode.Single && secondTokenState.tokenAddress) {
        secondTokenState.setTokenAddress(undefined);
      }
    },
    [firstTokenState.tokenAddress, availableTokens, modeTab, secondTokenState, chainId]
  );

  useEffect(
    function syncInputValues() {
      if (!focusedInput) return;

      if ([FocusedInput.firstToken, FocusedInput.secondToken].includes(focusedInput)) {
        const swapSumUsd = firstTokenState.usdAmount.add(secondTokenState.usdAmount);

        marketTokenState.setValueByUsd(swapSumUsd);

        return;
      }

      if (focusedInput === FocusedInput.marketToken) {
        if (modeTab === Mode.Single && firstTokenState.tokenAddress) {
          firstTokenState.setValueByUsd(marketTokenState.usdAmount);

          return;
        }

        if (modeTab === Mode.Pair && firstTokenState.tokenAddress && secondTokenState.tokenAddress) {
          const previousSum = firstTokenState.usdAmount.add(secondTokenState.usdAmount);

          const firstTokenUsd = firstTokenState.usdAmount
            .mul(marketTokenState.usdAmount)
            .div(previousSum.gt(0) ? previousSum : 1);

          const secondTokenUsd = marketTokenState.usdAmount.sub(firstTokenUsd);

          firstTokenState.setValueByUsd(firstTokenUsd);
          secondTokenState.setValueByUsd(secondTokenUsd);

          return;
        }
      }
    },
    [firstTokenState, secondTokenState, marketTokenState, modeTab, focusedInput]
  );

  return (
    <div className={`App-box GmSwapBox`}>
      <Dropdown
        className="GmSwapBox-market-dropdown"
        selectedOption={marketsOptions.find((o) => o.value === p.selectedMarketAddress)}
        options={marketsOptions}
        onSelect={(o) => p.onSelectMarket(o.value)}
      />

      <Tab
        options={Object.values(Operation)}
        optionLabels={operationLabels}
        option={operationTab}
        onChange={setOperationTab}
        className="Exchange-swap-option-tabs"
      />

      <Tab
        options={Object.values(Mode)}
        optionLabels={modeLabels}
        className="GmSwapBox-asset-options-tabs"
        type="inline"
        option={modeTab}
        onChange={setModeTab}
      />

      <div className={cx("GmSwapBox-form-layout", { reverse: operationTab === Operation.Withdrawal })}>
        <BuyInputSection
          topLeftLabel={operationTab === Operation.Deposit ? t`Pay:` : t`Receive:`}
          topLeftValue={formatUsd(firstTokenState.usdAmount)}
          topRightLabel={t`Balance:`}
          topRightValue={formatTokenAmount(firstTokenState.balance, firstTokenState.token?.decimals)}
          inputValue={firstTokenState.inputValue}
          onInputValueChange={(e) => {
            setFocusedInput(FocusedInput.firstToken);
            firstTokenState.setInputValue(e.target.value);
          }}
          showMaxButton={operationTab === Operation.Deposit && firstTokenState.isNotMatchAvailableBalance}
          onClickMax={() => {
            setFocusedInput(FocusedInput.firstToken);
            firstTokenState.setValueByTokenAmount(firstTokenState.balance);
          }}
        >
          {firstTokenState.tokenAddress && modeTab === Mode.Single ? (
            <TokenSelector
              label={t`Pay`}
              chainId={chainId}
              tokenAddress={firstTokenState.tokenAddress}
              onSelectToken={(token) => firstTokenState.setTokenAddress(token.address)}
              tokens={availableTokens}
              infoTokens={tokenSelectorOptionsMap}
              className="GlpSwap-from-token"
              showSymbolImage={true}
              showTokenImgInDropdown={true}
            />
          ) : (
            <div className="selected-token">{firstTokenState.token?.symbol}</div>
          )}
        </BuyInputSection>

        {modeTab === Mode.Pair && secondTokenState.token && (
          <BuyInputSection
            topLeftLabel={operationTab === Operation.Deposit ? t`Pay:` : t`Receive:`}
            topLeftValue={formatUsd(secondTokenState.usdAmount)}
            topRightLabel={t`Balance:`}
            topRightValue={formatTokenAmount(secondTokenState.balance, secondTokenState.token?.decimals)}
            inputValue={secondTokenState.inputValue}
            onInputValueChange={(e) => {
              setFocusedInput(FocusedInput.secondToken);
              secondTokenState.setInputValue(e.target.value);
            }}
            showMaxButton={operationTab === Operation.Deposit && secondTokenState.isNotMatchAvailableBalance}
            onClickMax={() => {
              setFocusedInput(FocusedInput.secondToken);
              secondTokenState.setValueByTokenAmount(secondTokenState.balance);
            }}
          >
            <div className="selected-token">{secondTokenState.token.symbol}</div>
          </BuyInputSection>
        )}

        <div className="AppOrder-ball-container" onClick={onSwitchOperation}>
          <div className="AppOrder-ball">
            <IoMdSwap className="Exchange-swap-ball-icon" />
          </div>
        </div>

        <BuyInputSection
          topLeftLabel={operationTab === Operation.Withdrawal ? t`Pay:` : t`Receive:`}
          topLeftValue={formatUsd(marketTokenState.usdAmount)}
          topRightLabel={t`Balance:`}
          topRightValue={formatTokenAmount(marketTokenState.balance, marketTokenState.token?.decimals)}
          inputValue={marketTokenState.inputValue}
          onInputValueChange={(e) => {
            setFocusedInput(FocusedInput.marketToken);
            marketTokenState.setInputValue(e.target.value);
          }}
          showMaxButton={operationTab === Operation.Withdrawal && marketTokenState.isNotMatchAvailableBalance}
          onClickMax={() => {
            setFocusedInput(FocusedInput.marketToken);
            marketTokenState.setValueByTokenAmount(marketTokenState.balance);
          }}
        >
          <div className="selected-token">GM</div>
        </BuyInputSection>
      </div>

      <div className="GmSwapBox-info-section">
        <GmFees
          priceImpact={priceImpact}
          executionFeeToken={executionFee?.feeToken}
          executionFeeUsd={executionFee?.feeUsd}
          executionFee={executionFee?.feeTokenAmount}
          totalFeeUsd={feesUsd}
        />
      </div>

      {isHighPriceImpact && (
        <div className="GmSwapBox-warnings">
          <Checkbox asRow isChecked={isHighPriceImpactAccepted} setIsChecked={setIsHighPriceImpactAccepted}>
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

      {isConfirming && (
        <GmConfirmationBox
          longDelta={longDelta}
          shortDelta={shortDelta}
          marketTokenAmount={marketTokenState.tokenAmount}
          marketTokenAddress={p.selectedMarketAddress!}
          tokensData={tokensData}
          priceImpact={priceImpact}
          feesUsd={feesUsd}
          executionFee={executionFee?.feeTokenAmount}
          executionFeeUsd={executionFee?.feeUsd}
          executionFeeToken={executionFee?.feeToken}
          operationType={operationTab}
          onSubmitted={() => {
            setIsConfirming(false);
            setIsProcessing(true);
          }}
          onClose={() => setIsConfirming(false)}
        />
      )}

      {isProcessing && (
        <GmOrderStatus
          firstToken={firstTokenState.tokenAddress!}
          secondToken={secondTokenState.tokenAddress}
          market={market?.marketTokenAddress!}
          isDeposit={operationTab === Operation.Deposit}
          onClose={() => setIsProcessing(false)}
        />
      )}
    </div>
  );
}

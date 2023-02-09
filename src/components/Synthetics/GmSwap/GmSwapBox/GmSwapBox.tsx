import { t, Trans } from "@lingui/macro";
import cx from "classnames";
import BuyInputSection from "components/BuyInputSection/BuyInputSection";
import { SubmitButton } from "components/SubmitButton/SubmitButton";
import Tab from "components/Tab/Tab";
import TokenSelector from "components/TokenSelector/TokenSelector";
import { convertTokenAddress, getToken, getWrappedToken, NATIVE_TOKEN_ADDRESS } from "config/tokens";
import {
  estimateExecuteDepositGasLimit,
  estimateExecuteWithdrawalGasLimit,
  FeeItem,
  getExecutionFee,
  getFeeItem,
  getMarketFeesConfig,
  getPriceImpactUsd,
  getTotalFeeItem,
  useGasPrice,
} from "domain/synthetics/fees";
import { useMarketsData, useMarketsPoolsData, useMarketTokensData } from "domain/synthetics/markets";
import { Market, MarketPoolType } from "domain/synthetics/markets/types";
import { getMarket, getMarketName, getPoolUsd, getTokenPoolType } from "domain/synthetics/markets/utils";
import { adaptToInfoTokens } from "domain/synthetics/tokens";
import { useTokenInput } from "domain/synthetics/trade";
import { BigNumber } from "ethers";
import { useChainId } from "lib/chains";
import { useEffect, useMemo, useState } from "react";
import { IoMdSwap } from "react-icons/io";
import { GmConfirmationBox } from "../GmConfirmationBox/GmConfirmationBox";
import { getSubmitError, GmSwapFees, Mode, modeLabels, Operation, operationLabels, PoolDelta } from "../utils";

import Checkbox from "components/Checkbox/Checkbox";
import { GmFees } from "components/Synthetics/GmSwap/GmFees/GmFees";
import { useAvailableTokensData } from "domain/synthetics/tokens";

import { Dropdown, DropdownOption } from "components/Dropdown/Dropdown";
import { applyFactor, formatTokenAmount, formatUsd } from "lib/numbers";
import { GmOrderStatus } from "../GmOrderStatus/GmOrderStatus";

import { SYNTHETICS_MARKET_DEPOSIT_TOKEN_KEY } from "config/localStorage";

import { HIGH_PRICE_IMPACT_BPS } from "config/synthetics";
import { useGasLimitsConfig } from "domain/synthetics/fees/useGasLimitsConfig";
import { useMarketsFeesConfigs } from "domain/synthetics/fees/useMarketsFeesConfigs";

import { getWithdawalAmounts } from "domain/synthetics/trade/utils/withdrawal";
import "./GmSwapBox.scss";

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

const availableModes = {
  [Operation.Deposit]: [Mode.Single, Mode.Pair],
  [Operation.Withdrawal]: [Mode.Pair],
};

export function GmSwapBox(p: Props) {
  const { chainId } = useChainId();

  const [operationTab, setOperationTab] = useState(Operation.Deposit);
  const [modeTab, setModeTab] = useState(Mode.Single);

  const isDeposit = operationTab === Operation.Deposit;
  const isWithdrawal = operationTab === Operation.Withdrawal;

  const [focusedInput, setFocusedInput] = useState<FocusedInput>();
  const [isConfirming, setIsConfirming] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isHighPriceImpactAccepted, setIsHighPriceImpactAccepted] = useState(false);

  const { tokensData } = useAvailableTokensData(chainId);
  const infoTokens = useMemo(() => adaptToInfoTokens(tokensData), [tokensData]);
  const { marketsData } = useMarketsData(chainId);
  const { marketTokensData } = useMarketTokensData(chainId);
  const { poolsData } = useMarketsPoolsData(chainId);
  const { marketsFeesConfigs } = useMarketsFeesConfigs(chainId);
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

  const firstTokenInput = useTokenInput(tokensData, {
    priceType: isDeposit ? "min" : "max",
    localStorageKey: [chainId, SYNTHETICS_MARKET_DEPOSIT_TOKEN_KEY, isDeposit, p.selectedMarketAddress, "first"],
  });

  const secondTokenInput = useTokenInput(tokensData, {
    priceType: isDeposit ? "min" : "max",
    localStorageKey: [chainId, SYNTHETICS_MARKET_DEPOSIT_TOKEN_KEY, isDeposit, p.selectedMarketAddress, "second"],
  });

  const marketTokenInput = useTokenInput(marketTokensData, {
    priceType: isDeposit ? "max" : "min",
    localStorageKey: [chainId, SYNTHETICS_MARKET_DEPOSIT_TOKEN_KEY, isDeposit, p.selectedMarketAddress, "market"],
  });

  const longDelta = getDeltaByPoolType(MarketPoolType.Long);
  const shortDelta = getDeltaByPoolType(MarketPoolType.Short);

  const feesConfig = getMarketFeesConfig(marketsFeesConfigs, market?.marketTokenAddress);

  const withdrawalAmounts = isWithdrawal
    ? getWithdawalAmounts({
        marketsData,
        tokensData,
        poolsData,
        feesConfigs: marketsFeesConfigs,
        market,
        marketToken: marketTokenInput.token,
        marketTokenAmount: marketTokenInput.tokenAmount,
      })
    : undefined;

  const longPoolUsd = getPoolUsd(
    marketsData,
    poolsData,
    tokensData,
    market?.marketTokenAddress,
    market?.longTokenAddress,
    "midPrice"
  );

  const shortPoolUsd = getPoolUsd(
    marketsData,
    poolsData,
    tokensData,
    market?.marketTokenAddress,
    market?.shortTokenAddress,
    "midPrice"
  );

  const priceImpactDeltaUsd = isDeposit
    ? getPriceImpactUsd({
        currentLongUsd: longPoolUsd,
        currentShortUsd: shortPoolUsd,
        longDeltaUsd: longDelta?.usdDelta || BigNumber.from(0),
        shortDeltaUsd: shortDelta?.usdDelta || BigNumber.from(0),
        factorPositive: feesConfig?.swapImpactFactorPositive,
        factorNegative: feesConfig?.swapImpactFactorNegative,
        exponentFactor: feesConfig?.swapImpactExponentFactor,
      })
    : undefined;

  const priceImpactFee = getFeeItem(priceImpactDeltaUsd, marketTokenInput.usdAmount);

  const isHighPriceImpact = priceImpactFee?.deltaUsd.lt(0) && priceImpactFee.bps.abs().gte(HIGH_PRICE_IMPACT_BPS);

  const swapFeeUsd =
    feesConfig && marketTokenInput.usdAmount.gt(0)
      ? applyFactor(marketTokenInput.usdAmount, feesConfig?.swapFeeFactor)
      : undefined;

  const swapFee = getFeeItem(swapFeeUsd?.mul(-1), marketTokenInput.usdAmount);

  const totalFees = getTotalFeeItem([priceImpactFee, swapFee].filter(Boolean) as FeeItem[]);

  const fees: GmSwapFees = {
    totalFees,
    swapFee,
    swapPriceImpact: priceImpactFee,
  };

  const executionFee = useMemo(() => {
    if (!gasLimits || !gasPrice) return undefined;

    if (isDeposit) {
      const estimatedGasLimit = estimateExecuteDepositGasLimit(gasLimits, {
        initialLongTokenAmount: longDelta?.tokenAmount,
        initialShortTokenAmount: shortDelta?.tokenAmount,
      });

      return getExecutionFee(chainId, gasLimits, tokensData, estimatedGasLimit, gasPrice);
    } else {
      const estimatedGasLimit = estimateExecuteWithdrawalGasLimit(gasLimits, {});

      return getExecutionFee(chainId, gasLimits, tokensData, estimatedGasLimit, gasPrice);
    }
  }, [chainId, gasLimits, gasPrice, isDeposit, longDelta?.tokenAmount, shortDelta?.tokenAmount, tokensData]);

  const submitButtonState = getSubmitButtonState();

  function getDeltaByPoolType(poolType: MarketPoolType): PoolDelta | undefined {
    if (!market) return undefined;

    const poolTokenState = [firstTokenInput, secondTokenInput].find((tokenState) => {
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
        : poolTokenState.usdAmount.mul(-1),
    };
  }

  function getSubmitButtonState(): { text: string; disabled?: boolean; onClick?: () => void } {
    const error = getSubmitError({
      operation: operationTab,
      tokensData,
      marketTokensData,
      poolsData,
      market,
      marketTokenAmount: marketTokenInput.tokenAmount,
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
    function updateMode() {
      if (!availableModes[operationTab].includes(modeTab)) {
        setModeTab(availableModes[operationTab][0]);
      }
    },
    [modeTab, operationTab]
  );

  useEffect(
    function updateInputsByMarket() {
      if (p.selectedMarketAddress !== marketTokenInput.tokenAddress) {
        marketTokenInput.setTokenAddress(p.selectedMarketAddress);
      }

      if (!availableTokens.length) return;

      if (
        !firstTokenInput.tokenAddress ||
        !availableTokens.find((token) => token.address === firstTokenInput.tokenAddress)
      ) {
        firstTokenInput.setTokenAddress(availableTokens[0].address);
      }

      if (
        secondTokenInput.tokenAddress &&
        !availableTokens.find((token) => token.address === secondTokenInput.tokenAddress)
      ) {
        const secondToken = availableTokens.find((token) => token.address !== firstTokenInput.tokenAddress);
        if (secondToken) {
          secondTokenInput.setTokenAddress(secondToken.address);
        }
      }
    },
    [availableTokens, firstTokenInput, marketTokenInput, p.selectedMarketAddress, secondTokenInput]
  );

  useEffect(
    function updateInputsByMode() {
      const firstConvertedAddress = firstTokenInput.tokenAddress
        ? convertTokenAddress(chainId, firstTokenInput.tokenAddress, "wrapped")
        : undefined;

      const secondConvertedAddress = secondTokenInput.tokenAddress
        ? convertTokenAddress(chainId, secondTokenInput.tokenAddress, "wrapped")
        : undefined;

      if (modeTab === Mode.Pair && (!secondConvertedAddress || firstConvertedAddress === secondConvertedAddress)) {
        const secondToken = availableTokens.filter(
          (token) => convertTokenAddress(chainId, token.address, "wrapped") !== firstConvertedAddress
        )[0];

        if (secondToken) {
          secondTokenInput.setTokenAddress(secondToken.address);
        }
      } else if (modeTab === Mode.Single && secondTokenInput.tokenAddress) {
        secondTokenInput.setTokenAddress(undefined);
        secondTokenInput.setInputValue("");
      }
    },
    [firstTokenInput.tokenAddress, availableTokens, modeTab, secondTokenInput, chainId]
  );

  useEffect(
    function updateInputValues() {
      if (isWithdrawal && withdrawalAmounts) {
        updateInputByPoolType(withdrawalAmounts.longTokenAmount, MarketPoolType.Long);
        updateInputByPoolType(withdrawalAmounts.shortTokenAmount, MarketPoolType.Short);
      }

      if (isDeposit && focusedInput) {
        if ([FocusedInput.firstToken, FocusedInput.secondToken].includes(focusedInput)) {
          const swapSumUsd = firstTokenInput.usdAmount.add(secondTokenInput.usdAmount);

          marketTokenInput.setValueByUsd(swapSumUsd);

          return;
        }

        if (focusedInput === FocusedInput.marketToken) {
          if (modeTab === Mode.Single && firstTokenInput.tokenAddress) {
            firstTokenInput.setValueByUsd(marketTokenInput.usdAmount);

            return;
          }

          if (modeTab === Mode.Pair && firstTokenInput.tokenAddress && secondTokenInput.tokenAddress) {
            const previousSum = firstTokenInput.usdAmount.add(secondTokenInput.usdAmount);

            const firstTokenUsd = firstTokenInput.usdAmount
              .mul(marketTokenInput.usdAmount)
              .div(previousSum.gt(0) ? previousSum : 1);

            const secondTokenUsd = marketTokenInput.usdAmount.sub(firstTokenUsd);

            firstTokenInput.setValueByUsd(firstTokenUsd);
            secondTokenInput.setValueByUsd(secondTokenUsd);

            return;
          }
        }
      }

      function updateInputByPoolType(amount: BigNumber, poolType: MarketPoolType) {
        const firstInputPoolType = getTokenPoolType(
          marketsData,
          tokensData,
          market?.marketTokenAddress,
          firstTokenInput.tokenAddress
        );

        const secondInputPoolType = getTokenPoolType(
          marketsData,
          tokensData,
          market?.marketTokenAddress,
          secondTokenInput.tokenAddress
        );

        if (poolType === firstInputPoolType) {
          firstTokenInput.setValueByTokenAmount(amount);
        }

        if (poolType === secondInputPoolType) {
          secondTokenInput.setValueByTokenAmount(amount);
        }
      }
    },
    [
      firstTokenInput,
      focusedInput,
      isDeposit,
      isWithdrawal,
      market?.marketTokenAddress,
      marketTokenInput,
      marketsData,
      modeTab,
      secondTokenInput,
      tokensData,
      withdrawalAmounts,
    ]
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
        options={availableModes[operationTab]}
        optionLabels={modeLabels}
        className="GmSwapBox-asset-options-tabs"
        type="inline"
        option={modeTab}
        onChange={setModeTab}
      />

      <div className={cx("GmSwapBox-form-layout", { reverse: operationTab === Operation.Withdrawal })}>
        <BuyInputSection
          topLeftLabel={operationTab === Operation.Deposit ? t`Pay:` : t`Receive:`}
          topLeftValue={formatUsd(firstTokenInput.usdAmount)}
          topRightLabel={t`Balance:`}
          topRightValue={formatTokenAmount(firstTokenInput.balance, firstTokenInput.token?.decimals)}
          inputValue={firstTokenInput.inputValue}
          onInputValueChange={(e) => {
            setFocusedInput(FocusedInput.firstToken);
            firstTokenInput.setInputValue(e.target.value);
          }}
          staticInput={isWithdrawal}
          showMaxButton={operationTab === Operation.Deposit && firstTokenInput.isNotMatchAvailableBalance}
          onClickMax={() => {
            setFocusedInput(FocusedInput.firstToken);
            firstTokenInput.setValueByTokenAmount(firstTokenInput.balance);
          }}
        >
          {firstTokenInput.tokenAddress && modeTab === Mode.Single ? (
            <TokenSelector
              label={t`Pay`}
              chainId={chainId}
              tokenAddress={firstTokenInput.tokenAddress}
              onSelectToken={(token) => firstTokenInput.setTokenAddress(token.address)}
              tokens={availableTokens}
              infoTokens={infoTokens}
              className="GlpSwap-from-token"
              showSymbolImage={true}
              showTokenImgInDropdown={true}
            />
          ) : (
            <div className="selected-token">{firstTokenInput.token?.symbol}</div>
          )}
        </BuyInputSection>

        {modeTab === Mode.Pair && secondTokenInput.token && (
          <BuyInputSection
            topLeftLabel={operationTab === Operation.Deposit ? t`Pay:` : t`Receive:`}
            topLeftValue={formatUsd(secondTokenInput.usdAmount)}
            topRightLabel={t`Balance:`}
            topRightValue={formatTokenAmount(secondTokenInput.balance, secondTokenInput.token?.decimals)}
            inputValue={secondTokenInput.inputValue}
            onInputValueChange={(e) => {
              setFocusedInput(FocusedInput.secondToken);
              secondTokenInput.setInputValue(e.target.value);
            }}
            staticInput={isWithdrawal}
            showMaxButton={operationTab === Operation.Deposit && secondTokenInput.isNotMatchAvailableBalance}
            onClickMax={() => {
              setFocusedInput(FocusedInput.secondToken);
              secondTokenInput.setValueByTokenAmount(secondTokenInput.balance);
            }}
          >
            <div className="selected-token">{secondTokenInput.token.symbol}</div>
          </BuyInputSection>
        )}

        <div className="AppOrder-ball-container" onClick={onSwitchOperation}>
          <div className="AppOrder-ball">
            <IoMdSwap className="Exchange-swap-ball-icon" />
          </div>
        </div>

        <BuyInputSection
          topLeftLabel={operationTab === Operation.Withdrawal ? t`Pay:` : t`Receive:`}
          topLeftValue={formatUsd(marketTokenInput.usdAmount)}
          topRightLabel={t`Balance:`}
          topRightValue={formatTokenAmount(marketTokenInput.balance, marketTokenInput.token?.decimals)}
          inputValue={marketTokenInput.inputValue}
          onInputValueChange={(e) => {
            setFocusedInput(FocusedInput.marketToken);
            marketTokenInput.setInputValue(e.target.value);
          }}
          showMaxButton={operationTab === Operation.Withdrawal && marketTokenInput.isNotMatchAvailableBalance}
          onClickMax={() => {
            setFocusedInput(FocusedInput.marketToken);
            marketTokenInput.setValueByTokenAmount(marketTokenInput.balance);
          }}
        >
          <div className="selected-token">GM</div>
        </BuyInputSection>
      </div>

      <div className="GmSwapBox-info-section">
        <GmFees totalFees={fees.totalFees} swapFee={fees.swapFee} swapPriceImpact={fees.swapPriceImpact} />
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
          marketTokenAmount={marketTokenInput.tokenAmount}
          marketTokenAddress={p.selectedMarketAddress!}
          tokensData={tokensData}
          fees={fees}
          executionFee={executionFee}
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
          firstToken={firstTokenInput.tokenAddress!}
          secondToken={secondTokenInput.tokenAddress}
          market={market?.marketTokenAddress!}
          isDeposit={operationTab === Operation.Deposit}
          onClose={() => setIsProcessing(false)}
        />
      )}
    </div>
  );
}

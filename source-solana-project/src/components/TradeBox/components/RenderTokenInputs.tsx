import BuyInputSection from '@/components/Common/Input/BuyInputSection';
import { MarketSelector } from '@/components/Selectors/MarketSelector';
import TokenSelector from '@/components/Selectors/TokenSelector';
import { BN_ZERO } from '@/config/constants';
import { usePriceImpactWarningState } from '@/hooks/tradeHooks/usePriceImpactWarningState';
import { selectNativeToken } from '@/selectors/token/selectNativeToken';
import { selectSortedAllMarkets } from '@/selectors/token/selectSortedAllMarkets';
import { selectSwapTokens } from '@/selectors/token/selectSwapTokens';
import { selectTokensData } from '@/selectors/token/selectTokensData';
import { Token } from '@/selectors/token/types';
import {
  selectSetTradeboxFocusedInput,
  selectSetTradeboxFromTokenAddress,
  selectSetTradeboxFromTokenInputValue,
  selectSetTradeboxToTokenAddress,
  selectSetTradeboxToTokenInputValue,
  selectTradeboxFromTokenInputValue,
  selectTradeboxIsLeverageEnabled,
  selectTradeboxToTokenInputValue,
  selectTradeboxTradeLeverage,
  selectTradeboxTradeType,
} from '@/selectors/tradebox/baseSelectors';
import { selectTradeboxFromToken } from '@/selectors/tradebox/selectTradeboxFromToken';
import { selectTradeboxFromTokenInputAmount } from '@/selectors/tradebox/selectTradeboxFromTokenInputAmount';
import { selectTradeboxFromTokenUsd } from '@/selectors/tradebox/selectTradeboxFromTokenUsd';
import { selectTradeboxIncreasePositionAmounts } from '@/selectors/tradebox/selectTradeboxIncreasePositionAmounts';
import { selectTradeboxIsWrapOrUnwrap } from '@/selectors/tradebox/selectTradeboxIsWrapOrUnwrap';
import { selectTradeboxSwapAmounts } from '@/selectors/tradebox/selectTradeboxSwapAmounts';
import { selectTradeboxToToken } from '@/selectors/tradebox/selectTradeboxToToken';
import { selectTradeboxTradeFlags } from '@/selectors/tradebox/selectTradeboxTradeFlags';
import {
  formatAmountFree,
  formatBalanceAmount,
  formatLeverage,
  formatTokenAmount,
  formatUsd,
} from '@/utils/legacy/format';
import { getMarketIndexName } from '@/utils/market/getMarketIndexName';
import { getMinResidualAmount } from '@/utils/token/getTokenMinResidualAmount';
import { useAppStore } from '@/zustand/useAppStore';
import { t } from '@lingui/macro';
import { ChangeEvent, useCallback, useMemo } from 'react';
import { useLatest } from 'react-use';

type RenderTokenInputsProps = {
  priceImpactWarningState: ReturnType<typeof usePriceImpactWarningState>;
};

export function RenderTokenInputs({
  priceImpactWarningState,
}: RenderTokenInputsProps) {
  const tradeTypeLabels = {
    Long: t`Long`,
    Short: t`Short`,
    Swap: t`Swap`,
  };

  const fromToken = useAppStore(selectTradeboxFromToken);
  const fromTokenUsd = useAppStore(selectTradeboxFromTokenUsd);
  const fromTokenAmount = useAppStore(selectTradeboxFromTokenInputAmount);
  const fromTokenInputValue = useAppStore(selectTradeboxFromTokenInputValue);
  const setFromTokenAddress = useAppStore(selectSetTradeboxFromTokenAddress);
  const setFromTokenInputValueRaw = useAppStore(
    selectSetTradeboxFromTokenInputValue
  );
  const toToken = useAppStore(selectTradeboxToToken);
  const toTokenInputValue = useAppStore(selectTradeboxToTokenInputValue);
  const setToTokenInputValueRaw = useAppStore(
    selectSetTradeboxToTokenInputValue
  );
  const setToTokenAddress = useAppStore(selectSetTradeboxToTokenAddress);
  const tokens = useAppStore(selectTokensData);
  const swapTokens = useAppStore(selectSwapTokens);
  const sortedAllMarkets = useAppStore(selectSortedAllMarkets);
  const increaseAmounts = useAppStore(selectTradeboxIncreasePositionAmounts);
  const swapAmounts = useAppStore(selectTradeboxSwapAmounts);
  const setFocusedInput = useAppStore(selectSetTradeboxFocusedInput);
  const tradeType = useAppStore(selectTradeboxTradeType);
  const tradeFlags = useAppStore(selectTradeboxTradeFlags);
  const { isSwap, isIncrease } = tradeFlags;
  const isLeverageEnabled = useAppStore(selectTradeboxIsLeverageEnabled);
  const leverage = useAppStore(selectTradeboxTradeLeverage);
  const isWrapOrUnwrap = useAppStore(selectTradeboxIsWrapOrUnwrap);
  const nativeToken = useAppStore(selectNativeToken);
  const minResidualAmount = getMinResidualAmount(nativeToken?.decimals);

  const setIsAcceptedRef = useLatest(priceImpactWarningState.setIsAccepted);

  const isNotMatchAvailableBalance = useMemo(
    () =>
      (fromToken?.balance ?? BN_ZERO).gt(BN_ZERO) &&
      fromToken?.balance !== fromTokenAmount,
    [fromToken?.balance, fromTokenAmount]
  );

  const setFromTokenInputValue = useCallback(
    (value: string, shouldResetPriceImpactWarning: boolean) => {
      setFromTokenInputValueRaw(value);
      if (shouldResetPriceImpactWarning) {
        setIsAcceptedRef.current(false);
      }
    },
    [setFromTokenInputValueRaw, setIsAcceptedRef]
  );

  const setToTokenInputValue = useCallback(
    (value: string, shouldResetPriceImpactWarning: boolean) => {
      setToTokenInputValueRaw(value);
      if (shouldResetPriceImpactWarning) {
        setIsAcceptedRef.current(false);
      }
    },
    [setToTokenInputValueRaw, setIsAcceptedRef]
  );

  const onMaxClick = useCallback(() => {
    if (fromToken?.balance) {
      let maxAvailableAmount = fromToken?.isNative
        ? fromToken.balance.sub(minResidualAmount)
        : fromToken.balance;

      if (maxAvailableAmount.lt(BN_ZERO)) {
        maxAvailableAmount = BN_ZERO;
      }

      setFocusedInput('from');
      const formattedAmount = formatAmountFree(
        maxAvailableAmount,
        fromToken.decimals
      );
      setFromTokenInputValue(formattedAmount, true);
    }
  }, [
    fromToken?.balance,
    fromToken?.decimals,
    fromToken?.isNative,
    minResidualAmount,
    setFocusedInput,
    setFromTokenInputValue,
  ]);

  const handleFromInputTokenChange = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => {
      const newValue = e.target.value;
      if (isWrapOrUnwrap && fromToken && fromToken.isWrappedNative) {
        setFromTokenInputValue('', true);
        return;
      }
      setFocusedInput('from');
      setFromTokenInputValue(newValue, true);
    },
    [isWrapOrUnwrap, fromToken, setFocusedInput, setFromTokenInputValue]
  );

  const handleToInputTokenChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      setFocusedInput('to');
      setToTokenInputValue(event.target.value, true);
    },
    [setFocusedInput, setToTokenInputValue]
  );

  const handleSelectFromToken = useCallback(
    (token: Token) => {
      setFromTokenAddress(token.address.toBase58());
    },
    [setFromTokenAddress]
  );

  const handleSelectToToken = useCallback(
    (token: Token) => {
      setToTokenAddress(token.address.toBase58());
    },
    [setToTokenAddress]
  );

  const handleSelectMarket = useCallback(
    (tokenAddress: string) => setToTokenAddress(tokenAddress),
    [setToTokenAddress]
  );

  return (
    <>
      <BuyInputSection
        topLeftLabel={t`Pay`}
        topLeftValue={
          fromTokenUsd !== undefined && fromTokenUsd.gt(BN_ZERO)
            ? formatUsd(
                isIncrease
                  ? increaseAmounts?.initialCollateralUsd
                  : fromTokenUsd
              )
            : ''
        }
        topRightLabel={t`Balance`}
        topRightValue={formatTokenAmount(
          fromToken?.balance ?? BN_ZERO,
          fromToken?.decimals ?? 0,
          '',
          { useCommas: true }
        )}
        onClickTopRightLabel={onMaxClick}
        inputValue={fromTokenInputValue}
        onInputValueChange={handleFromInputTokenChange}
        showMaxButton={isNotMatchAvailableBalance}
        onClickMax={onMaxClick}
        qa="pay"
      >
        {fromToken && (
          <TokenSelector
            label={t`Pay`}
            token={fromToken}
            onSelectToken={handleSelectFromToken}
            tokens={swapTokens}
            infoTokens={tokens}
            showBalances={true}
            qa="collateral-selector"
          />
        )}
      </BuyInputSection>

      {isSwap && (
        <BuyInputSection
          topLeftLabel={t`Receive`}
          topLeftValue={
            swapAmounts?.usdOut && swapAmounts.usdOut.gt(BN_ZERO)
              ? formatUsd(swapAmounts?.usdOut)
              : ''
          }
          topRightLabel={t`Balance`}
          topRightValue={
            toToken?.balance
              ? formatBalanceAmount(toToken.balance, toToken.decimals)
              : ''
          }
          inputValue={toTokenInputValue}
          onInputValueChange={handleToInputTokenChange}
          showMaxButton={false}
          preventFocusOnLabelClick="right"
          qa="swap-receive"
        >
          {toToken && (
            <TokenSelector
              label={t`Receive`}
              token={toToken}
              onSelectToken={handleSelectToToken}
              tokens={swapTokens}
              infoTokens={tokens}
              showBalances={true}
              qa="receive-selector"
            />
          )}
        </BuyInputSection>
      )}

      {isIncrease && (
        <BuyInputSection
          topLeftLabel={tradeTypeLabels[tradeType]}
          topLeftValue={
            increaseAmounts?.sizeDeltaUsd.gt(BN_ZERO)
              ? formatUsd(increaseAmounts?.sizeDeltaUsd, {
                  fallbackToZero: true,
                })
              : ''
          }
          topRightLabel={t`Leverage`}
          topRightValue={
            formatLeverage(
              isLeverageEnabled ? leverage : increaseAmounts?.estimatedLeverage
            ) || '-'
          }
          inputValue={toTokenInputValue}
          onInputValueChange={handleToInputTokenChange}
          showMaxButton={false}
        >
          {toToken && (
            <MarketSelector
              label={tradeTypeLabels[tradeType]}
              selectedIndexName={
                toToken
                  ? getMarketIndexName({
                      indexToken: toToken,
                      isSpotOnly: false,
                    })
                  : undefined
              }
              selectedMarketLabel={
                toToken && (
                  <span className="inline-flex items-center">
                    <span>{toToken.symbol}</span>
                  </span>
                )
              }
              markets={sortedAllMarkets ?? []}
              onSelectMarket={(_indexName, market) =>
                handleSelectMarket(market.indexToken.address.toBase58())
              }
              size="l"
            />
          )}
        </BuyInputSection>
      )}
    </>
  );
}

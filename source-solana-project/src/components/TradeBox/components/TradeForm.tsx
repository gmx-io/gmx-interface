/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { ExchangeInfo } from '@/components/Exchange/ExchangeInfo';
import { RenderDecreaseSizeInput } from '@/components/TradeBox/components/RenderDecreaseSizeInput';
import { SelectCompetition } from '@/components/TradeBox/components/Competition';
import { RenderPositionControls } from '@/components/TradeBox/components/RenderPositionControls';
import { RenderTokenInputs } from '@/components/TradeBox/components/RenderTokenInputs';
import { RenderTriggerPriceInput } from '@/components/TradeBox/components/RenderTriggerPriceInput';
import { RenderTriggerRatioInput } from '@/components/TradeBox/components/RenderTriggerRatioInput';
import { RenderUnwrapWarning } from '@/components/TradeBox/components/RenderUnwrapWarning';
import { TradeboxSubmitButton } from '@/components/TradeBox/components/TradeboxSubmitButton';
import { useHandleSubmitOrder } from '@/components/TradeBox/hooks/useHandleSubmitOrder';
import { useTradeboxAvailablePriceImpactValues } from '@/components/TradeBox/hooks/useTradeboxAvailablePriceImpactValues';
import { useTradeboxWarningsRows } from '@/components/TradeBox/hooks/useTradeWarningsRows';
import { useTriggerOrdersConsent } from '@/components/TradeBox/hooks/useTriggerOrdersConsent';
import { GtRewardsRow } from '@/components/TradeBox/TradeBoxRows/GtRewardsRow';
import { TradeFeesRow } from '@/components/TradeBox/TradeBoxRows/TradeFeesRow';
import { BN_ZERO } from '@/config/constants';
import { DEFAULT_LEVERAGE } from '@/config/factors';
import { NATIVE_TOKEN_ADDRESS } from '@/config/tokens';
import { useAnchor, useOpenConnectModal } from '@/contexts/anchor';
import {
  useUnwrapNativeToken,
  useWrapNativeToken,
} from '@/hooks/initializeHooks';
import { usePriceImpactWarningState } from '@/hooks/tradeHooks/usePriceImpactWarningState';
import {
  selectResetTradeboxInputs,
  selectSetTradeboxFocusedInput,
  selectSetTradeboxFromTokenInputValue,
  selectSetTradeboxReceiveTokenAddress,
  selectSetTradeboxToTokenInputValue,
  selectSetTradeboxTradeLeverage,
  selectSetTradeboxTriggerPriceInputValue,
  selectTradeboxFocusedInput,
  selectTradeboxFromTokenInputValue,
  selectTradeboxToTokenInputValue,
  selectTradeboxTradeLeverage,
  selectTradeboxTradeMode,
} from '@/selectors/tradebox/baseSelectors';
import { selectTradeboxCollateralToken } from '@/selectors/tradebox/selectTradeboxCollateralToken';
import { selectTradeboxFromToken } from '@/selectors/tradebox/selectTradeboxFromToken';
import { selectTradeboxIncreasePositionAmounts } from '@/selectors/tradebox/selectTradeboxIncreasePositionAmounts';
import { selectTradeboxIsWrapOrUnwrap } from '@/selectors/tradebox/selectTradeboxIsWrapOrUnwrap';
import { selectTradeboxMaxLeverage } from '@/selectors/tradebox/selectTradeboxMaxLeverage';
import { selectTradeboxReceiveTokenAddress } from '@/selectors/tradebox/selectTradeboxReceiveTokenAddress';
import { selectTradeboxSwapAmounts } from '@/selectors/tradebox/selectTradeboxSwapAmounts';
import { selectTradeboxToToken } from '@/selectors/tradebox/selectTradeboxToToken';
import { selectTradeboxTradeFees } from '@/selectors/tradebox/selectTradeboxTradeFees';
import { selectTradeboxTradeFeesType } from '@/selectors/tradebox/selectTradeboxTradeFeesType';
import { selectTradeboxTradeFlags } from '@/selectors/tradebox/selectTradeboxTradeFlags';
import { formatAmountFree, parseValue } from '@/utils/legacy';
import { isNativeToken } from '@/utils/token/isNativeToken';
import { isWrappedNativeToken } from '@/utils/token/isWrappedNativeToken';
import { useAppStore } from '@/zustand/useAppStore';
import { useCallback, useLayoutEffect, useRef } from 'react';
import { useEffect, useState } from 'react';
import { useLatest, usePrevious } from 'react-use';
import { useWallet } from '@solana/wallet-adapter-react';
// import { useMedia } from 'react-use';

// import '@material/web/button/filled-button.js';
// import '@material/web/button/outlined-button.js';
// import '@material/web/checkbox/checkbox.js';
// import '@material/web/circular-progress/circular-progress.js';
import '@material/web/progress/circular-progress.js';
import {
  useTriggerUnwrapToken,
  useTriggerWrapToken,
} from '@/hooks/triggerHooks';

export function useEventCallback<Args extends unknown[], Return>(
  fn: (...args: Args) => Return
): (...args: Args) => Return {
  const ref = useRef(fn);
  useLayoutEffect(() => {
    ref.current = fn;
  }, [fn]);
  return useCallback((...args: Args) => ref.current(...args), []);
}

export function TradeForm({
  priceImpactWarningState,
}: {
  priceImpactWarningState: ReturnType<typeof usePriceImpactWarningState>;
}) {
  const { owner } = useAnchor();
  const openConnectWalletModal = useOpenConnectModal();
  const tradeMode = useAppStore(selectTradeboxTradeMode);
  const { isSwap, isIncrease, isPosition, isLimit, isTrigger } = useAppStore(
    selectTradeboxTradeFlags
  );
  const focusedInput = useAppStore(selectTradeboxFocusedInput);
  const setFocusedInput = useAppStore(selectSetTradeboxFocusedInput);
  const fromTokenInputValue = useAppStore(selectTradeboxFromTokenInputValue);
  const fromToken = useAppStore(selectTradeboxFromToken);
  const setFromTokenInputValueRaw = useAppStore(
    selectSetTradeboxFromTokenInputValue
  );
  const toToken = useAppStore(selectTradeboxToToken);
  const setToTokenInputValueRaw = useAppStore(
    selectSetTradeboxToTokenInputValue
  );
  const toTokenInputValue = useAppStore(selectTradeboxToTokenInputValue);
  const collateralToken = useAppStore(selectTradeboxCollateralToken);
  const receiveTokenAddress = useAppStore(selectTradeboxReceiveTokenAddress);
  const setReceiveTokenAddress = useAppStore(
    selectSetTradeboxReceiveTokenAddress
  );
  const setTriggerPriceInputValue = useAppStore(
    selectSetTradeboxTriggerPriceInputValue
  );
  const leverageRaw = useAppStore(selectTradeboxTradeLeverage);
  const leverage = leverageRaw ? leverageRaw : DEFAULT_LEVERAGE;
  const setLeverage = useAppStore(selectSetTradeboxTradeLeverage);
  const maxLeverage = useAppStore(selectTradeboxMaxLeverage);
  const resetTradeboxInputs = useAppStore(selectResetTradeboxInputs);
  const increaseAmounts = useAppStore(selectTradeboxIncreasePositionAmounts);
  const swapAmounts = useAppStore(selectTradeboxSwapAmounts);
  const fees = useAppStore(selectTradeboxTradeFees);
  const feesType = useAppStore(selectTradeboxTradeFeesType);
  const isWrapOrUnwrap = useAppStore(selectTradeboxIsWrapOrUnwrap);
  const [isVisible, setIsVisible] = useState(false);
  const [paymentStatus, setPaymentStatus] = useState(false);
  const tokenInputValueRef = useRef('0');
  const signatureRef = useRef<string>('');

  const [isTriggerWarningAccepted, setIsTriggerWarningAccepted] =
    useState(false);
  const [competitionId, setCompetitionId] = useState('');

  let nativeTokenAmount = BN_ZERO;
  if (fromToken) {
    nativeTokenAmount =
      parseValue(fromTokenInputValue, fromToken.decimals) ?? BN_ZERO;
  }

  useTradeboxAvailablePriceImpactValues();

  const { trigger: wrapNativeToken } = useWrapNativeToken(() => {
    setFromTokenInputValue('', true);
  });

  const { trigger: unwrapNativeToken } = useUnwrapNativeToken(() => {
    setFromTokenInputValue('', true);
  });

  const { trigger: wrapToken } = useTriggerWrapToken();
  const { trigger: unwrapToken } = useTriggerUnwrapToken();

  const handleWrapOrUnwrap = useCallback(async () => {
    if (!nativeTokenAmount || !fromToken || !toToken) return;

    if (isNativeToken(fromToken.address)) {
      await wrapNativeToken(nativeTokenAmount);
    } else if (fromToken.isWrappedNative) {
      await unwrapNativeToken(undefined);
    } else if (fromToken.shouldWrap) {
      console.log('wrapping', fromToken.symbol);
      await wrapToken({
        amount: nativeTokenAmount,
        unwrappedTokenAddress: fromToken.address,
        skipPreflight: true,
      });
    } else {
      console.log('unwrapping', fromToken.symbol);
      await unwrapToken({
        amount: nativeTokenAmount,
        unwrappedTokenAddress: toToken.address,
        skipPreflight: true,
      });
    }
    resetTradeboxInputs();
  }, [
    nativeTokenAmount,
    wrapNativeToken,
    unwrapNativeToken,
    fromToken,
    resetTradeboxInputs,
  ]);

  const [handleSubmitOrder, isSending] = useHandleSubmitOrder(
    (tx: string | undefined) => {
      tokenInputValueRef.current = fromTokenInputValue || '';
      signatureRef.current = tx || '';
      setIsVisible(true);
      setPaymentStatus(true);
      setTimeout(() => {
        handleModalClose();
      }, 3000);
    },
    {
      isAddCompetition: isTriggerWarningAccepted,
      competitionId: isTriggerWarningAccepted ? competitionId : undefined,
    }
  );

  const handleSubmit = useCallback(
    (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      if (!owner) {
        openConnectWalletModal();
        return;
      }
      if (isWrapOrUnwrap) {
        void handleWrapOrUnwrap();
        return;
      }

      setIsVisible(true);
      handleSubmitOrder();
      resetTradeboxInputs();
    },
    [
      owner,
      isWrapOrUnwrap,
      handleWrapOrUnwrap,
      handleSubmitOrder,
      openConnectWalletModal,
      resetTradeboxInputs,
    ]
  );

  const handleModalClose = () => {
    setIsVisible(false);
    setPaymentStatus(false);
  };

  const [tradeboxWarningRows] = useTradeboxWarningsRows(
    priceImpactWarningState
  );
  const [triggerConsentRows] = useTriggerOrdersConsent();

  const prevIsSwap = usePrevious(isSwap);

  const setIsAcceptedRef = useLatest(priceImpactWarningState.setIsAccepted);

  const setFromTokenInputValue = useEventCallback(
    (value: string, shouldResetPriceImpactWarning: boolean) => {
      setFromTokenInputValueRaw(value);
      if (shouldResetPriceImpactWarning) {
        setIsAcceptedRef.current(false);
      }
    }
  );

  const setToTokenInputValue = useEventCallback(
    (value: string, shouldResetPriceImpactWarning: boolean) => {
      setToTokenInputValueRaw(value);
      if (shouldResetPriceImpactWarning) {
        setIsAcceptedRef.current(false);
      }
    }
  );

  useEffect(
    function updateInputAmounts() {
      if (!fromToken || !toToken || (!isSwap && !isIncrease)) {
        return;
      }

      if (isSwap !== prevIsSwap) {
        setFocusedInput('from');
        setFromTokenInputValue('', true);
        return;
      }

      if (isSwap && swapAmounts) {
        if (focusedInput === 'from') {
          setToTokenInputValue(
            swapAmounts.amountOut.gt(BN_ZERO)
              ? formatAmountFree(
                swapAmounts.amountOut,
                toToken.decimals,
                toToken.decimals
              )
              : '',
            false
          );
        } else {
          setFromTokenInputValue(
            swapAmounts.amountIn.gt(BN_ZERO)
              ? formatAmountFree(
                swapAmounts.amountIn,
                fromToken.decimals,
                fromToken.decimals
              )
              : '',
            false
          );
        }
      }

      if (isIncrease && increaseAmounts) {
        // if the focused input is 'from', we update the toToken input value
        if (focusedInput === 'from') {
          const isNoZero = increaseAmounts.indexTokenAmount.gt(BN_ZERO);
          // if the toTokenInputValue is empty or zero, we update it
          if (!toTokenInputValue && !isNoZero) return;
          const newValue = formatAmountFree(
            increaseAmounts.indexTokenAmount,
            toToken.decimals,
            toToken.decimals
          );
          // if the new value is the same as the current toTokenInputValue, we don't update it
          if (newValue == toTokenInputValue) return;
          setToTokenInputValue(isNoZero ? newValue : '', false);
        } else {
          const isNoZero = increaseAmounts.initialCollateralAmount.gt(BN_ZERO);
          // if the toTokenInputValue is empty or zero, we update it
          if (!fromTokenInputValue && !isNoZero) return;
          const newValue = formatAmountFree(
            increaseAmounts.initialCollateralAmount,
            fromToken.decimals,
            fromToken.decimals
          );
          // if the new value is the same as the current fromTokenInputValue, we don't update it
          if (newValue === fromTokenInputValue) return;
          setFromTokenInputValue(isNoZero ? newValue : '', false);
        }
      }
    },
    [
      focusedInput,
      fromToken,
      increaseAmounts,
      isIncrease,
      isSwap,
      prevIsSwap,
      setFocusedInput,
      setFromTokenInputValue,
      setToTokenInputValue,
      swapAmounts,
      toToken,
      toTokenInputValue,
      fromTokenInputValue,
    ]
  );

  useEffect(
    function resetTriggerPrice() {
      setTriggerPriceInputValue('');
    },
    [setTriggerPriceInputValue, tradeMode]
  );

  useEffect(
    function validateLeverage() {
      if (leverage && leverage.gt(maxLeverage)) {
        setLeverage(maxLeverage);
      }
    },
    [leverage, maxLeverage, setLeverage]
  );

  useEffect(() => {
    if (!receiveTokenAddress && collateralToken) {
      if (isWrappedNativeToken(collateralToken.address)) {
        setReceiveTokenAddress(NATIVE_TOKEN_ADDRESS.toBase58());
      } else {
        setReceiveTokenAddress(collateralToken.address.toBase58());
      }
    }
  }, [receiveTokenAddress, collateralToken, setReceiveTokenAddress]);

  useEffect(() => {
    !isSending && !paymentStatus && setIsVisible(false);
  }, [isSending, paymentStatus]);

  const wallet = useWallet();
  const { connected, publicKey } = wallet;
  // const isMobile = useMedia('(max-width: 1200px)');
  // const isSmallMobile = useMedia('(max-width: 450px)');

  const onCompetitionSelect = useCallback((competitionId: string | null) => {
    console.log('competitionId', competitionId);
    setCompetitionId(competitionId || '');
    setIsTriggerWarningAccepted(!!competitionId);
  }, []);

  return (
    <>
      <form onSubmit={handleSubmit} className="p-[1.2rem] pt-0">
        {(isSwap || isIncrease) && (
          <RenderTokenInputs
            priceImpactWarningState={priceImpactWarningState}
          />
        )}
        {isTrigger && <RenderDecreaseSizeInput />}
        {isSwap && isLimit && <RenderTriggerRatioInput />}
        {isPosition && (isLimit || isTrigger) && <RenderTriggerPriceInput />}

        <ExchangeInfo
          className="SwapBox-info-section"
          dividerClassName="App-card-divider"
        >
          {isWrapOrUnwrap && fromToken && fromToken.isWrappedNative && (
            <RenderUnwrapWarning />
          )}

          <ExchangeInfo.Group>
            {isPosition && <RenderPositionControls />}
          </ExchangeInfo.Group>

          {!isWrapOrUnwrap && (
            <ExchangeInfo.Group>
              <TradeFeesRow {...fees} feesType={feesType} />
              {!isSwap && <GtRewardsRow {...fees} />}
              {!isSwap && connected && publicKey && (
                <div className="competition">
                  <div className="App-card-divider"></div>
                  <div>
                    <SelectCompetition
                      onCompetitionSelect={onCompetitionSelect}
                    />
                  </div>
                </div>
              )}
            </ExchangeInfo.Group>
          )}

          {tradeboxWarningRows && (
            <ExchangeInfo.Group>{tradeboxWarningRows}</ExchangeInfo.Group>
          )}
          {triggerConsentRows && (
            <ExchangeInfo.Group>{triggerConsentRows}</ExchangeInfo.Group>
          )}
        </ExchangeInfo>

        <TradeboxSubmitButton
          priceImpactWarningState={priceImpactWarningState}
          isSending={isSending}
        />
      </form>
    </>
  );
}

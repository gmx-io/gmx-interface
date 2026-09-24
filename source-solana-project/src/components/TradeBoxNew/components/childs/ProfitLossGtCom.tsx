import { getGmw340Enabled, getGmw215Enabled, getGmw399Enabled, getGmw402Enabled } from '@/config/featureFlagEnable';
import { useState, memo, useRef, useEffect, type RefObject } from 'react';

import { useAppStore } from '@/zustand/useAppStore';
import tooltipIconPng from '@/components/ExchangeNew/assets/icons/tooltip.png';
import ToggleSwitch from '@/components/Common/ToggleSwitch/ToggleSwitch';
import TooltipWithPortal from '@/components/Common/Tooltip/TooltipWithPortal';
import { BN } from '@coral-xyz/anchor';
import CountPanel from './tokensPanel/countPanel';
import { GMX_SOLANA_TOKENS_RAW } from '@/config/program';
import { NumberInput } from '@/components/Common/Input/NumberInput';
import {
  formatAmount,
} from '@/utils/legacy/format';
import { getPriceDecimals } from '@/utils/legacy/common';
import { formatInput } from '../../utils/formatInput';
import { getMarketPriceInputDecimals } from '@/utils/priceInput/getMarketPriceInputDecimals';
import { GMX_SOLANA_STORE_ADDRESS } from '@/config/program';
import { useStoreAccount } from '@/hooks/fetchHooks/useStoreAccount';
import { t, Trans } from '@lingui/macro';
import { useShallow } from 'zustand/react/shallow';
import { USD_DECIMALS } from '@/config/constants';
import { useTpslCalculator } from '@/components/TradeBoxNew/Hooks/useTradeBoxLogic/useTpslCalculator';
import { selectUserOrderFeeDiscountFactor } from '@/selectors/referral/selectUserOrderFeeDiscountFactor';
import NewGainLossDisplay from './newGainLossDisplay';

const COMPACT_TOLERANCE_PX = 25;

function getMarketPriceDecimalPlaces(
  indexTokenPrice?: BN | number | string | null
): number | null {
  if (!indexTokenPrice) {
    return null;
  }

  const currentMarketPrice = new BN(indexTokenPrice);
  if (currentMarketPrice.lte(new BN(0))) {
    return null;
  }

  return getPriceDecimals(currentMarketPrice);
}

function limitDecimalPlaces(value: string, maxDecimalPlaces: number | null) {
  if (maxDecimalPlaces === null) {
    return value;
  }
  if (!value.includes('.')) {
    return value;
  }
  const [integerPart, decimalPart = ''] = value.split('.');
  if (maxDecimalPlaces <= 0) {
    return integerPart;
  }
  return `${integerPart}.${decimalPart.slice(0, maxDecimalPlaces)}`;
}

function removeLeadingSign(value?: string) {
  if (!value) return value;
  return value.replace(/^[+-]/, '');
}

function ProfitLossGtCom() {
  const isGmw215Enabled = getGmw215Enabled();
  const isGmw340Enabled = getGmw340Enabled();
  const isGmw402Enabled = getGmw402Enabled();
  useTpslCalculator();
  const [keepTpSl, setKeepTpSl] = useState(false);
  const {
    limitPrice,
    marketType,
    simulationData,
    marketDirection,
  } = useAppStore(useShallow((state) => state.TradeboxNew));
  const {
    indexToken,
    indexTokenData,
  } = useAppStore(useShallow((state) => state.indexTokens));
  const {
    setEnableTpsl,
    tpsl,
    setTpPrice,
    setSlPrice,
    tpPrice,
    slPrice,
  } = useAppStore(useShallow((state) => state.tpSlTokens));
  const {
    userOrderFeeVipDiscountFactor,
    userOrderFeeReferralDiscountFactor,
  } = useAppStore(selectUserOrderFeeDiscountFactor);
  const { store } = useStoreAccount(GMX_SOLANA_STORE_ADDRESS);
  const mintingCost = store?.gt?.mintingCost;
  const gtDecimals = store?.gt?.decimals;
  const [takeProfitPrice, setTakeProfitPrice] = useState('0.00');
  const [stopLossPrice, setStopLossPrice] = useState('0.00');
  const [paidBorrowingFee, setPaidBorrowingFee] = useState(new BN(0));
  const [isTpInputFocused, setIsTpInputFocused] = useState(false);
  const [isSlInputFocused, setIsSlInputFocused] = useState(false);
  const [showTpCountPanel, setShowTpCountPanel] = useState(false);
  const [showSlCountPanel, setShowSlCountPanel] = useState(false);
  const takeProfitRef = useRef<HTMLDivElement>(null);
  const stopLossRef = useRef<HTMLDivElement>(null);
  const tpGainInputRef = useRef<HTMLDivElement>(null);
  const tpGainPrefixRef = useRef<HTMLSpanElement>(null);
  const tpGainMeasureRef = useRef<HTMLSpanElement>(null);
  const slGainInputRef = useRef<HTMLDivElement>(null);
  const slGainPrefixRef = useRef<HTMLSpanElement>(null);
  const slGainMeasureRef = useRef<HTMLSpanElement>(null);
  const [tpNeedTooltip, setTpNeedTooltip] = useState(false);
  const [slNeedTooltip, setSlNeedTooltip] = useState(false);
  const indexTokenDecimals = GMX_SOLANA_TOKENS_RAW[indexToken]?.decimals ?? 0;
  const priceDecimals = USD_DECIMALS - indexTokenDecimals;
  const marketPriceInputDecimals = getMarketPriceInputDecimals(
    indexTokenData?.price,
    indexToken
  );
  const legacyMarketPriceDecimals = getMarketPriceDecimalPlaces(
    indexTokenData?.price
  );
  const priceInputDecimalPlaces = isGmw402Enabled
    ? marketPriceInputDecimals
    : isGmw340Enabled
      ? priceDecimals
      : undefined;

  useEffect(() => {
    if (
      getGmw399Enabled()
        ? !simulationData || !Object.keys(simulationData).length
        : !Object.keys(simulationData).length
    ) {
      setPaidBorrowingFee(new BN(0));
      return
    }
    const closeOrOpenFeeValue = simulationData?.reportData?.fees?.order?.fee_value || new BN(0);
    const vipFeeValue = closeOrOpenFeeValue?.mul(userOrderFeeVipDiscountFactor)?.div(new BN(10).pow(new BN(20)))
    const referralFeeValue = closeOrOpenFeeValue?.mul(userOrderFeeReferralDiscountFactor)?.div(new BN(10).pow(new BN(20)))
    const paidBorrowingFee = simulationData?.reportData?.fees?.paid_order_and_borrowing_fee_value?.sub(vipFeeValue)?.sub(referralFeeValue);
    setPaidBorrowingFee(paidBorrowingFee);
  }, [simulationData]);

  useEffect(() => {
    if (isTpInputFocused) {
      return;
    }
    if (tpPrice) {
      const decimals = 20 - GMX_SOLANA_TOKENS_RAW[indexToken]?.decimals;
      const useMarketDecimals =
        isGmw402Enabled && marketPriceInputDecimals !== undefined;
      const value = formatAmount(
        tpPrice,
        decimals,
        useMarketDecimals ? marketPriceInputDecimals : decimals,
        false,
        !useMarketDecimals
      );
      setTakeProfitPrice(value !== '0' ? value : '');
    } else {
      setTakeProfitPrice('');
    }
  }, [
    tpPrice,
    isTpInputFocused,
    indexToken,
    isGmw402Enabled,
    marketPriceInputDecimals,
  ]);

  useEffect(() => {
    if (isSlInputFocused) {
      return;
    }
    if (slPrice) {
      const decimals = 20 - GMX_SOLANA_TOKENS_RAW[indexToken]?.decimals;
      const useMarketDecimals =
        isGmw402Enabled && marketPriceInputDecimals !== undefined;
      const value = formatAmount(
        slPrice,
        decimals,
        useMarketDecimals ? marketPriceInputDecimals : decimals,
        false,
        !useMarketDecimals
      );
      setStopLossPrice(value !== '0' ? value : '');
    } else {
      setStopLossPrice('');
    }
  }, [
    slPrice,
    isSlInputFocused,
    indexToken,
    isGmw402Enabled,
    marketPriceInputDecimals,
  ]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        takeProfitRef.current &&
        !takeProfitRef.current.contains(event.target as Node)
      ) {
      }
      if (
        stopLossRef.current &&
        !stopLossRef.current.contains(event.target as Node)
      ) {
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // change take profit price
  const changeTakeProfitPrice = (e: React.ChangeEvent<HTMLInputElement>) => {
    const inputValue = e.target.value;
    const maxDecimalPlaces = isGmw402Enabled
      ? marketPriceInputDecimals
      : legacyMarketPriceDecimals;
    const value = isGmw215Enabled || isGmw402Enabled
      ? limitDecimalPlaces(inputValue, maxDecimalPlaces ?? null)
      : inputValue;
    if (!value) {
      setShowTpCountPanel(false);
      setTpPrice(null);
    }
    setTakeProfitPrice(value);
    const formattedValue = formatInput(value, isGmw340Enabled ? priceDecimals : 20);
    if (formattedValue && formattedValue.gt(new BN(0))) {
      const formattedValueUsd = isGmw340Enabled
        ? formattedValue.mul(new BN(10).pow(new BN(indexTokenDecimals)))
        : formattedValue;
      const isLong = marketDirection === 'Long';
      const isLimit = marketType === 'Limit';
      let indexTokenPrice = new BN(0);
      if (isLimit) {
        indexTokenPrice = limitPrice.mul(new BN(10).pow(new BN(indexTokenDecimals)));
      } else {
        indexTokenPrice = new BN(indexTokenData?.price);
      }
      if (isLong) {
        if (formattedValueUsd.lt(indexTokenPrice)) {
          setShowTpCountPanel(true);
          setTpPrice(null);
        } else {
          setShowTpCountPanel(false);
          const price = isGmw340Enabled
            ? formattedValue
            : new BN(formattedValue.toString())?.div(
              new BN(10).pow(new BN(GMX_SOLANA_TOKENS_RAW[indexToken].decimals))
            );
          setTpPrice(price);
        }
      } else {
        if (formattedValueUsd.gt(indexTokenPrice)) {
          setShowTpCountPanel(true);
          setTpPrice(null);
        } else {
          setShowTpCountPanel(false);
          const price = isGmw340Enabled
            ? formattedValue
            : new BN(formattedValue.toString())?.div(
              new BN(10).pow(new BN(GMX_SOLANA_TOKENS_RAW[indexToken].decimals))
            );
          setTpPrice(price);
        }
      }

    }
  };

  // change stop loss price
  const changeStopLossLoss = (e: React.ChangeEvent<HTMLInputElement>) => {
    const inputValue = e.target.value;
    const maxDecimalPlaces = isGmw402Enabled
      ? marketPriceInputDecimals
      : legacyMarketPriceDecimals;
    const value = isGmw215Enabled || isGmw402Enabled
      ? limitDecimalPlaces(inputValue, maxDecimalPlaces ?? null)
      : inputValue;
    if (!value) {
      setShowSlCountPanel(false);
      setSlPrice(null);
    }
    setStopLossPrice(value);
    const formattedValue = formatInput(value, isGmw340Enabled ? priceDecimals : 20);
    if (formattedValue && formattedValue.gt(new BN(0))) {
      const formattedValueUsd = isGmw340Enabled
        ? formattedValue.mul(new BN(10).pow(new BN(indexTokenDecimals)))
        : formattedValue;
      const isLong = marketDirection === 'Long';
      const isLimit = marketType === 'Limit';
      let indexTokenPrice = new BN(0);
      if (isLimit) {
        indexTokenPrice = limitPrice.mul(new BN(10).pow(new BN(indexTokenDecimals)));
      } else {
        indexTokenPrice = new BN(indexTokenData?.price);
      }
      if (isLong) {
        if (formattedValueUsd.gt(indexTokenPrice)) {
          setShowSlCountPanel(true);
          setSlPrice(null);
        } else {
          setShowSlCountPanel(false);
          const price = isGmw340Enabled
            ? formattedValue
            : new BN(formattedValue.toString())?.div(
              new BN(10).pow(new BN(GMX_SOLANA_TOKENS_RAW[indexToken].decimals))
            );
          setSlPrice(price);
        }
      } else {
        if (formattedValueUsd.lt(indexTokenPrice)) {
          setShowSlCountPanel(true);
          setSlPrice(null);
        } else {
          setShowSlCountPanel(false);
          const price = isGmw340Enabled
            ? formattedValue
            : new BN(formattedValue.toString())?.div(
              new BN(10).pow(new BN(GMX_SOLANA_TOKENS_RAW[indexToken].decimals))
            );
          setSlPrice(price);
        }
      }

    }
  };

  const tpDisplayMoney = removeLeadingSign(tpsl?.tpGainMoney) || '';
  const tpFullRate = removeLeadingSign(tpsl?.tpGainRate) || '';
  const slDisplayMoney = removeLeadingSign(tpsl?.slLossMoney) || '';
  const slFullRate = removeLeadingSign(tpsl?.slLossRate) || '';
  const tpDisplayRate = tpNeedTooltip ? '…' : tpFullRate;
  const slDisplayRate = slNeedTooltip ? '…' : slFullRate;

  useEffect(() => {
    if (!isGmw215Enabled || !keepTpSl) {
      setTpNeedTooltip(false);
      setSlNeedTooltip(false);
      return;
    }

    const shouldCompact = (
      gainInputRef: RefObject<HTMLDivElement>,
      prefixRef: RefObject<HTMLSpanElement>,
      measureRef: RefObject<HTMLSpanElement>
    ) => {
      const gainInputWidth = gainInputRef.current?.clientWidth ?? 0;
      const prefixWidth = prefixRef.current?.offsetWidth ?? 0;
      const valueWidth = measureRef.current?.scrollWidth ?? 0;
      if (!gainInputWidth) {
        return false;
      }
      return prefixWidth + valueWidth > gainInputWidth - COMPACT_TOLERANCE_PX;
    };

    const updateCompactState = () => {
      setTpNeedTooltip(shouldCompact(tpGainInputRef, tpGainPrefixRef, tpGainMeasureRef));
      setSlNeedTooltip(shouldCompact(slGainInputRef, slGainPrefixRef, slGainMeasureRef));
    };

    let frameId = 0;
    const scheduleUpdateCompactState = () => {
      if (frameId) {
        cancelAnimationFrame(frameId);
      }
      frameId = requestAnimationFrame(() => {
        updateCompactState();
      });
    };

    scheduleUpdateCompactState();
    window.addEventListener('resize', scheduleUpdateCompactState);
    return () => {
      if (frameId) {
        cancelAnimationFrame(frameId);
      }
      window.removeEventListener('resize', scheduleUpdateCompactState);
    };
  }, [isGmw215Enabled, keepTpSl, tpDisplayMoney, tpFullRate, slDisplayMoney, slFullRate]);

  return (
    <div className="tradeBox-exchangeForm-profitLossGtCom profitLossGtCom">
      <div className="profitLoss flexAlignCenter">
        <label className="profitLoss-label flexAlignCenter">
          {t`Take Profit / Stop Loss`}
          <TooltipWithPortal
            className="TradeFeesRow-tooltip"
            handle={
              <img
                src={tooltipIconPng}
                alt=""
                className="typeOptions-setting-info positive"
                style={{ position: 'relative', top: '-0.1rem' }}
              />
            }
            position="bottom"
            renderContent={() => (
              <div>
                <p>
                  {t`Create basic TP/SL orders that fully close your position. For advanced TP/SL setup, use the positions list after opening a position.`}
                </p>
              </div>
            )}
          />
        </label>
        <ToggleSwitch
          isChecked={keepTpSl}
          setIsChecked={(checked) => {
            setKeepTpSl(checked);
            setEnableTpsl(checked);
            setTpPrice(null);
            setSlPrice(null);
          }}
        />
      </div>

      {keepTpSl && (
        <div className="profit-loss-inputs">
          <div className="input-group">
            <div className="input-row">
              <div className="input-container">
                <div className={`price-input ${isTpInputFocused ? 'focused' : ''}`}>
                  <CountPanel
                    amount={marketDirection === 'Long' ? t`Trigger price below mark price` : t`Trigger price above mark price`}
                    showCountPanel={showTpCountPanel}
                    onClose={() => setShowTpCountPanel(false)}
                  />
                  <span className="input-prefix">{t`TP Price`}</span>
                  <NumberInput
                    value={takeProfitPrice}
                    className="price-input-field item-input h-[2.8rem] w-full bg-transparent px-[0] py-[0.2rem] text-[1.6rem] placeholder-[#A3A3A3] outline-none"
                    onValueChange={changeTakeProfitPrice}
                    decimalPlaces={priceInputDecimalPlaces}
                    onFocus={() => setIsTpInputFocused(true)}
                    onBlur={() => setIsTpInputFocused(false)}
                    placeholder="0.00"
                  />
                </div>
                {isGmw215Enabled ? (
                  <NewGainLossDisplay
                    label={t`Gain`}
                    rawMoney={tpsl?.tpGainMoney}
                    rawRate={tpsl?.tpGainRate}
                    displayMoney={tpDisplayMoney}
                    displayRate={tpDisplayRate}
                    fullRate={tpFullRate}
                    needTooltip={tpNeedTooltip}
                    gainInputRef={tpGainInputRef}
                    prefixRef={tpGainPrefixRef}
                    measureRef={tpGainMeasureRef}
                  />
                ) : (
                  <div className="gain-input">
                    <span className="input-prefix">{t`Gain`}</span>
                    <div
                      className={`gain-input-wrapper ${tpsl?.tpGainMoney === '$0.00' || !tpsl?.tpGainRate
                        ? ''
                        : tpsl?.tpGainMoney?.startsWith('-')
                          ? 'redStyle'
                          : 'greenStyle'
                        }`}
                      style={
                        tpsl?.tpGainMoney === '$0.00' || !tpsl?.tpGainRate
                          ? { color: '#A3A3A3' }
                          : {}
                      }
                    >
                      {tpsl?.tpGainMoney !== '$0.00' && tpsl?.tpGainRate ? tpsl?.tpGainMoney : ''}
                      {tpsl?.tpGainMoney !== '$0.00' && tpsl?.tpGainRate ? `(${tpsl?.tpGainRate})` : '-'}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="input-group">
            <div className="input-row">
              <div className="input-container">
                <div className={`price-input ${isSlInputFocused ? 'focused' : ''}`}>
                  <CountPanel
                    amount={marketDirection === 'Long' ? t`Trigger price above mark price` : t`Trigger price below mark price`}
                    showCountPanel={showSlCountPanel}
                    onClose={() => setShowSlCountPanel(false)}
                  />
                  <span className="input-prefix">{t`SL Price`}</span>
                  <NumberInput
                    value={stopLossPrice}
                    className="price-input-field item-input h-[2.8rem] w-full bg-transparent px-[0] py-[0.2rem] text-[1.6rem] placeholder-[#A3A3A3] outline-none"
                    onValueChange={changeStopLossLoss}
                    decimalPlaces={priceInputDecimalPlaces}
                    onFocus={() => setIsSlInputFocused(true)}
                    onBlur={() => setIsSlInputFocused(false)}
                    placeholder="0.00"
                  />
                </div>
                {isGmw215Enabled ? (
                  <NewGainLossDisplay
                    label={t`Loss`}
                    rawMoney={tpsl?.slLossMoney}
                    rawRate={tpsl?.slLossRate}
                    displayMoney={slDisplayMoney}
                    displayRate={slDisplayRate}
                    fullRate={slFullRate}
                    needTooltip={slNeedTooltip}
                    gainInputRef={slGainInputRef}
                    prefixRef={slGainPrefixRef}
                    measureRef={slGainMeasureRef}
                  />
                ) : (
                  <div className="gain-input">
                    <span className="input-prefix">{t`Loss`}</span>
                    <div
                      className={`gain-input-wrapper ${tpsl?.slLossMoney === '$0.00' || !tpsl?.slLossRate
                        ? ''
                        : tpsl?.slLossMoney?.startsWith('-')
                          ? 'redStyle'
                          : 'greenStyle'
                        }`}
                      style={
                        tpsl?.slLossMoney === '$0.00' || !tpsl?.slLossRate
                          ? { color: '#A3A3A3' }
                          : {}
                      }
                    >
                      {tpsl?.slLossMoney !== '$0.00' && tpsl?.slLossRate ? tpsl?.slLossMoney : ''}
                      {tpsl?.slLossMoney !== '$0.00' && tpsl?.slLossRate ? `(${tpsl?.slLossRate})` : '-'}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="GtRewards flexAlignCenter">
        <label className="GtRewards-label">
          <Trans>GT Rewards</Trans>
        </label>
        <span>
          <span className="gt-token-amount">
            +{mintingCost ? formatAmount(paidBorrowingFee?.div(mintingCost)?.abs(), gtDecimals, 2) : 0.00} GT

          </span>
          (${formatAmount(paidBorrowingFee?.abs(), USD_DECIMALS, 2)})
        </span>
      </div>
    </div>
  );
}

export default memo(ProfitLossGtCom);

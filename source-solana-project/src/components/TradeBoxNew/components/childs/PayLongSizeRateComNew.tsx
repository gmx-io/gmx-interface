/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unsafe-return */

import { memo, useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { getGmw340Enabled, getGmw374Enabled, getGmw402Enabled, getGmw440Enabled } from '@/config/featureFlagEnable';
import { BN_10, USD_DECIMALS, SLIDER_MARKS } from '@/config/constants';
import { useAppStore } from '@/zustand/useAppStore';
import { useShallow } from 'zustand/react/shallow';
import { BN } from '@coral-xyz/anchor';
import Slider from 'rc-slider';
import { NumberInput } from '@/components/Common/Input/NumberInput';
import { GMX_SOLANA_TOKENS_RAW, GMX_SOLANA_FOREX_PRECISION_MARKET_TOKENS } from '@/config/program';
import {
  formatAmount,
  formatAmountFree,
  formatPriceUsd
} from '@/utils/legacy/format';
import { formatInput } from '../../utils/formatInput';
import { getMarketPriceInputDecimals } from '@/utils/priceInput/getMarketPriceInputDecimals';
import { formatLeverage } from '../../utils/formatLeverage';
import TokenSelectDrawer from './TokenSelectDrawer';
import IconChevronDown from '@/img/trade/chevron-down.svg?react';
import IconArrowTransfer from '@/img/trade/arrow-transfer.svg?react';
import { t } from '@lingui/macro';
import { formatDisplayGmxSymbol } from '@/components/TradeBoxNew/utils/formatGmxSymbol';
import { getMarketDefaultLeverage } from '@/components/TradeBoxNew/utils/getMarketDefaultLeverage';
import { onTokenSelect } from '@/utils/events/tokenSelectEvent';
import { useLocation, useNavigate } from 'react-router-dom';
import { selectIndexMarket } from '@/utils/market/selectIndexMarket';
import './profitLossGtCom.scss';
import 'rc-slider/assets/index.css';

type SizeDisplayMode = 'usd' | 'token';

interface PayerSwapTokenInfo {
  tokenName: string;
  amount: string;
  value: string;
  tokenAddress: string;
  minPrice: BN;
  maxPrice: BN;
  decimals: number;
  defaultMaxTradeMoney: string;
  indexToken?: string;
}

interface IndexToken {
  symbol: string;
  price: number;
  volume24h: number;
  maxLeverage?: string;
  [key: string]: any;
}

function PayLongSizeRateComNew() {
  const navigate = useNavigate();
  const location = useLocation();
  const isGmw340Enabled = getGmw340Enabled();
  const isGmw402Enabled = getGmw402Enabled();
  const {
    setSizeNumber,
    setLeverage,
    payTokenNum,
    leverage,
    sizeNumber,
    setPayTokenNum,
    setTradeMoney,
    marketType,
    setLimitPrice,
    marketDirection,
    setBtnMessage,
    setBtnDisabled,
    limitPrice,
    isForbiddenTrade,
    setForbiddenTrade,
  } = useAppStore(
    useShallow((state) => ({
      ...state.TradeboxNew,
    }))
  );
  const {
    payerSwapList,
    payerSwapTokenInfo,
    setHasPayTokenChange,
    setPayerSwapTokenInfo,
  } = useAppStore(useShallow((state) => state.payerSwapTokens));
  const {
    indexToken,
    indexTokenData,
    sortedIndexTokens,
  } = useAppStore((state) => state.indexTokens);
  const { marketInfo } = useAppStore(useShallow((state) => state.markets));
  const { positionInfo } = useAppStore(
    useShallow((state) => state.positionState)
  );
  const { setTpPrice, setSlPrice, setTpsl } = useAppStore(
    useShallow((state) => state.tpSlTokens)
  );
  const {
    setHasCollateralChange,
  } = useAppStore(useShallow((state) => state.collateralTokens));
  const [scaleInputValue, setScaleInputValue] = useState(0);
  const [sizeDisplayMode, setSizeDisplayMode] = useState<SizeDisplayMode>('usd');
  const { tokenPriceMap } = useAppStore(
    useShallow((state) => ({
      tokenPriceMap: state.tickersState.tokenPriceMap,
    }))
  );
  const lastTokenPriceMapRef = useRef(new Map<string, any>());
  const getStableTokenPrice = useCallback(
    (tokenAddress?: string) => {
      if (!tokenAddress) return undefined;
      const tokenPrice = tokenPriceMap.get(tokenAddress);
      if (tokenPrice) {
        lastTokenPriceMapRef.current.set(tokenAddress, tokenPrice);
        return tokenPrice;
      }
      return lastTokenPriceMapRef.current.get(tokenAddress);
    },
    [tokenPriceMap]
  );
  const payTokenAmount = useMemo(
    () => new BN(payerSwapTokenInfo?.amount || 0),
    [payerSwapTokenInfo?.amount]
  );
  const payTokenPrice = useMemo(
    () =>
      new BN(
        getStableTokenPrice(payerSwapTokenInfo?.tokenAddress)?.minUnitPrice ||
        0
      ),
    [getStableTokenPrice, payerSwapTokenInfo?.tokenAddress]
  );
  const defaultMaxTradeMoney = useMemo(
    () =>
      payTokenAmount
        .mul(payTokenPrice)
        .mul(formatLeverage(leverage))
        .div(new BN(10)),
    [payTokenAmount, payTokenPrice, leverage]
  );
  const indexTokenPrice = useMemo(
    () =>
      marketType === 'Limit'
        ? limitPrice
          ? limitPrice
          : new BN(getStableTokenPrice(indexToken)?.unitPrice || 0)
        : new BN(getStableTokenPrice(indexToken)?.unitPrice || 0),
    [getStableTokenPrice, indexToken, limitPrice, marketType]
  );
  const payTokenInitNum = useMemo(
    () => new BN(payerSwapTokenInfo?.amount || 0),
    [payerSwapTokenInfo?.amount]
  );
  const previousPayTokenBalanceRef = useRef(payTokenInitNum);
  const isLong = marketDirection === 'Long';
  const formatLeverageBN = useMemo(() => formatInput(leverage, 1), [leverage]);
  const indexTokenDecimals = useMemo(
    () => GMX_SOLANA_TOKENS_RAW[indexToken || '']?.decimals || 8,
    [indexToken]
  );
  const payTokenDecimals = payerSwapTokenInfo?.decimals ?? 6;
  const priceDecimals = USD_DECIMALS - indexTokenDecimals;
  const marketPriceInputDecimals = getMarketPriceInputDecimals(
    getStableTokenPrice(indexToken)?.price,
    indexToken
  );
  const limitPriceDecimalPlaces = isGmw402Enabled
    ? marketPriceInputDecimals
    : isGmw340Enabled
      ? priceDecimals
      : undefined;
  const payTokenInputDecimals = isGmw340Enabled ? payTokenDecimals : payerSwapTokenInfo?.decimals;
  const sizeInputDecimals = isGmw340Enabled ? indexTokenDecimals : GMX_SOLANA_TOKENS_RAW[indexTokenData?.indexToken]?.decimals;
  const sizeUsdInputDecimals = 2;
  const limitPriceInputDecimals = isGmw340Enabled ? priceDecimals : 20 - indexTokenDecimals;

  useEffect(() => {
    const previousBalance = previousPayTokenBalanceRef.current;
    previousPayTokenBalanceRef.current = payTokenInitNum;
    if (previousBalance.eq(payTokenInitNum) || scaleInputValue <= 0 || payTokenInitNum.isZero() || payTokenPrice.isZero()) return;
    const nextPayTokenNum = payTokenInitNum.mul(new BN(scaleInputValue)).div(new BN(100));
    const nextAllMoney = nextPayTokenNum.mul(payTokenPrice).div(new BN(10)).mul(formatLeverageBN);
    setPayTokenNum(nextPayTokenNum);
    setPayTokenInput(formatAmount(nextPayTokenNum, payTokenDecimals, payTokenDecimals));
    setAllMoney(nextAllMoney);
    setTradeMoney(nextAllMoney);
    if (indexTokenPrice.gt(new BN(0))) {
      const nextSizeNumber = nextAllMoney.div(indexTokenPrice);
      setSizeNumber(nextSizeNumber);
      skipSizeInputSyncRef.current = true;
      setSizeInputValue(formatSizeInputFromUsd(nextAllMoney));
    }
    void validatePayTokenChange(nextAllMoney, nextPayTokenNum);
  }, [payTokenInitNum, payTokenPrice, formatLeverageBN, scaleInputValue, indexTokenPrice]);
  const lpBn = isLong
    ? new BN(marketInfo?.lpLong)
    : new BN(marketInfo?.lpShort);
  const payTokenBalanceDisplay = useMemo(() => {
    const amount = new BN(payerSwapTokenInfo?.amount || 0);
    if (amount.isZero()) {
      return '0';
    }
    return formatAmountFree(amount, payTokenDecimals, payTokenDecimals);
  }, [payerSwapTokenInfo?.amount, payTokenDecimals]);
  const payTokenSymbol =
    payerSwapTokenInfo?.tokenName === 'WGMX' ? 'GMX' : payerSwapTokenInfo?.tokenName;
  const indexTokenDisplaySymbol =
    GMX_SOLANA_TOKENS_RAW[indexToken]?.displaySymbol ||
    GMX_SOLANA_TOKENS_RAW[indexToken]?.symbol;
  const [isPayTokenChange, setIsPayTokenChange] = useState(false);
  const [isSizeChange, setIsSizeChange] = useState(false);
  const [isPayInputFocused, setIsPayInputFocused] = useState(false);
  const [isSizeInputFocused, setIsSizeInputFocused] = useState(false);
  const [isLimitInputFocused, setIsLimitInputFocused] = useState(false);
  const [allMoney, setAllMoney] = useState(new BN(0));
  const [payTokenInput, setPayTokenInput] = useState('');
  const [sizeInputValue, setSizeInputValue] = useState('');
  const [priceInputValue, setPriceInputValue] = useState('');
  const [tokenSelectTitle, setTokenSelectTitle] = useState<string>('Pay');
  const [selectType, setSelectType] = useState<string>('pay');
  const [isPanelOpen, setIsPanelOpen] = useState(false);
  const skipAllMoneyEffectRef = useRef(false);
  const skipPayTokenInputSyncRef = useRef(false);
  const skipSizeInputSyncRef = useRef(false);
  const sliderContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = sliderContainerRef.current;
    if (!el) return;

    const preventSwipeBack = (event: TouchEvent) => {
      if (event.cancelable) {
        event.preventDefault();
      }
    };

    el.addEventListener('touchmove', preventSwipeBack, {
      passive: false,
      capture: true,
    });
    return () => {
      el.removeEventListener('touchmove', preventSwipeBack, true);
    };
  }, []);

  // After an order is submitted, the wallet balance changes while the slider
  // percentage is intentionally preserved. Recalculate the margin from the
  // new balance so it does not keep displaying the amount used by the order.
  useEffect(() => {
    const previousBalance = previousPayTokenBalanceRef.current;
    previousPayTokenBalanceRef.current = payTokenInitNum;
    if (
      previousBalance.eq(payTokenInitNum) ||
      scaleInputValue <= 0 ||
      payTokenInitNum.isZero() ||
      payTokenPrice.isZero()
    ) {
      return;
    }

    const nextPayTokenNum = payTokenInitNum
      .mul(new BN(scaleInputValue))
      .div(new BN(100));
    const nextAllMoney = nextPayTokenNum
      .mul(payTokenPrice)
      .div(new BN(10))
      .mul(formatLeverageBN);
    setPayTokenNum(nextPayTokenNum);
    setPayTokenInput(
      formatAmount(
        nextPayTokenNum,
        payerSwapTokenInfo?.decimals || 6,
        payerSwapTokenInfo?.decimals
      )
    );
    setAllMoney(nextAllMoney);
    setTradeMoney(nextAllMoney);
    if (indexTokenPrice.gt(new BN(0))) {
      const nextSizeNumber = nextAllMoney.div(indexTokenPrice);
      setSizeNumber(nextSizeNumber);
      skipSizeInputSyncRef.current = true;
      setSizeInputValue(formatSizeInputFromUsd(nextAllMoney));
    }
  }, [payTokenInitNum, payTokenPrice, formatLeverageBN, scaleInputValue, indexTokenPrice]);

  const formatSizeInputFromUsd = useCallback(
    (usdAmount: BN, mode: SizeDisplayMode = sizeDisplayMode) => {
      if (!usdAmount || usdAmount.isZero()) {
        return '';
      }
      if (mode === 'usd') {
        const formatted = formatAmount(usdAmount, USD_DECIMALS, sizeUsdInputDecimals);
        return formatted !== '0' ? formatted : '';
      }
      if (indexTokenPrice.isZero()) {
        return '';
      }
      const tokenAmount = usdAmount.div(indexTokenPrice);
      const formatted = formatAmount(
        tokenAmount,
        indexTokenDecimals,
        indexTokenDecimals
      );
      return formatted !== '0' ? formatted : '';
    },
    [indexTokenDecimals, indexTokenPrice, sizeDisplayMode, sizeUsdInputDecimals]
  );

  // change allMoney
  useEffect(() => {
    if (allMoney === null) return;
    if (skipAllMoneyEffectRef.current) {
      skipAllMoneyEffectRef.current = false;
      return;
    }
    setTradeMoney(allMoney);
    if (marketType === 'Limit') {
      if (payTokenNum?.eq(new BN(0))) {
        setBtnDisabled(true);
        setBtnMessage(t`Enter an amount`);
        return;
      }
      void validatePayTokenChange(allMoney, payTokenNum, payerSwapTokenInfo);
    }
  }, [allMoney, payTokenNum]);

  // change payTokenNumber
  useEffect(() => {
    if (payTokenInput === null) return;
    if (skipPayTokenInputSyncRef.current) {
      skipPayTokenInputSyncRef.current = false;
      return;
    }
    // const handler = setTimeout(() => {
    const amount = formatInput(payTokenInput, payTokenInputDecimals);
    setPayTokenNum(amount);
    // }, 50);
  }, [payTokenInput, payTokenInputDecimals]);

  // change sizeNumber
  useEffect(() => {
    if (sizeInputValue === null) return;
    if (skipSizeInputSyncRef.current) {
      skipSizeInputSyncRef.current = false;
      return;
    }
    const handler = setTimeout(() => {
      if (sizeDisplayMode === 'usd') {
        const usdAmount = formatInput(sizeInputValue, USD_DECIMALS);
        const tokenAmount = indexTokenPrice.gt(new BN(0))
          ? usdAmount.div(indexTokenPrice)
          : new BN(0);
        setSizeNumber(tokenAmount);
      } else {
        const amount = formatInput(sizeInputValue, sizeInputDecimals);
        setSizeNumber(amount);
      }
    }, 50);

    return () => {
      clearTimeout(handler);
    };
  }, [sizeInputValue, sizeInputDecimals, sizeDisplayMode, indexTokenPrice]);

  // USA Market set
  useEffect(() => {
    if (marketInfo?.closed) {
      setBtnDisabled(true);
      setForbiddenTrade(true);
      return;
    } else {
      setForbiddenTrade(false);
      void validateSizeChange(allMoney, payTokenNum, false);
    }
  }, [marketInfo, indexToken]);

  // calc sizeNumber payTokenNum online
  useEffect(() => {
    if (getGmw440Enabled()) {
      // Unidirectional: price refresh only updates size from pay, never reverse-overwrites margin.
      void payTokenChangeCalcFn(payTokenNum);
      const nextAllMoney = (payTokenNum || new BN(0))
        .mul(payTokenPrice)
        .div(new BN(10))
        .mul(formatLeverageBN);
      void validatePayTokenChange(nextAllMoney, payTokenNum);
      return;
    }
    if (isSizeChange) {
      void sizeNumChangeCalcFn(sizeNumber);
    }
    if (isPayTokenChange) {
      void payTokenChangeCalcFn(payTokenNum);
    }
  }, [tokenPriceMap, isSizeChange, isPayTokenChange, leverage, indexToken]);

  useEffect(() => {
    if (marketDirection === 'Long' || marketDirection === 'Short') {
      void validatePayTokenChange(allMoney, payTokenNum);
    }
  }, [marketDirection, positionInfo]);

  useEffect(() => {
    void validatePayTokenChange(allMoney, payTokenNum);
  }, [marketType]);

  useEffect(() => {
    if (!payTokenNum && !sizeNumber) {
      setPayTokenInput('');
      setSizeInputValue('');
    }
    if (!limitPrice) {
      setPriceInputValue('');
    }
  }, [payTokenNum, sizeNumber, limitPrice]);

  // VOB row click → fill sizeUsd into the input with unit conversion
  const vobSizeUsd = useAppStore((state) => state.TradeboxNew.vobSizeUsd);
  const setVobSizeUsd = useAppStore((state) => state.TradeboxNew.setVobSizeUsd);
  useEffect(() => {
    if (!vobSizeUsd || vobSizeUsd.isZero()) return;
    if (!indexTokenPrice || indexTokenPrice.isZero()) return;

    // sizeUsd is the total USD amount for this order-book row
    const newAllMoney = vobSizeUsd;

    // Convert USD → index token quantity (e.g. SOL)
    const newSizeNumber = newAllMoney.div(indexTokenPrice);

    // Convert USD → pay token amount (taking leverage into account)
    const newPayTokenNum = newAllMoney
      .div(formatLeverageBN)
      .div(payTokenPrice)
      .mul(new BN(10));

    // Update all related local states + zustand
    setAllMoney(newAllMoney);
    setSizeNumber(newSizeNumber);
    setPayTokenNum(newPayTokenNum);
    skipSizeInputSyncRef.current = true;
    setSizeInputValue(formatSizeInputFromUsd(newAllMoney));

    if (newPayTokenNum.gt(new BN(0))) {
      const payStr = formatAmount(
        newPayTokenNum,
        payerSwapTokenInfo?.decimals || 6,
        payerSwapTokenInfo?.decimals
      );
      setPayTokenInput(payStr);
    } else {
      setPayTokenInput('');
    }

    if (payTokenInitNum.gt(new BN(0))) {
      const rate = newPayTokenNum.mul(new BN(100)).div(payTokenInitNum);
      setScaleInputValue(Number(rate.toString()));
    }

    if (getGmw440Enabled()) {
      setIsPayTokenChange(true);
      setIsSizeChange(false);
    } else {
      setIsSizeChange(true);
      setIsPayTokenChange(false);
    }

    void validateSizeChange(newAllMoney, newPayTokenNum, isForbiddenTrade);
    void validatePayTokenChange(newAllMoney, newPayTokenNum);

    // Clear the signal so it doesn't re-trigger
    setVobSizeUsd(null);
  }, [vobSizeUsd]);

  const changePayTokenNum = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    const amount = formatInput(value, payTokenInputDecimals);
    if (amount) {
      if (getGmw440Enabled()) {
        setIsPayTokenChange(true);
        setIsSizeChange(false);
      }
      setPayTokenInput(value);
      setPayTokenNum(amount);
      if (payTokenInitNum.gt(new BN(0))) {
        const rate = amount.mul(new BN(100)).div(payTokenInitNum);
        setScaleInputValue(Number(rate.toString()));
      }
      const nextAllMoney = amount
        .mul(payTokenPrice)
        .div(new BN(10))
        .mul(formatLeverageBN);
      setAllMoney(nextAllMoney);
      setTradeMoney(nextAllMoney);
      validateSizeChange(nextAllMoney, amount, isForbiddenTrade);
      validatePayTokenChange(nextAllMoney, amount);
      skipSizeInputSyncRef.current = true;
      setSizeInputValue(formatSizeInputFromUsd(nextAllMoney));
    }
  };

  const changeSizeNum = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSizeInputValue(value);
    const nextAllMoney =
      sizeDisplayMode === 'usd'
        ? formatInput(value, USD_DECIMALS)
        : formatInput(value, sizeInputDecimals).mul(indexTokenPrice);
    const newPayTokenNum = nextAllMoney
      .div(formatLeverageBN)
      .div(payTokenPrice)
      .mul(new BN(10));
    setPayTokenNum(newPayTokenNum);
    setAllMoney(nextAllMoney);
    setTradeMoney(nextAllMoney);
    validateSizeChange(nextAllMoney, newPayTokenNum, isForbiddenTrade);
    validatePayTokenChange(nextAllMoney, newPayTokenNum);
    if (payTokenInitNum.gt(new BN(0))) {
      const rate = newPayTokenNum.mul(new BN(100)).div(payTokenInitNum);
      setScaleInputValue(Number(rate.toString()));
    }
    if (nextAllMoney.gt(new BN(0))) {
      const payTokenInputValue = formatAmount(
        newPayTokenNum,
        payerSwapTokenInfo?.decimals || 6,
        payerSwapTokenInfo?.decimals
      );
      setPayTokenInput(payTokenInputValue);
    } else {
      setPayTokenInput('');
    }
    if (getGmw440Enabled()) {
      // Size edit syncs pay once; subsequent price refreshes stay pay → size.
      setIsPayTokenChange(true);
      setIsSizeChange(false);
    } else {
      setIsPayTokenChange(false);
      setIsSizeChange(true);
    }
  };

  const toggleSizeDisplayMode = () => {
    const nextMode: SizeDisplayMode =
      sizeDisplayMode === 'usd' ? 'token' : 'usd';
    setSizeDisplayMode(nextMode);
    skipSizeInputSyncRef.current = true;
    setSizeInputValue(formatSizeInputFromUsd(allMoney, nextMode));
  };

  const handlePayTokenChange = (token: PayerSwapTokenInfo) => {
    // if (payerInfo.connected) {
    setHasPayTokenChange(true);
    // }
    setPayerSwapTokenInfo(token);
    const payTokenPrice = new BN(
      getStableTokenPrice(token?.tokenAddress)?.minUnitPrice || 0
    );
    if (payTokenPrice.isZero()) {
      setPayTokenInput('');
      setPayTokenNum(new BN(0));
      return;
    }
    const newPayTokenNum = allMoney
      .div(formatLeverageBN)
      .div(payTokenPrice)
      .mul(new BN(10));
    const payTokenInitNum = new BN(token?.amount || 0);
    if (!payTokenInitNum?.eq(new BN(0))) {
      const rate = newPayTokenNum.mul(new BN(100)).div(payTokenInitNum);
      setScaleInputValue(Number(rate.toString()));
    } else {
      setScaleInputValue(0);
    }
    if (newPayTokenNum.gt(new BN(0))) {
      const payTokenInputValue = formatAmount(
        newPayTokenNum,
        token?.decimals || 6,
        token?.decimals
      );
      setPayTokenInput(payTokenInputValue);
      setPayTokenNum(newPayTokenNum);
    } else {
      setPayTokenInput('');
      setPayTokenNum(new BN(0));
    }
    validatePayTokenChange(allMoney, newPayTokenNum, token);
    if (getGmw440Enabled()) {
      setIsPayTokenChange(true);
      setIsSizeChange(false);
    } else {
      setIsPayTokenChange(false);
      setIsSizeChange(true);
    }
  };

  const handleMarketClick = (token: IndexToken) => {
    let isForbiddenTrade = false;
    if (marketInfo?.closed) {
      isForbiddenTrade = true;
      setForbiddenTrade(isForbiddenTrade);
    } else {
      isForbiddenTrade = false;
      setForbiddenTrade(false);
    }
    if (indexToken !== token.indexToken) {
      if (!getGmw374Enabled()) {
        const leverageBn = formatInput(leverage, 1);
        const isEnableMaxLeverage =
          localStorage.getItem('isEnableMaxLeverage') === 'enable';
        if (isEnableMaxLeverage) {
          if (leverageBn
            .mul(new BN(10).pow(new BN(20)))
            .div(BN_10)
            .gt(new BN(token.maxLeverage))) {
            setLeverage(getMarketDefaultLeverage(token.indexToken));
          }
        } else {
          if (
            leverageBn
              .mul(new BN(10).pow(new BN(20)))
              .div(BN_10)
              .gt(new BN(token.maxLeverage).divn(2))
          ) {
            setLeverage(getMarketDefaultLeverage(token.indexToken));
          }
        }
      }
      const indexTokenPrice = new BN(
        getStableTokenPrice(token?.indexToken)?.unitPrice || 0
      );
      const allMoney = payTokenNum
        .mul(payTokenPrice)
        .div(new BN(10))
        .mul(formatLeverageBN);

      const newSizeNumber = indexTokenPrice.gt(new BN(0))
        ? allMoney.div(indexTokenPrice)
        : new BN(0);

      setSizeNumber(newSizeNumber);
      setAllMoney(allMoney);
      skipSizeInputSyncRef.current = true;
      setSizeInputValue(formatSizeInputFromUsd(allMoney));
      // validateSizeChange(allMoney, payTokenNum, isForbiddenTrade);
    }
    setTpPrice(null);
    setSlPrice(null);
    setTpsl({
      tpGainMoney: '',
      slLossMoney: '',
      tpGainRate: '',
      slLossRate: '',
    });
    setIsPayTokenChange(true);
    setIsSizeChange(false);
    setHasCollateralChange(false);
    selectIndexMarket(navigate, {
      indexToken: token.indexToken,
      tokenData: token,
      search: location.search,
    });
  }

  useEffect(() => {
    const unsubscribe = onTokenSelect((token) => {
      void handleMarketClick(token as any);
    });

    return unsubscribe;
  }, []);

  const changeLimitPrice = (value: string) => {
    if (getGmw440Enabled()) {
      setIsPayTokenChange(true);
      setIsSizeChange(false);
    } else {
      setIsSizeChange(true);
      setIsPayTokenChange(false);
    }
    setPriceInputValue(value);
    if (value) {
      const limitPriceBN = formatInput(value, limitPriceInputDecimals);
      setLimitPrice(limitPriceBN);
    } else {
      setLimitPrice(null);
    }
  };

  const payTokenChangeCalcFn = (payTokenNum: BN) => {
    const nextAllMoney = (payTokenNum || new BN(0))
      .mul(payTokenPrice)
      .div(new BN(10))
      .mul(formatLeverageBN);
    if (nextAllMoney?.isZero()) {
      if (!sizeNumber?.isZero()) {
        setSizeNumber(new BN(0));
        setScaleInputValue(0);
      }
      skipSizeInputSyncRef.current = true;
      setSizeInputValue('');
    } else {
      if (indexTokenPrice.gt(new BN(0))) {
        const newSizeNumber = nextAllMoney.div(indexTokenPrice);
        if (!sizeNumber?.eq(newSizeNumber)) {
          setSizeNumber(newSizeNumber);
          skipSizeInputSyncRef.current = true;
          setSizeInputValue(formatSizeInputFromUsd(nextAllMoney));
        }
      }
    }
    setAllMoney(nextAllMoney);
    setTradeMoney(nextAllMoney);
  };

  const sizeNumChangeCalcFn = (sizeNumber: BN) => {
    if (payTokenPrice.gt(new BN(0)) && indexTokenPrice.gt(new BN(0))) {
      const nextAllMoney = (sizeNumber || new BN(0)).mul(indexTokenPrice);
      if (nextAllMoney?.isZero()) {
        if (!payTokenNum?.isZero()) {
          setPayTokenNum(new BN(0));
          setScaleInputValue(0);
        }
      } else {
        const newPayTokenNum = nextAllMoney
          .div(formatLeverageBN)
          .div(payTokenPrice)
          .mul(new BN(10));
        if (!payTokenNum?.eq(newPayTokenNum)) {
          setPayTokenNum(newPayTokenNum);
          const newPayTokenNumFree = formatAmountFree(
            newPayTokenNum,
            payerSwapTokenInfo?.decimals || 0
          );
          setPayTokenInput(newPayTokenNumFree);
        }
      }
      setAllMoney(nextAllMoney);
      setTradeMoney(nextAllMoney);
      skipSizeInputSyncRef.current = true;
      setSizeInputValue(formatSizeInputFromUsd(nextAllMoney));
    }
  };

  const handleSliderChange = (value: number | number[]) => {
    if (indexTokenPrice.isZero()) return;
    const numericValue = Array.isArray(value) ? value[0] : value;
    let newPayTokenNum = new BN(numericValue)
      .mul(payTokenInitNum)
      .div(new BN(100));
    if (getGmw440Enabled() && newPayTokenNum.gt(payTokenInitNum)) {
      newPayTokenNum = payTokenInitNum;
    }
    const newPayTokenNumFree = formatAmountFree(
      newPayTokenNum,
      payerSwapTokenInfo?.decimals || 0
    );
    skipAllMoneyEffectRef.current = true;
    skipPayTokenInputSyncRef.current = true;
    skipSizeInputSyncRef.current = true;
    setPayTokenNum(newPayTokenNum);
    setScaleInputValue(numericValue);
    setPayTokenInput(newPayTokenNumFree);

    if (getGmw440Enabled()) {
      setIsPayTokenChange(true);
      setIsSizeChange(false);
      payTokenChangeCalcFn(newPayTokenNum);
      const nextAllMoney = newPayTokenNum
        .mul(payTokenPrice)
        .div(new BN(10))
        .mul(formatLeverageBN);
      validatePayTokenChange(nextAllMoney, newPayTokenNum);
      return;
    }

    const maxNumber = new BN(defaultMaxTradeMoney)
      .mul(new BN(numericValue))
      .div(new BN(indexTokenPrice || 0))
      .div(new BN(100));
    const newAllMoney = maxNumber.mul(indexTokenPrice);
    setSizeNumber(maxNumber);
    setAllMoney(newAllMoney);
    setTradeMoney(newAllMoney);
    validatePayTokenChange(newAllMoney, newPayTokenNum);
    setSizeInputValue(formatSizeInputFromUsd(newAllMoney));
  };

  const validatePayTokenChange = (
    allMoney: BN,
    amount: BN,
    localPayTokenInfo?: { tokenName: string; defaultMaxTradeMoney: string }
  ) => {
    if (isForbiddenTrade) return;
    if (allMoney.gt(new BN(localPayTokenInfo?.defaultMaxTradeMoney || defaultMaxTradeMoney))) {
      setBtnMessage(t`Insufficient ${(localPayTokenInfo?.tokenName === 'WGMX' ? 'GMX' : localPayTokenInfo?.tokenName) || (payerSwapTokenInfo.tokenName === 'WGMX' ? 'GMX' : payerSwapTokenInfo.tokenName)} balance`);
      setBtnDisabled(true);
    } else if (
      allMoney.gt(new BN(0)) &&
      allMoney.lte(new BN(localPayTokenInfo?.defaultMaxTradeMoney || defaultMaxTradeMoney))
    ) {
      const AllCollateralValue = new BN(positionInfo?.collateral_value as string || 0).add((amount || new BN(0)).mul(payTokenPrice));
      if (AllCollateralValue.lt(new BN(marketInfo?.minCollateralValue))) {
        setBtnMessage(t`Min collateral:$${formatAmount(
          new BN(marketInfo?.minCollateralValue),
          USD_DECIMALS,
          2
        )}`
        );
        setBtnDisabled(true);
      } else if (allMoney.gt(lpBn)) {
        setBtnMessage(t`Exceeds available liquidity`);
        setBtnDisabled(true);
      } else {
        if (marketType === 'Limit' && !limitPrice) {
          setBtnMessage(t`Enter a price`);
          setBtnDisabled(true);
          return;
        }
        setBtnMessage(
          isLong
            ? marketType === 'Market'
              ? `${t`Long`} ${formatDisplayGmxSymbol(indexTokenData?.indexToken)}`
              : t`Create Limit Order`
            : marketType === 'Market'
              ? `${t`Short`} ${formatDisplayGmxSymbol(indexTokenData?.indexToken)}`
              : t`Create Limit Order`
        );
        setBtnDisabled(false);
      }
    } else {
      setBtnMessage(t`Enter an amount`);
      setBtnDisabled(true);
    }
  };

  const validateSizeChange = (allMoney: BN, amount: BN, isForbiddenTrade: boolean, token?: IndexToken) => {
    if (isForbiddenTrade) return;
    if (allMoney.gt(new BN(defaultMaxTradeMoney))) {
      setBtnMessage(t`Insufficient ${(payerSwapTokenInfo.tokenName === 'WGMX' ? 'GMX' : payerSwapTokenInfo.tokenName)} balance`);
      setBtnDisabled(true);
    } else if (
      allMoney.gt(new BN(0)) &&
      allMoney.lte(new BN(defaultMaxTradeMoney))
    ) {
      const AllCollateralValue = new BN(
        positionInfo?.collateral_value as string || 0
      ).add((amount || new BN(0)).mul(payTokenPrice));
      if (AllCollateralValue.lt(new BN(marketInfo?.minCollateralValue))) {
        setBtnMessage(
          t`Min collateral:$${formatAmount(
            new BN(marketInfo?.minCollateralValue),
            USD_DECIMALS,
            2
          )}`
        );
        setBtnDisabled(true);
      } else if (allMoney.gt(lpBn)) {
        setBtnMessage(t`Exceeds available liquidity`);
        setBtnDisabled(true);
      } else {
        if (marketType === 'Limit' && !limitPrice) {
          setBtnMessage(t`Enter a price`);
          setBtnDisabled(true);
          return;
        }
        setBtnMessage(
          isLong
            ? `${t`Long`} ${formatDisplayGmxSymbol(token?.indexToken || indexTokenData?.indexToken)}`
            : `${t`Short`} ${formatDisplayGmxSymbol(token?.indexToken || indexTokenData?.indexToken)}`
        );
        setBtnDisabled(false);
      }
    } else {
      setBtnMessage(t`Enter an amount`);
      setBtnDisabled(true);
    }
  };

  return (
    <>
      <div className="tradeBox-exchangeForm-payInputCom tradeBox-exchangeForm-payInputCom--gmw390">
        <div className={`box ${isPayInputFocused ? 'focused' : ''}`}>
          <div className="payInputCom-header">
            <span className="payInputCom-header-label">{t`Margin`}</span>
            <span className="maxBalance">{t`Max`} {payTokenBalanceDisplay}</span>
          </div>
          <div className="item flexAlignCenter">
            <div className="item-input flexAlignCenter">
              <NumberInput
                value={payTokenInput}
                className="item-input h-[2.4rem] w-full bg-transparent px-[0] py-[0.2rem] text-[1.6rem] placeholder-[#A3A3A3] outline-none"
                onValueChange={changePayTokenNum}
                decimalPlaces={isGmw340Enabled ? payTokenDecimals : undefined}
                onFocus={() => {
                  setIsPayTokenChange(true);
                  setIsSizeChange(false);
                  setIsPayInputFocused(true);
                }}
                onBlur={() => {
                  setIsPayInputFocused(false);
                }}
                placeholder="0.00"
              />
              <div
                className="item-select"
                onClick={() => {
                  setTokenSelectTitle('Pay');
                  setSelectType('pay');
                  setIsPanelOpen(true);
                }}
              >
                <span>{payTokenSymbol}</span>
                <IconChevronDown
                  fill=""
                  className="h-[1.6rem] w-[1.6rem]"
                  style={{ width: '1.6rem' }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="tradeBox-exchangeForm-sizeInputCom">
        <div className={`box ${isSizeInputFocused ? 'focused' : ''}`}>
          <label id="input-size">{t`Size`}</label>
          <div className="item flexAlignCenter">
            <div className="item-input flexAlignCenter">
              <NumberInput
                value={sizeInputValue}
                className="item-input h-[2.4rem] w-full bg-transparent px-[0] py-[0.2rem] text-[1.6rem] placeholder-[#A3A3A3] outline-none"
                onValueChange={changeSizeNum}
                decimalPlaces={
                  sizeDisplayMode === 'usd'
                    ? sizeUsdInputDecimals
                    : isGmw340Enabled
                      ? indexTokenDecimals
                      : undefined
                }
                onFocus={() => {
                  if (getGmw440Enabled()) {
                    setIsPayTokenChange(true);
                    setIsSizeChange(false);
                  } else {
                    setIsSizeChange(true);
                    setIsPayTokenChange(false);
                  }
                  setIsSizeInputFocused(true);
                }}
                onBlur={() => {
                  setIsSizeInputFocused(false);
                }}
                placeholder="0.00"
              />
              <div
                className="item-select item-select--sizeUnit"
                onClick={toggleSizeDisplayMode}
              >
                <span>
                  {sizeDisplayMode === 'usd' ? 'USD' : indexTokenDisplaySymbol}
                </span>
                <IconArrowTransfer className="size-unit-icon" />
              </div>
            </div>
          </div>
        </div>
      </div>

      {marketType === 'Limit' && (
        <div className="tradeBox-exchangeForm-priceInputCom">
          <div className={`box ${isLimitInputFocused ? 'focused' : ''}`}>
            <div className="priceInputCom-header">
              <label>{t`Price`}</label>
              <div style={{ marginRight: '1.4rem' }}>
                <span className="mark" style={{ marginRight: '0.6rem' }}>
                  Mark:
                </span>
                <span
                  className="markPrice"
                  onClick={() => {
                    void changeLimitPrice(
                      formatPriceUsd(
                        new BN(getStableTokenPrice(indexToken)?.price || 0),
                        {
                          showDollarSign: false,
                          useCommas: false,
                          displayDecimals: isGmw402Enabled
                            ? marketPriceInputDecimals
                            : undefined,
                          isDisplayDecimals: isGmw402Enabled
                            ? marketPriceInputDecimals !== undefined
                            : GMX_SOLANA_FOREX_PRECISION_MARKET_TOKENS.includes(
                              indexToken
                            ),
                        }
                      )
                    );
                  }}
                >
                  {formatPriceUsd(
                    new BN(getStableTokenPrice(indexToken)?.price || 0),
                    {
                      useCommas: false,
                      displayDecimals: isGmw402Enabled
                        ? marketPriceInputDecimals
                        : undefined,
                      isDisplayDecimals: isGmw402Enabled
                        ? marketPriceInputDecimals !== undefined
                        : GMX_SOLANA_FOREX_PRECISION_MARKET_TOKENS.includes(
                          indexToken
                        ),
                    }
                  )}
                </span>
              </div>
            </div>

            <div className="item flexAlignCenter">
              <div className="item-input flexAlignCenter">
                <NumberInput
                  value={priceInputValue}
                  className="item-input h-[2.4rem] w-full bg-transparent px-[0] py-[0.2rem] text-[1.6rem] placeholder-[#A3A3A3] outline-none"
                  onValueChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    changeLimitPrice(e.target.value)
                  }
                  decimalPlaces={limitPriceDecimalPlaces}
                  onFocus={() => {
                    setIsLimitInputFocused(true);
                  }}
                  onBlur={() => {
                    setIsLimitInputFocused(false);
                  }}
                  placeholder="0.00"
                />
                <span style={{ marginRight: '1.4rem' }}>USD</span>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="tradeBox-exchangeForm-leverageSlider tradeBox-exchangeForm-leverageSlider--gmw390 flexAlignCenter">
        <div className="options flexAlignCenter">
          <div className="inputBox flexAlignCenter commonBoxBg">
            <input
              type="number"
              placeholder="0"
              value={scaleInputValue}
              onChange={(e) => {
                const value = e.target.value;
                setScaleInputValue(Number(value));
                const numValue = Number(value);
                if (!isNaN(numValue) && value !== '') {
                  handleSliderChange(numValue);
                }
              }}
              onBlur={(e) => {
                const value = e.target.value;
                const numValue = Number(value);
                if (isNaN(numValue) || value === '') {
                  setScaleInputValue(0);
                  handleSliderChange(0);
                } else if (numValue > 100) {
                  setScaleInputValue(100);
                  handleSliderChange(100);
                } else if (numValue < 0) {
                  setScaleInputValue(0);
                  handleSliderChange(0);
                }
              }}
              max={100}
              min={0}
            />
            <span style={{ color: '#A3A3A3', marginLeft: '-0.4rem' }}>%</span>
          </div>
        </div>
        <div
          ref={sliderContainerRef}
          className="slider-container select-none"
        >
          <Slider
            min={0}
            max={100}
            marks={SLIDER_MARKS}
            step={1}
            value={scaleInputValue}
            onChange={handleSliderChange}
            trackStyle={{ backgroundColor: '#FA7B4E' }}
            railStyle={{ backgroundColor: '#1F1F1F' }}
            handleStyle={{
              borderColor: '#FA7B4E',
              backgroundColor: '#181818',
              boxShadow: 'none',
              touchAction: 'none',
            }}
            dotStyle={{
              backgroundColor: '#181818',
              borderColor: '#1F1F1F',
            }}
            activeDotStyle={{
              backgroundColor: '#181818',
              borderColor: '#FA7B4E',
            }}
          />
        </div>
      </div>

      <TokenSelectDrawer
        key={selectType}
        isOpen={isPanelOpen}
        selectType={selectType}
        title={tokenSelectTitle}
        payerSwapTokens={payerSwapList}
        sortedTokens={sortedIndexTokens}
        onClose={() => setIsPanelOpen(false)}
        onSelectToken={(token) => {
          if (!token) {
            return;
          }
          if (selectType === 'pay') {
            handlePayTokenChange(token);
          }
        }}
      />
    </>
  );
}

export default memo(PayLongSizeRateComNew);

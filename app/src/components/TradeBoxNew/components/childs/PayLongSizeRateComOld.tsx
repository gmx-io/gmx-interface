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
  formatUsd,
  formatPriceUsd
} from '@/utils/legacy/format';
import CountPanel from './tokensPanel/countPanel';
import { formatInput } from '../../utils/formatInput';
import { getMarketPriceInputDecimals } from '@/utils/priceInput/getMarketPriceInputDecimals';
import { formatLeverage } from '../../utils/formatLeverage';
import TokenSelectDrawer from './TokenSelectDrawer';
import IconChevronDown from '@/img/trade/chevron-down.svg?react';
import { t, Trans } from '@lingui/macro';
import { getIconUrlPath } from '@/utils/lib/icon';
import { formatDisplayGmxSymbol } from '@/components/TradeBoxNew/utils/formatGmxSymbol';
import { getMarketDefaultLeverage } from '@/components/TradeBoxNew/utils/getMarketDefaultLeverage';
import { onTokenSelect } from '@/utils/events/tokenSelectEvent';
import { useLocation, useNavigate } from 'react-router-dom';
import { selectIndexMarket } from '@/utils/market/selectIndexMarket';
import './profitLossGtCom.scss';
import 'rc-slider/assets/index.css';
import CustomSliderWithBars from './CustomSliderWithBars';
import { useMedia } from 'react-use';
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

function PayLongSizeRateCom() {
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
  const isScreen1024 = useMedia('(max-width: 1024px)');
  const isMobile = useMedia('(max-width: 768px)');
  const [scaleInputValue, setScaleInputValue] = useState(0);
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
  const liquidityMaxUsdValue = isLong
    ? marketInfo?.lpLong
    : marketInfo?.lpShort;
  const maxPositionUsd = useMemo(() => {
    if (liquidityMaxUsdValue === undefined || liquidityMaxUsdValue === null) {
      return null;
    }

    const walletMaxUsd = new BN(payerSwapTokenInfo?.value || 0)
      .mul(formatLeverage(leverage))
      .div(new BN(10));
    // Use the smaller of the available liquidity and the user's wallet value.
    return BN.min(walletMaxUsd, new BN(liquidityMaxUsdValue));
  }, [leverage, liquidityMaxUsdValue, payerSwapTokenInfo?.value]);
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
  const limitPriceInputDecimals = isGmw340Enabled ? priceDecimals : 20 - indexTokenDecimals;
  const lpBn = isLong
    ? new BN(marketInfo?.lpLong)
    : new BN(marketInfo?.lpShort);
  const [showCountPanel, setShowCountPanel] = useState(false);
  const [isPayTokenChange, setIsPayTokenChange] = useState(false);
  const [isSizeChange, setIsSizeChange] = useState(false);
  const [isSizeInputFocused, setIsSizeInputFocused] = useState(false);
  const [isLimitInputFocused, setIsLimitInputFocused] = useState(false);
  const [allMoney, setAllMoney] = useState(new BN(0));
  const [payTokenInput, setPayTokenInput] = useState('');
  const [sizeInputValue, setSizeInputValue] = useState('');
  const [priceInputValue, setPriceInputValue] = useState('');
  const [tokenSelectTitle, setTokenSelectTitle] = useState<string>('Pay');
  const [selectType, setSelectType] = useState<string>('pay');
  const [isPanelOpen, setIsPanelOpen] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const skipAllMoneyEffectRef = useRef(false);
  const skipPayTokenInputSyncRef = useRef(false);
  const skipSizeInputSyncRef = useRef(false);

  // Keep the selected slider percentage, but recalculate its margin when the
  // wallet balance changes after a successful order.
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
      setSizeInputValue(formatAmountFree(nextSizeNumber, indexTokenDecimals));
    }
  }, [payTokenInitNum, payTokenPrice, formatLeverageBN, scaleInputValue, indexTokenPrice]);

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

    // return () => {
    //   clearTimeout(handler);
    // };
  }, [payTokenInput, payTokenInputDecimals]);

  // change sizeNumber
  useEffect(() => {
    if (sizeInputValue === null) return;
    if (skipSizeInputSyncRef.current) {
      skipSizeInputSyncRef.current = false;
      return;
    }
    const handler = setTimeout(() => {
      const amount = formatInput(sizeInputValue, sizeInputDecimals);
      setSizeNumber(amount);
    }, 50);

    return () => {
      clearTimeout(handler);
    };
  }, [sizeInputValue, sizeInputDecimals]);

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

    if (newSizeNumber.gt(new BN(0))) {
      const sizeStr = formatAmountFree(newSizeNumber, indexTokenDecimals);
      setSizeInputValue(sizeStr);
    } else {
      setSizeInputValue('');
    }

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

  const showPanelAndHideAfterDelay = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }
    setShowCountPanel(true);
    timerRef.current = setTimeout(() => {
      setShowCountPanel(false);
    }, 1000);
  }, []);

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
      const allMoney = amount
        .mul(payTokenPrice)
        .div(new BN(10))
        .mul(formatLeverageBN);
      setAllMoney(allMoney);
      setTradeMoney(allMoney);
      validateSizeChange(allMoney, amount, isForbiddenTrade);
      validatePayTokenChange(allMoney, amount);
      const newSizeNumber = allMoney.div(indexTokenPrice);
      if (newSizeNumber.gt(new BN(0))) {
        const sizeInputValue = formatAmount(
          newSizeNumber,
          indexTokenDecimals,
          indexTokenDecimals
        );
        setSizeInputValue(sizeInputValue !== '0' ? sizeInputValue : '');
      } else {
        setSizeInputValue('');
      }
    }
  };

  const changeSizeNum = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    const amount = formatInput(value, sizeInputDecimals);
    setSizeInputValue(value);
    const allMoney = amount.mul(indexTokenPrice);
    const newPayTokenNum = allMoney
      .div(formatLeverageBN)
      .div(payTokenPrice)
      .mul(new BN(10));
    setPayTokenNum(newPayTokenNum);
    setAllMoney(allMoney);
    setTradeMoney(allMoney);
    validateSizeChange(allMoney, newPayTokenNum, isForbiddenTrade);
    validatePayTokenChange(allMoney, newPayTokenNum);
    if (payTokenInitNum.gt(new BN(0))) {
      const rate = newPayTokenNum.mul(new BN(100)).div(payTokenInitNum);
      setScaleInputValue(Number(rate.toString()));
    }
    if (amount.gt(new BN(0))) {
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

      if (newSizeNumber.gt(new BN(0))) {
        const sizeInputValue = formatAmount(
          newSizeNumber,
          GMX_SOLANA_TOKENS_RAW[token?.indexToken]?.decimals || 8,
          GMX_SOLANA_TOKENS_RAW[token?.indexToken]?.decimals
        );
        setSizeInputValue(sizeInputValue !== '0' ? sizeInputValue : '');
      } else {
        setSizeInputValue('');
      }
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
    const allMoney = (payTokenNum || new BN(0))
      .mul(payTokenPrice)
      .div(new BN(10))
      .mul(formatLeverageBN);
    if (allMoney?.isZero()) {
      if (!sizeNumber?.isZero()) {
        setSizeNumber(new BN(0));
        setScaleInputValue(0);
      }
    } else {
      if (indexTokenPrice.gt(new BN(0))) {
        const newSizeNumber = allMoney.div(indexTokenPrice);
        if (!sizeNumber?.eq(newSizeNumber)) {
          setSizeNumber(newSizeNumber);
          const newSizeNumberFree = formatAmountFree(
            newSizeNumber,
            indexTokenDecimals
          );
          setSizeInputValue(newSizeNumberFree);
        }
      }
    }
    setAllMoney(allMoney);
    setTradeMoney(allMoney);
  };

  const sizeNumChangeCalcFn = (sizeNumber: BN) => {
    if (payTokenPrice.gt(new BN(0)) && indexTokenPrice.gt(new BN(0))) {
      const allMoney = (sizeNumber || new BN(0)).mul(indexTokenPrice);
      if (allMoney?.isZero()) {
        if (!payTokenNum?.isZero()) {
          setPayTokenNum(new BN(0));
          setScaleInputValue(0);
        }
      } else {
        const newPayTokenNum = allMoney
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
      setAllMoney(allMoney);
      setTradeMoney(allMoney);
    }
  };

  const handleSliderChange = (value: number | number[]) => {
    if (indexTokenPrice.isZero()) return;
    showPanelAndHideAfterDelay();
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
    const newSizeNumberFree = formatAmountFree(
      maxNumber,
      indexTokenDecimals || 0
    );
    const newAllMoney = maxNumber.mul(indexTokenPrice);
    setSizeNumber(maxNumber);
    setAllMoney(newAllMoney);
    setTradeMoney(newAllMoney);
    validatePayTokenChange(newAllMoney, newPayTokenNum);
    setSizeInputValue(newSizeNumberFree);
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
        setBtnMessage(
          marketDirection === 'Long'
            ? t`Max ${formatDisplayGmxSymbol(indexTokenData?.indexToken)} long exceeded`
            : t`Max ${formatDisplayGmxSymbol(indexTokenData?.indexToken)} short exceeded`
        );
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
        setBtnMessage(
          marketDirection === 'Long'
            ? t`Max ${formatDisplayGmxSymbol(token?.indexToken || indexTokenData.indexToken)} long exceeded`
            : t`Max ${formatDisplayGmxSymbol(token?.indexToken || indexTokenData.indexToken)} short exceeded`
        );
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
      <div className="tradeBox-exchangeForm-payInputCom">
        <div className="item flexAlignCenter">
          <label>{t`Margin to Pay`}</label>
          <div className="item-input flexAlignCenter">
            <CountPanel
              amount={
                formatLeverageBN?.eq(new BN(0)) || !leverage
                  ? '$0.00'
                  : `$${formatAmount(
                    allMoney?.div(formatLeverageBN).mul(new BN(10)),
                    USD_DECIMALS,
                    4
                  )}`
              }
              showCountPanel={showCountPanel}
            />
            <NumberInput
              value={payTokenInput}
              className="item-input h-[2.4rem] w-full bg-transparent px-[0] py-[0.2rem] text-[1.6rem] placeholder-[#A3A3A3] outline-none"
              onValueChange={changePayTokenNum}
              decimalPlaces={isGmw340Enabled ? payTokenDecimals : undefined}
              onFocus={() => {
                setIsPayTokenChange(true);
                setIsSizeChange(false);
                setShowCountPanel(true);
                // showPanelAndSetHideTimeout();
              }}
              onBlur={() => {
                setShowCountPanel(false);
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
              <img
                className="token-icon"
                src={getIconUrlPath(
                  payerSwapTokenInfo?.tokenName === 'WGMX'
                    ? 'GMX'
                    : payerSwapTokenInfo?.tokenName,
                  24
                )}
                alt={payerSwapTokenInfo?.tokenName}
                width={22}
              />
              <span>
                {payerSwapTokenInfo?.tokenName === 'WGMX'
                  ? 'GMX'
                  : payerSwapTokenInfo?.tokenName}
              </span>
              <IconChevronDown
                fill=""
                className="h-[1.6rem] w-[1.6rem]"
                style={{ width: '1.6rem' }}
              />
            </div>
          </div>
        </div>

        <div className="item flexAlignCenter">
          <label>
            <Trans>Max {marketDirection === 'Long' ? t`Long` : t`Short`}</Trans>
          </label>
          <div className="item-input flexAlignCenter">
            <input
              type="text"
              value={
                maxPositionUsd === null
                  ? t`Loading...`
                  : maxPositionUsd.isZero()
                    ? '$0'
                    : formatUsd(maxPositionUsd, {
                      displayDecimals: payerSwapTokenInfo?.decimals,
                    })
              }
              placeholder="0.0"
              className="item-input"
              disabled
            />
          </div>
        </div>
      </div>

      <div className="tradeBox-exchangeForm-sizeInputCom">
        <div className={`box ${isSizeInputFocused ? 'focused' : ''}`}>
          <label id="input-size">{t`Size`}</label>
          <div className="item flexAlignCenter">
            <div className="item-input flexAlignCenter">
              <CountPanel
                amount={`$${formatAmount(allMoney, USD_DECIMALS, 4)}`}
                showCountPanel={showCountPanel}
              />
              <NumberInput
                value={sizeInputValue}
                className="item-input h-[2.4rem] w-full bg-transparent px-[0] py-[0.2rem] text-[1.6rem] placeholder-[#A3A3A3] outline-none"
                onValueChange={changeSizeNum}
                decimalPlaces={isGmw340Enabled ? indexTokenDecimals : undefined}
                onFocus={() => {
                  if (getGmw440Enabled()) {
                    setIsPayTokenChange(true);
                    setIsSizeChange(false);
                  } else {
                    setIsSizeChange(true);
                    setIsPayTokenChange(false);
                  }
                  setIsSizeInputFocused(true);
                  setShowCountPanel(true);
                }}
                onBlur={() => {
                  setIsSizeInputFocused(false);
                  setShowCountPanel(false);
                }}
                placeholder="0.00"
              />
              <div
                className="item-select"
                onClick={() => {
                  setTokenSelectTitle(
                    marketDirection === 'Long' ? t`Long` : t`Short`
                  );
                  setSelectType('market');
                  setIsPanelOpen(true);
                }}
              >
                <img
                  className="token-icon"
                  src={getIconUrlPath(
                    GMX_SOLANA_TOKENS_RAW[indexToken]?.symbol,
                    24
                  )}
                  alt={GMX_SOLANA_TOKENS_RAW[indexToken]?.symbol}
                  width={22}
                />
                <span>{GMX_SOLANA_TOKENS_RAW[indexToken]?.displaySymbol}</span>
                <IconChevronDown fill="" className="h-[1.6rem] w-[1.6rem]" />
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

      <div className="tradeBox-exchangeForm-leverageSlider flexAlignCenter">
        {isMobile ? (
          <div className="slider-container select-none">
            <Slider
              min={0}
              max={100}
              marks={SLIDER_MARKS}
              step={1}
              value={scaleInputValue}
              onChange={handleSliderChange}
              onBeforeChange={() => setShowCountPanel(true)}
              onAfterChange={() => setShowCountPanel(false)}
              trackStyle={{ backgroundColor: '#FA7B4E' }}
              railStyle={{ backgroundColor: '#1F1F1F' }}
              handleStyle={{
                borderColor: '#FA7B4E',
                backgroundColor: '#181818',
                boxShadow: 'none',
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
        ) : isScreen1024 ? (
          <CustomSliderWithBars
            value={scaleInputValue}
            onChange={handleSliderChange}
            onBeforeChange={() => setShowCountPanel(true)}
            onAfterChange={() => setShowCountPanel(false)}
          />
        ) : (
          <div className="slider-container select-none">
            <Slider
              min={0}
              max={100}
              marks={SLIDER_MARKS}
              step={1}
              value={scaleInputValue}
              onChange={handleSliderChange}
              onBeforeChange={() => setShowCountPanel(true)}
              onAfterChange={() => setShowCountPanel(false)}
              trackStyle={{ backgroundColor: '#FA7B4E' }}
              railStyle={{ backgroundColor: '#1F1F1F' }}
              handleStyle={{
                borderColor: '#FA7B4E',
                backgroundColor: '#181818',
                boxShadow: 'none',
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
        )}

        <div className="options flexAlignCenter">
          <div className="inputBox flexAlignCenter commonBoxBg">
            <input
              type="number"
              placeholder="0"
              value={scaleInputValue}
              // onFocus={() => setIsScaleInputFocused(true)}
              onChange={(e) => {
                const value = e.target.value;
                setScaleInputValue(Number(value));
                const numValue = Number(value);
                if (!isNaN(numValue) && value !== '') {
                  handleSliderChange(numValue);
                }
              }}
              onBlur={(e) => {
                // setIsScaleInputFocused(false);
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
          <div
            className={`maxLev ${scaleInputValue === 100 ? 'selected' : ''}`}
            onClick={() => handleSliderChange(100)}
          >
            {t`Max`}
          </div>
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
          } else if (selectType === 'market') {
            handleMarketClick(token);
          }
        }}
      />
    </>
  );
}

export default memo(PayLongSizeRateCom);

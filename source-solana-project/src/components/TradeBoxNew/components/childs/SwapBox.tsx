import { useState, useEffect } from 'react';

import { NumberInput } from '@/components/Common/Input/NumberInput';
import { useAppStore } from '@/zustand/useAppStore';
import { getIconUrlPath } from '@/utils/lib/icon';
import { BN } from '@coral-xyz/anchor';
import {
  formatAmount,
  formatPriceUsd,
  formatParseUsdToBN,
  formatAmountWithoutHalfUp,
} from '@/utils/legacy/format';
import TokenSelectDrawer from './TokenSelectDrawer';

import IconToggle from '@/img/trade/toggle.svg';
import IconChevronDown from '@/img/trade/chevron-down.svg?react';
import { BN_ZERO } from '@/config/constants';
import { max } from 'lodash';
import { t, Trans } from '@lingui/macro';
import { useShallow } from 'zustand/react/shallow';
import { getGmw320Enabled } from '@/config/featureFlagEnable';

interface PayerSwapItem {
  tokenAddress: string;
  tokenName: string;
  amount: string;
  value: string;
  lpAmount?: string;
  maxPrice?: string;
  minPrice?: string;
  percentChange24h?: string;
  decimals?: number;
  unitPrice: string | number;
  price: BN;
  payAmount: BN;
  paySizeInUsd: BN;
  limitAmount: BN;
  receiveAmount: BN;
}

function mergeSwapPayTokenFromStore(
  nextPayToken: PayerSwapItem,
  currentPayToken: PayerSwapItem | undefined
): PayerSwapItem {
  const merged = { ...nextPayToken };
  if (
    !currentPayToken?.tokenName ||
    currentPayToken.tokenName !== nextPayToken.tokenName ||
    !currentPayToken.payAmount?.gt(BN_ZERO)
  ) {
    return merged;
  }

  merged.payAmount = currentPayToken.payAmount;
  merged.paySizeInUsd = currentPayToken.payAmount.mul(
    nextPayToken.price ?? currentPayToken.price ?? BN_ZERO
  );
  if (currentPayToken.limitAmount) {
    merged.limitAmount = currentPayToken.limitAmount;
  }
  return merged;
}

function mergeSwapReceiveTokenFromStore(
  nextReceiveToken: PayerSwapItem,
  currentReceiveToken: PayerSwapItem | undefined
): PayerSwapItem {
  const merged = { ...nextReceiveToken };
  if (
    !currentReceiveToken?.tokenName ||
    currentReceiveToken.tokenName !== nextReceiveToken.tokenName
  ) {
    return merged;
  }

  if (currentReceiveToken.receiveAmount?.gt(BN_ZERO)) {
    merged.receiveAmount = currentReceiveToken.receiveAmount;
  }
  if (currentReceiveToken.limitAmount?.gt(BN_ZERO)) {
    merged.limitAmount = currentReceiveToken.limitAmount;
  }
  return merged;
}

export default function SwapBox() {
  const isGmw320Enabled = getGmw320Enabled();
  const { marketDirection, marketType, setTradeMoney } = useAppStore(
    (state) => state.TradeboxNew
  );
  const [isPanelOpen, setIsPanelOpen] = useState(false);

  const selectSwapPayToken = useAppStore(
    useShallow((state) => state.swap.selectSwapPayToken)
  );
  const selectSwapReceiveToken = useAppStore(
    useShallow((state) => state.swap.selectSwapReceiveToken)
  );
  const setSwapMark = useAppStore(
    useShallow((state) => state.swap.setSwapMark)
  );
  const swapFinished = useAppStore(
    useShallow((state) => state.swap.swapFinished)
  );
  const setSwapFinished = useAppStore(
    useShallow((state) => state.swap.setSwapFinished)
  );

  const setSelectSwapPayToken = useAppStore(
    useShallow((state) => state.swap.setSelectSwapPayToken)
  );
  const setSelectSwapReceiveToken = useAppStore(
    useShallow((state) => state.swap.setSelectSwapReceiveToken)
  );

  const setBtnMessage = useAppStore(
    useShallow((state) => state.TradeboxNew.setBtnMessage)
  );
  const setBtnDisabled = useAppStore(
    useShallow((state) => state.TradeboxNew.setBtnDisabled)
  );
  const { tokenPriceMap } = useAppStore(
    useShallow((state) => ({
      tokenPriceMap: state.tickersState.tokenPriceMap,
    }))
  );
  // const { setBtnMessage, setBtnDisabled } = useAppStore((state) => [state.TradeboxNew.setBtnMessage, state.TradeboxNew.setBtnDisabled]);
  const payerSwapList = useAppStore(
    useShallow(
      (state) => state.payerSwapTokens.payerSwapList as PayerSwapItem[]
    )
  );

  const [payToken, setPayToken] = useState<PayerSwapItem>();
  const [receiveToken, setReceiveToken] = useState<PayerSwapItem>();
  const [isSwapped, setIsSwapped] = useState<boolean>(false);

  const [payAmount, setPayAmount] = useState<string>('');
  const [receiveAmount, setReceiveAmount] = useState<string>('');
  const [limitAmount, setLimitAmount] = useState<string>('');
  const [balanceAmount, setBalanceAmount] = useState<string>('');
  const [receiveBalanceAmount, setReceiveBalanceAmount] = useState<string>('');

  const [marketAmount, setMarketAmount] = useState<string>('');
  // const [markMaxRatio, setmarkMaxRatio] = useState<string>("");
  // const [markMinRatio, setMarkMinRatio] = useState<string>("");

  const [inputFocus, setInputFocus] = useState<
    'pay' | 'receive' | 'limit' | ''
  >('');
  const [inputPreviousType, setInputPreviousType] = useState<
    'pay' | 'receive' | ''
  >('');

  const [tokenSelectTitle, setTokenSelectTitle] = useState<string>('Pay');
  const [selectType, setSelectType] = useState<string>('pay');
  const [isDifferentTokens, setIsDifferentTokens] = useState<boolean>(false);

  useEffect(() => {
    setPayAmount('');
    setReceiveAmount('');
    setLimitAmount('');
    setBalanceAmount('');
    setReceiveBalanceAmount('');
  }, [marketDirection]);

  useEffect(() => {
    setLimitAmount('');
    setTokenSelectTitle('Pay');
    setTimeout(() => {
      handlePayChange(payAmount, 'init');
    }, 50);
  }, [marketType]);

  const [tokens, setTokens] = useState<PayerSwapItem[]>([]);
  useEffect(() => {
    if (payerSwapList.length) {
      payerSwapList.forEach((item) => {
        const tokenPrice = tokenPriceMap.get(item.tokenAddress);
        if (tokenPrice) {
          item.price = new BN(tokenPrice.unitPrice);
        }
      });
      setTokens(payerSwapList);
      if (selectSwapPayToken?.tokenName && selectSwapReceiveToken?.tokenName) {
        const matchedPayToken = payerSwapList.find(
          (t) => t.tokenName === selectSwapPayToken.tokenName
        );
        const matchedReceiveToken = payerSwapList.find(
          (t) => t.tokenName === selectSwapReceiveToken.tokenName
        );
        if (swapFinished) {
          setPayAmount('');
          setReceiveAmount('');
          setLimitAmount('');
          setSwapFinished(false);
        }

        let nextPayToken = matchedPayToken || payerSwapList[0];
        let nextReceiveToken = matchedReceiveToken || payerSwapList[1];
        if (isGmw320Enabled) {
          const shouldPreserveInput = !swapFinished;
          nextPayToken = shouldPreserveInput
            ? mergeSwapPayTokenFromStore(
                nextPayToken,
                selectSwapPayToken as PayerSwapItem
              )
            : { ...nextPayToken };
          nextReceiveToken = shouldPreserveInput
            ? mergeSwapReceiveTokenFromStore(
                nextReceiveToken,
                selectSwapReceiveToken as PayerSwapItem
              )
            : { ...nextReceiveToken };
        }
        setPayToken(nextPayToken);
        setReceiveToken(nextReceiveToken);
        setSelectSwapPayToken(nextPayToken);
        setSelectSwapReceiveToken(nextReceiveToken);
        if (
          isGmw320Enabled &&
          !swapFinished &&
          nextPayToken.paySizeInUsd?.gt(BN_ZERO)
        ) {
          setTradeMoney(nextPayToken.paySizeInUsd);
        }
      } else {
        setPayToken(payerSwapList[0]);
        setReceiveToken(payerSwapList[1]);
        setTimeout(() => {
          setSelectSwapPayToken(payerSwapList[0]);
          setSelectSwapReceiveToken(payerSwapList[1]);
        }, 0);
      }
    }
  }, [isGmw320Enabled, payerSwapList, tokenPriceMap]);

  const [marketToken, setMarketToken] = useState<PayerSwapItem[]>([]);
  useEffect(() => {
    if (!tokens.length || !payToken || !receiveToken) return;
    const processTokens = (tokens: PayerSwapItem[]) => {
      const maxDecimals = Math.max(
        ...tokens.map((token) => token.decimals || 0)
      );
      const minDecimals = Math.min(
        ...tokens.map((token) => token.decimals || 0)
      );

      const adjustedTokens = tokens.map((token) => {
        const newToken = { ...token };
        if (token.decimals === maxDecimals) {
          const decimalsDiff = maxDecimals - minDecimals;
          if (newToken.price) {
            const priceStr = newToken.price.toString();
            newToken.price = new BN(priceStr + '0'.repeat(decimalsDiff));
          }
        }
        return newToken;
      });

      return adjustedTokens.sort((a, b) => {
        if (a?.price?.lt(b?.price)) return -1;
        if (a?.price?.gt(b?.price)) return 1;
        return 0;
      });
    };
    const newMarketToken = processTokens([payToken, receiveToken]);
    if (!newMarketToken.length || !newMarketToken[0]?.price) {
      return;
    }
    setMarketToken(newMarketToken);
    setBalanceAmount(formatAmountCompute(payToken?.amount, payToken?.decimals));
    setReceiveBalanceAmount(
      formatAmountCompute(receiveToken?.amount, receiveToken?.decimals)
    );

    const valueMaxBN = formatParseUsdToBN('1', newMarketToken[1].decimals);
    const payMaxPrice = valueMaxBN.mul(newMarketToken[1]?.price);
    let receiveMaxPrice;
    if (newMarketToken[0]?.price.gt(new BN(0))) {
      receiveMaxPrice = payMaxPrice?.div(newMarketToken[0]?.price);
    }
    const resultMaxStr = formatAmountWithoutHalfUp(
      receiveMaxPrice,
      newMarketToken[1].decimals,
      newMarketToken[1].decimals,
      false,
      false
    );
    const swapMarkStr = formatAmountWithoutHalfUp(
      receiveMaxPrice,
      newMarketToken[1].decimals,
      3,
      false,
      false
    );
    setMarketAmount(resultMaxStr.toString());
    setSwapMark(swapMarkStr);
    // setmarkMaxRatio(resultMaxStr.toString());

    // const valueMinBN = formatParseUsdToBN('1', newMarketToken[0].decimals);
    // const receiveMinPrice = valueMinBN.mul(newMarketToken[0]?.price);
    // const payMinPrice = receiveMinPrice.div(newMarketToken[1]?.price);
    // const resultMinStr = formatAmount(payMinPrice, newMarketToken[0].decimals, newMarketToken[0].decimals, false, false)
    // setMarkMinRatio(resultMinStr.toString())

    setIsSwapped(payToken?.tokenName !== newMarketToken[0]?.tokenName);

    if (
      payToken?.tokenAddress?.toString() ===
      receiveToken?.tokenAddress?.toString()
    ) {
      setIsDifferentTokens(true);
    } else {
      setIsDifferentTokens(false);
    }
  }, [payToken, receiveToken]);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    if (!receiveToken?.tokenName || !selectSwapReceiveToken?.tokenName) {
      return;
    }
    if (inputPreviousType === 'receive') {
      if (receiveAmount) {
        timer = setTimeout(() => {
          handleReceiveChange(receiveAmount);
        }, 100);
      }
    } else if (payAmount) {
      timer = setTimeout(() => {
        handlePayChange(payAmount);
      }, 100);
    }
    return () => {
      if (timer) {
        clearTimeout(timer);
      }
    };
  }, [selectSwapPayToken, selectSwapReceiveToken]);

  useEffect(() => {
    if (inputPreviousType === 'pay') {
      handlePayChange(payAmount);
    } else if (inputPreviousType === 'receive') {
      handleReceiveChange(receiveAmount);
    }
  }, [marketToken]);

  useEffect(() => {
    const payTokenNew = { ...payToken };
    payTokenNew.payAmount = new BN(
      formatParseUsdToBN(payAmount || '0', payTokenNew.decimals)
    );
    payTokenNew.paySizeInUsd = formatParseUsdToBN(
      payAmount || '0',
      payToken?.decimals
    ).mul(new BN(payToken?.price || 0));
    payTokenNew.limitAmount = new BN(
      formatParseUsdToBN(limitAmount || '0', receiveToken?.decimals)
    );
    payTokenNew.receiveAmount = new BN('0');
    if (payTokenNew?.tokenName) {
      setSelectSwapPayToken({ ...payToken, ...payTokenNew });
    }
    setTradeMoney(payTokenNew.paySizeInUsd);

    const inAmout = new BN(
      formatParseUsdToBN(payAmount || '0', payTokenNew.decimals) || '0'
    );
    const maxAmout = new BN(
      formatParseUsdToBN(balanceAmount || '0', payTokenNew.decimals) || '0'
    );
    if (payToken?.tokenName) {
      if (isDifferentTokens) {
        setBtnMessage(t`Select different tokens`);
        setBtnDisabled(true);
      } else if (
        (payToken?.tokenName === 'PUMP' &&
          receiveToken?.tokenName !== 'WPUMP') ||
        (payToken?.tokenName !== 'WPUMP' && receiveToken?.tokenName === 'PUMP')
      ) {
        setBtnMessage(
          t`Auto-unwrapping isn't supported. Please select WPUMP instead`
        );
        setBtnDisabled(true);
      } else if (inAmout.eq(new BN(0))) {
        setBtnMessage(t`Enter an amount`);
        setBtnDisabled(true);
      } else if (inAmout.gt(maxAmout)) {
        setBtnMessage(
          t`Insufficient ${payToken?.tokenName === 'WGMX' ? 'GMX' : payToken?.tokenName} balance`
        );
        setBtnDisabled(true);
      } else if (inAmout.eq(maxAmout)) {
        setBtnMessage(
          t`Swap ${payToken?.tokenName === 'WGMX' ? 'GMX' : payToken?.tokenName}`
        );
        setBtnDisabled(false);
      } else {
        setBtnMessage(
          t`Swap ${payToken?.tokenName === 'WGMX' ? 'GMX' : payToken?.tokenName}`
        );
        setBtnDisabled(false);
      }
    }
  }, [payAmount, limitAmount, isDifferentTokens, payToken]);

  useEffect(() => {
    const receiveTokenNew = { ...receiveToken };
    receiveTokenNew.receiveAmount = new BN(
      formatParseUsdToBN(receiveAmount || '0', receiveTokenNew.decimals)
    );
    if (receiveTokenNew?.tokenName) {
      setSelectSwapReceiveToken(receiveTokenNew);
    }
  }, [receiveAmount]);

  const PRECISION = new BN(10).pow(new BN(20));
  const mulBN = (a: BN, b: BN, decimals: BN): BN => {
    return a.mul(b).div(decimals);
  };

  const divBN = (a: BN, b: BN, decimals: BN): BN => {
    return a.mul(decimals).div(b);
  };

  const toDecimal = (
    bn: BN,
    decimals: number,
    displayDecimals: number = decimals
  ): string => {
    const s = bn.toString().padStart(decimals + 1, '0');
    const intPart = s.slice(0, -decimals) || '0';
    let fracPart = s.slice(-decimals);
    if (displayDecimals < decimals) {
      fracPart = fracPart.slice(0, displayDecimals);
    }
    fracPart = fracPart.replace(/0+$/, '');
    return fracPart ? `${intPart}.${fracPart}` : intPart;
  };

  const formatAmountCompute = (amount: string, decimals: number): string => {
    return formatAmountWithoutHalfUp(new BN(amount || '0'), decimals);
  };

  const handlePayChange = (value: string, type?: string) => {
    setPayAmount(value);
    if (parseFloat(limitAmount) > 0 && type !== 'init') {
      if (!isSwapped) {
        const payBN = mulBN(
          formatParseUsdToBN(value, 14),
          PRECISION,
          PRECISION
        );
        const limtBN = mulBN(
          formatParseUsdToBN(limitAmount, 14),
          PRECISION,
          PRECISION
        );
        const receiveBN = divBN(payBN, limtBN, PRECISION);
        const receiveAmount = toDecimal(receiveBN, 20, receiveToken.decimals);
        setReceiveAmount(receiveAmount);
      } else {
        const payBN = formatParseUsdToBN(value, 14);
        const limtBN = formatParseUsdToBN(limitAmount, 14);
        const receiveBN = payBN.mul(limtBN).div(new BN(10).pow(new BN(14)));
        const receiveAmount = toDecimal(receiveBN, 14, receiveToken.decimals);
        setReceiveAmount(receiveAmount);
        // console.log('278 receiveAmount', {
        //   payBN: payBN.toString(),
        //   limtBN: limtBN.toString(),
        //   receiveBN: receiveBN.toString(),
        //   receiveAmount: receiveAmount.toString()
        // })
      }
    } else {
      if (!value || value === '0') {
        return setReceiveAmount('');
      }
      try {
        if (isSwapped) {
          const valueBN = formatParseUsdToBN(
            value || '0',
            receiveToken.decimals
          );
          const payPrice = valueBN.mul(marketToken[1]?.price);
          const receivePrice = payPrice.div(marketToken[0]?.price);
          const resultStr = formatAmountWithoutHalfUp(
            receivePrice,
            receiveToken.decimals,
            receiveToken.decimals,
            false,
            false
          );
          setReceiveAmount(receivePrice.isZero() ? '' : resultStr);
        } else {
          const valueBN = formatParseUsdToBN(
            value || '0',
            receiveToken.decimals
          );
          const receivePrice = valueBN.mul(marketToken[0]?.price);
          const payPrice = receivePrice.div(marketToken[1]?.price);
          const resultStr = formatAmountWithoutHalfUp(
            payPrice,
            receiveToken.decimals,
            receiveToken.decimals,
            false,
            false
          );
          setReceiveAmount(payPrice.isZero() ? '' : resultStr);
        }
      } catch (error) {
        console.error('error:', error);
        setReceiveAmount('');
      }
    }
  };

  const handleReceiveChange = (value: string, type?: string) => {
    setReceiveAmount(value);

    if (parseFloat(limitAmount) > 0 && type !== 'init') {
      if (!isSwapped) {
        const receiveBN = formatParseUsdToBN(value, 20);
        const limtBN = formatParseUsdToBN(limitAmount, 20);
        const payBN = limtBN.mul(receiveBN).div(PRECISION);
        const payAmount = toDecimal(payBN, 20, payToken.decimals);
        setPayAmount(payAmount);
      } else {
        const receiveBN = formatParseUsdToBN(value, 20);
        const limtBN = formatParseUsdToBN(limitAmount, 20);
        const payBN = receiveBN.mul(PRECISION).div(limtBN);
        const payAmount = toDecimal(payBN, 20, payToken.decimals);
        setPayAmount(payAmount);
      }
    } else {
      if (!value || value === '0') {
        return setPayAmount('');
      }
      try {
        if (isSwapped) {
          const valueBN = formatParseUsdToBN(
            value || '0',
            receiveToken.decimals
          );
          const payPrice = valueBN.mul(marketToken[0]?.price);
          const receivePrice = payPrice.div(marketToken[1]?.price);
          const resultStr = formatAmountWithoutHalfUp(
            receivePrice,
            receiveToken.decimals,
            receiveToken.decimals,
            false,
            false
          );
          setPayAmount(receivePrice.isZero() ? '' : resultStr);
        } else {
          const valueBN = formatParseUsdToBN(value || '0', payToken.decimals);
          const receivePrice = valueBN.mul(marketToken[1]?.price);
          const payPrice = receivePrice.div(marketToken[0]?.price);
          const resultStr = formatAmountWithoutHalfUp(
            payPrice,
            payToken.decimals,
            payToken.decimals,
            false,
            false
          );
          setPayAmount(payPrice.isZero() ? '' : resultStr);
        }
      } catch (error) {
        console.error('error:', error);
        setPayAmount('');
      }
    }
  };

  const handleLimitChange = (value: string) => {
    setLimitAmount(value);

    if (!payAmount || !receiveAmount) {
      return;
    }

    if (!value) {
      if (inputPreviousType === 'pay') {
        handlePayChange(payAmount, 'init');
      } else {
        handleReceiveChange(receiveAmount, 'init');
      }
      return;
    }
    if (inputPreviousType === 'pay') {
      if (!isSwapped) {
        const payBN = mulBN(
          formatParseUsdToBN(payAmount, 14),
          PRECISION,
          PRECISION
        );
        const limtBN = mulBN(
          formatParseUsdToBN(value, 14),
          PRECISION,
          PRECISION
        );
        const receiveBN = divBN(payBN, limtBN, PRECISION);
        const receiveAmount = toDecimal(receiveBN, 20, receiveToken.decimals);
        setReceiveAmount(receiveAmount);
      } else {
        const payBN = formatParseUsdToBN(payAmount, 14);
        const limtBN = formatParseUsdToBN(value, 14);
        const receiveBN = payBN.mul(limtBN).div(new BN(10).pow(new BN(14)));
        const receiveAmount = toDecimal(receiveBN, 14, receiveToken.decimals);
        setReceiveAmount(receiveAmount);
        // console.log('380 receiveAmount', {
        //   payBN: payBN.toString(),
        //   limtBN: limtBN.toString(),
        //   receiveBN: receiveBN.toString(),
        //   receiveAmount: receiveAmount.toString()
        // })
      }
    } else if (inputPreviousType === 'receive') {
      const receiveBN = formatParseUsdToBN(receiveAmount, 20);
      const limtBN = formatParseUsdToBN(value, 20);
      const payBN = limtBN.mul(receiveBN).div(PRECISION);
      const payAmount = toDecimal(payBN, 20, payToken.decimals);
      setPayAmount(payAmount);
    }
  };

  const handleSwapTokens = () => {
    setInputPreviousType(inputPreviousType === 'pay' ? 'receive' : 'pay');
    setPayAmount(receiveAmount);
    setReceiveAmount(payAmount);
    setPayToken(receiveToken);
    setReceiveToken(payToken);
    setSelectSwapPayToken(receiveToken);
    setSelectSwapReceiveToken(payToken);
  };

  const handlePayTokenChange = (tokenName: string) => {
    const newPayToken = tokens.find((t) => t.tokenName === tokenName);
    if (!newPayToken) return;
    setPayToken(newPayToken);
    setSelectSwapPayToken(newPayToken);
  };

  const handleReceiveTokenChange = (tokenName: string) => {
    const newReceiveToken = tokens.find((t) => t.tokenName === tokenName);
    if (!newReceiveToken) return;
    setReceiveToken(newReceiveToken);
    setSelectSwapReceiveToken(newReceiveToken);
  };

  const getInputBoxClassName = (
    focusedInput: typeof inputFocus,
    extraClassName = ''
  ) =>
    `h-[8.7rem] rounded-[0.8rem] border-[1px] border-[transparent] bg-[#1F1F1F] p-[1.2rem] transition-colors duration-200 hover:border-[#535353] hover:bg-[#1F1F1F] active:!border-[#FA7B4E] active:bg-[#1F1F1F] focus-within:!border-[#FA7B4E] ${inputFocus === focusedInput ? '!border-[#FA7B4E]' : ''} ${extraClassName}`;

  return (
    <div className="m-[1.2rem] w-auto space-y-4 rounded-2xl bg-[#181818] text-white">
      <div className="relative space-y-4">
        <div className={getInputBoxClassName('pay')}>
          <div className="text-[1.2rem] text-[#A3A3A3]">{t`Pay`}</div>
          <div className="my-2 flex items-center justify-between">
            <NumberInput
              value={payAmount}
              className="h-[2.8rem] w-full bg-transparent px-[0] py-[0.2rem] text-[1.6rem] placeholder-[#A3A3A3] outline-none"
              onValueChange={(e) => {
                if (
                  selectSwapPayToken?.tokenAddress ===
                    'So11111111111111111111111111111111111111112' &&
                  selectSwapReceiveToken?.tokenAddress ===
                    'So1Zu7vPQQxrguzUehKAyVLpjcc769zxgBuDAsxTUMH'
                ) {
                  return;
                }
                handlePayChange(e.target.value);
                setInputPreviousType('pay');
              }}
              onFocus={() => setInputFocus('pay')}
              onBlur={() => setInputFocus('')}
              placeholder="0.0"
            />
            <img
              className="z-20"
              src={getIconUrlPath(
                payToken?.tokenName === 'WGMX' ? 'GMX' : payToken?.tokenName,
                24
              )}
              alt={payToken?.tokenName}
              width={20}
            />
            <div
              className="flex cursor-pointer items-center hover:text-[#FA7B4E]"
              onClick={() => {
                setTokenSelectTitle('Pay');
                setSelectType('pay');
                setIsPanelOpen(true);
              }}
            >
              <span className="mx-[0.4rem] text-[1.4rem]">
                {payToken?.tokenName === 'WGMX' ? 'GMX' : payToken?.tokenName}
              </span>
              <IconChevronDown fill="" className="h-[1.6rem] w-[1.6rem]" />
            </div>
          </div>
          <div className="flex items-center justify-between">
            <div
              className={`text-[1.2rem] text-[#A3A3A3] ${receiveAmount === '' ? 'text-[#A3A3A3]' : 'text-[#fff]'}`}
            >
              {formatPriceUsd(
                formatParseUsdToBN(payAmount || '0', payToken?.decimals).mul(
                  new BN(payToken?.price || 0)
                ),
                { fallbackToZero: true }
              )}
            </div>
            <div
              className={`flex items-center text-[1.2rem] text-[#A3A3A3] ${parseFloat(balanceAmount) > 0 ? 'opacity-100' : 'opacity-0'}`}
            >
              <p>
                <span className="text-[#fff] ">{balanceAmount}</span>
                <em className="ml-[0.2rem] not-italic">
                  {payToken?.tokenName === 'WGMX' ? 'GMX' : payToken?.tokenName}
                </em>
              </p>
              <div
                className={`ml-[0.8rem] rounded-[2rem] bg-[#535353] px-[0.8rem] py-[0.25rem] font-[500] text-[#fff] ${parseFloat(balanceAmount) > 0 ? 'cursor-pointer' : ''}`}
                onClick={() => {
                  handlePayChange(balanceAmount);
                  setInputPreviousType('pay');
                }}
              >
                {t`Max`}
              </div>
            </div>
          </div>
        </div>

        <div className="border-swap-divider">
          <button
            onClick={handleSwapTokens}
            className="absolute left-[50%] top-[50%] -translate-x-1/2 -translate-y-1/2 transform rounded-full"
          >
            <img src={IconToggle} alt="" />
          </button>
        </div>

        <div className={getInputBoxClassName('receive')}>
          <div className="text-[1.2rem] text-[#A3A3A3]">{t`Receive`}</div>
          <div className="mt-2 flex items-center justify-between">
            <NumberInput
              value={receiveAmount}
              className="h-[2.4rem] w-full bg-transparent px-[0] py-[0.2rem] text-[1.6rem] placeholder-[#A3A3A3] outline-none"
              onValueChange={(e) => {
                if (
                  selectSwapPayToken?.tokenAddress ===
                    'So11111111111111111111111111111111111111112' &&
                  selectSwapReceiveToken?.tokenAddress ===
                    'So1Zu7vPQQxrguzUehKAyVLpjcc769zxgBuDAsxTUMH'
                ) {
                  return;
                }
                handleReceiveChange(e.target.value);
                setInputPreviousType('receive');
              }}
              onFocus={() => setInputFocus('receive')}
              onBlur={() => setInputFocus('')}
              placeholder="0.0"
            />
            <img
              className="z-20"
              src={getIconUrlPath(
                receiveToken?.tokenName === 'WGMX'
                  ? 'GMX'
                  : receiveToken?.tokenName,
                24
              )}
              alt={receiveToken?.tokenName}
              width={20}
            />
            <div
              className="flex cursor-pointer items-center hover:text-[#FA7B4E]"
              onClick={() => {
                setTokenSelectTitle('Receive');
                setSelectType('receive');
                setIsPanelOpen(true);
              }}
            >
              <span className="mx-[0.4rem] text-[1.4rem]">
                {receiveToken?.tokenName === 'WGMX'
                  ? 'GMX'
                  : receiveToken?.tokenName}
              </span>
              <IconChevronDown fill="" className="h-[1.6rem] w-[1.6rem]" />
            </div>
          </div>
          <div className="flex items-center justify-between">
            <div
              className={`text-[1.2rem] text-[#A3A3A3] ${receiveAmount === '' ? 'text-[#A3A3A3]' : 'text-[#fff]'}`}
            >
              {formatPriceUsd(
                formatParseUsdToBN(
                  receiveAmount || '0',
                  receiveToken?.decimals
                ).mul(new BN(receiveToken?.price || 0)),
                { fallbackToZero: true }
              )}
            </div>
            <div
              className={`flex items-center text-[1.2rem] text-[#A3A3A3] ${parseFloat(receiveBalanceAmount) > 0 ? 'opacity-100' : 'opacity-0'}`}
            >
              <p>
                <span className="text-[#fff] ">{receiveBalanceAmount}</span>
                <em className="ml-[0.2rem] not-italic">
                  {receiveToken?.tokenName === 'WGMX'
                    ? 'GMX'
                    : receiveToken?.tokenName}
                </em>
              </p>
            </div>
          </div>
        </div>
      </div>

      {marketType === 'Limit' && (
        <div
          className={getInputBoxClassName(
            'limit',
            'flex flex-col justify-center gap-6'
          )}
        >
          <div className="flex w-full items-center justify-between text-[1.2rem] text-[#A3A3A3]">
            <span>{t`Limit Price`}</span>
            <span
              className="cursor-pointer"
              onClick={() => handleLimitChange(marketAmount)}
            >
              Mark{' '}
              <em className="text-[1.2rem] not-italic text-[#fff]">
                {marketAmount}
              </em>{' '}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <NumberInput
              value={limitAmount}
              className="h-[2.4rem] w-full bg-transparent px-[0] py-[0.2rem] text-[1.7rem] placeholder-[#A3A3A3] outline-none"
              onValueChange={(e) => {
                handleLimitChange(e.target.value);
              }}
              onFocus={() => setInputFocus('limit')}
              onBlur={() => setInputFocus('')}
              placeholder="0.00"
            />
            <div className="flex w-full items-center justify-end text-[1.4rem]">
              <img
                className="z-20 mr-[0.4rem]"
                src={getIconUrlPath(
                  marketToken[0]?.tokenName === 'WGMX'
                    ? 'GMX'
                    : marketToken[0]?.tokenName,
                  24
                )}
                alt={marketToken[0]?.tokenName}
                width={20}
              />
              <div>
                {marketToken[0]?.tokenName === 'WGMX'
                  ? 'GMX'
                  : marketToken[0]?.tokenName}
              </div>
              <p className="px-[0.4rem] text-[1.6rem] text-[#A3A3A3]">per</p>
              <img
                className="z-20 mr-[0.4rem]"
                src={getIconUrlPath(
                  marketToken[1]?.tokenName === 'WGMX'
                    ? 'GMX'
                    : marketToken[1]?.tokenName,
                  24
                )}
                alt={marketToken[1]?.tokenName}
                width={20}
              />
              <div>
                {marketToken[1]?.tokenName === 'WGMX'
                  ? 'GMX'
                  : marketToken[1]?.tokenName}
              </div>
            </div>
          </div>
        </div>
      )}
      <TokenSelectDrawer
        key={selectType}
        isOpen={isPanelOpen}
        selectType={selectType}
        title={tokenSelectTitle}
        payerSwapTokens={payerSwapList}
        onClose={() => setIsPanelOpen(false)}
        onSelectToken={(token) => {
          if (!token) {
            return;
          }
          if (selectType === 'pay') {
            handlePayTokenChange(token.tokenName);
          } else if (selectType === 'receive') {
            handleReceiveTokenChange(token.tokenName);
          }
        }}
      />
    </div>
  );
}

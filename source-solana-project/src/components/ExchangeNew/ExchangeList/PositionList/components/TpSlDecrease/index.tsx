import { useState, useEffect, useMemo, useRef } from 'react';
import { t } from '@lingui/macro';
import ExchangeButton from '../compose-components/ExchangeButton/index';
import Title from '../compose-components/title/index';
import InputItem from '../compose-components/InputItem/index';
import SliderComponent from '../compose-components/slider/index';
import KeepLeverage from '../compose-components/SwitchLabel/index';
import SwitchLabel from '../compose-components/SwitchLabel/index';
import { PositionInfo } from '@/selectors/position/types';
import { USD_DECIMALS } from '@/config/constants';
import { useWallet } from '@solana/wallet-adapter-react';
import { formatMarketName } from '@/components/TradeBoxNew/utils/formatMarketName';
import {
  getRecentBlockhash,
  getRecentPrioritizationFeesFn,
} from '@/components/TradeBoxNew/utils/getRpcOrSdkParams';
import {
  useCreateOrderParamsByTpSlDecrease,
  getExecOrderResultMessage,
  getExecOrderErrorInfo,
  type ExecOrderResult,
  isExecOrderSuccess,
} from '@/components/TradeBoxNew/utils/execOrder';
import { getGmw351Enabled, getGmw402Enabled } from '@/config/featureFlagEnable';
import { formatAmount, formatRatePercentage, formatPriceUsd } from '@/utils/legacy/format';
import { getMarketPriceInputDecimals } from '@/utils/priceInput/getMarketPriceInputDecimals';
import { useAppStore } from '@/zustand/useAppStore';
import {
  formatInput,
  divideAndRound,
} from '@/components/TradeBoxNew/utils/formatInput';
import { BN } from '@coral-xyz/anchor';
import { formatUsdToKMB } from '@/utils/legacy/format';
import { useStoreProgram } from '@/contexts/anchor';
import { PublicKey } from '@solana/web3.js';
import { helperToast } from '@/utils/lib/helperToast';
import { helperNotice } from '@/utils/lib/helperNotice';
import { removeNotice } from '@/utils/lib/helperNotice';

import CountPanel from '@/components/TradeBoxNew/components/childs/tokensPanel/countPanel';
import './index.scss';
import { useShallow } from 'zustand/react/shallow';
import { useComputeUnits } from '@/hooks/utilsHooks/useComputeUnits';
import { GMX_SOLANA_FOREX_PRECISION_MARKET_TOKENS } from '@/config/program';
import { isUSMarketOpen, isMetalMarketOpen, isCommodityMarketOpen } from '@/components/TradeBoxNew/utils/isUSMarketOpen';

export interface TpSlDecreaseProps {
  position: PositionInfo;
  isVisible: boolean;
  onClose: () => void;
  onConfirm?: (amount: string) => void;
}

export default function TpSlDecrease({
  position,
  isVisible,
  onClose,
}: TpSlDecreaseProps) {
  if (!isVisible) return null;
  const { payerInfo } = useAppStore(
    useShallow((state) => state.payerSwapTokens)
  );
  const { tokenPriceMap } = useAppStore(
    useShallow((state) => state.tickersState)
  );
  const { marketsMap } = useAppStore(useShallow((state) => state.markets));
  const { signAllTransactions } = useWallet();
  const { computeUnitPrice } = useComputeUnits();
  const isLong = position?.isLong;
  const symbol = position?.symbol;
  const title = isLong
    ? t`TP/SL: Long ${formatMarketName(position?.marketInfo?.indexToken)} Decrease`
    : t`TP/SL: Short ${formatMarketName(position?.marketInfo?.indexToken)} Decrease`;
  const leverage = formatAmount(new BN(position?.leverage), USD_DECIMALS, 1);
  const execution_price = useMemo(
    () =>
      new BN(tokenPriceMap?.get(position?.marketInfo?.indexToken)?.unitPrice),
    [position?.marketInfo?.indexToken, tokenPriceMap]
  );
  const gmw402Enabled = getGmw402Enabled();
  const priceInputDecimals = getMarketPriceInputDecimals(
    tokenPriceMap?.get(position?.marketInfo?.indexToken)?.price,
    position?.marketInfo?.indexToken
  );
  const sizeNumber = new BN(position?.sizeInTokens);
  const storeProgram = useStoreProgram();
  const [tpPrice, setTpPrice] = useState<string>();
  const [slPrice, setSlPrice] = useState<string>();
  const [editTpSl, setEditTpSl] = useState(false);
  const [showTpCountPanel, setShowTpCountPanel] = useState(false);
  const [showSlCountPanel, setShowSlCountPanel] = useState(false);
  const [closeSize, setCloseSize] = useState<string>();
  const [sizeBn, setSizeBn] = useState<BN>();
  const [keepLeverage, setKeepLeverage] = useState(false);
  const [rate, setRate] = useState(0);
  const [isOk, setIsOk] = useState(false);
  const [btnDisabled, setBtnDisabled] = useState(null);
  const [btnTitle, setBtnTitle] = useState('');
  const [isError, setIsError] = useState(false);
  const [tpGain, setTpGain] = useState({
    tpGainMoney: '',
    tpGainRate: '',
  });
  const [slGain, setSlGain] = useState({
    slGainMoney: '',
    slGainRate: '',
  });
  const [tpGainStyle, setTpGainStyle] = useState(true);
  const [slGainStyle, setSlGainStyle] = useState(true);
  const [isForbiddenTrade, setIsForbiddenTrade] = useState(false);
  useEffect(() => {
    if (tpPrice) {
      const tpPriceBN = formatInput(tpPrice, USD_DECIMALS - position.decimals);
      if (isLong) {
        if (tpPriceBN.lt(execution_price)) {
          setShowTpCountPanel(true);
          setBtnDisabled(true);
          return;
        } else {
          setShowTpCountPanel(false);
          calTpForLong(tpPriceBN);
        }
      } else {
        if (tpPriceBN.gt(execution_price)) {
          setShowTpCountPanel(true);
          setBtnDisabled(true);
          return;
        } else {
          setShowTpCountPanel(false);
          calTpForShort(tpPriceBN);
        }
      }
    }
    if (slPrice) {
      const slPriceBN = formatInput(slPrice, USD_DECIMALS - position.decimals);
      if (isLong) {
        if (slPriceBN.gt(execution_price)) {
          setShowSlCountPanel(true);
          setBtnDisabled(true);
          return;
        } else {
          setShowSlCountPanel(false);
          calSlForLong(slPriceBN);
        }
      } else {
        if (slPriceBN.lt(execution_price)) {
          setShowSlCountPanel(true);
          setBtnDisabled(true);
          return;
        } else {
          setShowSlCountPanel(false);
          calSlForShort(slPriceBN);
        }
      }
    }
  }, [tokenPriceMap, btnDisabled, closeSize, rate]);

  useEffect(() => {
    if (isForbiddenTrade) {
      return;
    }
    if (!tpPrice && !slPrice) {
      setBtnDisabled(true);
      setBtnTitle(t`Enter a price`);
    } else {
      if (sizeBn?.gt(position?.sizeInUsd || new BN(0))) {
        setBtnDisabled(true);
        setBtnTitle(t`Max close amount exceeded`);
        return
      }
      if (tpPrice && !slPrice) {
        setBtnTitle(t`Create Take-Profit Order`);
      } else if (!tpPrice && slPrice) {
        setBtnTitle(t`Create Stop-Loss Order`);
      } else if (tpPrice && slPrice) {
        setBtnTitle(t`Create TP&SL Order`);
      }
      setBtnDisabled(false);
    }
  }, [tpPrice, slPrice, sizeBn]);

  // USA Market set
  useEffect(() => {
    const marketInfo = marketsMap.get(position?.marketTokenAddress.toBase58());
    if (marketInfo?.closed) {
      setBtnDisabled(true);
      setBtnTitle(t`Market Is Not Open`);
      setIsForbiddenTrade(true);
    } else {
      setIsForbiddenTrade(false);
    }
  }, [marketsMap, position?.marketTokenAddress]);

  const calTpForLong = (value: BN) => {
    const fullRate = !editTpSl ? 100 : rate;
    const tpPriceBN = value;
    const tpGainMoney = tpPriceBN
      ?.sub(execution_price)
      .mul(sizeNumber)
      .mul(new BN(fullRate))
      .div(new BN(100));
    const formatTpGainMoney = formatUsdToKMB(tpGainMoney);
    const tpGainRate = tpGainMoney.eq(new BN(0))
      ? new BN(0)
      : tpPriceBN
        ?.sub(execution_price)
        .mul(new BN(10).pow(new BN(USD_DECIMALS)))
        .div(execution_price);
    const formatTpGainRate = formatRatePercentage(tpGainRate, 2);
    const isGain = tpGainMoney.gt(new BN(0));
    setTpGainStyle(isGain);
    setTpGain({
      tpGainMoney: formatTpGainMoney,
      tpGainRate: formatTpGainRate,
    });
  };

  const calSlForLong = (value: BN) => {
    const fullRate = !editTpSl ? 100 : rate;
    const slPriceBN = value;
    const slLossMoney = slPriceBN
      ?.sub(execution_price)
      .mul(sizeNumber)
      .mul(new BN(fullRate))
      .div(new BN(100));
    const formatSlLossMoney = formatUsdToKMB(slLossMoney);
    const slLossRate = slLossMoney.eq(new BN(0))
      ? new BN(0)
      : slPriceBN
        ?.sub(execution_price)
        .mul(new BN(10).pow(new BN(USD_DECIMALS)))
        .div(execution_price);
    const formatSlLossRate = formatRatePercentage(slLossRate, 2);
    const isGain = slLossMoney.gt(new BN(0));
    setSlGainStyle(isGain);
    setSlGain({
      slGainMoney: formatSlLossMoney,
      slGainRate: formatSlLossRate,
    });
  };

  const calTpForShort = (value: BN) => {
    const fullRate = !editTpSl ? 100 : rate;
    const tpPriceBN = value;
    const tpGainMoney = execution_price
      ?.sub(tpPriceBN)
      .mul(sizeNumber)
      .mul(new BN(fullRate))
      .div(new BN(100));
    console.log('tpGainMoney', tpGainMoney.gt(new BN(0)));
    const formatTpGainMoney = formatUsdToKMB(tpGainMoney);
    const tpGainRate = tpGainMoney.eq(new BN(0))
      ? new BN(0)
      : execution_price
        ?.sub(tpPriceBN)
        .mul(new BN(10).pow(new BN(USD_DECIMALS)))
        .div(execution_price);
    const formatTpGainRate = formatRatePercentage(tpGainRate, 2);
    const isGain = tpGainMoney.gt(new BN(0));
    setTpGainStyle(isGain);
    setTpGain({
      tpGainMoney: formatTpGainMoney,
      tpGainRate: formatTpGainRate,
    });
  };

  const calSlForShort = (value: BN) => {
    const fullRate = !editTpSl ? 100 : rate;
    const slPriceBN = value;
    const slLossMoney = execution_price
      ?.sub(slPriceBN)
      .mul(sizeNumber)
      .mul(new BN(fullRate))
      .div(new BN(100));
    const formatSlLossMoney = formatUsdToKMB(slLossMoney);
    const slLossRate = slLossMoney.eq(new BN(0))
      ? new BN(0)
      : execution_price
        ?.sub(slPriceBN)
        .mul(new BN(10).pow(new BN(USD_DECIMALS)))
        .div(execution_price);
    const formatSlLossRate = formatRatePercentage(slLossRate, 2);
    const isGain = slLossMoney.gt(new BN(0));
    setSlGainStyle(isGain);
    setSlGain({
      slGainMoney: formatSlLossMoney,
      slGainRate: formatSlLossRate,
    });
  };

  return (
    <>
      <div className="market-decrease-overlay" onClick={onClose} />

      <div className="market-decrease-modal">
        <Title title={title} onClose={onClose} />
        <div className="market-decrease-modal-markPrice">
          <div className='market-decrease-modal-markPrice-title'>{t`Mark Price`}</div>
          <div className='market-decrease-modal-markPrice-value'>{formatPriceUsd(execution_price?.mul(new BN(10).pow(new BN(position.decimals))), {
            displayDecimals: gmw402Enabled ? priceInputDecimals : undefined,
            isDisplayDecimals: gmw402Enabled
              ? priceInputDecimals !== undefined
              : GMX_SOLANA_FOREX_PRECISION_MARKET_TOKENS.includes(position?.marketInfo?.indexToken),
          })}</div>
        </div>
        <div className="market-decrease-content">
          <div className={`market-decrease-content-item`}>
            <CountPanel
              amount={
                isLong
                  ? t`Trigger price below mark price`
                  : t`Trigger price above mark price`
              }
              showCountPanel={showTpCountPanel}
              onClose={() => setShowTpCountPanel(false)}
            />
            <InputItem
              title={t`TP Price`}
              value={tpPrice}
              unit="USD"
              decimalPlaces={gmw402Enabled ? priceInputDecimals : undefined}
              onChange={(value) => {
                setTpPrice(value);
                const tpPriceBN = formatInput(
                  value,
                  USD_DECIMALS - position.decimals
                );
                if (isLong) {
                  if (tpPriceBN.lt(execution_price)) {
                    if (!value) {
                      setShowTpCountPanel(false);
                      setTpGain({
                        tpGainMoney: '',
                        tpGainRate: '',
                      });
                      return;
                    }
                    setBtnDisabled(true);
                    setShowTpCountPanel(true);
                    setTpGain({
                      tpGainMoney: '',
                      tpGainRate: '',
                    });
                    return;
                  } else {
                    setShowTpCountPanel(false);
                    calTpForLong(tpPriceBN);
                  }
                } else {
                  if (!value) {
                    setTpGain({
                      tpGainMoney: '',
                      tpGainRate: '',
                    });
                    return;
                  }
                  if (tpPriceBN.gt(execution_price)) {
                    setTpGain({
                      tpGainMoney: '',
                      tpGainRate: '',
                    });
                    setShowTpCountPanel(true);
                    setBtnDisabled(true);
                    return;
                  } else {
                    setShowTpCountPanel(false);
                    calTpForShort(tpPriceBN);
                  }
                }
              }}
              onBlur={(value) => {
                const tpPriceBN = formatInput(
                  value,
                  USD_DECIMALS - position.decimals
                );
                if (isLong) {
                  if (tpPriceBN.lt(execution_price)) {
                    setTpPrice('');
                    return;
                  }
                } else {
                  if (tpPriceBN.gt(execution_price)) {
                    setTpPrice('');
                    return;
                  }
                }
              }}
            />
            <InputItem
              className={tpGainStyle ? 'green' : 'red'}
              title={t`Est. PnL`}
              value={
                tpGain?.tpGainMoney
                  ? tpGain?.tpGainMoney + '(' + tpGain?.tpGainRate + ')'
                  : ''
              }
              disabled={true}
            />
          </div>

          <div className={`market-decrease-content-item`}>
            <CountPanel
              amount={
                isLong
                  ? t`Trigger price above mark price`
                  : t`Trigger price below mark price`
              }
              showCountPanel={showSlCountPanel}
              onClose={() => setShowSlCountPanel(false)}
            />
            <InputItem
              title={t`SL Price`}
              value={slPrice}
              unit="USD"
              decimalPlaces={gmw402Enabled ? priceInputDecimals : undefined}
              onChange={(value) => {
                setSlPrice(value);
                const slPriceBN = formatInput(
                  value,
                  USD_DECIMALS - position.decimals
                );
                if (isLong) {
                  if (!value) {
                    setSlGain({
                      slGainMoney: '',
                      slGainRate: '',
                    });
                    return;
                  }
                  if (slPriceBN.gt(execution_price)) {
                    setShowSlCountPanel(true);
                    setSlGain({
                      slGainMoney: '',
                      slGainRate: '',
                    });
                    return;
                  } else {
                    setShowSlCountPanel(false);
                    calSlForLong(slPriceBN);
                  }
                } else {
                  if (slPriceBN.lt(execution_price)) {
                    setSlGain({
                      slGainMoney: '',
                      slGainRate: '',
                    });
                    if (!value) {
                      setShowSlCountPanel(false);
                      return;
                    }
                    setShowSlCountPanel(true);
                    return;
                  } else {
                    setShowSlCountPanel(false);
                    calSlForShort(slPriceBN);
                  }
                }
              }}
              onBlur={(value) => {
                const slPriceBN = formatInput(
                  value,
                  USD_DECIMALS - position.decimals
                );
                if (isLong) {
                  if (slPriceBN.gt(execution_price)) {
                    setSlPrice('');
                    return;
                  }
                } else {
                  if (slPriceBN.lt(execution_price)) {
                    setSlPrice('');
                    return;
                  }
                }
              }}
            />
            <InputItem
              className={slGainStyle ? 'green' : 'red'}
              title={t`Est. PnL`}
              disabled={true}
              value={
                slGain?.slGainMoney
                  ? slGain?.slGainMoney + '(' + slGain?.slGainRate + ')'
                  : ''
              }
            />
          </div>
          <div style={{ marginBottom: '3rem' }}>
            <KeepLeverage
              title={
                keepLeverage
                  ? t`Keep Leverage at ${leverage}x`
                  : t`Keep Leverage at ...`
              }
              value={keepLeverage}
              onChange={(v) => {
                if (!editTpSl) {
                  return;
                }
                setKeepLeverage(v);
              }}
            />
          </div>
          <div style={{ marginBottom: '3rem' }}>
            <SwitchLabel
              value={editTpSl}
              title={t`Edit TP/SL Size`}
              onChange={(v) => {
                setEditTpSl(v);
                if (!v) {
                  setSizeBn(position?.sizeInUsd);
                  setKeepLeverage(false);
                }
                setTpGain({
                  tpGainMoney: '',
                  tpGainRate: '',
                });
                setSlGain({
                  slGainMoney: '',
                  slGainRate: '',
                });
                setCloseSize('');
                setRate(0);
              }}
            />
          </div>
          {editTpSl && (
            <div>
              <InputItem
                title={t`Close`}
                value={closeSize}
                unit={'USD'}
                onChange={(v) => {
                  setCloseSize(v);
                  const formatValue = formatInput(v, 20);
                  setSizeBn(formatValue);
                  if (formatValue.gt(position?.sizeInUsd || new BN(0))) {
                    if (!isForbiddenTrade) {
                      setBtnDisabled(true);
                      setBtnTitle(t`Max close amount exceeded`);
                    }
                    const rate = formatValue
                      .mul(new BN(10).pow(new BN(USD_DECIMALS + 2)))
                      .div(position?.sizeInUsd || new BN(0));
                    const formatRate = divideAndRound(rate.toString());
                    setRate(Number(formatRate));
                    return;
                  } else if (
                    formatValue.lte(position?.sizeInUsd || new BN(0)) &&
                    formatValue.gt(new BN(0))
                  ) {
                    if (!tpPrice && !slPrice) {
                      if (!isForbiddenTrade) {
                        setBtnDisabled(true);
                        setBtnTitle(t`Enter a price`);
                      }
                    } else {
                      if (tpPrice && !slPrice) {
                        if (!isForbiddenTrade) {
                          setBtnTitle(t`Create Take-Profit Order`);
                        }
                      } else if (!tpPrice && slPrice) {
                        if (!isForbiddenTrade) {
                          setBtnTitle(t`Create Stop-Loss Order`);
                        }
                      } else if (tpPrice && slPrice) {
                        if (!isForbiddenTrade) {
                          setBtnTitle(t`Create TP&SL Order`);
                        }
                      }
                      if (!isForbiddenTrade) {
                        setBtnDisabled(false);
                      }
                    }
                  } else if (formatValue.eq(new BN(0))) {
                    if (!isForbiddenTrade) {
                      setBtnDisabled(true);
                      setBtnTitle(t`Enter a close size`);
                    }
                  }
                  const rate = formatValue
                    .mul(new BN(10).pow(new BN(USD_DECIMALS + 2)))
                    .div(position?.sizeInUsd || new BN(0));
                  const formatRate = divideAndRound(rate.toString());
                  setRate(Number(formatRate));
                  const tpPriceBN = formatInput(
                    tpPrice,
                    USD_DECIMALS - position.decimals
                  );
                  const slPriceBN = formatInput(
                    slPrice,
                    USD_DECIMALS - position.decimals
                  );
                  if (isLong) {
                    if (tpPriceBN.toString() !== '0') {
                      calTpForLong(tpPriceBN);
                    }
                    if (slPriceBN.toString() !== '0') {
                      calSlForLong(slPriceBN);
                    }
                  } else {
                    if (tpPriceBN.toString() !== '0') {
                      calTpForShort(tpPriceBN);
                    }
                    if (slPriceBN.toString() !== '0') {
                      calSlForShort(slPriceBN);
                    }
                  }
                }}
              />
              <SliderComponent
                value={rate}
                onInputChange={(v) => {
                  setRate(v);
                  const changeValue = position?.sizeInUsd
                    .mul(new BN(v))
                    .div(new BN(100));
                  const value = formatAmount(changeValue, 20);
                  setSizeBn(changeValue);
                  setCloseSize(value.toString());
                  const tpPriceBN = formatInput(
                    tpPrice,
                    USD_DECIMALS - position.decimals
                  );
                  const slPriceBN = formatInput(
                    slPrice,
                    USD_DECIMALS - position.decimals
                  );
                  if (isLong) {
                    if (tpPriceBN.toString() !== '0') {
                      calTpForLong(tpPriceBN);
                    }
                    if (slPriceBN.toString() !== '0') {
                      calSlForLong(slPriceBN);
                    }
                  } else {
                    if (tpPriceBN.toString() !== '0') {
                      calTpForShort(tpPriceBN);
                    }
                    if (slPriceBN.toString() !== '0') {
                      calSlForShort(slPriceBN);
                    }
                  }
                }}
              />
            </div>
          )}
        </div>
        <div style={{ marginTop: '-3rem' }}>
          <ExchangeButton
            showTransactionModal={false}
            successCallbackInfo={{
              sig: '',
              num: '',
              tokenName: '',
            }}
            type="decrease"
            title={btnTitle}
            btnDisabled={btnDisabled}
            isOk={isOk}
            isError={isError}
            handleSubmit={async (graph) => {
              let noticeId = 0;
              const hasTp = tpPrice && tpPrice !== '';
              const hasSl = slPrice && slPrice !== '';

              if (!hasTp && hasSl) {
                noticeId = helperNotice.info(t`Creating SL order...`);
              } else if (hasTp && !hasSl) {
                noticeId = helperNotice.info(t`Creating TP order...`);
              } else {
                noticeId = helperNotice.info(t`Creating TP&SL order...`);
              }
              const connection = storeProgram.provider.connection;
              // const PrioritizationFees =
              //   await getRecentPrioritizationFeesFn(connection);
              const PrioritizationFees = computeUnitPrice;
              const blockhash = await getRecentBlockhash(connection);
              const payer = new PublicKey(payerInfo?.address).toBase58();
              const collateralToken =
                position?.collateralTokenAddress.toBase58();
              const hints = new Map([
                [
                  new PublicKey(position?.marketTokenAddress).toBase58(),
                  {
                    long_token: new PublicKey(
                      position?.marketInfo?.longToken
                    ).toBase58(),
                    short_token: new PublicKey(
                      position?.marketInfo?.shortToken
                    ).toBase58(),
                  },
                ],
              ]);
              const receive_token = collateralToken;
              // const receive_token = position?.isLong ? position?.marketInfo?.shortToken : position?.marketInfo?.longToken;
              // console.log('receive_token', receive_token);
              // console.log('collateralToken', collateralToken);
              const swapPathObj = graph?.best_swap_path(
                collateralToken,
                receive_token,
                false
              );
              const path = swapPathObj?.path;
              const skip_wrap_native_on_pay = position?.symbol === 'WSOL';
              const tpPriceBN = formatInput(
                tpPrice,
                USD_DECIMALS - position.decimals
              );
              const slPriceBN = formatInput(
                slPrice,
                USD_DECIMALS - position.decimals
              );
              const params = {
                marketToken: position?.marketTokenAddress.toBase58(),
                isLong: position?.isLong,
                size: editTpSl ? sizeBn : position?.sizeInUsd,
                amount: !keepLeverage ? new BN(0) : position?.collateralAmount,
                tp_tiggerPrice: tpPriceBN || new BN(0),
                sl_tiggerPrice: slPriceBN || new BN(0),
                blockhash,
                PrioritizationFees,
                payer,
                collateralToken,
                hints,
                path,
                skip_wrap_native_on_pay,
                receive_token,
                signAllTransactions,
                storeProgram,
              };
              // console.log('params', params);
              try {
                const result = await useCreateOrderParamsByTpSlDecrease(params);
                if (getGmw351Enabled()) {
                  removeNotice(noticeId);
                  const errorOptions = {
                    tradingErrorInfo: getExecOrderErrorInfo(result as ExecOrderResult, 'Add TP/SL', collateralToken),
                  };
                  const toast = getExecOrderResultMessage(
                    result.intended,
                    result
                  );
                  if (toast?.type === 'success') {
                    helperNotice.success(toast.message);
                    setIsOk(true);
                    setTimeout(() => {
                      onClose();
                    }, 2000);
                  } else if (toast?.type === 'error') {
                    helperNotice.error(toast.message, errorOptions);
                    setIsError(true);
                    setIsOk(false);
                  } else if (isExecOrderSuccess(result)) {
                    if (!hasTp && hasSl) {
                      helperNotice.success(t`SL order created.`);
                    } else if (hasTp && !hasSl) {
                      helperNotice.success(t`TP order created.`);
                    } else {
                      helperNotice.success(t`TP&SL order created.`);
                    }
                    setIsOk(true);
                    setTimeout(() => {
                      onClose();
                    }, 2000);
                  } else {
                    setIsError(true);
                    if (!hasTp && hasSl) {
                      helperNotice.error(t`Failed to create SL order.`, errorOptions);
                    } else if (hasTp && !hasSl) {
                      helperNotice.error(t`Failed to create TP order.`, errorOptions);
                    } else {
                      helperNotice.error(t`Failed to create TP&SL order.`, errorOptions);
                    }
                    setIsOk(false);
                  }
                } else if ((result as string[]).length) {
                  removeNotice(noticeId);
                  if (!hasTp && hasSl) {
                    helperNotice.success(t`SL order created.`);
                  } else if (hasTp && !hasSl) {
                    helperNotice.success(t`TP order created.`);
                  } else {
                    helperNotice.success(t`TP&SL order created.`);
                  }

                  setIsOk(true);
                  setTimeout(() => {
                    onClose();
                  }, 2000);
                }
              } catch (error) {
                setIsError(true);
                removeNotice(noticeId);
                const errorOptions = {
                  tradingErrorInfo: { actionName: 'Add TP/SL', errorData: error, collateral: collateralToken },
                };
                if (!hasTp && hasSl) {
                  helperNotice.error(t`Failed to create SL order.`, errorOptions);
                } else if (hasTp && !hasSl) {
                  helperNotice.error(t`Failed to create TP order.`, errorOptions);
                } else {
                  helperNotice.error(t`Failed to create TP&SL order.`, errorOptions);
                }

                setIsOk(false);
              }
            }}
          />
        </div>
      </div>
    </>
  );
}

/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unsafe-return */

import React, { useState, useEffect, useMemo, useRef } from 'react';
import TokensSelectCom from '@/components/TradeBoxNew/components/childs/TokensSelectCom';
import ExchangeButton from '../compose-components/ExchangeButton';
import { useCreateOrderParamsByMarketDecrease, isExecOrderSuccess, getExecOrderErrorInfo, type ExecOrderResult } from '@/components/TradeBoxNew/utils/execOrder';
import { getGmw351Enabled } from '@/config/featureFlagEnable';
import DataPanel from '../compose-components/DataPanel/index';
import Title from '../compose-components/title/index';
import PercentageInput from '@/components/Common/Input/PercentageInput';
import InputItem from '../compose-components/InputItem/index';
import SliderComponent from '../compose-components/slider/index';
import KeepLeverage from '../compose-components/SwitchLabel/index';
import { PositionInfo } from '@/selectors/position/types';
import { USD_DECIMALS } from '@/config/constants';
import { formatAmount, formatPriceUsd, formatAmountWithoutHalfUp } from '@/utils/legacy/format';
import { useAppStore } from '@/zustand/useAppStore';
import { useWallet } from '@solana/wallet-adapter-react';
import { BN } from '@coral-xyz/anchor';
import { BsArrowRight } from 'react-icons/bs';
import { formatMarketName } from '@/components/TradeBoxNew/utils/formatMarketName';
import { helperNotice } from '@/utils/lib/helperNotice';
import { removeNotice } from '@/utils/lib/helperNotice';
import {
  getRecentBlockhash,
} from '@/components/TradeBoxNew/utils/getRpcOrSdkParams';
import { useStoreProgram } from '@/contexts/anchor';
import { useShallow } from 'zustand/react/shallow';
import { formatInput } from '@/components/TradeBoxNew/utils/formatInput';
import TooltipWithPortal from '@/components/Common/Tooltip/TooltipWithPortal';
import FeesPanel from '@/components/ExchangeNew/ExchangeList/PositionList/components/MarketDecrease/FeesPanel/index';
import {
  getSimulateOrderByMarketDecrease,
  getPositionStatus,
} from '@/components/TradeBoxNew/utils/getSimulateResult';
import { GMX_SOLANA_TOKENS_RAW, GMX_SOLANA_FOREX_PRECISION_MARKET_TOKENS } from '@/config/program';
import { formatRatePercentage } from '@/utils/legacy';
import './index.scss';
import { Position } from '@gmsol-labs/gmsol-sdk';

import Info from '@/components/TradeBoxNew/assets/Info.svg';
import { t, Trans } from '@lingui/macro';
import IconChevronDown from '@/img/trade/chevron-down.svg?react';
import IconChevronUp from '@/img/trade/chevron-up.svg?react';
import { useComputeUnits } from '@/hooks/utilsHooks/useComputeUnits';
import { selectUserOrderFeeDiscountFactor } from '@/selectors/referral/selectUserOrderFeeDiscountFactor';
import { applySlippageToPrice } from '@/utils/tradebox/applySlippageToPrice';
import usePositionSocketStore from '@/zustand/positionSocketStore';
export interface MarketDecreaseProps {
  position: PositionInfo;
  isVisible: boolean;
  onClose: () => void;
  onConfirm?: (amount: string) => void;
}

export default function MarketDecrease({
  position,
  isVisible,
  onClose,
}: MarketDecreaseProps) {
  const payerSwapList = useAppStore((state) => state.payerSwapTokens.payerSwapList);
  const {
    userOrderFeeVipDiscountFactor,
    userOrderFeeReferralDiscountFactor,
  } = useAppStore(selectUserOrderFeeDiscountFactor);
  const leverage = formatAmount(new BN(position?.leverage), USD_DECIMALS, 2);
  const isLong = position?.isLong;
  const title = isLong
    ? t`Market: Long ${formatMarketName(position?.marketInfo?.indexToken)} Decrease`
    : t`Market: Short ${formatMarketName(position?.marketInfo?.indexToken)} Decrease`;
  const { graphObj, priorityFees } = useAppStore(
    useShallow((state) => ({
      graphObj: state.TradeboxNew.graphObj,
      priorityFees: state.TradeboxNew.priorityFees,
    }))
  );
  const positionMap = useAppStore((state) => state.positionState.positionMap);
  const payerInfo = useAppStore((state) => state.payerSwapTokens.payerInfo);
  const { marketBase64Map, marketsMap } = useAppStore(
    useShallow((state) => ({
      marketBase64Map: state.markets.marketBase64Map,
      marketsMap: state.markets.marketsMap,
    }))
  );
  const { slippage, setSlippage } = useAppStore(
    useShallow((state) => ({
      slippage: state.TradeboxNew.slippage,
      setSlippage: state.TradeboxNew.setSlippage,
    }))
  );
  const { computeUnitPrice } = useComputeUnits();
  const setIsRefreshPositionAndOrder = usePositionSocketStore(
    (state) => state.setIsRefreshPositionAndOrder
  );
  const [btnDisabled, setBtnDisabled] = useState(null);
  // const [slippage, setSlippage] = useState<number>(100);
  const [btnTitle, setBtnTitle] = useState(t`Enter an amount`);
  const [submitData, setSubmitData] = useState({});
  const [sizeNum, setSizeNum] = useState<string>();
  const [sizeBn, setSizeBn] = useState<BN>();
  const positionAddress = position?.address.toBase58();
  const collateralTokenAddress = position?.collateralTokenAddress.toBase58();
  const receiveTokenPositionAddressRef = useRef(positionAddress);
  const [receiveToken, setReceiveToken] = useState<Object>(
    payerSwapList?.find(
      (item) =>
        item.tokenAddress === collateralTokenAddress
    )
  );
  const [rate, setRate] = useState<number>(0);
  const [isOpen, setIsOpen] = useState(false);
  const [isKeep, setIsKeep] = useState(true);
  const [isOk, setIsOk] = useState(false);
  const [isError, setIsError] = useState(false);
  const [allFees, setAllFees] = useState<[]>([]);
  const [signature, setSignature] = useState<string>();
  const [feesObj, setFeesObj] = useState<any>({});
  const { signAllTransactions } = useWallet();
  const [precision, setPrecision] = useState(0);
  const tokenPriceMap = useAppStore((state) => state.tickersState.tokenPriceMap);
  const receiveTokenAddress = useMemo(
    () =>
      receiveToken?.tokenAddress ===
        'So1Zu7vPQQxrguzUehKAyVLpjcc769zxgBuDAsxTUMH'
        ? 'So11111111111111111111111111111111111111112'
        : receiveToken?.tokenAddress,
    [receiveToken]
  );
  const storeProgram = useStoreProgram();
  const getPositionStatusFn = (p1, p2, p3, p4) =>
    getPositionStatus(p1, p2, p3, p4);
  const [isForbiddenTrade, setIsForbiddenTrade] = useState(false);

  // Initialize after tokens load, while preserving the user's choice on refresh.
  useEffect(() => {
    const positionChanged = receiveTokenPositionAddressRef.current !== positionAddress;
    receiveTokenPositionAddressRef.current = positionAddress;
    setReceiveToken((currentToken) => {
      if (!positionChanged && currentToken) return currentToken;

      return payerSwapList?.find(
        (item) => item.tokenAddress === collateralTokenAddress
      );
    });
  }, [payerSwapList, positionAddress, collateralTokenAddress]);

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
  }, [position?.marketTokenAddress, marketsMap]);
  useEffect(() => {
    void (async () => {
      const decreaseSizeInUsd = formatInput(sizeNum || '0', USD_DECIMALS);
      if (position) {
        const remainingSizeInUsd = position?.sizeInUsd.sub(decreaseSizeInUsd);
        const oldPostionBase64 = positionMap.get(position?.address.toBase58());
        const oldPostion = Position.decode_from_base64(oldPostionBase64);
        const oldPositionStatus = getPositionStatusFn(
          oldPostion,
          position?.marketInfo,
          marketBase64Map,
          tokenPriceMap
        );
        const collateralTokenUnitPrice = tokenPriceMap.get(
          position?.collateralTokenAddress.toBase58()
        )?.unitPrice;
        /**
         * size'/net value' = size/net value
         * net value' = net value - amount
         * so：amount = net value - (size'*net value/size)
         */
        const newNetValue = new BN(oldPositionStatus?.net_value?.toString() || '0')
          .mul(remainingSizeInUsd)
          .div(position?.sizeInUsd);
        let amountValue = new BN(oldPositionStatus?.net_value?.toString() || '0').sub(
          newNetValue
        );
        const firstSwapValue = amountValue;

        let amount = new BN(0);
        if (isKeep) {
          if (oldPositionStatus.pending_pnl > 0) {
            const pnLRealize = decreaseSizeInUsd
              .mul(new BN(oldPositionStatus.pending_pnl.toString()))
              .div(position?.sizeInUsd);
            amountValue = amountValue.sub(pnLRealize);
          }
          amount = amountValue.div(new BN(collateralTokenUnitPrice));
        }
        const params = {
          graphObj,
          collateralToken: position?.collateralTokenAddress.toBase58(),
          receiveToken: receiveTokenAddress || position?.collateralTokenAddress,
          position: oldPostion,
          positionBase64: oldPostionBase64,
          marketToken: position?.marketTokenAddress.toBase58(),
          isLong: position?.isLong,
          sizeNum: decreaseSizeInUsd,
          amount: amount,
          marketInfo: position?.marketInfo,
          marketBase64Map,
          storeProgram,
          tokenPriceMap,
          decreasePositionSwapKind: 'PnlTokenToCollateralToken',
        };
        const recevieRet = await getSimulateOrderByMarketDecrease(
          firstSwapValue,
          priorityFees,
          params
        );
        const outputAmount =
          recevieRet?.reportData?.output_amounts?.output_amount || new BN(0);
        const receiveUnitPrice =
          tokenPriceMap.get(receiveToken?.tokenAddress)?.unitPrice || new BN(0);
        const receiveInUsd = outputAmount.mul(new BN(collateralTokenUnitPrice));
        const receiveAmount = receiveInUsd.div(new BN(receiveUnitPrice));
        params.decreasePositionSwapKind = 'NoSwap';
        const { positionData, reportData, path, swapData, positionStatus } =
          await getSimulateOrderByMarketDecrease(
            receiveInUsd,
            priorityFees,
            params
          );
        setFeesObj({
          reportData,
          swapData,
        });
        let priceImpactRate;
        if (decreaseSizeInUsd.gt(new BN(0))) {
          priceImpactRate = reportData?.price_impact_value
            .mul(new BN(10).pow(new BN(USD_DECIMALS)))
            .div(decreaseSizeInUsd);
        } else {
          priceImpactRate = new BN(0);
        }
        let pending_pnl = new BN(0);
        let collateral_value = new BN(0);
        let pnlRateBn = new BN(0);
        let decreaseAll = true;
        if (positionData?.state?.sizeInTokens > 0) {
          decreaseAll = false;
          pending_pnl = new BN(positionStatus?.pending_pnl.toString());
          collateral_value = new BN(
            positionStatus?.collateral_value.toString()
          );
          pnlRateBn = pending_pnl.mul(new BN(1000000)).div(collateral_value);
        }
        const oldPnlRateBn = new BN(oldPositionStatus.pending_pnl.toString())
          .mul(new BN(1000000))
          .div(new BN(oldPositionStatus.collateral_value.toString()));
        const oldPnlRate = formatAmount(oldPnlRateBn, 4, 2);
        const PnlRate = formatAmount(pnlRateBn, 4, 2);
        const data = {
          oldSizeValue: position?.sizeInUsd,
          oldLeverage: position?.leverage,
          leverage: decreaseAll ? new BN(0) : positionStatus.leverage,
          executionPrice: {
            executionPrice: reportData.execution_price,
            priceImpactValue: reportData.price_impact_value,
            priceImpactRate: priceImpactRate,
            impactText: `(${formatRatePercentage(priceImpactRate, 3, { signed: true })} of position size)`,
          },
          oldPnlRate,
          PnlRate,
          receiveInUsd: receiveInUsd,
          receiveAmount: receiveAmount,
          oldLiquidationPrice: oldPositionStatus.liquidation_price,
          liquidationPrice: decreaseAll
            ? new BN(0)
            : positionStatus.liquidation_price,
          oldPnl: oldPositionStatus.pending_pnl,
          pnl: pending_pnl,
          fees: allFees,
          sizeValue: positionData?.state?.sizeInUsd,
          collateralTokenSymbol:
            GMX_SOLANA_TOKENS_RAW[position?.collateralTokenAddress.toBase58()]
              ?.symbol,
          oldCollateralValue: oldPositionStatus.collateral_value,
          collateralValue: collateral_value,
          path: path,
          amount: amount,
          size: decreaseSizeInUsd,
          collateralToken: position?.collateralTokenAddress.toBase58(),
          priceImpactValueBN: reportData?.price_impact_value,
        };
        console.log('data', data);
        setSubmitData(data);
      }
    })();
  }, [position, sizeNum, isKeep, tokenPriceMap, receiveToken]);

  useEffect(() => {
    const price = formatPriceUsd(new BN(position?.liquidation_price).mul(
      new BN(10).pow(new BN(position?.decimals))
    ), {
      isDisplayDecimals: GMX_SOLANA_FOREX_PRECISION_MARKET_TOKENS.includes(position?.marketInfo?.indexToken)
    });
    const precision = price?.split('.');
    if (precision && precision.length && precision[1]?.length) {
      setPrecision(precision[1]?.length)
    } else {
      setPrecision(0);
    }
  }, [sizeNum, isKeep, receiveToken])

  const changeTokenFn = (token: Object) => {
    setReceiveToken(token);
  };
  const exe_details = [
    {
      title: t`Fees`,
      content: (
        <FeesPanel
          reportData={feesObj.reportData}
          swapData={feesObj.swapData}
          position={position}
          amount={submitData?.receiveAmount}
          value={submitData?.receiveInUsd}
          deltaSize={submitData?.size}
          path={submitData?.path}
          type="closeInterest"
          priceImpactValueBN={submitData?.priceImpactValueBN}
          userOrderFeeVipDiscountFactor={userOrderFeeVipDiscountFactor}
          userOrderFeeReferralDiscountFactor={userOrderFeeReferralDiscountFactor}
          marketInfo={position?.marketInfo}
        />
      ),
    },
    {
      title: t`Execution Price`,
      content: (
        <>
          <TooltipWithPortal
            className="TradeFeesRow-tooltip"
            handle={
              <span>
                {/* $
                {formatAmount(
                  new BN(submitData?.executionPrice?.executionPrice),
                  USD_DECIMALS - position?.decimals,
                  4
                )} */}
                {
                  formatPriceUsd(new BN(submitData?.executionPrice?.executionPrice).mul(
                    new BN(10).pow(new BN(position?.decimals))
                  ), {
                    isDisplayDecimals: GMX_SOLANA_FOREX_PRECISION_MARKET_TOKENS.includes(position?.marketInfo?.indexToken)
                  })
                }
              </span>
            }
            position="left-end"
            renderContent={() => (
              <div>
                <p>
                  Expected execution price for the order, including the current
                  price impact.
                </p>
                <p
                  style={{
                    marginTop: '1rem',
                    display: 'flex',
                    justifyContent: 'space-between',
                  }}
                >
                  <span>{t`Price Impact:`}</span>
                  <span
                    className={
                      new BN(submitData?.executionPrice?.priceImpactValue).gt(
                        new BN(0)
                      )
                        ? 'text-green-500'
                        : 'text-red-500'
                    }
                  >
                    $
                    {formatAmount(
                      new BN(submitData?.executionPrice?.priceImpactValue),
                      USD_DECIMALS,
                      2
                    )}
                  </span>
                </p>
              </div>
            )}
          />
        </>
      ),
    },
    {
      title: (
        <label className="flexAlignCenter">
          <span>{t`Network Fee`}</span>
          <TooltipWithPortal
            className="TradeFeesRow-tooltip"
            handle={
              <img
                src={Info}
                alt=""
                className="typeOptions-setting-info positive"
              />
            }
            position="top-end"
            renderContent={() => (
              <div>
                <p>
                  {t`Maximum network fee paid to the network. This fee is a blockchain cost not specific to GMTrade, and it does not impact your collateral.`}
                </p>
              </div>
            )}
          />
        </label>
      ),
      content: <span>$0.00</span>,
    },
    {
      title: (
        <label className="flexAlignCenter">
          <span>{t`Allowed Slippage`}</span>
          <TooltipWithPortal
            className="TradeFeesRow-tooltip"
            handle={
              <img
                src={Info}
                alt=""
                className="typeOptions-setting-info positive"
              />
            }
            position="top-end"
            renderContent={() => (
              <div>
                <p>
                  {t`You can edit the default Allowed Slippage in the settings menu on the top right of the page.`}
                </p>
                <p style={{ marginTop: '2rem' }}>
                  {t`Note that a low allowed slippage, e.g. less than -1.00%, may result in failed orders if prices are volatile.`}
                </p>
              </div>
            )}
          />
        </label>
      ),
      content: (
        <PercentageInput
          negativeSign
          defaultValue={100}
          value={slippage}
          onChange={(value) => {
            setSlippage(value);
            localStorage.setItem('slippage', value.toString());
          }}
          maxValue={9900}
          highValue={100}
          lowValue={10}
        />
      ),
      isLine: true,
    },
  ];
  const dataList1 = [
    {
      title: t`Receive`,
      content: (
        <div className="receive-content">
          <span className="amount">
            {submitData?.receiveAmount?.gt(new BN(0))
              ? formatAmount(
                submitData?.receiveAmount,
                GMX_SOLANA_TOKENS_RAW[receiveToken?.tokenAddress]?.decimals,
                4
              )
              : '0.0000'}
          </span>
          <span className="value">{receiveToken?.tokenName === 'WGMX' ? 'GMX' : receiveToken?.tokenName || 'USDC'}</span>
          <span className="text-[#A3A3A3]">
            ($
            {submitData?.receiveInUsd?.gt(new BN(0))
              ? formatAmount(submitData?.receiveInUsd, 20, 2)
              : '0.00'}
            )
          </span>

          <TokensSelectCom
            type="Receive"
            showLabel={false}
            changeToken={(token) => changeTokenFn(token)}
            applyBackground={false}
            popoverButtonIconClassName="!h-[1.6rem] !w-[1.6rem]"
          />
        </div>
      ),
    },
    {
      title: t`Liquidation Price`,
      content: (
        <div style={{ display: 'flex', alignItems: 'center' }}>
          {
            <span className="text-[#A3A3A3]">
              {position?.liquidation_price
                // ? `${formatAmount(new BN(position?.liquidation_price), 20 - position?.decimals, 2)}`
                ? `${formatPriceUsd(new BN(position?.liquidation_price).mul(
                  new BN(10).pow(new BN(position?.decimals))
                ), {
                  displayDecimals: precision,
                  isDisplayDecimals: Boolean(precision)
                })}`
                : 'N/A'}
              <BsArrowRight className="transition-arrow inline-block" />
            </span>
          }

          {sizeNum ? (
            <span>
              {formatPriceUsd(
                new BN(submitData?.liquidationPrice).mul(
                  new BN(10).pow(new BN(position?.decimals))
                ),
                {
                  displayDecimals: precision,
                  isDisplayDecimals: Boolean(precision)
                }
              )}{' '}
            </span>
          ) : (
            'N/A'
          )}
        </div>
      ),
    },
    {
      title: t`Pnl`,
      content: (
        <>
          <span className={sizeNum ? 'text-[#A3A3A3]' : ''}>
            ${formatAmount(new BN(submitData?.oldPnl?.toString()), 20, 2)}(
            {submitData?.oldPnlRate}%)
            {sizeNum ? (
              <BsArrowRight className="transition-arrow inline-block" />
            ) : null}
          </span>
          {sizeNum ? (
            <span className={sizeNum ? 'text-success' : ''}>
              ${formatAmount(new BN(submitData?.pnl?.toString()), 20, 2)}(
              {submitData?.PnlRate}%)
            </span>
          ) : null}
        </>
      ),
    },
    {
      title: t`Execution Details`,
      content: (
        <>
          <div
            className="flex cursor-pointer items-center justify-between"
            onClick={() => setIsOpen(!isOpen)}
          >
            <label className="cursor-pointer"></label>
            {isOpen ? <IconChevronUp /> : <IconChevronDown />}
          </div>
        </>
      ),
    },
  ];
  const dataList2 = [
    {
      title: t`Leverage`,
      content: (
        <>
          <span className={sizeNum ? 'text-[#A3A3A3]' : ''}>
            {formatAmount(new BN(submitData?.oldLeverage), 20, 2)}x
            {sizeNum ? (
              <BsArrowRight className="transition-arrow inline-block" />
            ) : null}
          </span>
          {sizeNum ? (
            <span className={sizeNum ? 'text-success' : ''}>
              {formatAmount(new BN(submitData?.leverage), 20, 2)}x
            </span>
          ) : null}
        </>
      ),
    },
    {
      title: t`Size`,
      content: (
        <>
          <span className={sizeNum ? 'text-[#A3A3A3]' : ''}>
            ${formatAmount(new BN(submitData?.oldSizeValue), 20, 2)}
            {sizeNum ? (
              <BsArrowRight className="transition-arrow inline-block" />
            ) : null}
          </span>
          {sizeNum ? (
            <span className={sizeNum ? 'text-success' : ''}>
              ${formatAmount(new BN(submitData?.sizeValue), 20, 2)}
            </span>
          ) : null}
        </>
      ),
    },
    {
      title: (
        <label className="flexAlignCenter">
          <span>
            <Trans>Collateral ({submitData?.collateralTokenSymbol === 'WGMX' ? 'GMX' : submitData?.collateralTokenSymbol})</Trans>
          </span>
          <TooltipWithPortal
            className="TradeFeesRow-tooltip"
            handle={
              <img
                src={Info}
                alt=""
                className="typeOptions-setting-info positive"
              />
            }
            position="top-end"
            renderContent={() => (
              <div>
                <p>{t`Initial Collateral (Collateral excluding Borrowing Fee and Funding Fee).`}</p>
              </div>
            )}
          />
        </label>
      ),
      content: (
        <>
          <span className={sizeNum ? 'text-[#A3A3A3]' : ''}>
            ${formatAmount(new BN(submitData?.oldCollateralValue), 20, 2)}
            {sizeNum ? (
              <BsArrowRight className="transition-arrow inline-block" />
            ) : null}
          </span>
          {sizeNum ? (
            <span className={sizeNum ? 'text-success' : ''}>
              ${formatAmount(new BN(submitData?.collateralValue), 20, 2)}
            </span>
          ) : null}
        </>
      ),
    },
  ];

  if (!isVisible) return <></>;

  return (
    <>
      <div className="market-decrease-overlay" onClick={onClose} />

      <div className="market-decrease-modal">
        <Title title={title} onClose={onClose} />
        <div className="market-decrease-content">
          <InputItem
            title={t`Close`}
            value={sizeNum}
            unit={'USD'}
            onChange={(value) => {
              setSizeNum(value);
              const sizeBn = formatInput(value, 20);
              const maxSize = position?.sizeInUsd;
              if (sizeBn.gt(new BN(0)) && sizeBn.lte(maxSize)) {
                if (!isForbiddenTrade) {
                  setBtnDisabled(false);
                  setBtnTitle(t`Close`);
                }
                const decreaseSizeInUsd = formatInput(
                  sizeNum || '0',
                  USD_DECIMALS
                );
                const remainingSizeInUsd =
                  position?.sizeInUsd.sub(decreaseSizeInUsd);
                const oldPostionBase64 = positionMap.get(
                  position?.address.toBase58()
                );
                const rate = sizeBn.mul(new BN(100)).div(maxSize);
                setRate(rate.toNumber());
                setSizeBn(sizeBn);
                const oldPostion =
                  Position.decode_from_base64(oldPostionBase64);
                const oldPositionStatus = getPositionStatusFn(
                  oldPostion,
                  position?.marketInfo,
                  marketBase64Map
                );
                const newNetValue = new BN(
                  String(oldPositionStatus?.net_value || 0)
                )
                  .mul(remainingSizeInUsd)
                  .div(position?.sizeInUsd);
              } else if (sizeBn.eq(new BN(0))) {
                if (!isForbiddenTrade) {
                  setBtnDisabled(true);
                  setBtnTitle(t`Enter an amount`);
                }
                setRate(0);
              } else {
                if (!isForbiddenTrade) {
                  setBtnDisabled(true);
                  setBtnTitle(t`Max close amount exceeded`);
                }
              }
            }}
          />
          <SliderComponent
            value={rate}
            onInputChange={(value) => {
              if (value > 0 && !isForbiddenTrade) {
                setBtnDisabled(false);
                setBtnTitle(t`Close`);
              } else {
                if (!isForbiddenTrade) {
                  setBtnDisabled(true);
                  setBtnTitle(t`Enter an amount`);
                }
              }
              const maxSize = position?.sizeInUsd;
              const sizeBn = maxSize.mul(new BN(value)).div(new BN(100));
              setSizeBn(sizeBn);
              const size = formatAmountWithoutHalfUp(sizeBn, USD_DECIMALS, 2);
              setSizeNum(size.toString() !== '0.00' ? size.toString() : '');
              setRate(value);
            }}
          />
          <KeepLeverage
            title={t`Keep Leverage at ${rate === 100 ? '...' : `${leverage}x`}`}
            value={rate === 100 ? false : isKeep}
            onChange={(value) => {
              setIsKeep(value);
            }}
          />
        </div>
        <ExchangeButton
          type="decrease"
          successCallbackInfo={{
            sig: signature || '',
            num: submitData?.receiveAmount?.gt(new BN(0))
              ? formatAmount(
                submitData?.receiveAmount,
                GMX_SOLANA_TOKENS_RAW[receiveToken?.tokenAddress]?.decimals,
                4
              )
              : '0.0000',
            tokenName:
              receiveToken?.tokenName === 'WSOL'
                ? 'SOL'
                : receiveToken?.tokenName === 'WGMX'
                  ? 'GMX'
                  : 'USDC',
          }}
          title={btnTitle}
          btnDisabled={btnDisabled}
          handleSubmit={async (graph) => {
            const noticeId = helperNotice.info(
              t`Creating market decrease order...`
            );
            const connection = storeProgram.provider.connection;
            // const PrioritizationFees =
            //   await getRecentPrioritizationFeesFn(connection);
            const skip_unwrap_native_on_receive =
              receiveToken?.tokenName === 'WSOL';
            const PrioritizationFees = computeUnitPrice;
            const blockhash = await getRecentBlockhash(connection);
            const payer = payerInfo.address;
            const currentPrice = tokenPriceMap.get(
              position?.marketInfo?.indexToken
            )?.unitPrice;
            if (!currentPrice || new BN(currentPrice).lte(new BN(0))) {
              removeNotice(noticeId);
              helperNotice.error(t`Price data unavailable. Please wait and try again.`);
              return;
            }
            const acceptable_price = applySlippageToPrice(
              slippage,
              new BN(currentPrice),
              false,
              position?.isLong
            );
            const hints = new Map([
              [
                position?.marketTokenAddress.toBase58(),
                {
                  long_token: position?.marketInfo?.longToken,
                  short_token: position?.marketInfo?.shortToken,
                },
              ],
            ]);
            if (submitData?.path) {
              submitData.path.forEach((item) => {
                const marketInfo = marketsMap.get(item);
                if (marketInfo) {
                  hints.set(item, {
                    long_token: marketInfo?.longToken,
                    short_token: marketInfo?.shortToken,
                  });
                }
              });
            }
            const path = submitData.path;
            const skip_wrap_native_on_pay = position?.symbol === 'WSOL';
            const orderParams = {
              marketToken: position?.marketTokenAddress.toBase58(),
              isLong: position?.isLong,
              size: sizeBn,
              amount: submitData?.amount,
              // amount: new BN(0),
              blockhash,
              PrioritizationFees,
              payer,
              collateralToken: submitData?.collateralToken,
              hints,
              path,
              skip_wrap_native_on_pay,
              skip_unwrap_native_on_receive,
              collateral_or_swap_out_token: submitData?.collateralToken,
              receiveToken: receiveTokenAddress,
              signAllTransactions,
              storeProgram,
              acceptable_price,
            };
            try {
              const result =
                await useCreateOrderParamsByMarketDecrease(orderParams);
              if (getGmw351Enabled()) {
                if (isExecOrderSuccess(result)) {
                  setIsRefreshPositionAndOrder(true);
                  helperNotice.success(t`Market decrease order created.`);
                  setTimeout(() => {
                    setIsOk(true);
                  }, 1500);
                  removeNotice(noticeId);
                  setSignature(result.signatures[0]);
                  setTimeout(() => {
                    onClose();
                  }, 2000);
                } else {
                  setIsError(true);
                  removeNotice(noticeId);
                  helperNotice.error(t`Failed to create market decrease order.`, {
                    tradingErrorInfo: getExecOrderErrorInfo(result as ExecOrderResult, 'Close Position', position?.collateralTokenAddress.toBase58()),
                  });
                }
              } else if ((result as string[]).length) {
                setIsRefreshPositionAndOrder(true);
                helperNotice.success(t`Market decrease order created.`);
                setTimeout(() => {
                  setIsOk(true);
                }, 1500);
                removeNotice(noticeId);
                setSignature((result as string[])[0]);
                setTimeout(() => {
                  onClose();
                }, 2000);
              }
            } catch (error) {
              setIsError(true);
              removeNotice(noticeId);
              helperNotice.error(t`Failed to create market decrease order.`, {
                tradingErrorInfo: { actionName: 'Close Position', errorData: error, collateral: position?.collateralTokenAddress.toBase58() },
              });
            }
          }}
          isOk={isOk}
          isError={isError}
        />
        <DataPanel dataList={dataList1} />
        {isOpen && (
          <div className="execution-details" style={{ marginTop: '-2rem' }}>
            <DataPanel dataList={exe_details} />
          </div>
        )}
        <DataPanel dataList={dataList2} />
      </div>
    </>
  );
}

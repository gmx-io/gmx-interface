import { useState, useEffect, useMemo } from 'react';
import { getSimulateOrderByLimitIncrease } from '@/components/TradeBoxNew/utils/getSimulateResult';
import ExchangeButton from '../../../PositionList/components/compose-components/ExchangeButton';
import Title from '../../../PositionList/components/compose-components/title/index';
import InputItem from '../../../PositionList/components/compose-components/InputItem/index';
import DataPanel from '../../../PositionList/components/compose-components/DataPanel/index';
import { formatInput } from '@/components/TradeBoxNew/utils/formatInput';
import { USD_DECIMALS } from '@/config/constants';
import { GMX_SOLANA_TOKENS_RAW } from '@/config/program';
import { useAppStore } from '@/zustand/useAppStore';
import { BN } from '@coral-xyz/anchor';
import { useStoreProgram } from '@/contexts/anchor';
import { PublicKey } from '@solana/web3.js';
import { useWallet } from '@solana/wallet-adapter-react';
import { useShallow } from 'zustand/react/shallow';
import { helperNotice } from '@/utils/lib/helperNotice';
import { removeNotice } from '@/utils/lib/helperNotice';
import { helperToast } from '@/utils/lib/helperToast';
import { formatMarketName } from '@/components/TradeBoxNew/utils/formatMarketName';
import { t } from '@lingui/macro';
import { useUpdateOrderByLongShortLimitIncrease } from '@/components/TradeBoxNew/utils/execOrder';
import PercentageInput from '@/components/Common/Input/PercentageInput';
import {
  getRecentBlockhash,
  getRecentPrioritizationFeesFn,
} from '@/components/TradeBoxNew/utils/getRpcOrSdkParams';
import './index.scss';
import { OrderInfo, OrderType } from '@/selectors/order/types';
import { formatAcceptablePriceDisplay } from '@/utils/order/formatAcceptablePriceDisplay';
import { applySlippageToPrice } from '@/utils/tradebox/applySlippageToPrice';
import { Position, PositionStatus } from '@gmsol-labs/gmsol-sdk';
import { getPositionStatus } from '@/components/TradeBoxNew/utils/getSimulateResult';
import { formatAmount, formatAmountFree } from '@/utils/legacy';
import { getPriceDecimals } from '@/utils/legacy/common';
import { getMarketPriceInputDecimals } from '@/utils/priceInput/getMarketPriceInputDecimals';
import { BsArrowRight } from 'react-icons/bs';
import { useComputeUnits } from '@/hooks/utilsHooks/useComputeUnits';
import { useBodyScrollLock } from '@/hooks/utilsHooks/useBodyScrollLock';
import { getGmw385Enabled, getGmw401Enabled, getGmw402Enabled } from '@/config/featureFlagEnable';
export interface LongOrShortLimitProps {
  order: OrderInfo;
  indexTokenAddress?: string;
  isVisible: boolean;
  onClose: () => void;
}

export default function LongOrShortLimit({
  order,
  indexTokenAddress,
  isVisible,
  onClose,
}: LongOrShortLimitProps) {
  if (!isVisible) return null;
  const { graphObj, priorityFees } = useAppStore(
    useShallow((state) => ({
      graphObj: state.TradeboxNew.graphObj,
      priorityFees: state.TradeboxNew.priorityFees,
    }))
  );
  const marketBase64Map = useAppStore((state) => state.markets.marketBase64Map);
  const { tokenPriceMap } = useAppStore(
    useShallow((state) => ({
      tokenPriceMap: state.tickersState.tokenPriceMap,
    }))
  );
  const { slippage, setSlippage } = useAppStore(
    useShallow((state) => ({
      slippage: state.TradeboxNew.slippage,
      setSlippage: state.TradeboxNew.setSlippage,
    }))
  );
  const payerInfo = useAppStore((state) => state.payerSwapTokens.payerInfo);
  const { signAllTransactions } = useWallet();
  const { computeUnitPrice } = useComputeUnits();
  const storeProgram = useStoreProgram();
  const legacyIndexTokenAddress =
    typeof order?.marketInfo?.indexToken === 'string'
      ? order.marketInfo.indexToken
      : undefined;
  const resolvedIndexTokenAddress = getGmw385Enabled()
    ? indexTokenAddress ?? legacyIndexTokenAddress
    : legacyIndexTokenAddress;
  const indexTokenDecimals = useMemo(
    () => GMX_SOLANA_TOKENS_RAW[resolvedIndexTokenAddress]?.decimals,
    [resolvedIndexTokenAddress]
  );
  const gmw401Enabled = getGmw401Enabled();
  const indexTokenPrice = new BN(
    tokenPriceMap.get(resolvedIndexTokenAddress)?.price || 0
  );
  const priceDisplayDecimals = getPriceDecimals(indexTokenPrice);
  const gmw402Enabled = getGmw402Enabled();
  const priceInputDecimals = getMarketPriceInputDecimals(
    indexTokenPrice,
    resolvedIndexTokenAddress
  );
  const useGmw402PriceDecimals =
    gmw402Enabled && priceInputDecimals !== undefined;
  const initTriggerPrice = useMemo(
    () =>
      formatAmount(
        order?.triggerPrice,
        USD_DECIMALS - indexTokenDecimals,
        useGmw402PriceDecimals
          ? priceInputDecimals
          : gmw401Enabled
            ? priceDisplayDecimals
            : 2,
        undefined,
        !useGmw402PriceDecimals
      ),
    [
      order?.triggerPrice,
      indexTokenDecimals,
      gmw401Enabled,
      priceDisplayDecimals,
      priceInputDecimals,
      useGmw402PriceDecimals,
    ]
  );
  const initSizeUsd = useMemo(
    () => formatAmountFree(order?.sizeDeltaUsd, USD_DECIMALS),
    [order?.sizeDeltaUsd]
  );
  const positionMap = useAppStore((state) => state.positionState.positionMap);
  const [btnTitle, setBtnTitle] = useState(t`Update Limit Order`);
  const [btnDisabled, setBtnDisabled] = useState(false);
  const [size, setSize] = useState(initSizeUsd || '');
  const [sizeDeltaValue, setSizeDeltaValue] = useState(
    order?.sizeDeltaUsd || new BN(0)
  );
  const [limitPrice, setLimitPrice] = useState(initTriggerPrice || '');
  const [limitPriceBn, setLimitPriceBn] = useState(
    order?.triggerPrice || new BN(0)
  );
  const [isOk, setIsOk] = useState(false);
  const [isError, setIsError] = useState(false);
  const [acceptablePrice, setAcceptablePrice] = useState(new BN(0));
  const [lqPrice, setLqPrice] = useState(new BN(0));
  const [oldLeverage, setOldLeverage] = useState(new BN(0));
  const [newLeverage, setNewLeverage] = useState(new BN(0));

  const markPrice = formatAmount(
    indexTokenPrice,
    USD_DECIMALS,
    useGmw402PriceDecimals
      ? priceInputDecimals
      : gmw401Enabled
        ? priceDisplayDecimals
        : undefined
  );
  const getPositionStatusFn = (p1, p2, p3) =>
    getPositionStatus(p1, p2, p3);

  const title = order?.isLong
    ? t`Edit Limit: Long ${formatMarketName(resolvedIndexTokenAddress)} Increase`
    : t`Edit Limit: Short ${formatMarketName(resolvedIndexTokenAddress)} Increase`;
  const dataList = [
    {
      title: t`Allowed Slippage`,
      content: (
        <PercentageInput
          defaultValue={100}
          negativeSign
          value={slippage}
          onChange={(value) => {
            setSlippage(value);
            localStorage.setItem('slippage', value.toString());
            setAcceptablePrice(
              applySlippageToPrice(value, limitPriceBn, true, order?.isLong ?? false)
            );
          }}
          maxValue={9900}
          highValue={100}
          lowValue={10}
        />
      ),
      isLine: true,
    },
    {
      title: t`Acceptable Price`,
      content: (
        <>
          <span>
            {formatAcceptablePriceDisplay({
              orderType: OrderType.LimitIncrease,
              isLong: order?.isLong ?? false,
              acceptablePrice,
              triggerPrice: limitPriceBn,
              indexTokenDecimals,
            })}
          </span>
        </>
      ),
    },
    {
      title: t`Leverage`,
      content: (
        <>
          <span className="text-muted">
            {formatAmount(new BN(oldLeverage), 20, 2)}x
            {<BsArrowRight className="transition-arrow inline-block" />}
          </span>
          {
            <span className="text-success">
              {formatAmount(new BN(newLeverage), 20, 2)}x
            </span>
          }
        </>
      ),
    },
    {
      title: t`Liquidation Price`,
      content: (
        <>
          <span>${formatAmount(lqPrice, 20 - indexTokenDecimals, 4)}</span>
        </>
      ),
    },
  ];
  useBodyScrollLock(true);
  useEffect(() => {
    (async () => {
      if (order) {
        // console.log('order', order);
        const payToken = order?.initialCollateralTokenAddress.toBase58();
        const amount = order?.initialCollateralDeltaAmount;
        const payTokenUnitPrice =
          tokenPriceMap.get(payToken)?.unitPrice || new BN(0);
        const amountValue = amount.mul(new BN(payTokenUnitPrice));
        const marketInfo = order?.marketInfo;
        const positonBase64 = positionMap.get(
          order?.positionAddress.toBase58()
        );
        let positionInfo: Position | null = null;
        let oldPositionStatus: PositionStatus;
        if (positonBase64) {
          positionInfo = Position.decode_from_base64(positonBase64);
          oldPositionStatus = getPositionStatusFn(
            positionInfo,
            marketInfo,
            marketBase64Map
          );
        }
        const increaseSizeInUsd = formatInput(size || '0', USD_DECIMALS);
        const limitPriceInUsd = formatInput(limitPrice || '0', USD_DECIMALS);
        const marketToken = order?.marketTokenAddress.toBase58();
        const collateralToken = order?.collateralTokenAddress.toBase58();
        const isLong = order?.isLong;

        const triggerPrice = limitPriceInUsd.div(
          new BN(10).pow(new BN(indexTokenDecimals))
        );
        const acceptable_price = applySlippageToPrice(
          slippage,
          triggerPrice,
          true,
          isLong
        );
        setAcceptablePrice(acceptable_price);
        const simulateParams = {
          marketToken,
          graphObj,
          size: increaseSizeInUsd,
          payToken,
          collateralToken,
          amount,
          amountValue,
          sizeUsd: amountValue,
          baseCost: priorityFees,
          isLong,
          triggerPrice,
          marketBase64Map,
          storeProgram,
          marketInfo,
          positionInfo,
          acceptable_price,
          syncSize: amountValue,
        };
        setSizeDeltaValue(new BN(increaseSizeInUsd));

        // setAcceptablePrice(triggerPrice) // todo
        // console.log('simulateParams', simulateParams?.amountValue.toString())
        const simuRet = await getSimulateOrderByLimitIncrease(simulateParams);
        const { positionStatus } = simuRet;
        setLqPrice(new BN(positionStatus?.liquidation_price?.toString()));
        const oldLeverage = new BN(oldPositionStatus?.leverage.toString());
        const newLeverage = new BN(positionStatus?.leverage.toString());
        setOldLeverage(oldLeverage);
        setNewLeverage(newLeverage);
      }
    })();
  }, [order, limitPrice, size]);

  return (
    <>
      <div className="market-decrease-overlay" onClick={onClose} />

      <div className="market-decrease-modal edit-collateral">
        <Title title={title} onClose={onClose} />
        <div className="market-decrease-content">
          <div className="input-group">
            <InputItem
              title={t`Size`}
              value={size}
              unit={'USD'}
              onChange={(value) => {
                if (!value) {
                  setBtnTitle(t`Enter an amount`);
                  setBtnDisabled(true);
                } else if (!limitPrice) {
                  setBtnTitle(t`Enter a price`);
                  setBtnDisabled(true);
                } else {
                  setBtnTitle(t`Update Limit Order`);
                  setBtnDisabled(false);
                }
                setSize(value);
              }}
            />
            <InputItem
              title={t`Limit Price`}
              value={limitPrice}
              unit={'USD'}
              mark={`${markPrice}`}
              decimalPlaces={gmw402Enabled ? priceInputDecimals : undefined}
              onChange={(value) => {
                if (!value) {
                  setBtnTitle(t`Enter a price`);
                  setBtnDisabled(true);
                } else if (!size) {
                  setBtnTitle(t`Enter an amount`);
                  setBtnDisabled(true);
                } else {
                  setBtnTitle(t`Update Limit Order`);
                  setBtnDisabled(false);
                }
                setLimitPrice(value);
                const limitPriceBn = formatInput(
                  value,
                  USD_DECIMALS - indexTokenDecimals
                );
                // console.log('limitPriceBn', limitPriceBn.toString())
                // const markPrice = new BN(tokenPriceMap.get(order?.marketInfo?.indexToken)?.unitPrice || 0);
                let acceptable_price = applySlippageToPrice(
                  slippage,
                  limitPriceBn,
                  true,
                  order?.isLong ?? false
                );
                setAcceptablePrice(acceptable_price);
                setLimitPriceBn(limitPriceBn);
              }}
            />
          </div>
        </div>
        <ExchangeButton
          btnDisabled={btnDisabled}
          title={t`${btnTitle}`}
          handleSubmit={async (graph) => {
            const noticeId = helperNotice.info(t`Updating limit order...`);
            const connection = storeProgram.provider.connection;
            // const PrioritizationFees =
            //   await getRecentPrioritizationFeesFn(connection);
            const PrioritizationFees = computeUnitPrice;
            const blockhash = await getRecentBlockhash(connection);
            const payer = new PublicKey(payerInfo.address).toBase58();
            const nextAcceptablePrice = order?.isLong
              ? limitPriceBn.mul(new BN(10000 + slippage)).div(new BN(10000))
              : limitPriceBn.mul(new BN(10000 - slippage)).div(new BN(10000));

            const params = {
              blockhash,
              payer,
              market_token: order?.marketTokenAddress.toBase58(),
              PrioritizationFees,
              size_delta_value: sizeDeltaValue,
              trigger_price: limitPriceBn,
              acceptable_price: nextAcceptablePrice,
              order_addr: order?.orderAddress.toBase58(),
              signAllTransactions,
              storeProgram,
            };
            try {
              const result =
                await useUpdateOrderByLongShortLimitIncrease(params);
              if (result.length) {
                if (noticeId) {
                  removeNotice(noticeId);
                }
                helperNotice.success(t`Limit order updated.`);
                setIsOk(true);
                setTimeout(() => {
                  onClose();
                }, 2000);
              }
            } catch (error) {
              setIsError(true);
              if (noticeId) {
                removeNotice(noticeId);
              }
              helperNotice.error(t`Failed to update limit order.`, {
                tradingErrorInfo: { actionName: 'Update Order', errorData: error },
              });
              setIsOk(false);
            }
          }}
          isOk={isOk}
          isError={isError}
        />
        <DataPanel dataList={dataList} />
      </div>
    </>
  );
}

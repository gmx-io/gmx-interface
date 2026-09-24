import { useState, useEffect, useMemo } from 'react';
import ExchangeButton from '../compose-components/ExchangeButton/index';
import Title from '../compose-components/title/index';
import InputItem from '../compose-components/InputItem/index';
import SliderComponent from '../compose-components/slider/index';
import DataPanel from '../compose-components/DataPanel/index';
import { formatInput } from '@/components/TradeBoxNew/utils/formatInput';
import { USD_DECIMALS } from '@/config/constants';
import {
  formatPriceUsd,
  formatParseUsdToBN,
  formatAmountFree
} from '@/utils/legacy/format';
import { formatAcceptablePriceDisplay } from '@/utils/order/formatAcceptablePriceDisplay';
import { applySlippageToPrice } from '@/utils/tradebox/applySlippageToPrice';
import { useAppStore } from '@/zustand/useAppStore';
import { BN } from '@coral-xyz/anchor';
import { useStoreProgram } from '@/contexts/anchor';
import { PublicKey } from '@solana/web3.js';
import { helperToast } from '@/utils/lib/helperToast';
import { formatMarketName } from '@/components/TradeBoxNew/utils/formatMarketName';
import { useShallow } from 'zustand/react/shallow';
import { helperNotice } from '@/utils/lib/helperNotice';
import { removeNotice } from '@/utils/lib/helperNotice';
import { useWallet } from '@solana/wallet-adapter-react';
import { useUpdateOrderByTpDecrease } from '@/components/TradeBoxNew/utils/execOrder';
import PercentageInput from '@/components/Common/Input/PercentageInput';
import {
  getRecentBlockhash,
  getRecentPrioritizationFeesFn,
} from '@/components/TradeBoxNew/utils/getRpcOrSdkParams';
import './index.scss';
import { OrderInfo, OrderType } from '@/selectors/order/types';
import { GMX_SOLANA_TOKENS_RAW, GMX_SOLANA_FOREX_PRECISION_MARKET_TOKENS } from '@/config/program';
import { t } from '@lingui/macro';
import { useComputeUnits } from '@/hooks/utilsHooks/useComputeUnits';
import { useBodyScrollLock } from '@/hooks/utilsHooks/useBodyScrollLock';
import { getGmw385Enabled, getGmw402Enabled } from '@/config/featureFlagEnable';
import { useStableOrderTicker } from '@/hooks/orderHooks/useStableOrderTicker';
import { getMarketPriceInputDecimals } from '@/utils/priceInput/getMarketPriceInputDecimals';
export interface TpDecreaseProps {
  isVisible: boolean;
  onClose: () => void;
  order: OrderInfo;
  indexTokenAddress?: string;
}

export default function TpDecrease({
  isVisible,
  onClose,
  order,
  indexTokenAddress,
}: TpDecreaseProps) {
  if (!isVisible) return null;
  const payerInfo = useAppStore((state) => state.payerSwapTokens.payerInfo);
  const tokenPriceMap = useAppStore((state) => state.tickersState.tokenPriceMap);
  const positions = useAppStore((state) => state.positionState.positions);
  const { slippage, setSlippage } = useAppStore(
    useShallow((state) => ({
      slippage: state.TradeboxNew.slippage,
      setSlippage: state.TradeboxNew.setSlippage,
    }))
  );
  const { signAllTransactions } = useWallet();
  const { computeUnitPrice } = useComputeUnits();
  const storeProgram = useStoreProgram();
  const resolvedIndexTokenAddress = getGmw385Enabled()
    ? indexTokenAddress ?? order?.marketInfo?.indexToken
    : order?.marketInfo?.indexToken;
  const sizeDecimals = useMemo(
    () => GMX_SOLANA_TOKENS_RAW[resolvedIndexTokenAddress]?.decimals,
    [resolvedIndexTokenAddress]
  );
  const sizeInUsd = order?.sizeDeltaUsd;
  const stableTicker = useStableOrderTicker(
    resolvedIndexTokenAddress,
    tokenPriceMap
  );
  const unitPrice = stableTicker?.unitPrice;
  const indexTokenPrice = stableTicker?.price;
  const gmw402Enabled = getGmw402Enabled();
  const priceInputDecimals = getMarketPriceInputDecimals(
    indexTokenPrice,
    resolvedIndexTokenAddress
  );
  const useGmw402PriceDecimals =
    gmw402Enabled && priceInputDecimals !== undefined;
  const tpTriggerPrice = order?.triggerPrice;
  const initAcceptPrice = useMemo(
    () =>
      tpTriggerPrice
        ? applySlippageToPrice(
            slippage,
            tpTriggerPrice,
            false,
            order?.isLong ?? false
          )
        : new BN(0),
    [tpTriggerPrice, slippage, order?.isLong]
  );
  const [markPrice, setMarkPrice] = useState<string>('');
  const [lqPrice, setLqPrice] = useState<string>('');
  const [acceptPriceBn, setAcceptPriceBn] = useState<BN>(initAcceptPrice);
  const [triggerPriceStr, setTriggerPriceStr] = useState<string>(
    formatPriceUsd(
      formatParseUsdToBN('1', sizeDecimals).mul(tpTriggerPrice),
      {
        useCommas: false,
        showDollarSign: false,
        fallbackToZero: true,
        displayDecimals: useGmw402PriceDecimals
          ? priceInputDecimals
          : undefined,
        isDisplayDecimals: useGmw402PriceDecimals ||
          GMX_SOLANA_FOREX_PRECISION_MARKET_TOKENS.includes(resolvedIndexTokenAddress)
      }
    )
  );
  const [triggerPriceBn, setTriggerPriceBn] = useState<BN>(tpTriggerPrice);
  const acceptPriceDisplay = formatAcceptablePriceDisplay({
    orderType: OrderType.LimitDecrease,
    isLong: order?.isLong ?? false,
    acceptablePrice: acceptPriceBn,
    triggerPrice: triggerPriceBn,
    indexTokenDecimals: sizeDecimals,
    displayDecimals: gmw402Enabled ? priceInputDecimals : undefined,
    isDisplayDecimals:
      useGmw402PriceDecimals ||
      GMX_SOLANA_FOREX_PRECISION_MARKET_TOKENS.includes(
        resolvedIndexTokenAddress
      ),
  });
  const [size, setSize] = useState(formatAmountFree(sizeInUsd, USD_DECIMALS));
  const [sizeBn, setSizeBn] = useState<BN>(sizeInUsd);
  const isLong = useMemo(() => order?.isLong, [order?.isLong]);
  const [sizeAmount, setSizeAmount] = useState<BN>(order?.sizeInTokens);
  const [rate, setRate] = useState(100);
  const [btnDisabled, setBtnDisabled] = useState<boolean>(false);
  const [isOk, setIsOk] = useState(false);
  const [isError, setIsError] = useState(false);
  const [btnTitle, setBtnTitle] = useState(t`Update Take-Profit Order`);
  const title = order?.isLong
    ? t`Edit TP: Long ${formatMarketName(resolvedIndexTokenAddress)}`
    : t`Edit TP: Short ${formatMarketName(resolvedIndexTokenAddress)}`;
  useEffect(() => {
    (() => {
      if (order) {
        // const markPrice = formatAmount(
        //   new BN(unitPrice),
        //   USD_DECIMALS - sizeDecimals,
        //   // 4
        // );
        const markPrice = formatPriceUsd(new BN(indexTokenPrice), {
          fallbackToZero: true,
          displayDecimals: useGmw402PriceDecimals
            ? priceInputDecimals
            : undefined,
          isDisplayDecimals: useGmw402PriceDecimals ||
            GMX_SOLANA_FOREX_PRECISION_MARKET_TOKENS.includes(resolvedIndexTokenAddress),
          showDollarSign: false
        });
        setMarkPrice(markPrice);
        const position = getGmw385Enabled()
          ? Object.values(positions ?? {}).find(
              (item) =>
                item.address?.toBase58() === order?.positionAddress?.toBase58()
            )
          : positions?.find(
              (item) =>
                item.address?.toBase58() === order?.positionAddress?.toBase58()
            );
        const liquidation_price = position?.liquidation_price;
        // const liquidation_price_usd = formatAmount(
        //   new BN(liquidation_price),
        //   USD_DECIMALS - sizeDecimals,
        //   4
        // );
        const liquidation_price_usd = formatPriceUsd(
          new BN(liquidation_price).mul(
            new BN(10).pow(new BN(sizeDecimals))
          ),
          {
            displayDecimals: useGmw402PriceDecimals
              ? priceInputDecimals
              : undefined,
            isDisplayDecimals: useGmw402PriceDecimals ||
              GMX_SOLANA_FOREX_PRECISION_MARKET_TOKENS.includes(resolvedIndexTokenAddress)
          }
        );
        setLqPrice(liquidation_price_usd);
      }
    })();
  }, [
    indexTokenPrice,
    order,
    positions,
    resolvedIndexTokenAddress,
    sizeDecimals,
    priceInputDecimals,
    useGmw402PriceDecimals,
  ]);

  const dataList = [
    {
      title: t`Allowed Slippage`,
      content: (
        <PercentageInput
          defaultValue={100}
          value={slippage}
          onChange={(value) => {
            setSlippage(value);
            localStorage.setItem('slippage', value.toString());
            setAcceptPriceBn(
              applySlippageToPrice(value, triggerPriceBn, false, isLong)
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
          <span>{acceptPriceDisplay}</span>
        </>
      ),
    },
    {
      title: t`Liquidation Price`,
      content: (
        <>
          <span>{lqPrice}</span>
        </>
      ),
    },
  ];
  useBodyScrollLock(true);
  return (
    <>
      <div className="market-decrease-overlay" onClick={onClose} />
      <div className="market-decrease-modal edit-collateral">
        <Title title={title} onClose={onClose} />
        <div className="market-decrease-content">
          <div>
            <InputItem
              title={t`Close`}
              value={size}
              unit={'USD'}
              onChange={(value) => {
                setSize(value);
                const maxSize = sizeInUsd;
                const sizeBN = formatInput(value, USD_DECIMALS);
                if (!value) {
                  setBtnTitle(t`Enter new amount`);
                  setBtnDisabled(true);
                }
                if (sizeBN.gt(new BN(0)) && sizeBN.lte(maxSize)) {
                  const rate = sizeBN.mul(new BN(100)).div(maxSize);
                  const amount = sizeBN.div(new BN(unitPrice));
                  setSizeAmount(amount);
                  setRate(rate.toNumber());
                  setSizeBn(sizeBN);
                  setBtnDisabled(false);
                  if (!triggerPriceStr) {
                    setBtnTitle(t`Enter a price`);
                    setBtnDisabled(true);
                    return;
                  }
                  setBtnTitle(t`Update Take-Profit Order`);
                  setBtnDisabled(false);
                } else {
                  setBtnTitle(t`Close Exceeded`);
                  setBtnDisabled(true);
                }
              }}
            />
            <br />
            <InputItem
              title={t`Trigger Price`}
              value={triggerPriceStr}
              unit={'USD'}
              mark={markPrice || '$0.0000'}
              decimalPlaces={gmw402Enabled ? priceInputDecimals : undefined}
              onChange={(value) => {
                setTriggerPriceStr(value);
                if (!value) {
                  setBtnTitle(t`Enter a price`);
                  setBtnDisabled(true);
                  setAcceptPriceBn(new BN(0));
                  // setAcceptPrice('$0.0000');
                } else {
                  const triggerPriceBn = formatInput(
                    value,
                    USD_DECIMALS - sizeDecimals
                  );
                  setAcceptPriceBn(
                    applySlippageToPrice(slippage, triggerPriceBn, false, isLong)
                  );
                  setTriggerPriceBn(triggerPriceBn);
                  if (!size) {
                    setBtnTitle(t`Enter new amount`);
                    setBtnDisabled(true);
                    return;
                  }
                  setBtnTitle(t`Update Take-Profit Order`);
                  setBtnDisabled(false);
                }
              }}
            />
            <SliderComponent
              onInputChange={(value) => {
                setRate(value);
                const currentCloseSize = sizeInUsd
                  .mul(new BN(value))
                  .div(new BN(100));
                const currentCloseSizeAmount = currentCloseSize.div(
                  new BN(unitPrice)
                );
                setSizeAmount(currentCloseSizeAmount);
                setSizeBn(currentCloseSize);
                const size = formatAmountFree(currentCloseSize, USD_DECIMALS);
                setSize(size);
                setBtnTitle(t`Update Take-Profit Order`);
                setBtnDisabled(false);
              }}
              value={rate}
            />
          </div>
        </div>

        <ExchangeButton
          successCallbackInfo={{
            num: '',
            tokenName: '',
            sig: '',
          }}
          type="decrease"
          title={btnTitle}
          btnDisabled={btnDisabled}
          handleSubmit={async () => {
            const noticeId = helperNotice.info(
              t`Updating take-profit order...`
            );
            const connection = storeProgram.provider.connection;
            // const PrioritizationFees = await getRecentPrioritizationFeesFn(connection)
            const PrioritizationFees = computeUnitPrice;
            const blockhash = await getRecentBlockhash(connection);
            const payer = new PublicKey(payerInfo.address).toBase58();
            const params = {
              blockhash,
              payer,
              market_token: order?.marketTokenAddress.toBase58(),
              PrioritizationFees,
              size_delta_value: sizeBn,
              trigger_price: triggerPriceBn,
              acceptable_price: acceptPriceBn,
              order_addr: order?.orderAddress?.toBase58(),
              signAllTransactions,
              storeProgram,
            };
            try {
              const result = await useUpdateOrderByTpDecrease(params);
              if (result.length) {
                removeNotice(noticeId);
                helperNotice.success(t`Take-profit order updated.`);
                // setIsOk(true)
                setTimeout(() => {
                  onClose();
                }, 2000);
              }
            } catch (error) {
              setIsError(true);
              removeNotice(noticeId);
              helperNotice.error(t`Failed to update take-profit order.`, {
                tradingErrorInfo: { actionName: 'Update Take Profit', errorData: error },
              });
              // setIsOk(false)
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

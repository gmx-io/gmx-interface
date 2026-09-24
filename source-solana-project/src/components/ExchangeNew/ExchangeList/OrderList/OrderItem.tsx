import ExternalLink from '@/components/Common/Link/ExternalLink';
import Button from '@/components/Common/Button/Button';
import { TableTd, TableTr } from '@/components/Common/Table/Table';
import { MarketWithDirectionLabel } from '@/components/Common/Table/TableMarketFilter/MarketWithDirectionLabel';
import TokenIcon from '@/components/Common/TokenIcon/TokenIcon';
import Tooltip from '@/components/Common/Tooltip/Tooltip';
import TooltipWithPortal from '@/components/Common/Tooltip/TooltipWithPortal';
import StatsTooltipRow from '@/components/Common/Tooltip/StatsTooltipRow';
import { SwapMarketLabel } from '@/components/Exchange/ExchangeList/OrderList/SwapMarketLabel';
import {
  BN_10,
  BN_NEG_ONE,
  BN_ONE,
  BN_ZERO,
  USD_DECIMALS,
} from '@/config/constants';
import { useOrderErrors } from '@/hooks/orderHooks/useOrderErrors';
import newLinkIcon from '@/img/ic_new_link_20.svg';
import { OrderType as OrderTypeEnum } from '@/selectors/order/types';
import { formatMarketName } from '@/components/TradeBoxNew/utils/formatMarketName';
import {
  OrderInfo,
  OrderType,
  PositionOrderInfo,
  SwapOrderInfo,
} from '@/selectors/order/types';
import IconTpEdit from '@/img/tp-edit.svg?react';
import closeIcons from '@/img/header/close.svg';
import { selectSetOrderEditorEditingOrderAddress } from '@/selectors/orderEditor/baseSelectors';
import { PositionsInfo } from '@/selectors/position/types';
import { selectShowDebugValues } from '@/selectors/setting/baseSelectors';
import { selectTokensData } from '@/selectors/token/selectTokensData';
import { TokenData, TokensData } from '@/selectors/token/types';
import { getGmw385Enabled } from '@/config/featureFlagEnable';
import LongOrShortLimit from '@/components/ExchangeNew/ExchangeList/OrderList/components/LongOrShortLimit';
import SwapLimit from '@/components/ExchangeNew/ExchangeList/OrderList/components/SwapLimit';
import {
  convertTokenAmountToUsd,
  convertUsdToTokenAmount,
} from '@/utils/legacy/convert';
import {
  formatAmount,
  formatParseUsdToBN,
  formatPriceUsd,
  formatTokenAmount,
  formatUsd,
  formatDivision,
} from '@/utils/legacy/format';
import { getAddressUrl } from '@/utils/lib/explorer';
import { getMarketMarkPrice } from '@/utils/market/getMarketMarkPrice';
import { getOrderExchangeRate } from '@/utils/order/getOrderExchangeRate';
import { getOrderExchangeRateDisplay } from '@/utils/order/getOrderExchangeRateDisplay';
import { getOrdersListTypeLabel } from '@/utils/order/getOrdersListTypeLabel';
import {
  isCollateralDepositOrder,
  isCollateralWithdrawOrder,
  isDecreaseOrderType,
  isIncreaseOrderType,
  isLimitSwapOrderType,
  isUserCreatedMarketOrderType,
} from '@/utils/order/isOrderType';
import { TriggerThresholdType } from '@/selectors/trade/types';
import { useShallow } from 'zustand/react/shallow';
import { useAppStore } from '@/zustand/useAppStore';
import { BN } from '@coral-xyz/anchor';
import { t, Trans } from '@lingui/macro';
import cx from 'classnames';
import {
  ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { MdClose } from 'react-icons/md';
import { GMX_SOLANA_TOKENS_RAW, GMX_SOLANA_FOREX_PRECISION_MARKET_TOKENS } from '@/config/program';
import { getNormalizedTokenSymbolForFetchingPrice } from '@/utils/token/getNormalizedTokenSymbolForFetchingPrice';
import { getTriggerThresholdType } from '@/utils/order/getTriggerThresholdType';
import { formatAcceptablePriceDisplay } from '@/utils/order/formatAcceptablePriceDisplay';
import TpDecrease from '../PositionList/components/TpDecrease';
import SlDecrease from '../PositionList/components/SlDecrease';
import { useMedia } from 'react-use';
import './OrderCard.scss';
import { resolveOrderMarketData } from '@/utils/order/resolveOrderMarketData';

type Props = {
  order: OrderInfo;
  onCancelOrder?: () => void;
  onEditTPSLOrder?: () => void;
  isCanceling?: boolean;
  hideActions?: boolean;
  isLarge: boolean;
  positionsInfoData?: PositionsInfo;
  setRef?: (el: HTMLElement | null, orderKey: string) => void;
};

type OrderItemLargeProps = {
  order: OrderInfo;
  setRef?: (el: HTMLElement | null, orderKey: string) => void;
  hideActions?: boolean;
  showDebugValues?: boolean;
  setEditingOrderAddress?: () => void;
  onCancelOrder?: () => void;
  onEditTPSLOrder?: () => void;
  isCanceling?: boolean;
  tokensData: TokensData;
};

function useOrderMarketData(
  order: OrderInfo,
  marketsMap: Map<string, unknown>,
  tokenPriceMap: Map<string, { price: string | number }>
) {
  const latestOrderMarketData = useMemo(
    () => resolveOrderMarketData(order, marketsMap, tokenPriceMap),
    [marketsMap, order.marketTokenAddress, tokenPriceMap]
  );
  const lastReadyOrderMarketDataRef = useRef<
    typeof latestOrderMarketData | null
  >(null);

  if (getGmw385Enabled() && latestOrderMarketData.isReady) {
    lastReadyOrderMarketDataRef.current = latestOrderMarketData;
  }

  if (
    getGmw385Enabled() &&
    !latestOrderMarketData.isReady &&
    lastReadyOrderMarketDataRef.current?.marketTokenAddress ===
      latestOrderMarketData.marketTokenAddress
  ) {
    return lastReadyOrderMarketDataRef.current;
  }

  return latestOrderMarketData;
}

export function OrderItem(p: Props) {
  const tokensData = useAppStore(selectTokensData);
  const showDebugValues = useAppStore(selectShowDebugValues);
  const [showLongOrShortLimit, setShowLongOrShortLimit] = useState(false);
  const setOrderEditorEditingOrderAddress = useAppStore(
    selectSetOrderEditorEditingOrderAddress
  );
  const setEditingOrderAddress = useCallback(() => {
    setShowLongOrShortLimit(true);
    setOrderEditorEditingOrderAddress(p.order.orderAddress.toBase58());
  }, [p.order.orderAddress, setOrderEditorEditingOrderAddress]);

  return p.isLarge ? (
    <OrderItemLarge
      order={p.order}
      hideActions={p.hideActions}
      showDebugValues={showDebugValues}
      setEditingOrderAddress={setEditingOrderAddress}
      onCancelOrder={p.onCancelOrder}
      onEditTPSLOrder={p.onEditTPSLOrder}
      isCanceling={p.isCanceling}
      setRef={p.setRef}
      tokensData={tokensData}
    />
  ) : (
    <OrderItemCard
      order={p.order}
      hideActions={p.hideActions}
      showDebugValues={showDebugValues}
      setEditingOrderAddress={setEditingOrderAddress}
      onCancelOrder={p.onCancelOrder}
      onEditTPSLOrder={p.onEditTPSLOrder}
      isCanceling={p.isCanceling}
      setRef={p.setRef}
      tokensData={tokensData}
    />
  );
}

function Title({
  order,
  showDebugValues,
  tokensData,
}: {
  order: OrderInfo;
  showDebugValues: boolean | undefined;
  tokensData: TokensData;
}) {
  if (isLimitSwapOrderType(order.orderType)) {
    return <TitleWithIcon order={order} />;
  }

  const positionOrder = order as PositionOrderInfo;

  function getCollateralLabel() {
    if (isUserCreatedMarketOrderType(positionOrder.orderType)) {
      return t`Collateral Delta`;
    }
    if (isDecreaseOrderType(positionOrder.orderType)) {
      return t`Collateral Delta`;
    }
    return t`Collateral`;
  }

  function getCollateralSign() {
    if (isCollateralWithdrawOrder(positionOrder)) {
      return '-';
    }
    if (isUserCreatedMarketOrderType(positionOrder.orderType)) {
      return '+';
    }
    return '';
  }

  function getCollateralText() {
    const tokenAmountText = formatAmount(
      positionOrder.initialCollateralDeltaAmount,
      GMX_SOLANA_TOKENS_RAW[order?.initialCollateralTokenAddress]?.decimals
    );

    const tokenAmountSymbol =
      GMX_SOLANA_TOKENS_RAW[order?.initialCollateralTokenAddress]?.symbol === 'WGMX' ? 'GMX' : GMX_SOLANA_TOKENS_RAW[order?.initialCollateralTokenAddress]?.symbol;
    const sign = getCollateralSign();
    return sign
      ? `${sign}${tokenAmountText} ${tokenAmountSymbol}`
      : `${tokenAmountText}  ${tokenAmountSymbol}`;
  }

  return (
    <TooltipWithPortal
      disableHandleStyle
      handle={<TitleWithIcon bordered order={order} />}
      position="bottom-start"
      content={
        <>
          <StatsTooltipRow
            label={getCollateralLabel()}
            value={getCollateralText()}
            showDollar={false}
          />
        </>
      }
    />
  );
}

function TitleWithIcon({
  order,
  bordered,
}: {
  order: OrderInfo;
  bordered?: boolean;
}) {
  if (isLimitSwapOrderType(order.orderType)) {
    const {
      initialCollateralTokenAddress,
      targetCollateralToken,
      minOutputAmount,
      initialCollateralDeltaAmount,
    } = order;

    const fromTokenText = formatTokenAmount(
      initialCollateralDeltaAmount,
      GMX_SOLANA_TOKENS_RAW[order?.initialCollateralTokenAddress]?.decimals,
      ''
    );
    const fromTokenIcon = (
      <TokenIcon
        symbol={
          GMX_SOLANA_TOKENS_RAW[order?.initialCollateralTokenAddress]?.symbol === 'WGMX' ? 'GMX' : GMX_SOLANA_TOKENS_RAW[order?.initialCollateralTokenAddress]?.symbol
        }
        displaySize={18}
        importSize={24}
        className="min-h-18 min-w-18"
      />
    );

    const toTokenText = formatTokenAmount(
      minOutputAmount,
      GMX_SOLANA_TOKENS_RAW[order?.finalOutputTokenAddress]?.decimals,
      ''
    );
    const toTokenIcon = (
      <TokenIcon
        symbol={
          GMX_SOLANA_TOKENS_RAW[order?.finalOutputTokenAddress]?.symbol === 'WGMX' ? 'GMX' : GMX_SOLANA_TOKENS_RAW[order?.finalOutputTokenAddress]?.symbol ?? ''
        }
        displaySize={18}
        importSize={24}
        className="min-h-18 min-w-18"
      />
    );

    return (
      <div
        className={cx(
          'text-body-medium inline-flex flex-wrap gap-y-8 whitespace-pre-wrap',
          {
            'cursor-help *:border-b *:border-dashed *:border-b-gray-400':
              bordered,
          }
        )}
      >
        <Trans>
          <span>{fromTokenText} </span>
          {fromTokenIcon}
          <span> to </span>
          <span>{toTokenText} </span>
          {toTokenIcon}
        </Trans>
      </div>
    );
  }

  const isCollateralEditOrder =
    isCollateralDepositOrder(order) || isCollateralWithdrawOrder(order);
  const { sizeDeltaUsd } = order;
  const sizeText = isCollateralEditOrder
    ? '$0'
    : formatUsd(
        sizeDeltaUsd.mul(
          isIncreaseOrderType(order.orderType) ? BN_ONE : BN_NEG_ONE
        ),
        {
          displayPlus: true,
        }
      );

  return (
    <span
      className={cx({
        'cursor-help border-b border-dashed border-b-gray-400': bordered,
      })}
    >
      {sizeText}
    </span>
  );
}

function MarkPrice({
  order,
  indexTokens,
  markSwapPrice,
  indexTokenPrice,
  indexTokenAddress,
  symbolText,
}: {
  order: OrderInfo;
  indexTokens: any;
  markSwapPrice: string;
  indexTokenPrice: string | number | undefined;
  indexTokenAddress?: string;
  symbolText: string;
}) {
  const positionOrder = order as PositionOrderInfo;

  const markPriceFormatted = formatPriceUsd(new BN(indexTokenPrice), {
    fallbackToZero: true,
    isDisplayDecimals: GMX_SOLANA_FOREX_PRECISION_MARKET_TOKENS.includes(
      getPositionOrderIndexTokenAddress(positionOrder)
    ),
  });

  const triggerPrice = useMemo(
    () =>
      formatPositionOrderPrice(
        positionOrder,
        positionOrder?.triggerPrice,
        indexTokenAddress
      ),
    [indexTokenAddress, positionOrder, positionOrder?.triggerPrice]
  );

  if (isLimitSwapOrderType(order.orderType)) {
    return (
      <div>
        <span className="mr-[0.4rem]">{markSwapPrice}</span>
        <span>{symbolText}</span>
      </div>
    );
  }

  if (
    isCollateralDepositOrder(order) ||
    isCollateralWithdrawOrder(order)
  ) {
    return <span>-</span>;
  }

  if (isUserCreatedMarketOrderType(order.orderType)) {
    return (
      <TooltipWithPortal
        handle={markPriceFormatted}
        position="bottom-end"
        renderContent={() => {
          return (
            <Trans>
              <p>
                The order will be executed at the next available oracle price.
              </p>
              <br />
              <p>
                Note that there may be rare cases where the order cannot be
                executed, for example, if the chain is down and no oracle
                reports are produced or if the price impact exceeds your
                acceptable price.
              </p>
            </Trans>
          );
        }}
      />
    );
  }

  return (
    <TooltipWithPortal
      handle={markPriceFormatted}
      position="bottom-end"
      renderContent={() => {
        return (
          <Trans>
            <p>
              The order will be executed when the oracle price is{' '}
              {getPositionOrderTriggerThresholdType(positionOrder)}{' '}
              {triggerPrice}.
            </p>
            <br />
            <p>
              Note that there may be rare cases where the order cannot be
              executed, for example, if the chain is down and no oracle
              reports are produced or if the price impact exceeds your
              acceptable price.
            </p>
          </Trans>
        );
      }}
    />
  );
}

function TriggerPrice({
  order,
  triggerPrice,
  indexTokenAddress,
  symbolText,
}: {
  order: OrderInfo;
  triggerPrice: string;
  indexTokenAddress?: string;
  symbolText: string;
}) {
  if (isLimitSwapOrderType(order.orderType)) {
    const swapOrder = order as SwapOrderInfo;
    const toAmount = swapOrder.minOutputAmount;
    const finalOutToken = GMX_SOLANA_TOKENS_RAW[order?.finalOutputTokenAddress];

    const toAmountText = formatTokenAmount(
      toAmount,
      finalOutToken?.decimals,
      finalOutToken?.symbol
    );

    return (
      <>
        <TooltipWithPortal
          position="bottom-end"
          handle={
            <div>
              <span className="mr-[0.4rem]">{triggerPrice}</span>
              <span>{symbolText}</span>
            </div>
          }
          renderContent={() =>
            t`You will receive at least ${toAmountText} if this order is executed. This price is being updated in real time based on swap fees and price impact.`
          }
        />
      </>
    );
  }

  if (
    isCollateralDepositOrder(order) ||
    isCollateralWithdrawOrder(order)
  ) {
    return <span>-</span>;
  }

  const positionOrder = order as PositionOrderInfo;
  const triggerThresholdType =
    getPositionOrderTriggerThresholdType(positionOrder);
  const formattedTriggerPrice = formatPositionOrderPrice(
    positionOrder,
    positionOrder?.triggerPrice,
    indexTokenAddress
  );
  const resolvedIndexTokenAddress =
    indexTokenAddress ?? getPositionOrderIndexTokenAddress(positionOrder);
  const indexTokenDecimals =
    GMX_SOLANA_TOKENS_RAW[resolvedIndexTokenAddress]?.decimals ?? 0;
  const acceptablePriceDisplay = formatAcceptablePriceDisplay({
    orderType: positionOrder.orderType,
    isLong: positionOrder.isLong,
    acceptablePrice: positionOrder.acceptablePrice,
    triggerPrice: positionOrder.triggerPrice,
    indexTokenDecimals,
    fallbackToZero: true,
    isDisplayDecimals: GMX_SOLANA_FOREX_PRECISION_MARKET_TOKENS.includes(
      resolvedIndexTokenAddress
    ),
  });
  const handle = isUserCreatedMarketOrderType(order.orderType)
    ? t`(Market)`
    : `${triggerThresholdType || ''} ${formattedTriggerPrice}`;

  return (
    <TooltipWithPortal
      handle={handle}
      position="bottom-end"
      renderContent={() => (
        <>
          <StatsTooltipRow
            label={t`Acceptable Price`}
            value={acceptablePriceDisplay}
            showDollar={false}
          />
        </>
      )}
    />
  );
}

function getPositionOrderIndexTokenAddress(order: PositionOrderInfo) {
  const indexToken = order.marketSummary?.indexToken;

  if (indexToken) {
    return indexToken;
  }

  return (
    (order.marketInfo?.indexToken as TokenData | undefined)?.address?.toBase58() ||
    ''
  );
}

function getPositionOrderTriggerThresholdType(
  order: PositionOrderInfo
): TriggerThresholdType | undefined {
  return (
    order.triggerThresholdType ??
    getTriggerThresholdType(order.orderType, order.isLong)
  );
}

function getPositionOrderPriceUsd(
  order: PositionOrderInfo,
  price?: BN | null,
  indexTokenAddress?: string
) {
  const resolvedIndexTokenAddress =
    indexTokenAddress ?? getPositionOrderIndexTokenAddress(order);
  const decimals =
    GMX_SOLANA_TOKENS_RAW[resolvedIndexTokenAddress]?.decimals ?? 0;

  return new BN(price?.toString() || 0).mul(BN_10.pow(new BN(decimals)));
}

function formatPositionOrderPrice(
  order: PositionOrderInfo,
  price?: BN | null,
  indexTokenAddress?: string
) {
  const resolvedIndexTokenAddress =
    indexTokenAddress ?? getPositionOrderIndexTokenAddress(order);

  return formatPriceUsd(
    getPositionOrderPriceUsd(order, price, resolvedIndexTokenAddress),
    {
      fallbackToZero: true,
      isDisplayDecimals: GMX_SOLANA_FOREX_PRECISION_MARKET_TOKENS.includes(
        resolvedIndexTokenAddress
      ),
    }
  );
}

function OrderItemTypeLabel({ order }: { order: OrderInfo }) {
  const { errors } = useOrderErrors(order.orderAddress.toBase58());

  const handle = getOrdersListTypeLabel(order);
  const typeText = (
    <span
      className={cx('text-white', {
        'cursor-help underline decoration-dashed decoration-1 decoration-white/50 underline-offset-2':
          errors.length > 0,
      })}
    >
      {handle}
    </span>
  );

  if (errors.length === 0) {
    return typeText;
  }

  return (
    <TooltipWithPortal
      disableHandleStyle
      handle={typeText}
      content={
        errors.length ? (
          <>
            {errors.map((error) => (
              <div className="mt-0" key={error.key}>
                <span className="text-white">{error.msg}</span>
              </div>
            ))}
          </>
        ) : null
      }
    />
  );
}

function OrderItemLarge(props: OrderItemLargeProps): ReactNode {
  const {
    order,
    setRef,
    hideActions,
    showDebugValues,
    setEditingOrderAddress,
    onCancelOrder,
    isCanceling,
    tokensData,
  } = props;
  const { positions } = useAppStore(
    useShallow((state) => ({
      positions: state.positionState.positions,
    }))
  );
  const marketsMap = useAppStore(
    useShallow((state) => state.markets.marketsMap as Map<string, unknown>)
  );
  const indexTokens = useAppStore(
    useShallow((state) => state.TradeboxNew.sortedIndexTokens)
  );
  const isSwap = isLimitSwapOrderType(order.orderType);
  const { tickers } = useAppStore(
    useShallow((state) => ({
      tickers: state.tickersState.tickers,
    }))
  );

  const [markPrice, setMarkPrice] = useState('');
  const [triggerPrice, setTriggerPrice] = useState('');
  const [symbolText, setSymbolText] = useState('');
  const [showLongOrShortLimit, setShowLongOrShortLimit] = useState(false);
  const [showSwapLimit, setShowSwapLimit] = useState(false);
  const [showTpDecrease, setShowTpDecrease] = useState(false);
  const [showSlDecrease, setShowSlDecrease] = useState(false);
  const { tokenPriceMap } = useAppStore(
    useShallow((state) => ({
      tokenPriceMap: state.tickersState.tokenPriceMap,
    }))
  );

  // test order info
  // useEffect(() => {
  //   console.log('order info', {
  //     isLong: order.isLong,
  //     orderType: order.orderType,
  //     acceptablePrice: order.acceptablePrice?.toString(),
  //     collateralTokenAddress: order.collateralTokenAddress?.toBase58(),
  //     finalOutputTokenAddress: order.finalOutputTokenAddress?.toBase58(),
  //     initialCollateralDeltaAmount: order.initialCollateralDeltaAmount?.toString(),
  //     initialCollateralTokenAddress: order.initialCollateralTokenAddress?.toBase58(),
  //     longTokenAddress: order.longTokenAddress?.toBase58(),
  //     marketTokenAddress: order.marketTokenAddress?.toBase58(),
  //     minOutputAmount: order.minOutputAmount?.toString(),
  //     orderAddress: order.orderAddress?.toBase58(),
  //     shortTokenAddress: order.shortTokenAddress?.toBase58(),
  //     sizeDeltaUsd: order.sizeDeltaUsd?.toString(),
  //     triggerPrice: order.triggerPrice?.toString(),
  //     orderInfo: order,
  //   })
  // }, [order])

  useEffect(() => {
    if (isLimitSwapOrderType(order.orderType)) {
      const inTokenDecimals =
        GMX_SOLANA_TOKENS_RAW[order?.initialCollateralTokenAddress]?.decimals;
      const outTokenDecimals =
        GMX_SOLANA_TOKENS_RAW[order?.finalOutputTokenAddress]?.decimals;

      const inToken = {
        inTokenAmount: order.initialCollateralDeltaAmount,
        symbol: getNormalizedTokenSymbolForFetchingPrice(order?.inSymbol),
        triggerPrice: new BN(order?.initialCollateralDeltaAmount).mul(
          new BN(10).pow(new BN(outTokenDecimals))
        ),
        decimals: inTokenDecimals,
        price: '',
      };
      const outToken = {
        outTokenAmount: order.minOutputAmount,
        symbol: getNormalizedTokenSymbolForFetchingPrice(order?.outSymbol),
        triggerPrice: new BN(order.minOutputAmount).mul(
          new BN(10).pow(new BN(inTokenDecimals))
        ),
        decimals: outTokenDecimals,
        price: '',
      };

      tickers.forEach((item) => {
        if (item.symbol === inToken.symbol) {
          inToken.price = new BN(item.price);
        }
        if (item.symbol === outToken.symbol) {
          outToken.price = new BN(item.price);
        }
      });

      const triggerTokenList = inToken?.triggerPrice?.gt(outToken?.triggerPrice)
        ? [inToken, outToken]
        : [outToken, inToken];

      const valueMaxBN = formatParseUsdToBN('1', triggerTokenList[1].decimals);
      const payMaxPrice = valueMaxBN.mul(new BN(triggerTokenList[1]?.price));
      let receiveMaxPrice = new BN(0);
      if (new BN(triggerTokenList[0]?.price).gt(new BN(0))) {
        receiveMaxPrice = payMaxPrice.div(new BN(triggerTokenList[0]?.price));
      }

      const markPrice = formatAmount(
        receiveMaxPrice,
        triggerTokenList[1].decimals,
        3,
        true,
        false
      );
      const triggerPrice = formatDivision(
        triggerTokenList[0]?.triggerPrice,
        triggerTokenList[1]?.triggerPrice,
        3
      );
      const symbolText = `${triggerTokenList[0]?.symbol} / ${triggerTokenList[1]?.symbol}`;

      setMarkPrice(markPrice);
      setTriggerPrice(triggerPrice);
      setSymbolText(symbolText);
    }
  }, [tickers]);

  const orderMarketData = useOrderMarketData(
    order,
    marketsMap,
    tokenPriceMap
  );

  const { indexName, tokenSymbol } = useMemo(() => {
    const { indexTokenAddress, marketTokenAddress } = orderMarketData;
    const gmw385Enabled = getGmw385Enabled();

    if (!marketTokenAddress || isSwap)
      return {
        indexName: '...',
        tokenSymbol: '...',
      };

    if (!gmw385Enabled) {
      return {
        indexName: `${formatMarketName(order.marketSummary?.indexToken)}`,
        tokenSymbol: `${GMX_SOLANA_TOKENS_RAW[order.marketSummary?.indexToken]?.symbol}`,
      };
    }

    if (!indexTokenAddress)
      return {
        indexName: '...',
        tokenSymbol: '...',
      };

    return {
      indexName: formatMarketName(indexTokenAddress) ?? '...',
      tokenSymbol:
        GMX_SOLANA_TOKENS_RAW[indexTokenAddress]?.symbol ?? '...',
    };
  }, [
    isSwap,
    order.marketSummary?.indexToken,
    orderMarketData,
  ]);

  const indexTokenAddress = useMemo(() => {
    if (!getGmw385Enabled()) {
      return order.marketSummary?.indexToken;
    }

    return orderMarketData.indexTokenAddress;
  }, [order.marketSummary?.indexToken, orderMarketData.indexTokenAddress]);

  const swapPathTokenSymbols = useMemo(() => {
    if (!isSwap) return [];
    return [
      `${GMX_SOLANA_TOKENS_RAW[order?.initialCollateralTokenAddress]?.symbol}`,
      `${GMX_SOLANA_TOKENS_RAW[order?.finalOutputTokenAddress]?.symbol}`,
    ];
  }, [
    isSwap,
    order.initialCollateralTokenAddress,
    order.finalOutputTokenAddress,
  ]);

  const handleSetRef = useCallback(
    (el: HTMLElement | null) => {
      setRef && setRef(el, order.orderAddress.toBase58());
    },
    [order.orderAddress, setRef]
  );

  const triggerThresholdType = useMemo(() => {
    if (!isLimitSwapOrderType(order.orderType)) {
      return getTriggerThresholdType(order?.orderType, order?.isLong);
    }
  }, [order?.orderType, order?.isLong]);

  if (!isLimitSwapOrderType(order.orderType)) {
    order.triggerThresholdType = triggerThresholdType;
  }

  const indexTokenPrice = useMemo(() => {
    if (!getGmw385Enabled()) {
      return indexTokenAddress
        ? tokenPriceMap.get(indexTokenAddress)?.price
        : undefined;
    }

    return indexTokenAddress ? orderMarketData.ticker?.price : undefined;
  }, [indexTokenAddress, orderMarketData.ticker, tokenPriceMap]);

  return (
    <>
      <TableTr ref={handleSetRef} bordered={false}>
        <TableTd>
          {/* market */}
          <div className="inline-flex items-center gap-5">
            {isSwap ? (
              <SwapMarketLabel
                bordered
                fromSymbol={swapPathTokenSymbols[0]}
                toSymbol={swapPathTokenSymbols[1]}
              />
            ) : (
              <MarketWithDirectionLabel
                isLong={order.isLong}
                indexName={indexName}
                tokenSymbol={tokenSymbol}
              />
            )}
            <ExternalLink
              href={getAddressUrl(order.orderAddress)}
              className="ml-2 inline-flex items-center hover:opacity-80"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                window.open(
                  getAddressUrl(order.orderAddress),
                  '_blank',
                  'noopener,noreferrer'
                );
              }}
            >
              <img
                src={newLinkIcon}
                alt="View in explorer"
                width={12}
                height={12}
              />
            </ExternalLink>
          </div>
        </TableTd>
        <TableTd>
          {/* type */}
          <OrderItemTypeLabel order={order} />
        </TableTd>
        <TableTd>
          {/* size */}
          <Title
            order={order}
            showDebugValues={showDebugValues}
            tokensData={tokensData}
          />
        </TableTd>
        <TableTd>
          {/* Trigger */}
          <TriggerPrice
            order={order}
            triggerPrice={triggerPrice}
            indexTokenAddress={indexTokenAddress}
            symbolText={symbolText}
          />
        </TableTd>
        <TableTd>
          {/* mark price */}
          <MarkPrice
            order={order}
            indexTokens={indexTokens}
            markSwapPrice={markPrice}
            indexTokenPrice={indexTokenPrice}
            indexTokenAddress={indexTokenAddress}
            symbolText={symbolText}
          />
        </TableTd>
        {!hideActions && (
          <>
            <TableTd>
              {!isUserCreatedMarketOrderType(order.orderType) && (
                <Button
                  variant="ghost"
                  className="cursor-pointer !bg-transparent !p-6 !text-gray-300 hover:!bg-transparent hover:!text-white"
                  onClick={() => {
                    const type =
                      OrderType[order.kind.toString() as OrderTypeEnum];
                    if (type === 'LimitIncrease') {
                      setShowLongOrShortLimit(true);
                    }
                    if (type === 'LimitSwap') {
                      setShowSwapLimit(true);
                    }
                    if (type === 'LimitDecrease') {
                      setShowTpDecrease(true);
                    }
                    if (type === 'StopLossDecrease') {
                      setShowSlDecrease(true);
                    }
                  }}
                >
                  <Trans>Edit</Trans>
                </Button>
              )}
            </TableTd>
            <TableTd>
              {onCancelOrder && (
                <Button
                  variant="ghost"
                  className="cursor-pointer !bg-transparent !p-6 !text-gray-300 hover:!bg-transparent hover:!text-white disabled:!cursor-wait"
                  disabled={isCanceling}
                  onClick={onCancelOrder}
                >
                  <MdClose title={t`Close order`} fontSize={16} />
                </Button>
              )}
            </TableTd>
          </>
        )}
      </TableTr>
      <LongOrShortLimit
        order={order}
        indexTokenAddress={indexTokenAddress}
        isVisible={showLongOrShortLimit}
        onClose={() => setShowLongOrShortLimit(false)}
      />
      <TpDecrease
        order={order}
        indexTokenAddress={indexTokenAddress}
        isVisible={showTpDecrease}
        onClose={() => setShowTpDecrease(false)}
      />
      <SlDecrease
        order={order}
        indexTokenAddress={indexTokenAddress}
        isVisible={showSlDecrease}
        onClose={() => setShowSlDecrease(false)}
      />

      <SwapLimit
        order={order}
        isVisible={showSwapLimit}
        onClose={() => setShowSwapLimit(false)}
      />
    </>
  );
}

function OrderItemCard(props: OrderItemLargeProps): ReactNode {
  const {
    order,
    hideActions,
    onCancelOrder,
    isCanceling,
    showDebugValues,
    tokensData,
  } = props;

  const isSwap = isLimitSwapOrderType(order.orderType);
  const { tickers } = useAppStore(
    useShallow((state) => ({
      tickers: state.tickersState.tickers,
    }))
  );

  const [markPrice, setMarkPrice] = useState('');
  const [triggerPrice, setTriggerPrice] = useState('');
  const [symbolText, setSymbolText] = useState('');
  const [showLongOrShortLimit, setShowLongOrShortLimit] = useState(false);
  const [showSwapLimit, setShowSwapLimit] = useState(false);
  const [showTpDecrease, setShowTpDecrease] = useState(false);
  const [showSlDecrease, setShowSlDecrease] = useState(false);
  const { tokenPriceMap } = useAppStore(
    useShallow((state) => ({
      tokenPriceMap: state.tickersState.tokenPriceMap,
    }))
  );
  const indexTokens = useAppStore(
    useShallow((state) => state.TradeboxNew.sortedIndexTokens)
  );
  const marketsMap = useAppStore(
    useShallow((state) => state.markets.marketsMap as Map<string, unknown>)
  );

  useEffect(() => {
    if (isLimitSwapOrderType(order.orderType)) {
      const inTokenDecimals =
        GMX_SOLANA_TOKENS_RAW[order?.initialCollateralTokenAddress]?.decimals;
      const outTokenDecimals =
        GMX_SOLANA_TOKENS_RAW[order?.finalOutputTokenAddress]?.decimals;

      const inToken = {
        inTokenAmount: order.initialCollateralDeltaAmount,
        symbol: getNormalizedTokenSymbolForFetchingPrice(order.inSymbol),
        triggerPrice: new BN(order?.initialCollateralDeltaAmount).mul(
          new BN(10).pow(new BN(outTokenDecimals || 6))
        ),
        decimals: inTokenDecimals || 6,
        price: '0',
      };
      const outToken = {
        outTokenAmount: order.minOutputAmount,
        symbol: getNormalizedTokenSymbolForFetchingPrice(order.outSymbol),
        triggerPrice: new BN(order.minOutputAmount).mul(
          new BN(10).pow(new BN(inTokenDecimals || 6))
        ),
        decimals: outTokenDecimals || 6,
        price: '0',
      };

      tickers.forEach((item) => {
        if (item.symbol === inToken.symbol) {
          inToken.price = item.price.toString();
        }
        if (item.symbol === outToken.symbol) {
          outToken.price = item.price.toString();
        }
      });

      const triggerTokenList = inToken?.triggerPrice?.gt(outToken?.triggerPrice)
        ? [inToken, outToken]
        : [outToken, inToken];

      const valueMaxBN = formatParseUsdToBN('1', triggerTokenList[1].decimals);
      const payMaxPrice = valueMaxBN.mul(new BN(triggerTokenList[1]?.price));
      let receiveMaxPrice = new BN(0);
      if (new BN(triggerTokenList[0]?.price).gt(new BN(0))) {
        receiveMaxPrice = payMaxPrice.div(new BN(triggerTokenList[0]?.price));
      }

      const markPrice = formatAmount(
        receiveMaxPrice,
        triggerTokenList[1].decimals,
        3,
        true,
        false
      );
      const triggerPrice = formatDivision(
        triggerTokenList[0]?.triggerPrice,
        triggerTokenList[1]?.triggerPrice,
        3
      );
      const symbolText = `${triggerTokenList[0]?.symbol} / ${triggerTokenList[1]?.symbol}`;

      setMarkPrice(markPrice);
      setTriggerPrice(triggerPrice);
      setSymbolText(symbolText);
    }
  }, [tickers, order]);

  const orderMarketData = useOrderMarketData(
    order,
    marketsMap,
    tokenPriceMap
  );

  const { indexName, tokenSymbol } = useMemo(() => {
    const { indexTokenAddress, marketTokenAddress } = orderMarketData;
    const gmw385Enabled = getGmw385Enabled();

    if (!marketTokenAddress || isSwap)
      return {
        indexName: '...',
        tokenSymbol: '...',
      };

    if (!gmw385Enabled) {
      return {
        indexName: `${formatMarketName(order.marketSummary?.indexToken)}`,
        tokenSymbol: `${GMX_SOLANA_TOKENS_RAW[order.marketSummary?.indexToken]?.symbol}`,
      };
    }

    if (!indexTokenAddress)
      return {
        indexName: '...',
        tokenSymbol: '...',
      };

    return {
      indexName: formatMarketName(indexTokenAddress) ?? '...',
      tokenSymbol:
        GMX_SOLANA_TOKENS_RAW[indexTokenAddress]?.symbol ?? '...',
    };
  }, [
    isSwap,
    order.marketSummary?.indexToken,
    orderMarketData,
  ]);

  const indexTokenAddress = useMemo(() => {
    if (!getGmw385Enabled()) {
      return order.marketSummary?.indexToken;
    }

    return orderMarketData.indexTokenAddress;
  }, [order.marketSummary?.indexToken, orderMarketData.indexTokenAddress]);

  const swapPathTokenSymbols = useMemo(() => {
    if (!isSwap) return [];
    return [
      `${GMX_SOLANA_TOKENS_RAW[order?.initialCollateralTokenAddress]?.symbol}`,
      `${GMX_SOLANA_TOKENS_RAW[order?.finalOutputTokenAddress]?.symbol}`,
    ];
  }, [
    isSwap,
    order.initialCollateralTokenAddress,
    order.finalOutputTokenAddress,
  ]);

  const indexTokenPrice = useMemo(() => {
    if (isSwap) return '0';

    if (!getGmw385Enabled()) {
      return indexTokenAddress
        ? tokenPriceMap.get(indexTokenAddress)?.price || '0'
        : '0';
    }

    return indexTokenAddress ? orderMarketData.ticker?.price || '0' : '0';
  }, [indexTokenAddress, isSwap, orderMarketData.ticker, tokenPriceMap]);

  const orderTypeText = getOrdersListTypeLabel(order);

  return (
    <>
      <div className="order-card">
        <div className="order-card-header">
          <div className="order-card-symbol">
            {isSwap ? (
              <div className="order-card-swap-info">
                <TokenIcon
                  symbol={swapPathTokenSymbols[0]}
                  displaySize={20}
                  importSize={40}
                  className="order-card-token-icon"
                />
                <span className="order-card-swap-arrow">→</span>
                <TokenIcon
                  symbol={swapPathTokenSymbols[1] === 'WGMX' ? 'GMX' : swapPathTokenSymbols[1]}
                  displaySize={20}
                  importSize={40}
                  className="order-card-token-icon"
                />
                <div className="order-card-symbol-info">
                  <div className="order-card-market-name">
                    {swapPathTokenSymbols[0] === 'WGMX' ? 'GMX' : swapPathTokenSymbols[0]} → {swapPathTokenSymbols[1] === 'WGMX' ? 'GMX' : swapPathTokenSymbols[1]}
                  </div>
                </div>
              </div>
            ) : (
              <div className="order-card-position-info">
                <TokenIcon
                  symbol={tokenSymbol}
                  displaySize={20}
                  importSize={40}
                  className="order-card-token-icon"
                />
                <div className="order-card-symbol-info">
                  <div className="order-card-market-name">
                    {indexName}
                    <span
                      className={cx('order-card-direction', {
                        long: order.isLong,
                        short: !order.isLong,
                      })}
                    >
                      {order.isLong ? t`Long` : t`Short`}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="order-card-details">
          <div className="order-card-detail-row">
            <div className="order-card-detail-label">
              <Trans>Order Type</Trans>
            </div>
            <div className="order-card-detail-value">{orderTypeText}</div>
          </div>

          <div className="order-card-detail-row">
            <div className="order-card-detail-label">
              <Trans>Size</Trans>
            </div>
            <div className="order-card-detail-value">
              <Title
                order={order}
                showDebugValues={showDebugValues}
                tokensData={tokensData}
              />
            </div>
          </div>

          <div className="order-card-detail-row">
            <div className="order-card-detail-label">
              <Trans>Trigger Price</Trans>
            </div>
            <div className="order-card-detail-value">
              <TriggerPrice
                order={order}
                triggerPrice={triggerPrice}
                indexTokenAddress={indexTokenAddress}
                symbolText={symbolText}
              />
            </div>
          </div>

          <div className="order-card-detail-row">
            <div className="order-card-detail-label">
              <Trans>Mark Price</Trans>
            </div>
            <div className="order-card-detail-value">
              <MarkPrice
                order={order}
                indexTokens={indexTokens}
                markSwapPrice={markPrice}
                indexTokenPrice={indexTokenPrice}
                indexTokenAddress={indexTokenAddress}
                symbolText={symbolText}
              />
            </div>
          </div>
        </div>

        {!hideActions && (
          <div className="order-card-actions">
            <div style={{ display: 'flex', gap: '0.8rem' }}>
              {!isUserCreatedMarketOrderType(order.orderType) && (
                <Button
                  variant="ghost"
                  className="order-card-button !rounded-[0.8rem] !bg-[#1F1F1F] !p-[0.8rem] !text-[1.3rem] !text-[#A3A3A3] hover:!bg-white/10 hover:!text-white"
                  onClick={() => {
                    const type =
                      OrderType[order.kind.toString() as OrderTypeEnum];
                    if (type === 'LimitIncrease') {
                      setShowLongOrShortLimit(true);
                    }
                    if (type === 'LimitSwap') {
                      setShowSwapLimit(true);
                    }
                    if (type === 'LimitDecrease') {
                      setShowTpDecrease(true);
                    }
                    if (type === 'StopLossDecrease') {
                      setShowSlDecrease(true);
                    }
                  }}
                >
                  <IconTpEdit fontSize={16} />
                  <Trans>Edit</Trans>
                </Button>
              )}

              {onCancelOrder && (
                <Button
                  variant="ghost"
                  className="order-card-button !rounded-[0.8rem] !bg-[#1F1F1F] !p-[0.8rem] !text-[1.3rem] !text-[#A3A3A3] hover:!bg-white/10 hover:!text-white disabled:!bg-[#1F1F1F]"
                  disabled={isCanceling}
                  onClick={onCancelOrder}
                >
                  <img src={closeIcons} alt="close" />
                  <Trans>Close</Trans>
                </Button>
              )}
            </div>
          </div>
        )}
      </div>

      <LongOrShortLimit
        order={order}
        indexTokenAddress={indexTokenAddress}
        isVisible={showLongOrShortLimit}
        onClose={() => setShowLongOrShortLimit(false)}
      />
      <TpDecrease
        order={order}
        indexTokenAddress={indexTokenAddress}
        isVisible={showTpDecrease}
        onClose={() => setShowTpDecrease(false)}
      />
      <SlDecrease
        order={order}
        indexTokenAddress={indexTokenAddress}
        isVisible={showSlDecrease}
        onClose={() => setShowSlDecrease(false)}
      />
      <SwapLimit
        order={order}
        isVisible={showSwapLimit}
        onClose={() => setShowSwapLimit(false)}
      />
    </>
  );
}

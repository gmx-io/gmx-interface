/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */

import { memo, useEffect, useMemo } from 'react';
import { useState } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { useAppStore } from '@/zustand/useAppStore';
import PercentageInput from '@/components/Common/Input/PercentageInput';
import ReferralModal from '@/components/Referrals/Referral/ReferralModal';
import { t } from '@lingui/macro';
import { BN } from '@coral-xyz/anchor';
import IconChevronDown from '@/img/trade/chevron-down.svg?react';
import IconChevronUp from '@/img/trade/chevron-up.svg?react';
import TooltipWithPortal from '@/components/Common/Tooltip/TooltipWithPortal';
import InfoSvg from '@/components/TradeBoxNew/assets/Info.svg';
import ArrowRightSvg from '@/components/TradeBoxNew/assets/arrow-right.svg';
import './ExecutionPanel.scss';
import {
  formatAmount,
  formatPriceUsd,
  formatRatePercentage,
} from '@/utils/legacy';
import { OrderType } from '@/selectors/order/types';
import { formatAcceptablePriceDisplay } from '@/utils/order/formatAcceptablePriceDisplay';
import { USD_DECIMALS, BN_ZERO, BN_10 } from '@/config/constants';
import {
  GMX_SOLANA_TOKENS_RAW,
  GMX_SOLANA_FOREX_PRECISION_MARKET_TOKENS,
} from '@/config/program';
import { BsArrowRight } from 'react-icons/bs';
import { useComputeUnits } from '@/hooks/utilsHooks/useComputeUnits';
import { useOrderSimulator } from '@/components/TradeBoxNew/Hooks/useTradeBoxLogic/useOrderSimulator';
import { usePositionUpdater } from '@/components/TradeBoxNew/Hooks/useTradeBoxLogic/usePositionUpdater';
import FeesPanel from '@/components/ExchangeNew/ExchangeList/PositionList/components/MarketDecrease/FeesPanel/index';
import { formatInput } from '../../utils/formatInput';
import { selectUserOrderFeeDiscountFactor } from '@/selectors/referral/selectUserOrderFeeDiscountFactor';
import { selectReferrer } from '@/selectors/referral/baseSelectors';
import { PublicKey } from '@solana/web3.js';
import { NoticeCard } from '@/components/NoticeCard';
import { getNoticeConfig } from '@/components/useNotice';
import { useWallet } from '@solana/wallet-adapter-react';
import { usePayer } from '@/components/TradeBoxNew/Hooks/usePayer';
import { isSameTokenAddress } from '@/utils/token/isSameTokenAddress';
import { getGmw404Enabled } from '@/config/featureFlagEnable';

const PUMP_MINT = new PublicKey('pumpCmXqMfrsAkQ5r49WcJnRayYRqmXz6ae8H7H9Dfn');
const WPUMP_MINT = new PublicKey(
  'HTHR6CbWSqrVCB83onNwKKH1W3qpGoKbpqvs9sgK7PEC'
);

export default memo(function ExecutionPanel() {
  useOrderSimulator();
  usePositionUpdater();
  const { publicKey } = useWallet();
  const { connected } = usePayer();
  const userKey = publicKey?.toBase58() ?? null;
  const { userOrderFeeVipDiscountFactor, userOrderFeeReferralDiscountFactor } =
    useAppStore(selectUserOrderFeeDiscountFactor);
  const { bgColor, icon } = getNoticeConfig('info');
  const { computeUnits, computeUnitPrice } = useComputeUnits();
  const {
    simulationData,
    slippage,
    setSlippage,
    marketDirection,
    marketType,
    payTokenNum,
    tradeMoney,
    leverage,
    Fees,
  } = useAppStore(useShallow((state) => state.TradeboxNew));
  const { swapMark, selectSwapPayToken, selectSwapReceiveToken, swapFeeRate } =
    useAppStore(useShallow((state) => state.swap));
  const { positionInfo, positions } = useAppStore(
    useShallow((state) => state.positionState)
  );
  const { markets, marketInfo } = useAppStore(
    useShallow((state) => state.markets)
  );
  const { collateralToken } = useAppStore(
    useShallow((state) => state.collateralTokens)
  );
  const selectedPositionData = useMemo(
    () =>
      Object.values(positions || {}).find(
        (position) =>
          isSameTokenAddress(
            position?.marketTokenAddress,
            marketInfo?.marketToken
          ) &&
          isSameTokenAddress(position?.collateralTokenAddress, collateralToken) &&
          position?.isLong === (marketDirection === 'Long')
      ) as any,
    [positions, marketInfo?.marketToken, collateralToken, marketDirection]
  );
  const currentPositionLiquidationPrice =
    selectedPositionData?.liquidation_price ||
    positionInfo?.liquidation_price;
  const { indexToken } = useAppStore(useShallow((state) => state.indexTokens));
  const { tokenPriceMap } = useAppStore(
    useShallow((state) => state.tickersState)
  );
  const referrer = useAppStore(selectReferrer);
  const [showReferralModal, setShowReferralModal] = useState(false);
  const openReferralModal = useAppStore(
    (state) => state.referralState.openReferralModal
  );
  const isGmw404Enabled = getGmw404Enabled();
  const [showExtendedExecutionPrice, setShowExtendedExecutionPrice] =
    useState(false);
  const isSwap = marketDirection === 'Swap';
  const executionPriceDisplay =
    showExtendedExecutionPrice && simulationData?.executionPriceExtended
      ? simulationData.executionPriceExtended
      : simulationData?.executionPrice;
  const acceptablePriceDisplay = useMemo(() => {
    if (!simulationData?.acceptablePriceBn) {
      return '-';
    }

    return formatAcceptablePriceDisplay({
      orderType:
        marketType === 'Limit'
          ? OrderType.LimitIncrease
          : OrderType.MarketIncrease,
      isLong: marketDirection === 'Long',
      acceptablePrice: new BN(simulationData.acceptablePriceBn.toString()),
      indexTokenDecimals: simulationData.indexTokenDecimals,
      isDisplayDecimals:
        GMX_SOLANA_FOREX_PRECISION_MARKET_TOKENS.includes(indexToken),
    });
  }, [simulationData, marketType, marketDirection, indexToken]);

  const iswraporUnwrap = useMemo(
    () =>
      (selectSwapPayToken?.tokenAddress ===
        'So1Zu7vPQQxrguzUehKAyVLpjcc769zxgBuDAsxTUMH' &&
        selectSwapReceiveToken?.tokenAddress ===
        'So11111111111111111111111111111111111111112') ||
      (selectSwapPayToken?.tokenAddress ===
        'So11111111111111111111111111111111111111112' &&
        selectSwapReceiveToken?.tokenAddress ===
        'So1Zu7vPQQxrguzUehKAyVLpjcc769zxgBuDAsxTUMH') ||
      (selectSwapPayToken?.tokenAddress === PUMP_MINT.toBase58() &&
        selectSwapReceiveToken?.tokenAddress === WPUMP_MINT.toBase58()) ||
      (selectSwapPayToken?.tokenAddress === WPUMP_MINT.toBase58() &&
        selectSwapReceiveToken?.tokenAddress === PUMP_MINT.toBase58()),
    [selectSwapPayToken?.tokenAddress, selectSwapReceiveToken?.tokenAddress]
  );
  const computeUnitPriceNum = useMemo(
    () =>
      new BN(computeUnits).mul(new BN(computeUnitPrice)).div(new BN(1000000)),
    [computeUnits, computeUnitPrice]
  );
  const baseFeeNum = useMemo(() => new BN(5000), []);
  const totalFeeNum = computeUnitPriceNum.add(baseFeeNum);
  const netWorkFeeBn = useMemo(
    () =>
      totalFeeNum.mul(
        new BN(
          tokenPriceMap?.get('So11111111111111111111111111111111111111112')
            ?.unitPrice || BN_ZERO
        )
      ),
    [totalFeeNum, tokenPriceMap]
  );
  const netWorkFee = useMemo(
    () => formatAmount(netWorkFeeBn, 20, 4),
    [netWorkFeeBn]
  );

  const leverageBn = useMemo(() => formatInput(leverage, 1), [leverage]);
  const [isOpen, setIsOpen] = useState(false);
  const [minReceive, setMinReceive] = useState('');
  const [delta, setDelta] = useState<BN>(BN_ZERO);
  const payToToken = useMemo(() => {
    const address = selectSwapPayToken?.tokenAddress || '';
    if (address === 'So1Zu7vPQQxrguzUehKAyVLpjcc769zxgBuDAsxTUMH') {
      return 'So11111111111111111111111111111111111111112';
    }
    return address;
  }, [selectSwapPayToken?.tokenAddress]);
  const receiveToToken = useMemo(() => {
    const address = selectSwapReceiveToken?.tokenAddress || '';
    if (address === 'So1Zu7vPQQxrguzUehKAyVLpjcc769zxgBuDAsxTUMH') {
      return 'So11111111111111111111111111111111111111112';
    }
    return address;
  }, [selectSwapReceiveToken?.tokenAddress]);
  const [isShowReferrerNotice, setIsShowReferrerNotice] = useState(true);
  const handleSetReferrer = () => {
    if (!referrer) {
      const urlParams = new URLSearchParams(window.location.search);
      const refCode = (urlParams.get('ref') ?? '').trim();
      if (refCode) {
        sessionStorage.setItem('pending_referral_code', refCode);
      }
    }
    if (isGmw404Enabled) {
      openReferralModal();
    } else {
      setShowReferralModal(true);
    }
  };
  useEffect(() => {
    if (isGmw404Enabled) return;

    const urlParams = new URLSearchParams(window.location.search);
    const refCode = (urlParams.get('ref') ?? '').trim();
    if (!refCode && userKey) {
      setShowReferralModal(false);
    }
  }, [isGmw404Enabled, referrer, userKey]);
  useEffect(() => {
    const amount = selectSwapReceiveToken?.receiveAmount;
    if (marketDirection === 'Swap' && amount && amount?.gt(BN_ZERO)) {
      const rate = new BN(10000).sub(new BN(slippage));
      const minReceive = amount.mul(rate).div(new BN(10000));
      const receiveAmount = formatAmount(
        minReceive,
        selectSwapReceiveToken?.decimals
      );
      setMinReceive(receiveAmount?.toString());
    } else {
      setMinReceive('');
    }
  }, [slippage, selectSwapReceiveToken]);

  useEffect(() => {
    if (!isSwap) {
      return;
    }
    let atoUsdcMarkets = [];
    let usdcToBMarkets = [];
    const relatedMarkets = markets?.filter((item) => {
      const longToken = item?.longToken;
      const shortToken = item?.shortToken;
      return (
        (longToken === payToToken && shortToken === receiveToToken) ||
        (longToken === receiveToToken && shortToken === payToToken)
      );
    });
    if (!relatedMarkets.length) {
      atoUsdcMarkets = markets?.filter((item) => {
        const longToken = item?.longToken;
        const shortToken = item?.shortToken;
        return (
          (longToken === payToToken &&
            shortToken === 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v') ||
          (longToken === 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v' &&
            shortToken === receiveToToken)
        );
      });
      usdcToBMarkets = markets?.filter((item) => {
        const longToken = item?.longToken;
        const shortToken = item?.shortToken;
        return (
          (longToken === 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v' &&
            shortToken === receiveToToken) ||
          (longToken === receiveToToken &&
            shortToken === 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v')
        );
      });
      const aToUsdcResults = atoUsdcMarkets?.map((marketInfo: any) => {
        const payTokenIsLong = marketInfo.longToken === payToToken;
        const delta = payTokenIsLong
          ? marketInfo?.longToShortAvailableLiquidity
          : marketInfo?.shortToLongAvailableLiquidity;
        return delta;
      });
      const usdcToBResults = usdcToBMarkets?.map((marketInfo: any) => {
        const payTokenIsLong = marketInfo.longToken === payToToken;
        const delta = payTokenIsLong
          ? marketInfo?.longToShortAvailableLiquidity
          : marketInfo?.shortToLongAvailableLiquidity;
        return delta;
      });
      const maxAtoUsdcValueBn =
        Array.isArray(aToUsdcResults) && aToUsdcResults.length > 0
          ? aToUsdcResults.reduce((max: BN, item: any) => {
            try {
              const candidate =
                item && typeof item === 'object' && 'deltaMax' in item
                  ? item.deltaMax
                  : item;
              const valBn =
                candidate instanceof BN
                  ? candidate
                  : new BN(
                    candidate?.toString?.() ?? String(candidate ?? '0')
                  );
              return valBn.gt(max) ? valBn : max;
            } catch {
              return max;
            }
          }, new BN(0))
          : new BN(0);
      const maxUsdcToBValueBn =
        Array.isArray(usdcToBResults) && usdcToBResults.length > 0
          ? usdcToBResults.reduce((max: BN, item: any) => {
            try {
              const candidate =
                item && typeof item === 'object' && 'deltaMax' in item
                  ? item.deltaMax
                  : item;
              const valBn =
                candidate instanceof BN
                  ? candidate
                  : new BN(
                    candidate?.toString?.() ?? String(candidate ?? '0')
                  );
              return valBn.gt(max) ? valBn : max;
            } catch {
              return max;
            }
          }, new BN(0))
          : new BN(0);
      const delta = maxUsdcToBValueBn.gt(maxAtoUsdcValueBn)
        ? maxAtoUsdcValueBn
        : maxUsdcToBValueBn;
      setDelta(delta);
      return;
    }
    const results = relatedMarkets?.map((marketInfo: any) => {
      const payTokenIsLong = marketInfo.longToken === payToToken;
      const delta = payTokenIsLong
        ? marketInfo?.longToShortAvailableLiquidity
        : marketInfo?.shortToLongAvailableLiquidity;
      return delta;
    });
    const maxValueBn =
      Array.isArray(results) && results.length > 0
        ? results.reduce((max: BN, item: any) => {
          try {
            const candidate =
              item && typeof item === 'object' && 'deltaMax' in item
                ? item.deltaMax
                : item;
            const valBn =
              candidate instanceof BN
                ? candidate
                : new BN(candidate?.toString?.() ?? String(candidate ?? '0'));
            return valBn.gt(max) ? valBn : max;
          } catch {
            return max;
          }
        }, new BN(0))
        : new BN(0);
    setDelta(maxValueBn);
  }, [payToToken, receiveToToken, markets]);

  const closeFeeValue = useMemo(
    () => simulationData?.reportData?.fees?.order?.fee_value || new BN(0),
    [simulationData]
  );
  let priceImpactValueBN;
  if (isSwap) {
    priceImpactValueBN = simulationData?.swapReports?.reduce(
      (max: BN, item: any) => {
        const priceImpactValue = item?.result?.price_impact_value || new BN(0);
        return max?.add(priceImpactValue);
      },
      new BN(0)
    );
  } else {
    priceImpactValueBN =
      simulationData?.reportData?.execution?.price_impact_value || new BN(0);
  }

  const discountedFeeRate = useMemo(() => {
    if (payTokenNum?.eq(new BN(0))) {
      return '0.000%';
    }
    if (priceImpactValueBN?.eq(new BN(0))) {
      return '0.000%';
    }
    const baseFee = priceImpactValueBN?.gt(new BN(0))
      ? new BN(marketInfo?.oFFForPositive || 0)
      : new BN(marketInfo?.oFFForNegative || 0);
    const vipDiscountMultiplier = new BN(1)
      .mul(new BN(10).pow(new BN(20)))
      .sub(userOrderFeeVipDiscountFactor || new BN(0));
    const referralDiscountMultiplier = new BN(1)
      .mul(new BN(10).pow(new BN(20)))
      .sub(userOrderFeeReferralDiscountFactor || new BN(0));
    const discountedFee = baseFee
      .mul(vipDiscountMultiplier)
      .div(new BN(10).pow(new BN(20)))
      .mul(referralDiscountMultiplier)
      .div(new BN(10).pow(new BN(20)));
    const threshold = new BN(10).pow(new BN(16)); // 0.0001 = 10^16
    const decimals = discountedFee.lt(threshold) ? 4 : 3;
    return formatRatePercentage(discountedFee, decimals, { signed: false });
  }, [
    tradeMoney,
    marketInfo,
    userOrderFeeVipDiscountFactor,
    userOrderFeeReferralDiscountFactor,
    payTokenNum,
  ]);

  if (isSwap && iswraporUnwrap) {
    return <></>;
  }
  return (
    <>
      <div className="tradeBox-exchangeCardInfo-ExecutionPanel w-full text-gray-400">
        <div className="tradeBox-exchangeCardInfo-card">
          {!isSwap && (
            <>
              <div className="item flexAlignCenter">
                <label className="flexAlignCenter">{t`Execution Price`}</label>
                {(simulationData?.executionPrice && (
                  <TooltipWithPortal
                    className="TradeFeesRow-tooltip"
                    tooltipClassName="execution-price-tooltip-mobile"
                    handle={
                      <div
                        className='text-white'
                        onDoubleClick={() =>
                          setShowExtendedExecutionPrice((current) => !current)
                        }
                      >
                        {executionPriceDisplay || '-'}
                      </div>
                    }
                    position="left-end"
                    renderContent={() => (
                      <div className="executionPriceTooltip">
                        <p>
                          {t`Expected execution price for the order, including the current price impact.`}
                        </p>
                        <p style={{ marginTop: '1.5rem' }}>
                          <span
                            style={{ color: '#A3A3A3' }}
                          >{t`Price Impact:`}</span>
                          <span
                            className={`${priceImpactValueBN.gt(new BN(0)) ? 'text-green-500' : 'text-red-500'}`}
                          >
                            {priceImpactValueBN.gt(new BN(0))
                              ? priceImpactValueBN?.lt(
                                new BN(1).mul(new BN(10).pow(new BN(18)))
                              )
                                ? '< +$0.01'
                                : simulationData?.price_impact_value
                              : priceImpactValueBN?.gt(
                                new BN(-1).mul(new BN(10).pow(new BN(18)))
                              )
                                ? '< -$0.01'
                                : simulationData?.price_impact_value}
                          </span>
                        </p>
                        <p style={{ color: '#A3A3A3' }}>
                          (
                          {t`${simulationData?.priceImpactRate?.slice(1)} of position size`}
                          )
                        </p>
                        <p style={{ marginTop: '1rem' }}>
                          <span
                            style={{ color: '#A3A3A3' }}
                          >{t`Order Acceptable Price:`}</span>
                          <span>{acceptablePriceDisplay}</span>
                        </p>

                        <p style={{ marginTop: '2rem' }}>
                          {t`The order's acceptable price includes the current price impact and set allowed slippage. The execution price must meet this condition for the order to be executed.`}
                        </p>
                      </div>
                    )}
                  />
                )) || <div>-</div>}
              </div>

              <div className="item flexAlignCenter">
                <label className="flexAlignCenter">
                  {t`Liquidation Price`}
                </label>
                <div>
                  {simulationData?.positionStatus?.liquidation_price ? (
                    positionInfo ? (
                      <>
                        <span className="tabular-nums text-[#A3A3A3]">
                          {formatPriceUsd(
                            new BN(
                              currentPositionLiquidationPrice?.toString()
                            ).mul(
                              new BN(10).pow(
                                new BN(
                                  GMX_SOLANA_TOKENS_RAW[indexToken].decimals
                                )
                              )
                            ),
                            {
                              isDisplayDecimals:
                                GMX_SOLANA_FOREX_PRECISION_MARKET_TOKENS.includes(
                                  indexToken
                                ),
                            }
                          )}
                        </span>
                        <BsArrowRight className="transition-arrow inline-block text-[#A3A3A3]" />
                        <span className="tabular-nums">
                          {simulationData?.liquidationPrice}
                        </span>
                      </>
                    ) : (
                      <span className="tabular-nums">
                        {formatPriceUsd(
                          new BN(
                            simulationData?.positionStatus?.liquidation_price
                          ).mul(
                            new BN(10).pow(
                              new BN(GMX_SOLANA_TOKENS_RAW[indexToken].decimals)
                            )
                          ),
                          {
                            isDisplayDecimals:
                              GMX_SOLANA_FOREX_PRECISION_MARKET_TOKENS.includes(
                                indexToken
                              ),
                          }
                        )}
                      </span>
                    )
                  ) : (
                    '-'
                  )}
                </div>
              </div>
            </>
          )}

          {isSwap && (
            <div className="item flexAlignCenter">
              <label className="flexAlignCenter">{t`Min. Receive`}</label>
              <div>
                {minReceive}{' '}
                {selectSwapReceiveToken?.tokenName === 'WGMX'
                  ? 'GMX'
                  : selectSwapReceiveToken?.tokenName}
              </div>
            </div>
          )}

          <div className="item flexAlignCenter">
            <label className="flexAlignCenter">{t`Price Impact / Fees`}</label>
            {isSwap && (
              <div>
                <span
                  className={`${priceImpactValueBN?.gt(new BN(0)) ? 'text-green-500' : priceImpactValueBN?.lt(new BN(0)) ? 'text-red-500' : ''}`}
                >
                  {simulationData?.priceImpactRate || '0.000%'}
                </span>{' '}
                /{swapFeeRate || '0.000%'}
              </div>
            )}
            {!isSwap && (
              <div>
                <span
                  className={`${priceImpactValueBN?.gt(new BN(0)) ? 'text-green-500' : priceImpactValueBN?.lt(new BN(0)) ? 'text-red-500' : ''}`}
                >
                  {simulationData?.priceImpactRate || '0.000%'}
                </span>{' '}
                / -{discountedFeeRate}
              </div>
            )}
          </div>
          <div className="item flexAlignCenter">
            {!referrer && isShowReferrerNotice && connected && (
              <>
                <NoticeCard
                  type="info"
                  cardType="notice"
                  title={t`Unlock 10% off trading fees`}
                  description={
                    <div
                      className="flex cursor-pointer items-center gap-2 "
                      onClick={() => handleSetReferrer()}
                    >
                      <span className="font-medium text-[#FA7B4E]">
                        {t`Add a referrer`}{' '}
                      </span>
                      <img
                        src={ArrowRightSvg}
                        alt=""
                        className="h-[12px] w-[12px]"
                      />
                    </div>
                  }
                  onClose={() => {
                    setIsShowReferrerNotice(false);
                  }}
                  className="mb-[-10px] w-full"
                  closeIconClass="!w-[20px] !h-[20px]"
                  bgColor={bgColor}
                  icon={icon}
                />
              </>
            )}
          </div>
        </div>
        <div
          className="flex cursor-pointer items-center justify-between"
          onClick={() => setIsOpen(!isOpen)}
        >
          <label className="cursor-pointer">{t`Execution Details`}</label>
          {isOpen ? <IconChevronUp /> : <IconChevronDown />}
        </div>
        {isOpen && (
          <div className="panel">
            <div className="item flexAlignCenter">
              <label className="flexAlignCenter">{t`Fees`}</label>
              {!isSwap && (
                <FeesPanel
                  type="openInterest"
                  reportData={simulationData?.reportData}
                  swapData={simulationData?.swapData}
                  position={positionInfo}
                  amount={payTokenNum}
                  value={
                    leverageBn.gt(new BN(0))
                      ? tradeMoney?.div(leverageBn).mul(BN_10)
                      : new BN(0)
                  }
                  deltaSize={tradeMoney}
                  path={simulationData?.path}
                  priceImpactValueBN={priceImpactValueBN}
                  userOrderFeeVipDiscountFactor={userOrderFeeVipDiscountFactor}
                  userOrderFeeReferralDiscountFactor={
                    userOrderFeeReferralDiscountFactor
                  }
                  marketInfo={marketInfo}
                />
              )}
              {isSwap && (
                <FeesPanel
                  swapData={
                    simulationData?.swapReports?.length
                      ? simulationData?.swapReports
                      : null
                  }
                  // position={positionInfo}
                  amount={selectSwapPayToken?.payAmount}
                  value={selectSwapPayToken?.paySizeInUsd}
                  // deltaSize={tradeMoney}
                  path={simulationData?.path}
                />
              )}
            </div>

            <div className="item flexAlignCenter">
              <label className="flexAlignCenter">
                <span>{t`Network Fee`}</span>
                <TooltipWithPortal
                  style={{ marginTop: '-0.4rem' }}
                  className="TradeFeesRow-tooltip"
                  handle={
                    <img
                      src={InfoSvg}
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
              <div style={{ color: '#fff' }}>
                {tradeMoney?.gt(new BN(0)) ? '$' + netWorkFee : '-'}
              </div>
            </div>

            <div className="item flexAlignCenter">
              <label className="flexAlignCenter">
                <span>{t`Allowed Slippage`}</span>
                <TooltipWithPortal
                  className="TradeFeesRow-tooltip"
                  style={{ marginTop: '-0.4rem' }}
                  handle={
                    <img
                      src={InfoSvg}
                      alt=""
                      className="typeOptions-setting-info positive"
                    />
                  }
                  position="top-end"
                  renderContent={() => (
                    <div>
                      <p>
                        {t`The maximum allowed percentage difference between the mark price and the execution price for market orders. You can edit the default value in the settings menu on the top right of the page.`}
                      </p>
                      <p style={{ marginTop: '1rem' }}>
                        {t`Note that a low allowed slippage, e.g. less than -1.00%, may result in failed orders if prices are volatile.`}
                      </p>
                    </div>
                  )}
                />
              </label>
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
            </div>

            {!isSwap && positionInfo && (
              <div
                className="tradeBox-exchangeCardInfo-card"
                style={{ marginTop: '1rem' }}
              >
                <div className="item flexAlignCenter">
                  <label className="flexAlignCenter">{t`Leverage`}</label>
                  <div>
                    <span
                      className={
                        Object.keys(simulationData)?.length
                          ? 'text-[#A3A3A3]'
                          : ''
                      }
                    >
                      {formatAmount(
                        new BN(positionInfo?.leverage?.toString()),
                        USD_DECIMALS,
                        2
                      )}
                      x
                    </span>
                    {Object.keys(simulationData)?.length ? (
                      <>
                        <BsArrowRight className="transition-arrow inline-block text-[#A3A3A3]" />
                        <span
                          className={simulationData ? '' : 'text-[#A3A3A3]'}
                        >
                          {formatAmount(
                            new BN(simulationData?.positionStatus?.leverage),
                            USD_DECIMALS,
                            2
                          )}
                          x
                        </span>
                      </>
                    ) : null}
                  </div>
                </div>

                <div className="item flexAlignCenter">
                  <label className="flexAlignCenter">{t`Entry Price`}</label>
                  <div>
                    <span
                      className={
                        Object.keys(simulationData)?.length
                          ? 'text-[#A3A3A3]'
                          : ''
                      }
                    >
                      {formatPriceUsd(
                        new BN(positionInfo?.entry_price.toString()).mul(
                          new BN(10).pow(
                            new BN(GMX_SOLANA_TOKENS_RAW[indexToken].decimals)
                          )
                        ),
                        {
                          isDisplayDecimals:
                            GMX_SOLANA_FOREX_PRECISION_MARKET_TOKENS.includes(
                              indexToken
                            ),
                        }
                      )}
                    </span>
                    {Object.keys(simulationData)?.length ? (
                      <>
                        <BsArrowRight className="transition-arrow inline-block text-[#A3A3A3]" />
                        <span>
                          {formatPriceUsd(
                            new BN(
                              simulationData?.positionStatus?.entry_price
                            ).mul(
                              new BN(10).pow(
                                new BN(
                                  GMX_SOLANA_TOKENS_RAW[indexToken].decimals
                                )
                              )
                            ),
                            {
                              isDisplayDecimals:
                                GMX_SOLANA_FOREX_PRECISION_MARKET_TOKENS.includes(
                                  indexToken
                                ),
                            }
                          )}
                        </span>
                      </>
                    ) : null}
                  </div>
                </div>

                <div className="item flexAlignCenter">
                  <label className="flexAlignCenter">{t`Size`}</label>
                  <div>
                    <span
                      className={
                        Object.keys(simulationData)?.length
                          ? 'text-[#A3A3A3]'
                          : ''
                      }
                    >
                      $
                      {formatAmount(
                        positionInfo?.state?.sizeInUsd,
                        USD_DECIMALS,
                        2
                      )}
                    </span>
                    {Object.keys(simulationData)?.length ? (
                      <>
                        <BsArrowRight className="transition-arrow inline-block text-[#A3A3A3]" />
                        <span>
                          $
                          {formatAmount(
                            new BN(
                              simulationData?.positionData?.state?.sizeInUsd
                            ),
                            USD_DECIMALS,
                            2
                          )}
                        </span>
                      </>
                    ) : null}
                  </div>
                </div>

                <div className="item flexAlignCenter">
                  <label className="flexAlignCenter">{t`Collateral`}</label>
                  <div>
                    <span
                      className={
                        Object.keys(simulationData)?.length
                          ? 'text-[#A3A3A3]'
                          : ''
                      }
                    >
                      $
                      {formatAmount(
                        new BN(positionInfo?.collateral_value?.toString()),
                        USD_DECIMALS,
                        2
                      )}
                    </span>
                    {Object.keys(simulationData)?.length ? (
                      <>
                        <BsArrowRight className="transition-arrow inline-block text-[#A3A3A3]" />
                        <span>
                          $
                          {formatAmount(
                            new BN(
                              simulationData?.positionStatus?.collateral_value
                            ),
                            USD_DECIMALS,
                            2
                          )}
                        </span>
                      </>
                    ) : null}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {isSwap && (
        <div className="ExecutionSwapPanel">
          <div className="title">{t`Swap`}</div>
          <div className="content">
            <div className="item">
              <div className="label">
                {t`${selectSwapPayToken?.tokenName === 'WGMX' ? 'GMX' : selectSwapPayToken?.tokenName} Price`}
              </div>
              <div className="value">
                {formatPriceUsd(
                  new BN(
                    tokenPriceMap.get(selectSwapPayToken?.tokenAddress)
                      ?.price || 0
                  ),
                  {
                    displayDecimals: 12,
                  }
                )}
              </div>
            </div>

            <div className="item">
              <div className="label">
                {t`${selectSwapReceiveToken?.tokenName === 'WGMX' ? 'GMX' : selectSwapReceiveToken?.tokenName} Price`}
              </div>
              <div className="value">
                {formatPriceUsd(
                  new BN(
                    tokenPriceMap.get(selectSwapReceiveToken?.tokenAddress)
                      ?.price || 0
                  ),
                  {
                    displayDecimals: 12,
                  }
                )}
              </div>
            </div>

            <div className="item">
              <div className="label">{t`Available Liquidity`}</div>
              <div className="value">
                {tokenPriceMap?.get(selectSwapReceiveToken?.tokenAddress)
                  ?.unitPrice
                  ? formatAmount(
                    delta.div(
                      new BN(
                        tokenPriceMap?.get(
                          selectSwapReceiveToken?.tokenAddress
                        )?.unitPrice
                      )
                    ),
                    selectSwapReceiveToken?.decimals,
                    2
                  )
                  : '0'}
                <span style={{ marginLeft: '0.2rem' }}>
                  {selectSwapReceiveToken?.tokenName === 'WGMX'
                    ? 'GMX'
                    : selectSwapReceiveToken?.tokenName}
                </span>
                <span>({formatPriceUsd(delta)})</span>
              </div>
            </div>

            <div className="item">
              <div className="label">{t`Price`}</div>
              <div className="value">
                {swapMark}{' '}
                {selectSwapPayToken?.tokenAddress &&
                  selectSwapReceiveToken?.tokenAddress &&
                  new BN(
                    tokenPriceMap?.get(selectSwapPayToken?.tokenAddress)?.price
                  ).gt(
                    new BN(
                      tokenPriceMap?.get(
                        selectSwapReceiveToken?.tokenAddress
                      )?.price
                    )
                  )
                  ? `${selectSwapReceiveToken?.tokenName === 'WGMX' ? 'GMX' : selectSwapReceiveToken?.tokenName} / ${selectSwapPayToken?.tokenName === 'WGMX' ? 'GMX' : selectSwapPayToken?.tokenName}`
                  : `${selectSwapPayToken?.tokenName === 'WGMX' ? 'GMX' : selectSwapPayToken?.tokenName} / ${selectSwapReceiveToken?.tokenName === 'WGMX' ? 'GMX' : selectSwapReceiveToken?.tokenName}`}
              </div>
            </div>
          </div>
        </div>
      )}
      {!isGmw404Enabled && (
        <ReferralModal
          showModal={showReferralModal}
          onClose={() => setShowReferralModal(false)}
        />
      )}
    </>
  );
});

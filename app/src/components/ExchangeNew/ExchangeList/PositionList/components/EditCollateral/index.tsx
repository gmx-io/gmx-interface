import { useState, useEffect, useMemo, act } from 'react';
import { t } from '@lingui/macro';
import { Position } from '@gmsol-labs/gmsol-sdk';
import {
  getSimulateOrderByMarketIncrease,
  getSimulateOrderByMarketDecrease,
} from '@/components/TradeBoxNew/utils/getSimulateResult';
import ExchangeButton from '../compose-components/ExchangeButton/index';
import Title from '../compose-components/title/index';
import InputItem from '../compose-components/InputItem/index';
import SliderComponent from '../compose-components/slider/index';
import DataPanel from '../compose-components/DataPanel/index';
import { PositionInfo } from '@/selectors/position/types';
import { USD_DECIMALS } from '@/config/constants';
import { formatMarketName } from '@/components/TradeBoxNew/utils/formatMarketName';
import {
  formatAmount,
  formatAmountFree,
  formatParseUsdToBN,
  formatPriceUsd
} from '@/utils/legacy/format';
import { GMX_SOLANA_TOKENS_RAW, GMX_SOLANA_FOREX_PRECISION_MARKET_TOKENS } from '@/config/program';
import { useAppStore } from '@/zustand/useAppStore';
import { BN } from '@coral-xyz/anchor';
import { useStoreProgram } from '@/contexts/anchor';
import { BsArrowRight } from 'react-icons/bs';
import { PublicKey } from '@solana/web3.js';
import { useWallet } from '@solana/wallet-adapter-react';
import { helperNotice } from '@/utils/lib/helperNotice';
import { removeNotice } from '@/utils/lib/helperNotice';
import TooltipWithPortal from '@/components/Common/Tooltip/TooltipWithPortal';
import IconChevronDown from '@/img/trade/chevron-down.svg?react';
import IconChevronUp from '@/img/trade/chevron-up.svg?react';
import {
  useCreateOrderParamsByDepositMarketIncrease,
  getExecOrderErrorInfo,
  useCreateOrderParamsByMarketDecrease,
  isExecOrderSuccess,
} from '@/components/TradeBoxNew/utils/execOrder';
import { getGmw351Enabled } from '@/config/featureFlagEnable';
import {
  getRecentBlockhash,
  getRecentPrioritizationFeesFn,
} from '@/components/TradeBoxNew/utils/getRpcOrSdkParams';
import './index.scss';
import Info from '@/components/TradeBoxNew/assets/Info.svg';
import { useShallow } from 'zustand/react/shallow';
import { useComputeUnits } from '@/hooks/utilsHooks/useComputeUnits';
import { useBodyScrollLock } from '@/hooks/utilsHooks/useBodyScrollLock';
import { isUSMarketOpen, isMetalMarketOpen, isCommodityMarketOpen } from '@/components/TradeBoxNew/utils/isUSMarketOpen';
import usePositionSocketStore from '@/zustand/positionSocketStore';
export interface EditCollateralProps {
  position: PositionInfo;
  isVisible: boolean;
  onClose: () => void;
  onConfirm?: (amount: string) => void;
}

export default function EditCollateral({
  position,
  isVisible,
  onClose,
}: EditCollateralProps) {
  if (!isVisible) return null;
  const { graphObj, priorityFees } = useAppStore(
    useShallow((state) => ({
      graphObj: state.TradeboxNew.graphObj,
      priorityFees: state.TradeboxNew.priorityFees,
    }))
  );
  const { marketBase64Map, marketsMap } = useAppStore(
    useShallow((state) => ({
      marketBase64Map: state.markets.marketBase64Map,
      marketsMap: state.markets.marketsMap,
    }))
  );

  const { payerInfo, payerSwapList } = useAppStore(
    useShallow((state) => ({
      payerInfo: state.payerSwapTokens.payerInfo,
      payerSwapList: state.payerSwapTokens.payerSwapList,
    }))
  );
  const collateralTokenName = useMemo(
    () =>
      GMX_SOLANA_TOKENS_RAW[position?.collateralTokenAddress?.toBase58()]
        ?.symbol,
    [position?.collateralTokenAddress]
  );
  const positionMap = useAppStore((state) => state.positionState.positionMap);
  const tokenPriceMap = useAppStore((state) => state.tickersState.tokenPriceMap);
  const { computeUnitPrice } = useComputeUnits();
  const setIsRefreshPositionAndOrder = usePositionSocketStore(
    (state) => state.setIsRefreshPositionAndOrder
  );
  const collateralPrice = useMemo(
    () =>
      new BN(
        tokenPriceMap.get(position?.collateralTokenAddress.toBase58())
          ?.unitPrice || 0
      ),
    [position?.collateralTokenAddress, tokenPriceMap]
  );
  const { signAllTransactions } = useWallet();
  const storeProgram = useStoreProgram();
  const [amount, setAmount] = useState('');
  const [amountBn, setAmountBn] = useState(new BN(0));
  const [canWithdrawValue, setCanWithdrawValue] = useState('');
  const [feesBn, setFeesBn] = useState(new BN(0));
  const [feesObj, setFeesObj] = useState({
    borrowingFee: '-',
    fundingFee: '-',
    fees: '-',
  });
  const [rate, setRate] = useState(0);
  const [collateralValue, setCollateralValue] = useState<string>('');
  const minCollateralValue = useMemo(
    () => new BN(position?.marketInfo?.minCollateralValue),
    [position?.marketInfo?.minCollateralValue]
  );
  const minCollateralFactor = useMemo(() => {
    if (position?.isLong) {
      return new BN(position?.marketInfo?.minCollateralFactorForLong);
    }
    return new BN(position?.marketInfo?.minCollateralFactorForShort);
  }, [
    position?.isLong,
    position?.marketInfo?.minCollateralFactorForLong,
    position?.marketInfo?.minCollateralFactorForShort,
  ]);
  const pnlUsd = useMemo(
    () => new BN(position?.pending_pnl || 0),
    [position?.pending_pnl]
  );
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('Deposit');
  const [unit, setUnit] = useState<string>('');
  const [lqPrice, setLqPrice] = useState<string>('');
  const [leverage, setLeverage] = useState<string>('');
  const [size, setSize] = useState<string>('');
  const [btnTitle, setBtnTitle] = useState<string>(t`Enter an amount`);
  const [btnDisabled, setBtnDisabled] = useState<boolean>(null);
  const [collateralTokenMaxAmountBN, setCollateralTokenMaxAmountBN] = useState(
    new BN(0)
  );
  const collateralDecimals =
    GMX_SOLANA_TOKENS_RAW[position?.collateralTokenAddress.toBase58()]
      ?.decimals;
  const [isOk, setIsOk] = useState(false);
  const [isError, setIsError] = useState(false);

  const title = position?.isLong
    ? t`Edit Collateral: Long ${formatMarketName(position?.marketInfo?.indexToken)}`
    : t`Edit Collateral: Short ${formatMarketName(position?.marketInfo?.indexToken)}`;
  const [isForbiddenTrade, setIsForbiddenTrade] = useState(false);
  const exe_details = [
    {
      title: t`Fees`,
      content: (
        <>
          <TooltipWithPortal
            className="TradeFeesRow-tooltip"
            handle={<span>-${feesObj?.fees}</span>}
            position="left-end"
            renderContent={() => (
              <div className="executionPriceTooltip">
                <p>
                  <span>{t`Borrowing Fee:`}</span>
                  <span className="text-red-500">
                    -${feesObj?.borrowingFee}
                  </span>
                </p>
                <p>
                  <span>{t`Funding Fee:`}</span>
                  <span className="text-red-500">-${feesObj?.fundingFee}</span>
                </p>
                <p>
                  <span>{t`This swap is routed through several GM pools for the lowest possible fees and price impact.`}</span>
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
      content: <span>{'< $0.01'}</span>,
    },
  ];
  const dataList1 = [
    {
      title: t`Receive`,
      content: (
        <span>
          {amount || 0.0}{' '}
          {collateralTokenName === 'WSOL' ? 'SOL' : collateralTokenName === 'WGMX' ? 'GMX' : collateralTokenName} ($
          {canWithdrawValue || 0.0})
        </span>
      ),
    },
    {
      title: t`Liquidation Price`,
      content: (
        <>
          {!amount ? (
            <span>
              {/* $
              {formatAmount(
                new BN(position?.liquidation_price),
                20 - position?.decimals,
                3
              )} */}
              {formatPriceUsd(
                new BN(position?.liquidation_price).mul(
                  new BN(10).pow(new BN(position?.decimals))
                ),
                {
                  isDisplayDecimals: GMX_SOLANA_FOREX_PRECISION_MARKET_TOKENS.includes(position?.marketInfo?.indexToken)
                }
              )}
            </span>
          ) : (
            <>
              {lqPrice && (
                <span className="text-[#A3A3A3]">
                  {/* $
                  {formatAmount(
                    new BN(position?.liquidation_price),
                    20 - position?.decimals,
                    3
                  )} */}
                  {formatPriceUsd(
                    new BN(position?.liquidation_price).mul(
                      new BN(10).pow(new BN(position?.decimals))
                    ),
                    {
                      isDisplayDecimals: GMX_SOLANA_FOREX_PRECISION_MARKET_TOKENS.includes(position?.marketInfo?.indexToken)
                    }
                  )}
                  <BsArrowRight className="transition-arrow inline-block" />
                </span>
              )}
              <span>{lqPrice}</span>
            </>
          )}
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
          {!amount ? (
            <span>
              {formatAmount(new BN(position?.leverage), USD_DECIMALS, 2)}x
            </span>
          ) : (
            <>
              {leverage && (
                <span className="text-[#A3A3A3]">
                  {formatAmount(new BN(position?.leverage), USD_DECIMALS, 2)}x
                  <BsArrowRight className="transition-arrow inline-block" />
                </span>
              )}
              <span>{leverage}x</span>
            </>
          )}
        </>
      ),
    },
    {
      title: t`Size`,
      content: (
        <>
          {size && (
            <span className="text-[#A3A3A3]">
              ${size}
              <BsArrowRight className="transition-arrow inline-block" />
            </span>
          )}
          <span>
            ${formatAmount(new BN(position?.sizeInUsd), USD_DECIMALS, 2)}
          </span>
        </>
      ),
    },
    {
      title: (
        <label className="flexAlignCenter">
          <span>
            {t`Collateral`}(
            {collateralTokenName === 'WSOL' ? 'SOL' : collateralTokenName === 'WGMX' ? 'GMX' : collateralTokenName})
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
          {!amount ? (
            <span>
              $
              {formatAmount(
                new BN(position?.collateral_value),
                USD_DECIMALS,
                2
              )}
            </span>
          ) : (
            <>
              {collateralValue && (
                <span className="text-[#A3A3A3]">
                  $
                  {formatAmount(
                    new BN(position?.collateral_value),
                    USD_DECIMALS,
                    2
                  )}
                  <BsArrowRight className="transition-arrow inline-block" />
                </span>
              )}
              {collateralValue && <span>${collateralValue}</span>}
            </>
          )}
        </>
      ),
    },
  ];
  useBodyScrollLock(true);
  useEffect(() => {
    (async () => {
      if (position) {
        // console.log('position', position)
        const borrowingFee = new BN(position?.pending_borrowing_fee_value);
        const fundingFee = new BN(position?.pending_funding_fee_value);
        const fees = new BN(borrowingFee).add(new BN(fundingFee));
        setFeesBn(fees);
        setFeesObj({
          borrowingFee: formatAmount(borrowingFee, USD_DECIMALS, 2),
          fundingFee: formatAmount(fundingFee, USD_DECIMALS, 2),
          fees: formatAmount(fees, USD_DECIMALS, 2),
        });
        const decimals = 20 - position?.decimals;
        const marketToken = position?.marketTokenAddress.toBase58();
        // const size = position?.sizeInUsd;
        const collateralToken = position?.collateralTokenAddress.toBase58();
        const unitName =
          GMX_SOLANA_TOKENS_RAW[collateralToken]?.symbol === 'WSOL'
            ? 'SOL'
            : GMX_SOLANA_TOKENS_RAW[collateralToken]?.symbol;
        setUnit(unitName);
        const collateralTokenMaxAmountBN = new BN(
          payerSwapList?.find((item) => item.tokenName === unitName)?.amount
        );
        setCollateralTokenMaxAmountBN(collateralTokenMaxAmountBN);
        const isLong = position?.isLong;
        const marketInfo = position?.marketInfo;
        const positionStr = positionMap.get(position?.address.toBase58());
        const positionInfo = Position.decode_from_base64(positionStr);
        const simulateParams = {
          marketToken,
          graphObj,
          _size: new BN(0),
          size: new BN(0),
          syncSize: new BN(0),
          payToken: collateralToken,
          collateralToken,
          amount: amountBn,
          isLong,
          marketBase64Map,
          storeProgram,
          marketInfo,
          positionInfo,
          receiveToken: collateralToken,
          decreasePositionSwapKind: 'PnlTokenToCollateralToken',
          sizeNum: new BN(0),
          positionBase64: positionStr,
          tokenPriceMap,
        };
        if (!amountBn.gt(new BN(0))) {
          return;
        }
        let simResult;
        if (activeTab === 'Deposit') {
          simResult = await getSimulateOrderByMarketIncrease(
            priorityFees,
            simulateParams
          );
        } else {
          simResult = await getSimulateOrderByMarketDecrease(
            new BN(0),
            priorityFees,
            simulateParams
          );
        }
        if (simResult) {
          if (amountBn.gt(new BN(0))) {
            const liquidation_price =
              simResult?.positionStatus?.liquidation_price;
            const leverage = simResult?.positionStatus?.leverage;
            const collateral_value = new BN(
              simResult?.positionStatus?.collateral_value?.toString()
            );
            const price = formatPriceUsd(
              new BN(position?.liquidation_price).mul(
                new BN(10).pow(new BN(position?.decimals))
              ),
              {
                isDisplayDecimals: GMX_SOLANA_FOREX_PRECISION_MARKET_TOKENS.includes(position?.marketInfo?.indexToken)
              }
            )
            const precision = price?.split('.');
            const newLqPrice = formatPriceUsd(
              new BN(liquidation_price).mul(
                new BN(10).pow(new BN(position?.decimals))
              ),
              {
                displayDecimals: precision && precision.length && precision[1]?.length,
                isDisplayDecimals: Boolean(precision && precision.length)
              }
            );
            const newLeverage = formatAmount(
              new BN(leverage?.toString()),
              USD_DECIMALS,
              2
            );
            setLqPrice(newLqPrice);
            setLeverage(newLeverage);
            setCollateralValue(formatAmount(collateral_value, USD_DECIMALS, 2));
          }
        }
      }
    })();
  }, [position, tokenPriceMap, rate]);

  useEffect(() => {
    if (position && activeTab === 'Withdraw') {
      const marketInfo = marketsMap.get(position?.marketTokenAddress.toBase58());
      if (marketInfo?.closed) {
        setBtnDisabled(true);
        setBtnTitle(t`Market Is Not Open`);
        setIsForbiddenTrade(true);
      } else {
        setIsForbiddenTrade(false);
      }
    }
  }, [activeTab, marketsMap, position?.marketTokenAddress]);

  return (
    <>
      <div className="market-decrease-overlay" onClick={onClose} />

      <div className="market-decrease-modal edit-collateral">
        <Title title={title} onClose={onClose} />
        <div className="market-decrease-content">
          <div className="market-decrease-content-tabs">
            <div
              onClick={() => {
                setActiveTab('Deposit');
                setBtnDisabled(true);
                setBtnTitle(t`Enter an amount`);
                setAmount('');
                setRate(0);
              }}
              className={activeTab === 'Deposit' ? 'active' : ''}
            >
              {t`Deposit`}
            </div>
            <div
              onClick={() => {
                setActiveTab('Withdraw');
                if (!isForbiddenTrade) {
                  setBtnDisabled(true);
                  setBtnTitle(t`Enter an amount`);
                }
                setAmount('');
                setRate(0);
              }}
              className={activeTab === 'Withdraw' ? 'active' : ''}
            >
              {t`Withdraw`}
            </div>
          </div>
          <div>
            <InputItem
              title={activeTab === 'Deposit' ? t`Deposit` : t`Withdraw`}
              value={amount}
              unit={unit}
              showIcon={true}
              onChange={(value) => {
                setAmount(value);
                if (!value) {
                  if (activeTab === 'Withdraw' && !isForbiddenTrade) {
                    setCanWithdrawValue('0');
                    setBtnTitle(t`Enter an amount`);
                    setBtnDisabled(true);
                  }
                  if (activeTab === 'Deposit') {
                    setBtnTitle(t`Enter an amount`);
                    setBtnDisabled(true);
                  }
                }
                const amountBN = formatParseUsdToBN(value, collateralDecimals);
                setAmountBn(amountBN);
                if (activeTab === 'Deposit') {
                  if (
                    amountBN.gt(new BN(0)) &&
                    amountBN.lte(collateralTokenMaxAmountBN)
                  ) {
                    const rate = amountBN
                      .mul(new BN(100))
                      .div(collateralTokenMaxAmountBN);
                    setRate(Number(rate.toString()));
                    setBtnDisabled(false);
                    setBtnTitle(t`Deposit`);
                  } else if (amountBN.gt(collateralTokenMaxAmountBN)) {
                    setRate(0);
                    setBtnDisabled(true);
                    setBtnTitle(t`Insufficient ${collateralTokenName} balance`);
                  } else {
                    setBtnDisabled(true);
                    setBtnTitle(t`Enter an amount`);
                  }
                }
                if (activeTab === 'Withdraw') {
                  const borrowingFee = new BN(
                    position?.pending_borrowing_fee_value
                  );
                  const fundingFee = new BN(
                    position?.pending_funding_fee_value
                  );
                  const borrowingFeesUsd = borrowingFee.abs();
                  const fundingFeesUsd = fundingFee.abs();

                  const collateralValue = new BN(position?.collateral_value);

                  const netCollateralValue = collateralValue
                    .sub(borrowingFeesUsd)
                    .sub(fundingFeesUsd);
                  const minCollateralValueBySize = new BN(minCollateralFactor)
                    .mul(new BN(position?.sizeInUsd))
                    .div(new BN(10).pow(new BN(USD_DECIMALS)));
                  const needStayCollateralValue = minCollateralValueBySize.gt(
                    minCollateralValue
                  )
                    ? minCollateralValueBySize
                    : minCollateralValue;
                  const canWithdrawValue = netCollateralValue
                    .sub(needStayCollateralValue)
                    .sub(pnlUsd.abs());

                  const canWithdrawAmount =
                    canWithdrawValue.div(collateralPrice);
                  setRate(0);
                  if (
                    amountBN.gt(new BN(0)) &&
                    amountBN.lte(canWithdrawAmount)
                  ) {
                    const rate = amountBN
                      .mul(new BN(100))
                      .div(canWithdrawAmount);
                    const currentValue = formatAmount(
                      amountBN.mul(collateralPrice),
                      USD_DECIMALS,
                      2
                    );
                    setCanWithdrawValue(currentValue);
                    setRate(Number(rate.toString()));
                    if (!isForbiddenTrade) {
                      setBtnDisabled(false);
                      setBtnTitle(t`Withdraw`);
                    }
                  } else if (amountBN.gt(canWithdrawAmount)) {
                    const currentValue = formatAmount(
                      // amountBN.mul(collateralPrice),
                      amountBN,
                      USD_DECIMALS,
                      2
                    );
                    setCanWithdrawValue(currentValue);
                    if (!isForbiddenTrade) {
                      setBtnDisabled(true);
                      setBtnTitle(t`Max. Leverage exceeded`);
                    }
                  } else {
                    setCanWithdrawValue('0');
                    if (!isForbiddenTrade) {
                      setBtnDisabled(true);
                      setBtnTitle(t`Enter an amount`);
                    }
                  }
                }
              }}
            />
            <SliderComponent
              onInputChange={(value) => {
                setRate(value);
                if (value > 0) {
                  if (activeTab === 'Deposit') {
                    setBtnDisabled(false);
                    setBtnTitle(t`Deposit`);
                  }
                  if (activeTab === 'Withdraw' && !isForbiddenTrade) {
                    setBtnDisabled(false);
                    setBtnTitle(t`Withdraw`);
                  }
                }
                if (value === 0) {
                  if (activeTab === 'Deposit') {
                    setBtnDisabled(true);
                    setBtnTitle(t`Enter an amount`);
                  }
                  if (activeTab === 'Withdraw' && !isForbiddenTrade) {
                    setBtnDisabled(true);
                    setBtnTitle(t`Enter an amount`);
                  }
                }
                if (activeTab === 'Deposit') {
                  const amountBN = collateralTokenMaxAmountBN
                    .mul(new BN(value))
                    .div(new BN(100));
                  setAmount(formatAmountFree(amountBN, collateralDecimals));
                  setAmountBn(amountBN);
                }
                if (activeTab === 'Withdraw') {
                  const borrowingFee = new BN(
                    position?.pending_borrowing_fee_value
                  );
                  const fundingFee = new BN(
                    position?.pending_funding_fee_value
                  );
                  const borrowingFeesUsd = borrowingFee.abs();
                  const fundingFeesUsd = fundingFee.abs();
                  const collateralValue = new BN(position?.collateral_value);
                  const netCollateralValue = collateralValue
                    .sub(borrowingFeesUsd)
                    .sub(fundingFeesUsd);
                  const minCollateralValueBySize = new BN(minCollateralFactor)
                    .mul(new BN(position?.sizeInUsd))
                    .div(new BN(10).pow(new BN(USD_DECIMALS)));
                  const needStayCollateralValue = minCollateralValueBySize.gt(
                    minCollateralValue
                  )
                    ? minCollateralValueBySize
                    : minCollateralValue;
                  const canWithdrawValue = netCollateralValue
                    .sub(needStayCollateralValue)
                    .sub(pnlUsd.abs());
                  if (canWithdrawValue.lte(new BN(0))) {
                    setCanWithdrawValue('0');
                    if (!isForbiddenTrade) {
                      setBtnDisabled(true);
                      setBtnTitle('Withdrawable collateral: 0');
                    }
                    return;
                  }
                  const canWithdrawAmount =
                    canWithdrawValue.div(collateralPrice);
                  const amountBN = canWithdrawAmount
                    .mul(new BN(value))
                    .div(new BN(100));
                  const amountValue = canWithdrawValue
                    .mul(new BN(value))
                    .div(new BN(100));
                  const currentValue = formatAmount(
                    amountValue,
                    USD_DECIMALS,
                    2
                  );
                  setCanWithdrawValue(currentValue);
                  setAmountBn(amountBN);
                  setAmount(formatAmountFree(amountBN, collateralDecimals));
                }
              }}
              value={rate}
            />
          </div>
        </div>

        {/* Enter an amount button moved to top */}
        <ExchangeButton
          title={btnTitle}
          btnDisabled={btnDisabled}
          successCallbackInfo={{
            num: formatAmount(amountBn, collateralDecimals, 2),
            tokenName: unit === 'WGMX' ? 'GMX' : unit,
            sig: '',
          }}
          handleSubmit={async (graph) => {
            const connection = storeProgram.provider.connection;

            // const PrioritizationFees =
            //   await getRecentPrioritizationFeesFn(connection);
            const PrioritizationFees = computeUnitPrice;
            const blockhash = await getRecentBlockhash(connection);
            const payer = new PublicKey(payerInfo.address).toBase58();
            const collateralToken = position?.collateralTokenAddress.toBase58();
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
            const swapPathObj = graph?.best_swap_path(
              collateralToken,
              receive_token,
              false
            );
            const path = swapPathObj?.path;
            const skip_wrap_native_on_pay = position?.symbol === 'WSOL';
            const params = {
              marketToken: position?.marketTokenAddress.toBase58(),
              isLong: position?.isLong,
              size: new BN(0),
              amount: amountBn,
              blockhash,
              PrioritizationFees,
              payer,
              collateralToken,
              hints,
              path,
              skip_wrap_native_on_pay,
              collateral_or_swap_out_token: collateralToken,
              receive_token,
              signAllTransactions,
              storeProgram,
            };
            let result;
            let DepositNoticeId = 0;
            let WithdrawNoticeId = 0;
            if (activeTab === 'Deposit') {
              DepositNoticeId = helperNotice.info(
                t`Creating collateral deposit order...`
              );
              console.log('DepositNoticeId', DepositNoticeId);
              try {
                result =
                  await useCreateOrderParamsByDepositMarketIncrease(params);
              } catch (error) {
                setIsError(true);
                if (DepositNoticeId) {
                  console.log('removed DepositNoticeId', DepositNoticeId);
                  removeNotice(DepositNoticeId);
                }
                helperNotice.error(
                  t`Failed to create collateral deposit order.`,
                  { tradingErrorInfo: { actionName: 'Deposit Collateral', errorData: error, collateral: collateralToken } }
                );
              }
            } else {
              WithdrawNoticeId = helperNotice.info(
                t`Creating collateral withdraw order...`
              );
              console.log('WithdrawNoticeId', WithdrawNoticeId);
              try {
                result = await useCreateOrderParamsByMarketDecrease(params);
              } catch (error) {
                if (WithdrawNoticeId) {
                  console.log('removed WithdrawNoticeId', WithdrawNoticeId);
                  removeNotice(WithdrawNoticeId);
                }
                helperNotice.error(
                  t`Failed to create collateral withdrawal order.`,
                  { tradingErrorInfo: { actionName: 'Withdraw Collateral', errorData: error, collateral: collateralToken } }
                );
              }
            }
            if (getGmw351Enabled()) {
              if (result && isExecOrderSuccess(result)) {
                setIsRefreshPositionAndOrder(true);
                if (activeTab === 'Deposit') {
                  if (DepositNoticeId) {
                    console.log('removed DepositNoticeId', DepositNoticeId);
                    removeNotice(DepositNoticeId);
                  }
                  helperNotice.success(t`Collateral deposit order created.`);
                } else {
                  if (WithdrawNoticeId) {
                    console.log('removed WithdrawNoticeId', WithdrawNoticeId);
                    removeNotice(WithdrawNoticeId);
                  }
                  helperNotice.success(t`Collateral withdrawal order created.`);
                }
                setIsOk(true);
                setTimeout(() => {
                  onClose();
                }, 2000);
              } else if (result && !isExecOrderSuccess(result)) {
                if (activeTab === 'Deposit') {
                  if (DepositNoticeId) {
                    removeNotice(DepositNoticeId);
                  }
                  helperNotice.error(
                    t`Failed to create collateral deposit order.`,
                    { tradingErrorInfo: getExecOrderErrorInfo(result, 'Deposit Collateral', collateralToken) }
                  );
                } else {
                  if (WithdrawNoticeId) {
                    removeNotice(WithdrawNoticeId);
                  }
                  helperNotice.error(
                    t`Failed to create collateral withdrawal order.`,
                    { tradingErrorInfo: getExecOrderErrorInfo(result, 'Withdraw Collateral', collateralToken) }
                  );
                }
              }
            } else if (result && (result as string[]).length) {
              setIsRefreshPositionAndOrder(true);
              if (activeTab === 'Deposit') {
                if (DepositNoticeId) {
                  console.log('removed DepositNoticeId', DepositNoticeId);
                  removeNotice(DepositNoticeId);
                }
                helperNotice.success(t`Collateral deposit order created.`);
              } else {
                if (WithdrawNoticeId) {
                  console.log('removed WithdrawNoticeId', WithdrawNoticeId);
                  removeNotice(WithdrawNoticeId);
                }
                helperNotice.success(t`Collateral withdrawal order created.`);
              }
              setIsOk(true);
              setTimeout(() => {
                onClose();
              }, 2000);
            }
          }}
          isOk={isOk}
          isError={isError}
        />

        <DataPanel
          dataList={activeTab === 'Deposit' ? dataList1.slice(1) : dataList1}
        />
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

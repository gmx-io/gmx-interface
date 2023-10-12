import { Trans, t } from "@lingui/macro";
import cx from "classnames";
import Button from "components/Button/Button";
import BuyInputSection from "components/BuyInputSection/BuyInputSection";
import Checkbox from "components/Checkbox/Checkbox";
import ExchangeInfoRow from "components/Exchange/ExchangeInfoRow";
import Modal from "components/Modal/Modal";
import TokenSelector from "components/TokenSelector/TokenSelector";
import Tooltip from "components/Tooltip/Tooltip";
import { ValueTransition } from "components/ValueTransition/ValueTransition";
import { getKeepLeverageKey } from "config/localStorage";
import { convertTokenAddress } from "config/tokens";
import { useSyntheticsEvents } from "context/SyntheticsEvents";
import { useUserReferralInfo } from "domain/referrals/hooks";
import {
  estimateExecuteDecreaseOrderGasLimit,
  getExecutionFee,
  getIsHighPriceImpact,
  useGasLimits,
  useGasPrice,
} from "domain/synthetics/fees";
import { MarketsInfoData } from "domain/synthetics/markets";
import { DecreasePositionSwapType, OrderType, createDecreaseOrderTxn } from "domain/synthetics/orders";
import {
  PositionInfo,
  formatAcceptablePrice,
  formatLeverage,
  formatLiquidationPrice,
  getTriggerNameByOrderType,
  usePositionsConstants,
} from "domain/synthetics/positions";
import { TokensData } from "domain/synthetics/tokens";
import {
  AvailableTokenOptions,
  getDecreasePositionAmounts,
  getMarkPrice,
  getNextPositionValuesForDecreaseTrade,
  getSwapAmountsByFromValue,
  getTradeFees,
  useSwapRoutes,
} from "domain/synthetics/trade";
import { getCommonError, getDecreaseError } from "domain/synthetics/trade/utils/validation";
import { getIsEquivalentTokens } from "domain/tokens";
import { BigNumber } from "ethers";
import { useChainId } from "lib/chains";
import { USD_DECIMALS } from "lib/legacy";
import { useLocalStorageSerializeKey } from "lib/localStorage";
import {
  bigNumberify,
  formatAmount,
  formatAmountFree,
  formatDeltaUsd,
  formatPercentage,
  formatTokenAmountWithUsd,
  formatUsd,
  parseValue,
} from "lib/numbers";
import { getByKey } from "lib/objects";
import { usePrevious } from "lib/usePrevious";
import { useEffect, useMemo, useState } from "react";
import { TradeFeesRow } from "../TradeFeesRow/TradeFeesRow";
import "./PositionSeller.scss";
import { useDebugExecutionPrice } from "domain/synthetics/trade/useExecutionPrice";
import SlippageInput from "components/SlippageInput/SlippageInput";
import ToggleSwitch from "components/ToggleSwitch/ToggleSwitch";
import { useSettings } from "context/SettingsContext/SettingsContextProvider";
import TooltipWithPortal from "components/Tooltip/TooltipWithPortal";
import { DEFAULT_SLIPPAGE_AMOUNT } from "config/factors";
import Tab from "components/Tab/Tab";
import { useHasOutdatedUi } from "domain/legacy";
import useWallet from "lib/wallets/useWallet";
import { useConnectModal } from "@rainbow-me/rainbowkit";
import { AiOutlineEdit } from "react-icons/ai";

export type Props = {
  acceptablePriceImpactBps: BigNumber;
  position?: PositionInfo;
  marketsInfoData?: MarketsInfoData;
  tokensData?: TokensData;
  showPnlInLeverage: boolean;
  availableTokensOptions?: AvailableTokenOptions;
  onClose: () => void;
  setPendingTxns: (txns: any) => void;
  isHigherSlippageAllowed: boolean;
  setIsHigherSlippageAllowed: (isAllowed: boolean) => void;
  shouldDisableValidation: boolean;
  onEditAcceptablePriceImpact: () => void;
};

enum OrderOption {
  Market = "Market",
  Trigger = "Trigger",
}

export function PositionSeller(p: Props) {
  const {
    acceptablePriceImpactBps,
    position,
    marketsInfoData,
    tokensData,
    showPnlInLeverage,
    onClose,
    setPendingTxns,
    availableTokensOptions,
    onEditAcceptablePriceImpact,
  } = p;

  const { chainId } = useChainId();
  const { savedAllowedSlippage } = useSettings();
  const { signer, account } = useWallet();
  const { openConnectModal } = useConnectModal();
  const { gasPrice } = useGasPrice(chainId);
  const { gasLimits } = useGasLimits(chainId);
  const { minCollateralUsd, minPositionSizeUsd } = usePositionsConstants(chainId);
  const userReferralInfo = useUserReferralInfo(signer, chainId, account);
  const { data: hasOutdatedUi } = useHasOutdatedUi();

  const isVisible = Boolean(position);
  const prevIsVisible = usePrevious(isVisible);

  const ORDER_OPTION_LABELS = {
    [OrderOption.Market]: t`Market`,
    [OrderOption.Trigger]: t`TP/SL`,
  };

  const [orderOption, setOrderOption] = useState<OrderOption>(OrderOption.Market);
  const [triggerPriceInputValue, setTriggerPriceInputValue] = useState("");
  const triggerPrice = parseValue(triggerPriceInputValue, USD_DECIMALS);

  const isTrigger = orderOption === OrderOption.Trigger;

  const { setPendingPosition, setPendingOrder } = useSyntheticsEvents();
  const [keepLeverage, setKeepLeverage] = useLocalStorageSerializeKey(getKeepLeverageKey(chainId), true);

  const [isHighPriceImpactAccepted, setIsHighPriceImpactAccepted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [closeUsdInputValue, setCloseUsdInputValue] = useState("");
  const closeSizeUsd = parseValue(closeUsdInputValue || "0", USD_DECIMALS)!;
  const maxCloseSize = position?.sizeInUsd || BigNumber.from(0);

  const [receiveTokenAddress, setReceiveTokenAddress] = useState<string>();
  const [allowedSlippage, setAllowedSlippage] = useState(savedAllowedSlippage);
  const receiveToken = isTrigger ? position?.collateralToken : getByKey(tokensData, receiveTokenAddress);

  useEffect(() => {
    setAllowedSlippage(savedAllowedSlippage);
  }, [savedAllowedSlippage]);

  const markPrice = position
    ? getMarkPrice({ prices: position.indexToken.prices, isLong: position.isLong, isIncrease: false })
    : undefined;

  const { findSwapPath, maxSwapLiquidity } = useSwapRoutes({
    marketsInfoData,
    fromTokenAddress: position?.collateralTokenAddress,
    toTokenAddress: receiveTokenAddress,
  });

  const decreaseAmounts = useMemo(() => {
    if (!position || !minCollateralUsd || !minPositionSizeUsd) {
      return undefined;
    }

    return getDecreasePositionAmounts({
      marketInfo: position.marketInfo,
      collateralToken: position.collateralToken,
      isLong: position.isLong,
      position,
      closeSizeUsd: closeSizeUsd,
      keepLeverage: keepLeverage!,
      triggerPrice: isTrigger ? triggerPrice : undefined,
      savedAcceptablePriceImpactBps: isTrigger ? acceptablePriceImpactBps : undefined,
      userReferralInfo,
      minCollateralUsd,
      minPositionSizeUsd,
    });
  }, [
    acceptablePriceImpactBps,
    closeSizeUsd,
    isTrigger,
    keepLeverage,
    minCollateralUsd,
    minPositionSizeUsd,
    position,
    triggerPrice,
    userReferralInfo,
  ]);

  useDebugExecutionPrice(chainId, {
    skip: true,
    marketInfo: position?.marketInfo,
    sizeInUsd: position?.sizeInUsd,
    sizeInTokens: position?.sizeInTokens,
    sizeDeltaUsd: decreaseAmounts?.sizeDeltaUsd.mul(-1),
    isLong: position?.isLong,
  });

  const shouldSwap = position && receiveToken && !getIsEquivalentTokens(position.collateralToken, receiveToken);

  const swapAmounts = useMemo(() => {
    if (!shouldSwap || !receiveToken || !decreaseAmounts?.receiveTokenAmount || !position) {
      return undefined;
    }

    return getSwapAmountsByFromValue({
      tokenIn: position.collateralToken,
      tokenOut: receiveToken,
      amountIn: decreaseAmounts.receiveTokenAmount,
      isLimit: false,
      findSwapPath,
    });
  }, [decreaseAmounts, findSwapPath, position, receiveToken, shouldSwap]);

  const receiveUsd = swapAmounts?.usdOut || decreaseAmounts?.receiveUsd;
  const receiveTokenAmount = swapAmounts?.amountOut || decreaseAmounts?.receiveTokenAmount;

  const nextPositionValues = useMemo(() => {
    if (!position || !decreaseAmounts?.sizeDeltaUsd.gt(0) || !minCollateralUsd) {
      return undefined;
    }

    return getNextPositionValuesForDecreaseTrade({
      existingPosition: position,
      marketInfo: position.marketInfo,
      collateralToken: position.collateralToken,
      sizeDeltaUsd: decreaseAmounts.sizeDeltaUsd,
      sizeDeltaInTokens: decreaseAmounts.sizeDeltaInTokens,
      collateralDeltaUsd: decreaseAmounts.collateralDeltaUsd,
      collateralDeltaAmount: decreaseAmounts.collateralDeltaAmount,
      payedRemainingCollateralUsd: decreaseAmounts.payedRemainingCollateralUsd,
      payedRemainingCollateralAmount: decreaseAmounts.payedRemainingCollateralAmount,
      realizedPnl: decreaseAmounts.realizedPnl,
      estimatedPnl: decreaseAmounts.estimatedPnl,
      showPnlInLeverage,
      isLong: position.isLong,
      minCollateralUsd,
      userReferralInfo,
    });
  }, [decreaseAmounts, minCollateralUsd, position, showPnlInLeverage, userReferralInfo]);

  const { fees, executionFee } = useMemo(() => {
    if (!position || !decreaseAmounts || !gasLimits || !tokensData || !gasPrice) {
      return {};
    }

    const swapsCount =
      (decreaseAmounts.decreaseSwapType === DecreasePositionSwapType.NoSwap ? 0 : 1) +
      (swapAmounts?.swapPathStats?.swapPath?.length || 0);

    const estimatedGas = estimateExecuteDecreaseOrderGasLimit(gasLimits, {
      swapsCount,
    });

    return {
      fees: getTradeFees({
        isIncrease: false,
        initialCollateralUsd: position.collateralUsd,
        sizeDeltaUsd: decreaseAmounts.sizeDeltaUsd,
        swapSteps: swapAmounts?.swapPathStats?.swapSteps || [],
        positionFeeUsd: decreaseAmounts.positionFeeUsd,
        swapPriceImpactDeltaUsd: swapAmounts?.swapPathStats?.totalSwapPriceImpactDeltaUsd || BigNumber.from(0),
        positionPriceImpactDeltaUsd: decreaseAmounts.positionPriceImpactDeltaUsd,
        borrowingFeeUsd: decreaseAmounts.borrowingFeeUsd,
        fundingFeeUsd: decreaseAmounts.fundingFeeUsd,
        feeDiscountUsd: decreaseAmounts.feeDiscountUsd,
        swapProfitFeeUsd: decreaseAmounts.swapProfitFeeUsd,
      }),
      executionFee: getExecutionFee(chainId, gasLimits, tokensData, estimatedGas, gasPrice),
    };
  }, [
    chainId,
    decreaseAmounts,
    gasLimits,
    gasPrice,
    position,
    swapAmounts?.swapPathStats?.swapPath,
    swapAmounts?.swapPathStats?.swapSteps,
    swapAmounts?.swapPathStats?.totalSwapPriceImpactDeltaUsd,
    tokensData,
  ]);

  const isHighPriceImpact = getIsHighPriceImpact(fees?.positionPriceImpact, fees?.swapPriceImpact);

  const isNotEnoughReceiveTokenLiquidity = shouldSwap ? maxSwapLiquidity?.lt(receiveUsd || 0) : false;

  const error = useMemo(() => {
    if (!position) {
      return undefined;
    }

    const commonError = getCommonError({
      chainId,
      isConnected: Boolean(account),
      hasOutdatedUi,
    });

    const decreaseError = getDecreaseError({
      marketInfo: position.marketInfo,
      inputSizeUsd: closeSizeUsd,
      sizeDeltaUsd: decreaseAmounts?.sizeDeltaUsd,
      receiveToken,
      isTrigger,
      triggerPrice,
      fixedTriggerThresholdType: undefined,
      existingPosition: position,
      markPrice,
      nextPositionValues,
      isLong: position.isLong,
      isContractAccount: false,
      minCollateralUsd,
      isNotEnoughReceiveTokenLiquidity,
    });

    if (commonError[0] || decreaseError[0]) {
      return commonError[0] || decreaseError[0];
    }

    if (isHighPriceImpact && !isHighPriceImpactAccepted) {
      return t`Price Impact not yet acknowledged`;
    }

    if (isSubmitting) {
      return t`Creating Order...`;
    }
  }, [
    account,
    chainId,
    closeSizeUsd,
    decreaseAmounts?.sizeDeltaUsd,
    hasOutdatedUi,
    isHighPriceImpact,
    isHighPriceImpactAccepted,
    isNotEnoughReceiveTokenLiquidity,
    isSubmitting,
    isTrigger,
    markPrice,
    minCollateralUsd,
    nextPositionValues,
    position,
    receiveToken,
    triggerPrice,
  ]);

  function onSubmit() {
    if (!account) {
      openConnectModal?.();
      return;
    }

    const orderType = isTrigger ? decreaseAmounts?.triggerOrderType : OrderType.MarketDecrease;

    if (
      !tokensData ||
      !position ||
      !executionFee?.feeTokenAmount ||
      !receiveToken?.address ||
      !receiveUsd ||
      !decreaseAmounts?.acceptablePrice ||
      !signer ||
      !orderType
    ) {
      return;
    }

    setIsSubmitting(true);

    createDecreaseOrderTxn(
      chainId,
      signer,
      {
        account,
        marketAddress: position.marketAddress,
        initialCollateralAddress: position.collateralTokenAddress,
        initialCollateralDeltaAmount: decreaseAmounts.collateralDeltaAmount || BigNumber.from(0),
        receiveTokenAddress: receiveToken.address,
        swapPath: swapAmounts?.swapPathStats?.swapPath || [],
        sizeDeltaUsd: decreaseAmounts.sizeDeltaUsd,
        sizeDeltaInTokens: decreaseAmounts.sizeDeltaInTokens,
        isLong: position.isLong,
        acceptablePrice: decreaseAmounts.acceptablePrice,
        triggerPrice: isTrigger ? triggerPrice : undefined,
        minOutputUsd: BigNumber.from(0),
        decreasePositionSwapType: decreaseAmounts.decreaseSwapType,
        orderType,
        referralCode: userReferralInfo?.referralCodeForTxn,
        executionFee: executionFee.feeTokenAmount,
        allowedSlippage,
        indexToken: position.indexToken,
        tokensData,
        skipSimulation: p.shouldDisableValidation,
      },
      {
        setPendingOrder,
        setPendingTxns,
        setPendingPosition,
      }
    )
      .then(onClose)
      .finally(() => setIsSubmitting(false));
  }

  useEffect(
    function resetForm() {
      if (!isVisible !== prevIsVisible) {
        setCloseUsdInputValue("");
        setTriggerPriceInputValue("");
        setIsHighPriceImpactAccepted(false);
        setReceiveTokenAddress(undefined);
        setOrderOption(OrderOption.Market);
      }
    },
    [isVisible, prevIsVisible]
  );

  useEffect(
    function initReceiveToken() {
      if (!receiveTokenAddress && position?.collateralToken?.address) {
        const convertedAddress = convertTokenAddress(chainId, position?.collateralToken.address, "native");
        setReceiveTokenAddress(convertedAddress);
      }
    },
    [chainId, position?.collateralToken, receiveTokenAddress]
  );

  const indexPriceDecimals = position?.indexToken?.priceDecimals;
  const toToken = position?.indexToken;

  const triggerPriceRow = (
    <ExchangeInfoRow
      className="SwapBox-info-row"
      label={t`Trigger Price`}
      isTop
      value={`${decreaseAmounts?.triggerThresholdType || ""} ${
        formatUsd(decreaseAmounts?.triggerPrice, {
          displayDecimals: toToken?.priceDecimals,
        }) || "-"
      }`}
    />
  );

  const allowedSlippageRow = (
    <div>
      <ExchangeInfoRow
        label={
          <TooltipWithPortal
            handle={t`Allowed Slippage`}
            position="left-top"
            renderContent={() => {
              return (
                <div className="text-white">
                  <Trans>
                    You can edit the default Allowed Slippage in the settings menu on the top right of the page.
                    <br />
                    <br />
                    Note that a low allowed slippage, e.g. less than{" "}
                    {formatPercentage(bigNumberify(DEFAULT_SLIPPAGE_AMOUNT), { signed: false })}, may result in failed
                    orders if prices are volatile.
                  </Trans>
                </div>
              );
            }}
          />
        }
      >
        <SlippageInput setAllowedSlippage={setAllowedSlippage} defaultSlippage={savedAllowedSlippage} />
      </ExchangeInfoRow>
    </div>
  );

  const markPriceRow = (
    <ExchangeInfoRow
      label={t`Mark Price`}
      isTop
      value={
        formatUsd(markPrice, {
          displayDecimals: indexPriceDecimals,
        }) || "-"
      }
    />
  );

  const entryPriceRow = (
    <ExchangeInfoRow
      label={t`Entry Price`}
      value={
        formatUsd(position?.entryPrice, {
          displayDecimals: indexPriceDecimals,
        }) || "-"
      }
    />
  );

  const priceImpactRow = (
    <ExchangeInfoRow
      label={t`Price Impact`}
      value={formatPercentage(decreaseAmounts?.acceptablePriceDeltaBps, { signed: true }) || "-"}
    />
  );

  const acceptablePriceImpactRow = (
    <ExchangeInfoRow
      className="SwapBox-info-row"
      label={t`Acceptable Price Impact`}
      value={
        decreaseAmounts?.triggerOrderType === OrderType.StopLossDecrease ? (
          "NA"
        ) : (
          <span className="TradeBox-acceptable-price-impact" onClick={onEditAcceptablePriceImpact}>
            {formatPercentage(acceptablePriceImpactBps?.mul(-1))}
            <span className="edit-icon" onClick={() => null}>
              <AiOutlineEdit fontSize={16} />
            </span>
          </span>
        )
      }
    />
  );

  const acceptablePriceRow = (
    <ExchangeInfoRow
      label={t`Acceptable Price`}
      value={
        decreaseAmounts?.sizeDeltaUsd.gt(0)
          ? formatAcceptablePrice(decreaseAmounts.acceptablePrice, {
              displayDecimals: indexPriceDecimals,
            })
          : "-"
      }
    />
  );

  const liqPriceRow = position && (
    <ExchangeInfoRow
      className="SwapBox-info-row"
      label={t`Liq. Price`}
      value={
        decreaseAmounts?.isFullClose ? (
          "-"
        ) : (
          <ValueTransition
            from={
              formatLiquidationPrice(position.liquidationPrice, {
                displayDecimals: indexPriceDecimals,
              })!
            }
            to={
              decreaseAmounts?.sizeDeltaUsd.gt(0)
                ? formatLiquidationPrice(nextPositionValues?.nextLiqPrice, {
                    displayDecimals: indexPriceDecimals,
                  })
                : undefined
            }
          />
        )
      }
    />
  );

  const sizeRow = (
    <ExchangeInfoRow
      isTop={!isTrigger}
      label={t`Size`}
      value={<ValueTransition from={formatUsd(position?.sizeInUsd)!} to={formatUsd(nextPositionValues?.nextSizeUsd)} />}
    />
  );

  const pnlRow =
    position &&
    (isTrigger ? (
      <ExchangeInfoRow
        label={t`PnL`}
        value={
          <ValueTransition
            from={
              <>
                {formatDeltaUsd(decreaseAmounts?.estimatedPnl)} (
                {formatPercentage(decreaseAmounts?.estimatedPnlPercentage, { signed: true })})
              </>
            }
            to={
              decreaseAmounts?.sizeDeltaUsd.gt(0) ? (
                <>
                  {formatDeltaUsd(nextPositionValues?.nextPnl)} (
                  {formatPercentage(nextPositionValues?.nextPnlPercentage, { signed: true })})
                </>
              ) : undefined
            }
          />
        }
      />
    ) : (
      <ExchangeInfoRow
        label={t`PnL`}
        value={
          <ValueTransition
            from={formatDeltaUsd(position.pnl, position.pnlPercentage)}
            to={formatDeltaUsd(nextPositionValues?.nextPnl, nextPositionValues?.nextPnlPercentage)}
          />
        }
      />
    ));

  const receiveTokenRow = isTrigger ? (
    <ExchangeInfoRow
      className="SwapBox-info-row"
      label={t`Receive`}
      value={formatTokenAmountWithUsd(
        decreaseAmounts?.receiveTokenAmount,
        decreaseAmounts?.receiveUsd,
        position?.collateralToken?.symbol,
        position?.collateralToken?.decimals
      )}
    />
  ) : (
    <ExchangeInfoRow
      isTop
      label={t`Receive`}
      className="Exchange-info-row PositionSeller-receive-row "
      value={
        receiveToken && (
          <TokenSelector
            label={t`Receive`}
            className={cx("PositionSeller-token-selector", {
              warning: isNotEnoughReceiveTokenLiquidity,
            })}
            chainId={chainId}
            showBalances={false}
            disableBodyScrollLock={true}
            infoTokens={availableTokensOptions?.infoTokens}
            tokenAddress={receiveToken.address}
            onSelectToken={(token) => setReceiveTokenAddress(token.address)}
            tokens={availableTokensOptions?.swapTokens || []}
            showTokenImgInDropdown={true}
            selectedTokenLabel={
              <span className="PositionSelector-selected-receive-token">
                {formatTokenAmountWithUsd(
                  receiveTokenAmount,
                  receiveUsd,
                  receiveToken?.symbol,
                  receiveToken?.decimals,
                  {
                    fallbackToZero: true,
                  }
                )}
              </span>
            }
            extendedSortSequence={availableTokensOptions?.sortedLongAndShortTokens}
          />
        )
      }
    />
  );

  const rows = isTrigger ? (
    <>
      {triggerPriceRow}
      {acceptablePriceImpactRow}
      {acceptablePriceRow}
      {liqPriceRow}
      {sizeRow}
    </>
  ) : (
    <>
      {allowedSlippageRow}
      {markPriceRow}
      {entryPriceRow}
      {priceImpactRow}
      {acceptablePriceRow}
      {liqPriceRow}
      {sizeRow}
    </>
  );

  return (
    <div className="PositionEditor PositionSeller">
      <Modal
        className="PositionSeller-modal"
        isVisible={position}
        setIsVisible={p.onClose}
        label={
          <Trans>
            Close {p.position?.isLong ? t`Long` : t`Short`} {p.position?.indexToken?.symbol}
          </Trans>
        }
        allowContentTouchMove
      >
        <Tab
          options={Object.values(OrderOption)}
          option={orderOption}
          optionLabels={ORDER_OPTION_LABELS}
          onChange={setOrderOption}
        />

        {position && (
          <>
            <div className="relative">
              <BuyInputSection
                topLeftLabel={t`Close`}
                topRightLabel={t`Max`}
                topRightValue={formatUsd(maxCloseSize)}
                inputValue={closeUsdInputValue}
                onInputValueChange={(e) => setCloseUsdInputValue(e.target.value)}
                showMaxButton={maxCloseSize?.gt(0) && !closeSizeUsd?.eq(maxCloseSize)}
                onClickMax={() => setCloseUsdInputValue(formatAmountFree(maxCloseSize, USD_DECIMALS))}
                showPercentSelector={true}
                onPercentChange={(percentage) => {
                  const formattedAmount = formatAmountFree(maxCloseSize.mul(percentage).div(100), USD_DECIMALS, 2);
                  setCloseUsdInputValue(formattedAmount);
                }}
              >
                USD
              </BuyInputSection>
            </div>
            {isTrigger && (
              <BuyInputSection
                topLeftLabel={t`Price`}
                topRightLabel={t`Mark`}
                topRightValue={formatUsd(markPrice, {
                  displayDecimals: toToken?.priceDecimals,
                })}
                onClickTopRightLabel={() => {
                  setTriggerPriceInputValue(formatAmount(markPrice, USD_DECIMALS, toToken?.priceDecimals || 2));
                }}
                inputValue={triggerPriceInputValue}
                onInputValueChange={(e) => {
                  setTriggerPriceInputValue(e.target.value);
                }}
              >
                USD
              </BuyInputSection>
            )}

            <div className="PositionEditor-info-box">
              <div className="PositionEditor-keep-leverage-settings">
                <ToggleSwitch isChecked={keepLeverage ?? false} setIsChecked={setKeepLeverage}>
                  <span className="text-gray font-sm">
                    <Trans>Keep leverage at {position?.leverage ? formatLeverage(position.leverage) : "..."}</Trans>
                  </span>
                </ToggleSwitch>
              </div>

              {rows}

              <div className="Exchange-info-row">
                <div>
                  <Tooltip
                    handle={
                      <span className="Exchange-info-label">
                        <Trans>Collateral ({position.collateralToken?.symbol})</Trans>
                      </span>
                    }
                    position="left-top"
                    renderContent={() => {
                      return <Trans>Initial Collateral (Collateral excluding Borrow and Funding Fee).</Trans>;
                    }}
                  />
                </div>
                <div className="align-right">
                  <ValueTransition
                    from={formatUsd(position?.collateralUsd)!}
                    to={formatUsd(nextPositionValues?.nextCollateralUsd)}
                  />
                </div>
              </div>

              {!keepLeverage && (
                <ExchangeInfoRow
                  label={t`Leverage`}
                  value={
                    decreaseAmounts?.sizeDeltaUsd.eq(position.sizeInUsd) ? (
                      "-"
                    ) : (
                      <ValueTransition
                        from={formatLeverage(position.leverage)}
                        to={formatLeverage(nextPositionValues?.nextLeverage)}
                      />
                    )
                  }
                />
              )}

              {pnlRow}

              <TradeFeesRow {...fees} executionFee={executionFee} feesType="decrease" warning={executionFee?.warning} />

              {receiveTokenRow}
            </div>

            {isHighPriceImpact && <div className="line-divider" />}

            {isHighPriceImpact && (
              <div className="PositionSeller-price-impact-warning">
                <Checkbox asRow isChecked={isHighPriceImpactAccepted} setIsChecked={setIsHighPriceImpactAccepted}>
                  <span className="text-gray font-sm">
                    <Trans>Acknowledge high Price Impact</Trans>
                  </span>
                </Checkbox>
              </div>
            )}

            <div className="Exchange-swap-button-container">
              <Button
                className="w-full"
                variant="primary-action"
                disabled={Boolean(error) && !p.shouldDisableValidation}
                onClick={onSubmit}
              >
                {error ||
                  (isTrigger
                    ? t`Create ${getTriggerNameByOrderType(decreaseAmounts?.triggerOrderType!)} Order`
                    : t`Close`)}
              </Button>
            </div>
          </>
        )}
      </Modal>
    </div>
  );
}

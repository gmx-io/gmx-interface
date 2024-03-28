import { Trans, t } from "@lingui/macro";
import { useConnectModal } from "@rainbow-me/rainbowkit";
import Token from "abis/Token.json";
import { ApproveTokenButton } from "components/ApproveTokenButton/ApproveTokenButton";
import Button from "components/Button/Button";
import BuyInputSection from "components/BuyInputSection/BuyInputSection";
import ExchangeInfoRow from "components/Exchange/ExchangeInfoRow";
import { ExchangeInfo } from "components/Exchange/ExchangeInfo";
import Modal from "components/Modal/Modal";
import Tab from "components/Tab/Tab";
import TokenSelector from "components/TokenSelector/TokenSelector";
import Tooltip from "components/Tooltip/Tooltip";
import { ValueTransition } from "components/ValueTransition/ValueTransition";
import { getContract } from "config/contracts";
import { getSyntheticsCollateralEditAddressKey } from "config/localStorage";
import { NATIVE_TOKEN_ADDRESS, getToken } from "config/tokens";
import { MAX_METAMASK_MOBILE_DECIMALS } from "config/ui";
import { useSubaccount } from "context/SubaccountContext/SubaccountContext";
import { useSyntheticsEvents } from "context/SyntheticsEvents";
import { useHasOutdatedUi } from "domain/legacy";
import {
  estimateExecuteDecreaseOrderGasLimit,
  estimateExecuteIncreaseOrderGasLimit,
  getExecutionFee,
  getFeeItem,
  getTotalFeeItem,
  useGasLimits,
  useGasPrice,
} from "domain/synthetics/fees";
import {
  DecreasePositionSwapType,
  OrderType,
  createDecreaseOrderTxn,
  createIncreaseOrderTxn,
} from "domain/synthetics/orders";
import {
  formatLeverage,
  formatLiquidationPrice,
  getLeverage,
  getLiquidationPrice,
  substractMaxLeverageSlippage,
  willPositionCollateralBeSufficientForPosition,
} from "domain/synthetics/positions";
import { adaptToV1InfoTokens, convertToTokenAmount, convertToUsd } from "domain/synthetics/tokens";
import { TradeFees, getMarkPrice, getMinCollateralUsdForLeverage } from "domain/synthetics/trade";
import { getCommonError, getEditCollateralError } from "domain/synthetics/trade/utils/validation";
import { BigNumber, ethers } from "ethers";
import { useChainId } from "lib/chains";
import { contractFetcher } from "lib/contracts";
import { useLocalStorageSerializeKey } from "lib/localStorage";
import {
  expandDecimals,
  formatAmountFree,
  formatTokenAmount,
  formatTokenAmountWithUsd,
  formatUsd,
  limitDecimals,
  parseValue,
} from "lib/numbers";
import { getByKey } from "lib/objects";
import { usePrevious } from "lib/usePrevious";
import useIsMetamaskMobile from "lib/wallets/useIsMetamaskMobile";
import useWallet from "lib/wallets/useWallet";
import { useCallback, useEffect, useMemo, useState, useRef } from "react";
import useSWR from "swr";
import { TradeFeesRow } from "../TradeFeesRow/TradeFeesRow";
import { NetworkFeeRow } from "../NetworkFeeRow/NetworkFeeRow";
import { getMinResidualAmount } from "domain/tokens";
import { SubaccountNavigationButton } from "components/SubaccountNavigationButton/SubaccountNavigationButton";
import {
  usePositionsConstants,
  useSavedIsPnlInLeverage,
  useTokensData,
  useUserReferralInfo,
} from "context/SyntheticsStateContext/hooks/globalsHooks";
import { useHighExecutionFeeConsent } from "domain/synthetics/trade/useHighExecutionFeeConsent";
import ExternalLink from "components/ExternalLink/ExternalLink";
import { bigNumberBinarySearch } from "lib/binarySearch";
import TooltipWithPortal from "components/Tooltip/TooltipWithPortal";

import "./PositionEditor.scss";
import { useKey } from "react-use";
import {
  usePositionEditorMinCollateralFactor,
  usePositionEditorPosition,
  usePositionEditorPositionState,
} from "context/SyntheticsStateContext/hooks/positionEditorHooks";

export type Props = {
  allowedSlippage: number;
  setPendingTxns: (txns: any) => void;
  shouldDisableValidation: boolean;
};

enum Operation {
  Deposit = "Deposit",
  Withdraw = "Withdraw",
}

const OPERATION_LABELS = {
  [Operation.Deposit]: t`Deposit`,
  [Operation.Withdraw]: t`Withdraw`,
};

export function PositionEditor(p: Props) {
  const [, setEditingPositionKey] = usePositionEditorPositionState();
  const { setPendingTxns, allowedSlippage } = p;
  const { chainId } = useChainId();
  const showPnlInLeverage = useSavedIsPnlInLeverage();
  const tokensData = useTokensData();
  const { account, signer, active } = useWallet();
  const { openConnectModal } = useConnectModal();
  const isMetamaskMobile = useIsMetamaskMobile();
  const { setPendingPosition, setPendingOrder } = useSyntheticsEvents();
  const { gasPrice } = useGasPrice(chainId);
  const { gasLimits } = useGasLimits(chainId);
  const routerAddress = getContract(chainId, "SyntheticsRouter");
  const { minCollateralUsd } = usePositionsConstants();
  const userReferralInfo = useUserReferralInfo();
  const { data: hasOutdatedUi } = useHasOutdatedUi();
  const position = usePositionEditorPosition();

  const submitButtonRef = useRef<HTMLButtonElement>(null);

  const nativeToken = getByKey(tokensData, NATIVE_TOKEN_ADDRESS);
  const minResidualAmount = getMinResidualAmount(nativeToken?.decimals, nativeToken?.prices?.maxPrice);

  const isVisible = Boolean(position);
  const prevIsVisible = usePrevious(isVisible);

  const infoTokens = useMemo(() => {
    if (!tokensData) {
      return undefined;
    }
    return adaptToV1InfoTokens(tokensData);
  }, [tokensData]);

  const { data: tokenAllowance } = useSWR<BigNumber>(
    position ? [active, chainId, position.collateralTokenAddress, "allowance", account, routerAddress] : null,
    {
      fetcher: contractFetcher(signer, Token) as any,
    }
  );

  const [isSubmitting, setIsSubmitting] = useState(false);

  const [operation, setOperation] = useState(Operation.Deposit);
  const isDeposit = operation === Operation.Deposit;

  const indexPriceDecimals = position?.indexToken.priceDecimals || 2;

  const [selectedCollateralAddress, setSelectedCollateralAddress] = useLocalStorageSerializeKey(
    getSyntheticsCollateralEditAddressKey(chainId, position?.collateralTokenAddress),
    position?.collateralTokenAddress
  );

  const collateralToken = getByKey(tokensData, selectedCollateralAddress);

  const availableSwapTokens = useMemo(() => {
    return position?.collateralToken.isWrapped
      ? [getToken(chainId, position.collateralTokenAddress), getToken(chainId, NATIVE_TOKEN_ADDRESS)]
      : undefined;
  }, [chainId, position?.collateralToken.isWrapped, position?.collateralTokenAddress]);

  const onClose = useCallback(() => {
    setEditingPositionKey(undefined);
  }, [setEditingPositionKey]);

  const collateralPrice = collateralToken?.prices.minPrice;

  const markPrice = position
    ? getMarkPrice({
        prices: position.indexToken.prices,
        isLong: position.isLong,
        isIncrease: isDeposit,
      })
    : undefined;

  const [collateralInputValue, setCollateralInputValue] = useState("");
  const collateralDeltaAmount = parseValue(collateralInputValue || "0", collateralToken?.decimals || 0);
  const collateralDeltaUsd = convertToUsd(collateralDeltaAmount, collateralToken?.decimals, collateralPrice);

  const needCollateralApproval =
    isDeposit &&
    tokenAllowance &&
    collateralDeltaAmount &&
    selectedCollateralAddress !== ethers.constants.AddressZero &&
    collateralDeltaAmount.gt(tokenAllowance);

  const maxWithdrawAmount = useMemo(() => {
    if (!position) return BigNumber.from(0);

    const minCollateralUsdForLeverage = getMinCollateralUsdForLeverage(position, BigNumber.from(0));
    let _minCollateralUsd = minCollateralUsdForLeverage;

    if (minCollateralUsd?.gt(_minCollateralUsd)) {
      _minCollateralUsd = minCollateralUsd;
    }

    _minCollateralUsd = _minCollateralUsd
      .add(position?.pendingBorrowingFeesUsd || 0)
      .add(position?.pendingFundingFeesUsd || 0);

    if (position.collateralUsd.lt(_minCollateralUsd)) {
      return BigNumber.from(0);
    }

    const maxWithdrawUsd = position.collateralUsd.sub(_minCollateralUsd);
    const maxWithdrawAmount = convertToTokenAmount(maxWithdrawUsd, collateralToken?.decimals, collateralPrice);

    return maxWithdrawAmount;
  }, [collateralPrice, collateralToken?.decimals, minCollateralUsd, position]);

  const { fees, executionFee } = useMemo(() => {
    if (!position || !gasLimits || !tokensData || !gasPrice) {
      return {};
    }

    const collateralBasisUsd = isDeposit
      ? position.collateralUsd.add(collateralDeltaUsd || BigNumber.from(0))
      : position.collateralUsd;

    const fundingFee = getFeeItem(position.pendingFundingFeesUsd.mul(-1), collateralBasisUsd);
    const borrowFee = getFeeItem(position.pendingBorrowingFeesUsd.mul(-1), collateralBasisUsd);
    const totalFees = getTotalFeeItem([fundingFee, borrowFee]);

    const fees: TradeFees = {
      totalFees,
      fundingFee,
      borrowFee,
    };

    const estimatedGas = isDeposit
      ? estimateExecuteIncreaseOrderGasLimit(gasLimits, {})
      : estimateExecuteDecreaseOrderGasLimit(gasLimits, {});
    const executionFee = getExecutionFee(chainId, gasLimits, tokensData, estimatedGas, gasPrice);

    return {
      fees,
      executionFee,
    };
  }, [chainId, collateralDeltaUsd, gasLimits, gasPrice, isDeposit, position, tokensData]);

  const { element: highExecutionFeeAcknowledgement, isHighFeeConsentError } = useHighExecutionFeeConsent(
    executionFee?.feeUsd
  );

  const { nextCollateralUsd, nextLeverage, nextLiqPrice, receiveUsd, receiveAmount } = useMemo(() => {
    if (!position || !collateralDeltaUsd?.gt(0) || !minCollateralUsd || !fees?.totalFees) {
      return {};
    }

    const totalFeesUsd = fees.totalFees.deltaUsd.abs();

    const nextCollateralUsd = isDeposit
      ? position.collateralUsd.sub(totalFeesUsd).add(collateralDeltaUsd)
      : position.collateralUsd.sub(totalFeesUsd).sub(collateralDeltaUsd);

    const nextCollateralAmount = convertToTokenAmount(nextCollateralUsd, collateralToken?.decimals, collateralPrice)!;

    const receiveUsd = isDeposit ? BigNumber.from(0) : collateralDeltaUsd;
    const receiveAmount = convertToTokenAmount(receiveUsd, collateralToken?.decimals, collateralPrice)!;

    const nextLeverage = getLeverage({
      sizeInUsd: position.sizeInUsd,
      collateralUsd: nextCollateralUsd,
      pendingBorrowingFeesUsd: BigNumber.from(0),
      pendingFundingFeesUsd: BigNumber.from(0),
      pnl: showPnlInLeverage ? position.pnl : BigNumber.from(0),
    });

    const nextLiqPrice = getLiquidationPrice({
      sizeInUsd: position.sizeInUsd,
      sizeInTokens: position.sizeInTokens,
      collateralUsd: nextCollateralUsd,
      collateralAmount: nextCollateralAmount,
      collateralToken: position.collateralToken,
      marketInfo: position.marketInfo,
      userReferralInfo,
      pendingFundingFeesUsd: BigNumber.from(0),
      pendingBorrowingFeesUsd: BigNumber.from(0),
      isLong: position.isLong,
      minCollateralUsd,
    });

    return {
      nextCollateralUsd,
      nextLeverage,
      nextLiqPrice,
      receiveUsd,
      receiveAmount,
    };
  }, [
    collateralDeltaUsd,
    collateralPrice,
    collateralToken,
    fees,
    isDeposit,
    minCollateralUsd,
    position,
    showPnlInLeverage,
    userReferralInfo,
  ]);

  const minCollateralFactor = usePositionEditorMinCollateralFactor();

  const [error, tooltipName] = useMemo(() => {
    const commonError = getCommonError({
      chainId,
      isConnected: Boolean(account),
      hasOutdatedUi,
    });

    const editCollateralError = getEditCollateralError({
      collateralDeltaAmount,
      collateralDeltaUsd,
      nextLeverage,
      nextLiqPrice,
      isDeposit,
      position,
      depositToken: collateralToken,
      depositAmount: collateralDeltaAmount,
      minCollateralFactor,
    });

    const error = commonError[0] || editCollateralError[0];
    const tooltipName = commonError[1] || editCollateralError[1];

    if (error) {
      return [error, tooltipName];
    }

    if (needCollateralApproval) {
      return [t`Pending ${collateralToken?.assetSymbol ?? collateralToken?.symbol} approval`];
    }

    if (isHighFeeConsentError) {
      return [t`High Execution Fee not yet acknowledged`];
    }

    if (isSubmitting) {
      return [t`Creating Order...`];
    }

    return [];
  }, [
    chainId,
    account,
    hasOutdatedUi,
    collateralDeltaAmount,
    collateralDeltaUsd,
    nextLeverage,
    nextLiqPrice,
    isDeposit,
    position,
    collateralToken,
    minCollateralFactor,
    needCollateralApproval,
    isHighFeeConsentError,
    isSubmitting,
  ]);

  const detectAndSetMaxSize = useCallback(() => {
    if (!maxWithdrawAmount) return;
    if (!collateralToken) return;
    if (!position) return;
    if (!minCollateralFactor) return;

    const { result: safeMaxWithdrawal } = bigNumberBinarySearch(
      BigNumber.from(1),
      maxWithdrawAmount,
      expandDecimals(1, Math.ceil(collateralToken.decimals / 3)),
      (x) => {
        const isValid = willPositionCollateralBeSufficientForPosition(
          position,
          x,
          BigNumber.from(0),
          minCollateralFactor,
          BigNumber.from(0)
        );
        return { isValid, returnValue: null };
      }
    );
    setCollateralInputValue(
      formatAmountFree(substractMaxLeverageSlippage(safeMaxWithdrawal), collateralToken.decimals)
    );
  }, [collateralToken, maxWithdrawAmount, minCollateralFactor, position]);

  const errorTooltipContent = useMemo(() => {
    if (tooltipName !== "maxLeverage") return null;

    return (
      <Trans>
        Decrease the withdraw size to match the max.{" "}
        <ExternalLink href="https://docs.gmx.io/docs/trading/v2/#max-leverage">Read more</ExternalLink>.
        <br />
        <br />
        <span onClick={detectAndSetMaxSize} className="Tradebox-handle">
          <Trans>Set max withdrawal</Trans>
        </span>
      </Trans>
    );
  }, [detectAndSetMaxSize, tooltipName]);

  const subaccount = useSubaccount(executionFee?.feeTokenAmount ?? null);

  function onSubmit() {
    if (!account) {
      openConnectModal?.();
      return;
    }

    if (
      !executionFee?.feeTokenAmount ||
      !tokensData ||
      !markPrice ||
      !position?.indexToken ||
      !collateralDeltaAmount ||
      !selectedCollateralAddress ||
      !signer
    ) {
      return;
    }

    let txnPromise: Promise<void>;

    if (isDeposit) {
      setIsSubmitting(true);

      txnPromise = createIncreaseOrderTxn(chainId, signer, subaccount, {
        account,
        marketAddress: position.marketAddress,
        initialCollateralAddress: selectedCollateralAddress,
        initialCollateralAmount: collateralDeltaAmount,
        targetCollateralAddress: position.collateralTokenAddress,
        collateralDeltaAmount,
        swapPath: [],
        sizeDeltaUsd: BigNumber.from(0),
        sizeDeltaInTokens: BigNumber.from(0),
        acceptablePrice: markPrice,
        triggerPrice: undefined,
        orderType: OrderType.MarketIncrease,
        isLong: position.isLong,
        executionFee: executionFee.feeTokenAmount,
        allowedSlippage,
        referralCode: userReferralInfo?.referralCodeForTxn,
        indexToken: position.indexToken,
        tokensData,
        skipSimulation: p.shouldDisableValidation,
        setPendingTxns,
        setPendingOrder,
        setPendingPosition,
      });
    } else {
      if (!receiveUsd) {
        return;
      }

      setIsSubmitting(true);

      txnPromise = createDecreaseOrderTxn(
        chainId,
        signer,
        subaccount,
        {
          account,
          marketAddress: position.marketAddress,
          initialCollateralAddress: position.collateralTokenAddress,
          initialCollateralDeltaAmount: collateralDeltaAmount,
          receiveTokenAddress: selectedCollateralAddress,
          swapPath: [],
          sizeDeltaUsd: BigNumber.from(0),
          sizeDeltaInTokens: BigNumber.from(0),
          acceptablePrice: markPrice,
          triggerPrice: undefined,
          decreasePositionSwapType: DecreasePositionSwapType.NoSwap,
          orderType: OrderType.MarketDecrease,
          isLong: position.isLong,
          minOutputUsd: receiveUsd,
          executionFee: executionFee.feeTokenAmount,
          allowedSlippage,
          referralCode: userReferralInfo?.referralCodeForTxn,
          indexToken: position.indexToken,
          tokensData,
          skipSimulation: p.shouldDisableValidation,
        },
        {
          setPendingTxns,
          setPendingOrder,
          setPendingPosition,
        }
      );
    }

    if (subaccount) {
      onClose();
      setIsSubmitting(false);
      return;
    }

    txnPromise.then(onClose).finally(() => {
      setIsSubmitting(false);
    });
  }

  useKey(
    "Enter",
    () => {
      if (isVisible && !error) {
        submitButtonRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
        onSubmit();
      }
    },
    {},
    [isVisible, error]
  );

  useEffect(
    function initCollateral() {
      if (!position) {
        return;
      }

      if (
        !selectedCollateralAddress ||
        !availableSwapTokens?.find((token) => token.address === selectedCollateralAddress)
      ) {
        setSelectedCollateralAddress(position.collateralTokenAddress);
      }
    },
    [availableSwapTokens, position, selectedCollateralAddress, setSelectedCollateralAddress]
  );

  useEffect(
    function resetForm() {
      if (isVisible !== prevIsVisible) {
        setCollateralInputValue("");
      }
    },
    [isVisible, prevIsVisible]
  );

  const showMaxOnDeposit = collateralToken?.isNative
    ? minResidualAmount && collateralToken?.balance?.gt(minResidualAmount)
    : true;

  const renderErrorTooltipContent = useCallback(() => errorTooltipContent, [errorTooltipContent]);

  const buttonContent = (
    <Button
      className="w-full"
      variant="primary-action"
      onClick={onSubmit}
      disabled={Boolean(error) && !p.shouldDisableValidation}
      buttonRef={submitButtonRef}
    >
      {error || OPERATION_LABELS[operation]}
    </Button>
  );
  const button = errorTooltipContent ? (
    <TooltipWithPortal
      className="w-full"
      renderContent={renderErrorTooltipContent}
      handle={buttonContent}
      handleClassName="w-full"
      position="top"
    />
  ) : (
    buttonContent
  );

  return (
    <div className="PositionEditor">
      <Modal
        className="PositionEditor-modal"
        isVisible={!!position}
        setIsVisible={onClose}
        label={
          <Trans>
            Edit {position?.isLong ? t`Long` : t`Short`} {position?.indexToken?.symbol}
          </Trans>
        }
      >
        {position && (
          <>
            <Tab
              onChange={setOperation}
              option={operation}
              options={Object.values(Operation)}
              optionLabels={OPERATION_LABELS}
              className="PositionEditor-tabs SwapBox-option-tabs"
            />
            <SubaccountNavigationButton
              executionFee={executionFee?.feeTokenAmount}
              closeConfirmationBox={onClose}
              isNativeToken={isDeposit && collateralToken?.isNative}
              tradeFlags={undefined}
            />

            <BuyInputSection
              topLeftLabel={OPERATION_LABELS[operation]}
              topLeftValue={formatUsd(collateralDeltaUsd)}
              topRightLabel={t`Max`}
              topRightValue={
                isDeposit
                  ? formatTokenAmount(collateralToken?.balance, collateralToken?.decimals, "", {
                      useCommas: true,
                    })
                  : formatTokenAmount(maxWithdrawAmount, position?.collateralToken?.decimals, "", {
                      useCommas: true,
                    })
              }
              inputValue={collateralInputValue}
              onInputValueChange={(e) => setCollateralInputValue(e.target.value)}
              showMaxButton={
                isDeposit
                  ? collateralToken?.balance && showMaxOnDeposit && !collateralDeltaAmount?.eq(collateralToken?.balance)
                  : maxWithdrawAmount && !collateralDeltaAmount?.eq(maxWithdrawAmount)
              }
              showPercentSelector={!isDeposit}
              onPercentChange={(percent) => {
                if (!isDeposit) {
                  setCollateralInputValue(
                    formatAmountFree(maxWithdrawAmount!.mul(percent).div(100), position?.collateralToken?.decimals || 0)
                  );
                }
              }}
              onClickMax={() => {
                let maxDepositAmount = collateralToken?.isNative
                  ? collateralToken!.balance!.sub(BigNumber.from(minResidualAmount || 0))
                  : collateralToken!.balance!;

                if (maxDepositAmount.isNegative()) {
                  maxDepositAmount = BigNumber.from(0);
                }

                const formattedMaxDepositAmount = formatAmountFree(maxDepositAmount!, collateralToken!.decimals);
                const finalDepositAmount = isMetamaskMobile
                  ? limitDecimals(formattedMaxDepositAmount, MAX_METAMASK_MOBILE_DECIMALS)
                  : formattedMaxDepositAmount;

                if (isDeposit) {
                  setCollateralInputValue(finalDepositAmount);
                } else {
                  setCollateralInputValue(
                    formatAmountFree(maxWithdrawAmount!, position?.collateralToken?.decimals || 0)
                  );
                }
              }}
            >
              {availableSwapTokens ? (
                <TokenSelector
                  label={OPERATION_LABELS[operation]}
                  chainId={chainId}
                  tokenAddress={selectedCollateralAddress!}
                  onSelectToken={(token) => setSelectedCollateralAddress(token.address)}
                  tokens={availableSwapTokens}
                  infoTokens={infoTokens}
                  className="Edit-collateral-token-selector"
                  showSymbolImage={true}
                  showTokenImgInDropdown={true}
                  showBalances={false}
                />
              ) : (
                collateralToken?.symbol
              )}
            </BuyInputSection>

            <ExchangeInfo className="PositionEditor-info-box">
              <ExchangeInfo.Group>
                <ExchangeInfoRow
                  label={t`Leverage`}
                  value={
                    <ValueTransition from={formatLeverage(position?.leverage)} to={formatLeverage(nextLeverage)} />
                  }
                />
              </ExchangeInfo.Group>

              <ExchangeInfo.Group>
                <ExchangeInfoRow
                  label={t`Entry Price`}
                  value={formatUsd(position.entryPrice, { displayDecimals: indexPriceDecimals })}
                />
                <ExchangeInfoRow
                  label={t`Mark Price`}
                  value={formatUsd(position.markPrice, { displayDecimals: indexPriceDecimals })}
                />
                <ExchangeInfoRow
                  label={t`Liq. Price`}
                  value={
                    <ValueTransition
                      from={formatLiquidationPrice(position.liquidationPrice, { displayDecimals: indexPriceDecimals })}
                      to={
                        collateralDeltaAmount?.gt(0)
                          ? formatLiquidationPrice(nextLiqPrice, { displayDecimals: indexPriceDecimals })
                          : undefined
                      }
                    />
                  }
                />
              </ExchangeInfo.Group>

              <ExchangeInfo.Group>
                <ExchangeInfoRow label={t`Size`} value={formatUsd(position.sizeInUsd)} />
                <div className="Exchange-info-row">
                  <div>
                    <Tooltip
                      handle={
                        <span className="Exchange-info-label">
                          <Trans>Collateral ({position?.collateralToken?.symbol})</Trans>
                        </span>
                      }
                      position="top-start"
                      renderContent={() => {
                        return <Trans>Initial Collateral (Collateral excluding Borrow and Funding Fee).</Trans>;
                      }}
                    />
                  </div>
                  <div className="align-right">
                    <ValueTransition
                      from={formatUsd(position?.collateralUsd)!}
                      to={collateralDeltaUsd?.gt(0) ? formatUsd(nextCollateralUsd) : undefined}
                    />
                  </div>
                </div>
                <TradeFeesRow {...fees} feesType="edit" shouldShowRebate={false} />
                <NetworkFeeRow executionFee={executionFee} />
              </ExchangeInfo.Group>

              <ExchangeInfo.Group>
                {!isDeposit && (
                  <ExchangeInfoRow
                    label={t`Receive`}
                    value={formatTokenAmountWithUsd(
                      receiveAmount,
                      receiveUsd,
                      collateralToken?.symbol,
                      collateralToken?.decimals,
                      { fallbackToZero: true }
                    )}
                  />
                )}
              </ExchangeInfo.Group>

              <ExchangeInfo.Group>
                {needCollateralApproval && collateralToken && (
                  <ApproveTokenButton
                    tokenAddress={collateralToken.address}
                    tokenSymbol={collateralToken.assetSymbol ?? collateralToken.symbol}
                    spenderAddress={routerAddress}
                  />
                )}
                {highExecutionFeeAcknowledgement}
              </ExchangeInfo.Group>
            </ExchangeInfo>

            <div className="Exchange-swap-button-container Confirmation-box-row">{button}</div>
          </>
        )}
      </Modal>
    </div>
  );
}

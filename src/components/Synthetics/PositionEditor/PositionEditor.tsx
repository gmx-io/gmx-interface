import { Trans, t } from "@lingui/macro";
import { useWeb3React } from "@web3-react/core";
import Token from "abis/Token.json";
import { ApproveTokenButton } from "components/ApproveTokenButton/ApproveTokenButton";
import Button from "components/Button/Button";
import BuyInputSection from "components/BuyInputSection/BuyInputSection";
import ExchangeInfoRow from "components/Exchange/ExchangeInfoRow";
import Modal from "components/Modal/Modal";
import Tab from "components/Tab/Tab";
import TokenSelector from "components/TokenSelector/TokenSelector";
import Tooltip from "components/Tooltip/Tooltip";
import { ValueTransition } from "components/ValueTransition/ValueTransition";
import { getContract } from "config/contracts";
import { getSyntheticsCollateralEditAddressKey } from "config/localStorage";
import { NATIVE_TOKEN_ADDRESS, getToken } from "config/tokens";
import { useSyntheticsEvents } from "context/SyntheticsEvents";
import { useUserReferralInfo } from "domain/referrals/hooks";
import {
  estimateExecuteDecreaseOrderGasLimit,
  estimateExecuteIncreaseOrderGasLimit,
  getExecutionFee,
  getFeeItem,
  getPositionFee,
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
  PositionInfo,
  formatLeverage,
  getLeverage,
  getLiquidationPrice,
  usePositionsConstants,
} from "domain/synthetics/positions";
import {
  adaptToV1InfoTokens,
  convertToTokenAmount,
  convertToUsd,
  useAvailableTokensData,
} from "domain/synthetics/tokens";
import { TradeFees, getMarkPrice } from "domain/synthetics/trade";
import { getCommonError, getEditCollateralError } from "domain/synthetics/trade/utils/validation";
import { BigNumber } from "ethers";
import { useChainId } from "lib/chains";
import { contractFetcher } from "lib/contracts";
import { useLocalStorageSerializeKey } from "lib/localStorage";
import { formatAmountFree, formatTokenAmount, formatTokenAmountWithUsd, formatUsd, parseValue } from "lib/numbers";
import { getByKey } from "lib/objects";
import { useMemo, useState } from "react";
import useSWR from "swr";
import { TradeFeesRow } from "../TradeFeesRow/TradeFeesRow";
import "./PositionEditor.scss";

export type Props = {
  position: PositionInfo;
  showPnlInLeverage: boolean;
  allowedSlippage: number;
  setPendingTxns: (txns: any) => void;
  onClose: () => void;
  onConnectWallet: () => void;
};

enum Operation {
  Deposit = "Deposit",
  Withdraw = "Withdraw",
}

export function PositionEditor(p: Props) {
  const { position, showPnlInLeverage, setPendingTxns, onClose, onConnectWallet, allowedSlippage } = p;

  const { chainId } = useChainId();
  const { account, library, active } = useWeb3React();
  const { setPendingPosition, setPendingOrder } = useSyntheticsEvents();
  const { tokensData } = useAvailableTokensData(chainId);
  const { gasPrice } = useGasPrice(chainId);
  const { gasLimits } = useGasLimits(chainId);
  const { minCollateralUsd } = usePositionsConstants(chainId);
  const routerAddress = getContract(chainId, "SyntheticsRouter");
  const userReferralInfo = useUserReferralInfo(library, chainId, account);

  const infoTokens = useMemo(() => {
    if (!tokensData) {
      return undefined;
    }
    return adaptToV1InfoTokens(tokensData);
  }, [tokensData]);

  const { data: tokenAllowance } = useSWR<BigNumber>(
    [active, chainId, position.collateralTokenAddress, "allowance", account, routerAddress],
    {
      fetcher: contractFetcher(library, Token),
    }
  );

  const [isSubmitting, setIsSubmitting] = useState(false);

  const [operation, setOperation] = useState(Operation.Deposit);
  const isDeposit = operation === Operation.Deposit;

  const indexPriceDecimals = position.indexToken.priceDecimals || 2;

  const [selectedCollateralAddress, setSelectedCollateralAddress] = useLocalStorageSerializeKey(
    getSyntheticsCollateralEditAddressKey(chainId, position.collateralTokenAddress),
    position.collateralTokenAddress
  );
  const collateralToken = getByKey(tokensData, selectedCollateralAddress);

  const availableSwapTokens = position.collateralToken.isWrapped
    ? [getToken(chainId, position.collateralTokenAddress), getToken(chainId, NATIVE_TOKEN_ADDRESS)]
    : undefined;

  const collateralPrice = collateralToken?.prices.minPrice;
  const markPrice = getMarkPrice({
    prices: position.indexToken.prices,
    isLong: position.isLong,
    isIncrease: isDeposit,
  });

  const [collateralInputValue, setCollateralInputValue] = useState("");
  const collateralDeltaAmount = parseValue(collateralInputValue || "0", collateralToken?.decimals || 0)!;
  const collateralDeltaUsd = convertToUsd(collateralDeltaAmount, collateralToken?.decimals, collateralPrice);

  const needCollateralApproval =
    isDeposit && tokenAllowance && collateralDeltaAmount && collateralDeltaAmount.gt(tokenAllowance);

  const maxWithdrawUsd = minCollateralUsd ? position.initialCollateralUsd.sub(minCollateralUsd) : BigNumber.from(0);
  const maxWithdrawAmount = convertToTokenAmount(maxWithdrawUsd, collateralToken?.decimals, collateralPrice)!;

  const { fees, executionFee } = useMemo(() => {
    if (!gasLimits || !tokensData || !gasPrice) {
      return {};
    }

    const fundingFee = getFeeItem(position.pendingFundingFeesUsd.mul(-1), collateralDeltaUsd);
    const borrowFee = getFeeItem(position.pendingBorrowingFeesUsd.mul(-1), collateralDeltaUsd);
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

  const { nextCollateralUsd, nextLeverage, nextLiqPrice, receiveUsd, receiveAmount, remainingCollateralFeesUsd } =
    useMemo(() => {
      if (!collateralDeltaUsd?.gt(0) || !minCollateralUsd || !fees?.totalFees) {
        return {};
      }

      let nextCollateralUsd: BigNumber;
      let receiveUsd = BigNumber.from(0);

      let remainingCollateralFeesUsd = fees.totalFees.deltaUsd.abs().sub(collateralDeltaUsd);
      if (remainingCollateralFeesUsd.lt(0)) {
        remainingCollateralFeesUsd = BigNumber.from(0);
      }

      if (isDeposit) {
        const collateralDeltaAfterFeesUsd = collateralDeltaUsd.sub(fees.totalFees.deltaUsd.abs());
        nextCollateralUsd = position.initialCollateralUsd.add(collateralDeltaAfterFeesUsd);
      } else {
        if (collateralDeltaUsd.gt(fees.totalFees.deltaUsd.abs())) {
          nextCollateralUsd = position.initialCollateralUsd.sub(collateralDeltaUsd);
          receiveUsd = collateralDeltaUsd.sub(fees.totalFees.deltaUsd.abs());
        } else {
          nextCollateralUsd = position.initialCollateralUsd.sub(collateralDeltaUsd).sub(remainingCollateralFeesUsd);
          receiveUsd = BigNumber.from(0);
        }
      }

      const receiveAmount = convertToTokenAmount(receiveUsd, collateralToken?.decimals, collateralPrice)!;

      if (nextCollateralUsd?.lt(0)) {
        nextCollateralUsd = BigNumber.from(0);
      }

      const nextLeverage = getLeverage({
        sizeInUsd: position.sizeInUsd,
        collateralUsd: nextCollateralUsd,
        pendingBorrowingFeesUsd: BigNumber.from(0),
        pendingFundingFeesUsd: BigNumber.from(0),
        pnl: showPnlInLeverage ? position.pnl : BigNumber.from(0),
      });

      const nextLiqPrice = getLiquidationPrice({
        sizeInUsd: position.sizeInUsd,
        collateralUsd: nextCollateralUsd,
        pnl: position.pnl,
        markPrice: position.markPrice,
        closingFeeUsd: getPositionFee(position.marketInfo, position.sizeInUsd, userReferralInfo).positionFeeUsd,
        maxPriceImpactFactor: position.marketInfo.maxPositionImpactFactorForLiquidations,
        pendingFundingFeesUsd: BigNumber.from(0),
        pendingBorrowingFeesUsd: BigNumber.from(0),
        minCollateralFactor: position.marketInfo.minCollateralFactor,
        minCollateralUsd,
        isLong: position.isLong,
      });

      return {
        nextCollateralUsd,
        nextLeverage,
        nextLiqPrice,
        receiveUsd,
        receiveAmount,
        remainingCollateralFeesUsd,
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

  const error = useMemo(() => {
    const commonError = getCommonError({
      chainId,
      isConnected: Boolean(account),
      hasOutdatedUi: false,
    });

    const editCollateralError = getEditCollateralError({
      collateralDeltaAmount,
      collateralDeltaUsd,
      nextCollateralUsd,
      nextLeverage,
      nextLiqPrice,
      minCollateralUsd,
      isDeposit,
      position,
    });

    const error = commonError[0] || editCollateralError[0];

    if (error) {
      return error;
    }

    if (needCollateralApproval) {
      return t`Pending ${collateralToken?.symbol} approval`;
    }

    if (isSubmitting) {
      return t`Creating Order...`;
    }
  }, [
    account,
    chainId,
    collateralDeltaAmount,
    collateralDeltaUsd,
    collateralToken?.symbol,
    isDeposit,
    isSubmitting,
    minCollateralUsd,
    needCollateralApproval,
    nextCollateralUsd,
    nextLeverage,
    nextLiqPrice,
    position,
  ]);

  function onSubmit() {
    if (!account) {
      onConnectWallet();
      return;
    }

    if (
      !executionFee?.feeTokenAmount ||
      !tokensData ||
      !markPrice ||
      !position?.indexToken ||
      !collateralDeltaAmount ||
      !selectedCollateralAddress
    ) {
      return;
    }

    if (isDeposit) {
      setIsSubmitting(true);

      createIncreaseOrderTxn(chainId, library, {
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
        referralCode: userReferralInfo?.userReferralCode,
        indexToken: position.indexToken,
        tokensData,
        setPendingTxns,
        setPendingOrder,
        setPendingPosition,
      })
        .then(onClose)
        .finally(() => {
          setIsSubmitting(false);
        });
    } else {
      if (!receiveUsd) {
        return;
      }

      setIsSubmitting(true);

      createDecreaseOrderTxn(chainId, library, {
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
        referralCode: userReferralInfo?.userReferralCode,
        indexToken: position.indexToken,
        tokensData,
        setPendingTxns,
        setPendingOrder,
        setPendingPosition,
      })
        .then(onClose)
        .finally(() => {
          setIsSubmitting(false);
        });
    }
  }

  const operationLabels = {
    [Operation.Deposit]: t`Deposit`,
    [Operation.Withdraw]: t`Withdraw`,
  };

  return (
    <div className="PositionEditor">
      <Modal
        className="PositionEditor-modal"
        isVisible={Boolean(position)}
        setIsVisible={onClose}
        label={
          <Trans>
            Edit {position?.isLong ? t`Long` : t`Short`} {position?.indexToken?.symbol}
          </Trans>
        }
        allowContentTouchMove
      >
        <Tab
          onChange={setOperation}
          option={operation}
          options={Object.values(Operation)}
          optionLabels={operationLabels}
          className="PositionEditor-tabs SwapBox-option-tabs"
        />

        <BuyInputSection
          topLeftLabel={operationLabels[operation] + `:`}
          topLeftValue={formatUsd(collateralDeltaUsd)}
          topRightLabel={t`Max` + `:`}
          topRightValue={
            isDeposit
              ? formatTokenAmount(collateralToken?.balance, collateralToken?.decimals)
              : formatTokenAmount(maxWithdrawAmount, position?.collateralToken?.decimals)
          }
          inputValue={collateralInputValue}
          onInputValueChange={(e) => setCollateralInputValue(e.target.value)}
          showMaxButton={
            isDeposit
              ? collateralToken?.balance && !collateralDeltaAmount?.eq(collateralToken?.balance)
              : maxWithdrawAmount && !collateralDeltaAmount?.eq(maxWithdrawAmount)
          }
          onClickMax={() =>
            isDeposit
              ? setCollateralInputValue(formatAmountFree(collateralToken!.balance!, collateralToken!.decimals, 4))
              : setCollateralInputValue(
                  formatAmountFree(maxWithdrawAmount!, position?.collateralToken?.decimals || 0, 6)
                )
          }
        >
          {availableSwapTokens ? (
            <TokenSelector
              label={operationLabels[operation]}
              chainId={chainId}
              tokenAddress={selectedCollateralAddress!}
              onSelectToken={(token) => setSelectedCollateralAddress(token.address)}
              tokens={availableSwapTokens}
              infoTokens={infoTokens}
              className="Edit-collateral-token-selector"
              showSymbolImage={true}
              showTokenImgInDropdown={true}
            />
          ) : (
            collateralToken?.symbol
          )}
        </BuyInputSection>

        <div className="PositionEditor-info-box">
          {executionFee?.warning && <div className="Confirmation-box-warning">{executionFee.warning}</div>}

          <ExchangeInfoRow
            label={t`Leverage`}
            value={<ValueTransition from={formatLeverage(position?.leverage)} to={formatLeverage(nextLeverage)} />}
          />

          <ExchangeInfoRow
            isTop
            label={t`Entry Price`}
            value={formatUsd(position.entryPrice, { displayDecimals: indexPriceDecimals })}
          />
          <ExchangeInfoRow
            label={t`Mark Price`}
            value={formatUsd(position.markPrice, { displayDecimals: indexPriceDecimals })}
          />

          <ExchangeInfoRow
            label={t`Liq Price`}
            value={
              <ValueTransition
                from={formatUsd(position.liquidationPrice)}
                to={formatUsd(nextLiqPrice, { displayDecimals: indexPriceDecimals })}
              />
            }
          />

          <ExchangeInfoRow isTop label={t`Size`} value={formatUsd(position.sizeInUsd)} />

          <div className="Exchange-info-row">
            <div>
              <Tooltip
                handle={
                  <span className="Exchange-info-label">
                    <Trans>Collateral ({position?.collateralToken?.symbol})</Trans>
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
                from={formatUsd(position?.initialCollateralUsd)!}
                to={collateralDeltaUsd?.gt(0) ? formatUsd(nextCollateralUsd) : undefined}
              />
            </div>
          </div>

          <TradeFeesRow
            {...fees}
            executionFee={executionFee}
            feesType={"edit"}
            warning={
              remainingCollateralFeesUsd?.gt(0)
                ? isDeposit
                  ? t`Deposit amount is insufficient to cover pending Fees. Collateral will be reduced after this deposit.`
                  : t`Withdrawal amount is insufficient to cover pending Fees. They are deducted from Collateral.`
                : ""
            }
          />

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
        </div>

        {needCollateralApproval && collateralToken && (
          <>
            <div className="App-card-divider" />

            <ApproveTokenButton
              tokenAddress={collateralToken.address}
              tokenSymbol={collateralToken.symbol}
              spenderAddress={routerAddress}
            />
          </>
        )}

        <div className="Exchange-swap-button-container Confirmation-box-row">
          <Button className="w-100" variant="primary-action" onClick={onSubmit} disabled={Boolean(error)}>
            {error || operationLabels[operation]}
          </Button>
        </div>
      </Modal>
    </div>
  );
}

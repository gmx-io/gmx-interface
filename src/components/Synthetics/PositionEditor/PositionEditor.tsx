import { useWeb3React } from "@web3-react/core";
import { useSyntheticsEvents } from "context/SyntheticsEvents";
import {
  FeeItem,
  estimateExecuteDecreaseOrderGasLimit,
  estimateExecuteIncreaseOrderGasLimit,
  getExecutionFee,
  getFeeItem,
  getPositionFee,
  getTotalFeeItem,
  useGasLimits,
  useGasPrice,
} from "domain/synthetics/fees";
import Token from "abis/Token.json";
import {
  PositionInfo,
  formatLeverage,
  getLeverage,
  getLiquidationPrice,
  usePositionsConstants,
} from "domain/synthetics/positions";
import { useChainId } from "lib/chains";
import useSWR from "swr";
import { contractFetcher } from "lib/contracts";
import { BigNumber } from "ethers";
import { getContract } from "config/contracts";
import { useMemo, useState } from "react";
import { convertToTokenAmount, convertToUsd, useAvailableTokensData } from "domain/synthetics/tokens";
import { formatAmountFree, formatTokenAmount, formatTokenAmountWithUsd, formatUsd, parseValue } from "lib/numbers";
import {
  TradeFees,
  applySlippage,
  getAcceptablePrice,
  getDecreaseSwapType,
  getMarkPrice,
} from "domain/synthetics/trade";
import { getCommonError, getEditCollateralError } from "domain/synthetics/trade/utils/validation";
import { OrderType, createDecreaseOrderTxn, createIncreaseOrderTxn } from "domain/synthetics/orders";
import Modal from "components/Modal/Modal";
import { ApproveTokenButton } from "components/ApproveTokenButton/ApproveTokenButton";
import ExchangeInfoRow from "components/Exchange/ExchangeInfoRow";
import { TradeFeesRow } from "../TradeFeesRow/TradeFeesRow";
import { ValueTransition } from "components/ValueTransition/ValueTransition";
import { Trans, t } from "@lingui/macro";
import BuyInputSection from "components/BuyInputSection/BuyInputSection";
import Tab from "components/Tab/Tab";
import Button from "components/Button/Button";
import Tooltip from "components/Tooltip/Tooltip";
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

  const operationLabels = {
    [Operation.Deposit]: t`Deposit`,
    [Operation.Withdraw]: t`Withdraw`,
  };

  const { chainId } = useChainId();
  const { account, library, active } = useWeb3React();
  const { setPendingPositionUpdate } = useSyntheticsEvents();
  const { tokensData } = useAvailableTokensData(chainId);
  const { gasPrice } = useGasPrice(chainId);
  const { gasLimits } = useGasLimits(chainId);
  const { minCollateralUsd } = usePositionsConstants(chainId);
  const routerAddress = getContract(chainId, "SyntheticsRouter");
  const { data: tokenAllowance } = useSWR<BigNumber>(
    [active, chainId, position.collateralTokenAddress, "allowance", account, routerAddress],
    {
      fetcher: contractFetcher(library, Token),
    }
  );

  const [operation, setOperation] = useState(Operation.Deposit);
  const isDeposit = operation === Operation.Deposit;

  const { collateralToken } = position;
  const collateralPrice = isDeposit ? collateralToken.prices.minPrice : collateralToken.prices.maxPrice;

  const markPrice = getMarkPrice({
    prices: position.indexToken.prices,
    isLong: position.isLong,
    isIncrease: isDeposit,
  });

  const maxWithdrawUsd = minCollateralUsd ? position.initialCollateralUsd.sub(minCollateralUsd) : BigNumber.from(0);
  const maxWithdrawAmount = convertToTokenAmount(maxWithdrawUsd, collateralToken.decimals, collateralPrice)!;

  const [collateralInputValue, setCollateralInputValue] = useState("");
  const collateralDeltaAmount = parseValue(collateralInputValue || "0", collateralToken?.decimals || 0)!;
  const collateralDeltaUsd = convertToUsd(collateralDeltaAmount, collateralToken?.decimals, collateralPrice);

  const needApproval = isDeposit && tokenAllowance && collateralDeltaAmount && collateralDeltaAmount.gt(tokenAllowance);

  let receiveUsd =
    !isDeposit && collateralDeltaUsd?.gt(0)
      ? collateralDeltaUsd?.sub(position.pendingBorrowingFeesUsd).sub(position.pendingFundingFeesUsd)
      : BigNumber.from(0);

  if (receiveUsd?.lt(0)) {
    receiveUsd = BigNumber.from(0);
  }
  const receiveAmount = convertToTokenAmount(receiveUsd, collateralToken.decimals, collateralPrice);

  const { fees, executionFee } = useMemo(() => {
    if (!gasLimits || !tokensData || !gasPrice) {
      return {};
    }

    const fundingFee = getFeeItem(position.pendingFundingFeesUsd.mul(-1), collateralDeltaUsd);
    const borrowFee = getFeeItem(position.pendingBorrowingFeesUsd.mul(-1), collateralDeltaUsd);
    const totalFees = getTotalFeeItem([fundingFee, borrowFee].filter(Boolean) as FeeItem[]);

    const fees: TradeFees = {
      totalFees,
      fundingFee,
      borrowFee,
    };

    let estimatedGas: BigNumber;
    if (isDeposit) {
      estimatedGas = estimateExecuteIncreaseOrderGasLimit(gasLimits, {});
    } else {
      estimatedGas = estimateExecuteDecreaseOrderGasLimit(gasLimits, {});
    }

    const executionFee = getExecutionFee(chainId, gasLimits, tokensData, estimatedGas, gasPrice);

    return {
      fees,
      executionFee,
    };
  }, [chainId, collateralDeltaUsd, gasLimits, gasPrice, isDeposit, position, tokensData]);

  const { nextCollateralUsd, nextLeverage, nextLiqPrice, acceptablePrice } = useMemo(() => {
    if (!collateralDeltaUsd?.gt(0) || !minCollateralUsd) {
      return {};
    }

    let nextCollateralUsd = isDeposit
      ? position.remainingCollateralUsd?.add(collateralDeltaUsd || BigNumber.from(0))
      : position.initialCollateralUsd?.sub(collateralDeltaUsd || BigNumber.from(0));

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
      closingFeeUsd: getPositionFee(position.marketInfo, position.sizeInUsd),
      maxPriceImpactFactor: position.marketInfo.maxPositionImpactFactorForLiquidations,
      pendingFundingFeesUsd: BigNumber.from(0),
      pendingBorrowingFeesUsd: BigNumber.from(0),
      minCollateralFactor: position.marketInfo.minCollateralFactor,
      minCollateralUsd,
      isLong: position.isLong,
    });

    const { acceptablePrice } = getAcceptablePrice({
      isIncrease: isDeposit,
      isLong: position.isLong,
      sizeDeltaUsd: BigNumber.from(0),
      priceImpactDeltaUsd: BigNumber.from(0),
      indexPrice: markPrice,
    });

    return {
      nextCollateralUsd,
      nextLeverage,
      nextLiqPrice,
      acceptablePrice,
    };
  }, [
    collateralDeltaUsd,
    isDeposit,
    markPrice,
    minCollateralUsd,
    position.initialCollateralUsd,
    position.isLong,
    position.markPrice,
    position.marketInfo,
    position.pnl,
    position.remainingCollateralUsd,
    position.sizeInUsd,
    showPnlInLeverage,
  ]);

  const decreaseSwapType = getDecreaseSwapType({
    market: position.marketInfo,
    collateralTokenAddress: collateralToken.address,
    isLong: position.isLong,
  });

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

    if (needApproval) {
      return t`Pending ${collateralToken?.symbol} approval`;
    }
  }, [
    account,
    chainId,
    collateralDeltaAmount,
    collateralDeltaUsd,
    collateralToken?.symbol,
    isDeposit,
    minCollateralUsd,
    needApproval,
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
      !acceptablePrice ||
      !position?.indexToken ||
      !collateralDeltaAmount
    ) {
      return;
    }

    const acceptablePriceAfterSlippage = applySlippage(allowedSlippage, acceptablePrice, isDeposit, position.isLong);

    if (isDeposit) {
      createIncreaseOrderTxn(chainId, library, {
        account,
        marketAddress: position.marketAddress,
        indexTokenAddress: position.indexToken.address,
        swapPath: [],
        initialCollateralAddress: position.collateralTokenAddress,
        initialCollateralAmount: collateralDeltaAmount,
        acceptablePrice: acceptablePriceAfterSlippage,
        orderType: OrderType.MarketIncrease,
        sizeDeltaUsd: BigNumber.from(0),
        isLong: position.isLong,
        executionFee: executionFee.feeTokenAmount,
        tokensData,
        setPendingTxns,
      }).then(() => {
        if (p.position) {
          setPendingPositionUpdate({
            isIncrease: true,
            positionKey: p.position.key,
            collateralDeltaAmount,
          });
        }

        p.onClose();
      });
    } else {
      if (!receiveUsd) {
        return;
      }

      createDecreaseOrderTxn(chainId, library, {
        account,
        marketAddress: position.marketAddress,
        indexTokenAddress: position.indexToken.address,
        swapPath: [],
        initialCollateralDeltaAmount: collateralDeltaAmount,
        initialCollateralAddress: position.collateralTokenAddress,
        receiveTokenAddress: position.collateralTokenAddress,
        acceptablePrice: acceptablePriceAfterSlippage,
        sizeDeltaUsd: BigNumber.from(0),
        orderType: OrderType.MarketDecrease,
        isLong: position.isLong,
        executionFee: executionFee.feeTokenAmount,
        decreasePositionSwapType: decreaseSwapType,
        minOutputUsd: receiveUsd,
        tokensData,
        setPendingTxns,
      }).then(() => {
        if (p.position) {
          setPendingPositionUpdate({
            isIncrease: false,
            positionKey: p.position.key,
            collateralDeltaAmount: collateralDeltaAmount,
          });
        }

        onClose();
      });
    }
  }

  return (
    <div className="PositionEditor">
      <Modal
        className="PositionEditor-modal"
        isVisible={Boolean(position)}
        setIsVisible={p.onClose}
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
          topLeftLabel={(isDeposit ? t`Deposit` : t`Withdraw`) + `:`}
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
          {collateralToken?.symbol}
        </BuyInputSection>

        <div className="PositionEditor-info-box">
          {executionFee?.warning && <div className="Confirmation-box-warning">{executionFee.warning}</div>}

          <ExchangeInfoRow
            label={t`Leverage`}
            value={<ValueTransition from={formatLeverage(position?.leverage)} to={formatLeverage(nextLeverage)} />}
          />

          <ExchangeInfoRow isTop label={t`Entry Price`} value={formatUsd(position.entryPrice)} />
          <ExchangeInfoRow label={t`Mark Price`} value={formatUsd(position.markPrice)} />

          <ExchangeInfoRow
            label={t`Liq Price`}
            value={<ValueTransition from={formatUsd(position.liquidationPrice)} to={formatUsd(nextLiqPrice)} />}
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
            executionFee={executionFee}
            totalTradeFees={fees?.totalFees}
            fundingFee={fees?.fundingFee}
            borrowFee={fees?.borrowFee}
            feesType={"edit"}
          />

          {!isDeposit && (
            <ExchangeInfoRow
              label={t`Receive`}
              value={formatTokenAmountWithUsd(
                receiveAmount,
                receiveUsd,
                collateralToken?.symbol,
                collateralToken?.decimals
              )}
            />
          )}
        </div>

        {needApproval && collateralToken && (
          <>
            <div className="App-card-divider" />

            <div className="ConfirmationBox-approve-tokens">
              <div className="ConfirmationBox-approve-token">
                <ApproveTokenButton
                  tokenAddress={collateralToken.address}
                  tokenSymbol={collateralToken.symbol}
                  spenderAddress={routerAddress}
                />
              </div>
            </div>

            <div className="App-card-divider" />
          </>
        )}

        <div className="Exchange-swap-button-container">
          <Button className="w-100" variant="primary-action" onClick={onSubmit} disabled={Boolean(error)}>
            {error || operationLabels[operation]}
          </Button>
        </div>
      </Modal>
    </div>
  );
}

import { Trans, t } from "@lingui/macro";
import { useWeb3React } from "@web3-react/core";
import Token from "abis/Token.json";
import BuyInputSection from "components/BuyInputSection/BuyInputSection";
import Modal from "components/Modal/Modal";
import { SubmitButton } from "components/SubmitButton/SubmitButton";
import Tab from "components/Tab/Tab";
import Tooltip from "components/Tooltip/Tooltip";
import { ValueTransition } from "components/ValueTransition/ValueTransition";
import { useSyntheticsEvents } from "context/SyntheticsEvents";
import {
  estimateExecuteDecreaseOrderGasLimit,
  estimateExecuteIncreaseOrderGasLimit,
  getExecutionFee,
  useGasPrice,
} from "domain/synthetics/fees";
import {
  DecreasePositionSwapType,
  OrderType,
  createDecreaseOrderTxn,
  createIncreaseOrderTxn,
} from "domain/synthetics/orders";
import { PositionInfo, formatLeverage, getLeverage, getLiquidationPrice } from "domain/synthetics/positions";
import { convertToTokenAmount, convertToUsd, useAvailableTokensData } from "domain/synthetics/tokens";
import { BigNumber } from "ethers";
import { useChainId } from "lib/chains";
import { BASIS_POINTS_DIVISOR, DEFAULT_SLIPPAGE_AMOUNT, MAX_ALLOWED_LEVERAGE, USD_DECIMALS } from "lib/legacy";
import { formatAmount, formatAmountFree, formatDeltaUsd, formatTokenAmount, formatUsd, parseValue } from "lib/numbers";
import { useMemo, useState } from "react";

import { ApproveTokenButton } from "components/ApproveTokenButton/ApproveTokenButton";
import ExchangeInfoRow from "components/Exchange/ExchangeInfoRow";
import { ErrorCode, ErrorDisplayType } from "components/Exchange/constants";
import { getContract } from "config/contracts";
import { useGasLimits } from "domain/synthetics/fees/useGasLimits";

import { usePositionsConstants } from "domain/synthetics/positions/usePositionsConstants";
import { getAcceptablePrice } from "domain/synthetics/trade";
import { contractFetcher } from "lib/contracts";
import useSWR from "swr";
import { TradeFeesRow } from "../TradeFeesRow/TradeFeesRow";
import "./PositionEditor.scss";

type Props = {
  position?: PositionInfo;
  savedIsPnlInLeverage: boolean;
  setPendingTxns: (txns: any) => void;
  onClose: () => void;
};

enum Operation {
  Deposit = "Deposit",
  Withdraw = "Withdraw",
}

const operationLabels = {
  [Operation.Deposit]: t`Deposit`,
  [Operation.Withdraw]: t`Withdraw`,
};

export function PositionEditor(p: Props) {
  const { position, savedIsPnlInLeverage } = p;
  const { chainId } = useChainId();
  const { account, library, active } = useWeb3React();
  const { setPendingPositionUpdate } = useSyntheticsEvents();
  const [operation, setOperation] = useState(Operation.Deposit);
  const isDeposit = operation === Operation.Deposit;
  const { minCollateralUsd } = usePositionsConstants(chainId);

  const { tokensData } = useAvailableTokensData(chainId);
  const { gasPrice } = useGasPrice(chainId);
  const { gasLimits } = useGasLimits(chainId);

  const collateralToken = position?.collateralToken;

  const routerAddress = getContract(chainId, "SyntheticsRouter");
  const { data: tokenAllowance } = useSWR<BigNumber>(
    [active, chainId, position?.collateralTokenAddress, "allowance", account, routerAddress],
    {
      fetcher: contractFetcher(library, Token),
    }
  );

  const collateralPrice = isDeposit
    ? position?.collateralToken?.prices?.minPrice
    : position?.collateralToken?.prices?.maxPrice;

  const maxWithdrawUsd = position?.remainingCollateralUsd?.sub(minCollateralUsd || 0) || BigNumber.from(0);
  const maxWithdrawAmount = convertToTokenAmount(maxWithdrawUsd, position?.collateralToken?.decimals, collateralPrice);

  const [collateralInputValue, setCollateralInputValue] = useState("");
  const collateralDeltaAmount = parseValue(collateralInputValue || "0", position?.collateralToken?.decimals || 0)!;
  const collateralDeltaUsd = convertToUsd(collateralDeltaAmount, position?.collateralToken?.decimals, collateralPrice);

  let nextCollateralUsd = isDeposit
    ? position?.remainingCollateralUsd?.add(collateralDeltaUsd || BigNumber.from(0))
    : position?.remainingCollateralUsd?.sub(collateralDeltaUsd || BigNumber.from(0));

  if (nextCollateralUsd?.lt(0)) {
    nextCollateralUsd = BigNumber.from(0);
  }

  const { nextLeverageExcludingPnl, nextLeverage, nextLiqPrice, acceptablePrice } = useMemo(() => {
    if (!position || !nextCollateralUsd || !minCollateralUsd) {
      return {};
    }

    const nextLeverageExcludingPnl = collateralDeltaUsd?.gt(0)
      ? getLeverage({
          sizeInUsd: position?.sizeInUsd,
          collateralUsd: nextCollateralUsd,
          pendingBorrowingFeesUsd: position?.pendingBorrowingFeesUsd,
          pendingFundingFeesUsd: position?.pendingFundingFeesUsd,
          pnl: undefined,
        })
      : undefined;

    const nextLeverage = collateralDeltaUsd?.gt(0)
      ? getLeverage({
          sizeInUsd: position?.sizeInUsd,
          collateralUsd: nextCollateralUsd,
          pendingBorrowingFeesUsd: position?.pendingBorrowingFeesUsd,
          pendingFundingFeesUsd: position?.pendingFundingFeesUsd,
          pnl: savedIsPnlInLeverage ? position?.pnl : undefined,
        })
      : undefined;

    const nextLiqPrice = collateralDeltaUsd?.gt(0)
      ? getLiquidationPrice({
          sizeInUsd: position?.sizeInUsd,
          collateralUsd: nextCollateralUsd,
          markPrice: position?.markPrice,
          pnl: position.pnl,
          isLong: position?.isLong,
          pendingBorrowingFeesUsd: BigNumber.from(0),
          pendingFundingFeesUsd: BigNumber.from(0),
          closingFeeUsd: position.closingFeeUsd,
          minCollateralFactor: position.marketInfo.minCollateralFactor,
          maxPriceImpactFactor: position.marketInfo.maxPositionImpactFactorForLiquidations,
          minCollateralUsd,
        })
      : undefined;

    const { acceptablePrice = undefined } = position
      ? getAcceptablePrice({
          isIncrease: isDeposit,
          isLong: position?.isLong,
          sizeDeltaUsd: BigNumber.from(0),
          indexPrice: position?.markPrice,
          allowedSlippage: DEFAULT_SLIPPAGE_AMOUNT,
        })
      : {};

    return {
      nextLeverageExcludingPnl,
      nextLeverage,
      nextLiqPrice,
      acceptablePrice,
    };
  }, [collateralDeltaUsd, isDeposit, minCollateralUsd, nextCollateralUsd, position, savedIsPnlInLeverage]);

  // TODO: calculate swap fees
  const shouldSwapPnlToCollateralToken =
    !isDeposit && position?.marketInfo && position?.pnlToken?.address !== position?.collateralToken?.address;

  const needApproval = isDeposit && tokenAllowance && collateralDeltaAmount && collateralDeltaAmount.gt(tokenAllowance);

  const executionFee = useMemo(() => {
    if (!gasLimits || !gasPrice || !tokensData) return undefined;

    let estimatedGas: BigNumber;
    if (isDeposit) {
      estimatedGas = estimateExecuteIncreaseOrderGasLimit(gasLimits, {});
    } else {
      estimatedGas = estimateExecuteDecreaseOrderGasLimit(gasLimits, {});
    }

    return getExecutionFee(chainId, gasLimits, tokensData, estimatedGas, gasPrice);
  }, [chainId, gasLimits, gasPrice, isDeposit, tokensData]);

  function getError() {
    if (!collateralDeltaAmount || collateralDeltaAmount.eq(0)) {
      return [t`Enter an amount`];
    }

    if (collateralDeltaAmount.lte(0)) {
      return [t`Amount should be greater than zero`];
    }

    if (!isDeposit && collateralDeltaUsd && position?.remainingCollateralUsd && minCollateralUsd) {
      if (position?.remainingCollateralUsd.sub(collateralDeltaUsd).lt(minCollateralUsd)) {
        return [t`Min residual collateral: ${formatAmount(minCollateralUsd, USD_DECIMALS, 2)} USD`];
      }
    }

    if (!isDeposit && collateralDeltaUsd && nextLiqPrice && position?.markPrice) {
      if (position?.isLong && position?.markPrice.lt(nextLiqPrice)) {
        return [t`Invalid liq. price`, ErrorDisplayType.Tooltip, ErrorCode.InvalidLiqPrice];
      }
      if (!position?.isLong && position?.markPrice.gt(nextLiqPrice)) {
        return [t`Invalid liq. price`, ErrorDisplayType.Tooltip, ErrorCode.InvalidLiqPrice];
      }
    }

    if (nextLeverageExcludingPnl && nextLeverageExcludingPnl.lt(1.1 * BASIS_POINTS_DIVISOR)) {
      return [t`Min leverage: 1.1x`];
    }

    if (nextLeverage && nextLeverage.gt(MAX_ALLOWED_LEVERAGE)) {
      return [t`Max leverage: ${(MAX_ALLOWED_LEVERAGE / BASIS_POINTS_DIVISOR).toFixed(1)}x`];
    }

    return [false];
  }

  function getSubmitButtonState(): { text: string; disabled?: boolean; onClick?: () => void } {
    const error = getError();

    if (typeof error[0] === "string") {
      return {
        text: error[0],
        disabled: true,
      };
    }

    if (needApproval) {
      return {
        text: t`Pending ${collateralToken?.symbol} approval`,
        disabled: true,
      };
    }

    return {
      text: operationLabels[operation],
      disabled: false,
      onClick: onSubmit,
    };
  }

  function onSubmit() {
    if (!account || !tokensData || !executionFee?.feeTokenAmount || !acceptablePrice || !position?.indexToken) return;

    if (operation === Operation.Deposit) {
      createIncreaseOrderTxn(chainId, library, {
        account,
        marketAddress: position?.marketAddress,
        indexTokenAddress: position?.indexToken.address,
        swapPath: [],
        initialCollateralAddress: position?.collateralTokenAddress,
        initialCollateralAmount: collateralDeltaAmount,
        acceptablePrice,
        orderType: OrderType.MarketIncrease,
        sizeDeltaUsd: BigNumber.from(0),
        isLong: position?.isLong,
        executionFee: executionFee.feeTokenAmount,
        tokensData,
        setPendingTxns: p.setPendingTxns,
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
      if (!collateralDeltaAmount) return;

      createDecreaseOrderTxn(chainId, library, {
        account,
        marketAddress: position?.marketAddress,
        indexTokenAddress: position?.indexToken.address,
        swapPath: [],
        initialCollateralDeltaAmount: collateralDeltaAmount,
        initialCollateralAddress: position?.collateralTokenAddress,
        receiveTokenAddress: position?.collateralTokenAddress,
        acceptablePrice,
        sizeDeltaUsd: BigNumber.from(0),
        orderType: OrderType.MarketDecrease,
        isLong: position?.isLong,
        executionFee: executionFee.feeTokenAmount,
        decreasePositionSwapType: shouldSwapPnlToCollateralToken
          ? DecreasePositionSwapType.SwapPnlTokenToCollateralToken
          : DecreasePositionSwapType.NoSwap,
        tokensData,
        setPendingTxns: p.setPendingTxns,
      }).then(() => {
        if (p.position) {
          setPendingPositionUpdate({
            isIncrease: false,
            positionKey: p.position.key,
            collateralDeltaAmount: collateralDeltaAmount,
          });
        }

        p.onClose();
      });
    }
  }

  const submitButtonState = getSubmitButtonState();

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

          <ExchangeInfoRow isTop label={t`Entry Price`} value={formatUsd(position?.markPrice)} />
          <ExchangeInfoRow label={t`Mark Price`} value={formatUsd(position?.markPrice)} />
          <ExchangeInfoRow
            label={t`Liq Price`}
            value={<ValueTransition from={formatUsd(position?.liquidationPrice)} to={formatUsd(nextLiqPrice)} />}
          />

          <ExchangeInfoRow isTop label={t`Size`} value={formatUsd(position?.sizeInUsd)} />

          <ExchangeInfoRow
            label={t`Collateral (${position?.collateralToken?.symbol})`}
            value={
              <ValueTransition
                from={formatUsd(position?.remainingCollateralUsd) || "..."}
                to={formatUsd(nextCollateralUsd)}
              />
            }
          />

          <ExchangeInfoRow
            label={t`Borrow Fee`}
            value={
              <Tooltip
                handle={
                  <ValueTransition
                    from={formatUsd(position?.pendingBorrowingFeesUsd, { fallbackToZero: true })}
                    to={collateralDeltaUsd?.gt(0) ? formatUsd(BigNumber.from(0)) : undefined}
                  />
                }
                position="right-top"
                renderContent={() => <Trans>The pending borrow fee will be charged on this transaction.</Trans>}
              />
            }
          />

          <ExchangeInfoRow
            label={t`Funding Fee`}
            value={
              <Tooltip
                handle={
                  <ValueTransition
                    from={formatDeltaUsd(position?.pendingFundingFeesUsd, undefined, { fallbackToZero: true })}
                    to={collateralDeltaUsd?.gt(0) ? formatUsd(BigNumber.from(0)) : undefined}
                  />
                }
                position="right-top"
                renderContent={() => <Trans>The pending funding fee will be charged on this transaction.</Trans>}
              />
            }
          />

          <TradeFeesRow executionFee={executionFee} feesType={"edit"} />
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
          <SubmitButton onClick={submitButtonState.onClick} disabled={submitButtonState.disabled} authRequired>
            {submitButtonState.text}
          </SubmitButton>
        </div>
      </Modal>
    </div>
  );
}

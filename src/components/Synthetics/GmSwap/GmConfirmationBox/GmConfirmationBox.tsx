import { Trans, msg, plural, t } from "@lingui/macro";
import { useLingui } from "@lingui/react";
import { uniq } from "lodash";
import { useMemo, useState } from "react";
import { FaArrowRight } from "react-icons/fa";
import { useKey } from "react-use";

import { getContract } from "config/contracts";
import { DEFAULT_SLIPPAGE_AMOUNT } from "config/factors";
import { useSyntheticsEvents } from "context/SyntheticsEvents";
import { useMarketsInfoData } from "context/SyntheticsStateContext/hooks/globalsHooks";
import { ExecutionFee } from "domain/synthetics/fees";
import { createDepositTxn } from "domain/synthetics/markets/createDepositTxn";
import { createShiftTxn } from "domain/synthetics/markets/createShiftTxn";
import { createWithdrawalTxn } from "domain/synthetics/markets/createWithdrawalTxn";
import { useMarketTokensData } from "domain/synthetics/markets/useMarketTokensData";
import { getNeedTokenApprove, getTokenData, useTokensDataRequest } from "domain/synthetics/tokens";
import { TokenData } from "domain/synthetics/tokens/types";
import { useTokensAllowanceData } from "domain/synthetics/tokens/useTokenAllowanceData";
import { GmSwapFees } from "domain/synthetics/trade";
import { useHighExecutionFeeConsent } from "domain/synthetics/trade/useHighExecutionFeeConsent";
import { useChainId } from "lib/chains";
import { formatTokenAmount, formatUsd } from "lib/numbers";
import { getByKey } from "lib/objects";
import { usePendingTxns } from "lib/usePendingTxns";
import useWallet from "lib/wallets/useWallet";
import { Operation } from "../GmSwapBox/types";

import { ApproveTokenButton } from "components/ApproveTokenButton/ApproveTokenButton";
import Button from "components/Button/Button";
import Modal from "components/Modal/Modal";
import { NetworkFeeRow } from "components/Synthetics/NetworkFeeRow/NetworkFeeRow";
import { GmFees } from "../GmFees/GmFees";

import "./GmConfirmationBox.scss";

type Props = {
  isVisible: boolean;
  marketToken?: TokenData;
  fromMarketToken?: TokenData;
  fromMarketTokenAmount?: bigint;
  fromMarketTokenUsd?: bigint;
  longToken?: TokenData;
  shortToken?: TokenData;
  marketTokenAmount: bigint;
  marketTokenUsd: bigint;
  longTokenAmount?: bigint;
  longTokenUsd?: bigint;
  shortTokenAmount?: bigint;
  shortTokenUsd?: bigint;
  fees?: GmSwapFees;
  error?: string;
  operation: Operation;
  executionFee?: ExecutionFee;
  onSubmitted: () => void;
  onClose: () => void;
  shouldDisableValidation?: boolean;
};

const operationTextMap = {
  [Operation.Deposit]: msg`Buy`,
  [Operation.Withdrawal]: msg`Sell`,
  [Operation.Shift]: msg`Shift`,
};

const processingTextMap = {
  [Operation.Deposit]: msg`Buying GM...`,
  [Operation.Withdrawal]: msg`Selling GM...`,
  [Operation.Shift]: msg`Shifting GM...`,
};

export function GmConfirmationBox({
  isVisible,
  marketToken,
  longToken,
  shortToken,
  marketTokenAmount,
  marketTokenUsd,
  longTokenAmount,
  longTokenUsd,
  shortTokenAmount,
  shortTokenUsd,
  fees,
  error,
  operation,
  executionFee,
  onSubmitted,
  onClose,
  shouldDisableValidation,
  fromMarketToken,
  fromMarketTokenAmount,
  fromMarketTokenUsd,
}: Props) {
  const { signer, account } = useWallet();
  const { chainId } = useChainId();
  const { _ } = useLingui();
  const marketsInfoData = useMarketsInfoData();
  const { tokensData } = useTokensDataRequest(chainId);
  const { marketTokensData } = useMarketTokensData(chainId, { isDeposit: true });
  const { setPendingDeposit, setPendingWithdrawal, setPendingShift } = useSyntheticsEvents();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [, setPendingTxns] = usePendingTxns();

  const market = getByKey(marketsInfoData, marketToken?.address);

  const routerAddress = getContract(chainId, "SyntheticsRouter");
  const { element: highExecutionFeeAcknowledgement, isHighFeeConsentError } = useHighExecutionFeeConsent(
    executionFee?.feeUsd
  );

  const payTokenAddresses = (function getPayTokenAddresses() {
    if (!marketToken) {
      return [];
    }

    const addresses: string[] = [];

    if (operation === Operation.Deposit) {
      if (longTokenAmount !== undefined && longTokenAmount > 0 && longToken) {
        addresses.push(longToken.address);
      }
      if (shortTokenAmount !== undefined && shortTokenAmount > 0 && shortToken) {
        addresses.push(shortToken.address);
      }
    } else if (operation === Operation.Withdrawal) {
      addresses.push(marketToken.address);
    } else if (operation === Operation.Shift) {
      addresses.push(fromMarketToken!.address);
    }

    return uniq(addresses);
  })();

  const { tokensAllowanceData } = useTokensAllowanceData(chainId, {
    spenderAddress: routerAddress,
    tokenAddresses: payTokenAddresses,
    skip: !isVisible,
  });

  const tokensToApprove = useMemo(
    function getTokensToApprove() {
      const addresses: string[] = [];

      if (!tokensAllowanceData) {
        return addresses;
      }

      if (operation === Operation.Deposit) {
        if (
          longTokenAmount !== undefined &&
          longTokenAmount > 0 &&
          longToken &&
          getNeedTokenApprove(tokensAllowanceData, longToken.address, longTokenAmount)
        ) {
          addresses.push(longToken.address);
        }

        if (
          shortTokenAmount !== undefined &&
          shortTokenAmount > 0 &&
          shortToken &&
          getNeedTokenApprove(tokensAllowanceData, shortToken.address, shortTokenAmount)
        ) {
          addresses.push(shortToken.address);
        }
      } else if (operation === Operation.Withdrawal) {
        if (
          marketTokenAmount > 0 &&
          marketToken &&
          getNeedTokenApprove(tokensAllowanceData, marketToken.address, marketTokenAmount)
        ) {
          addresses.push(marketToken.address);
        }
      } else if (operation === Operation.Shift) {
        if (
          fromMarketTokenAmount !== undefined &&
          fromMarketTokenAmount > 0 &&
          fromMarketToken &&
          getNeedTokenApprove(tokensAllowanceData, fromMarketToken.address, fromMarketTokenAmount)
        ) {
          addresses.push(fromMarketToken.address);
        }
      }

      return uniq(addresses);
    },
    [
      fromMarketToken,
      fromMarketTokenAmount,
      longToken,
      longTokenAmount,
      marketToken,
      marketTokenAmount,
      operation,
      shortToken,
      shortTokenAmount,
      tokensAllowanceData,
    ]
  );

  const longSymbol = market?.isSameCollaterals ? `${longToken?.symbol} Long` : longToken?.symbol;
  const shortSymbol = market?.isSameCollaterals ? `${shortToken?.symbol} Short` : shortToken?.symbol;

  const operationText = _(operationTextMap[operation]);

  const isAllowanceLoaded = Boolean(tokensAllowanceData);

  const submitButtonState = (function getSubmitButtonState() {
    if (payTokenAddresses.length > 0 && !isAllowanceLoaded) {
      return {
        text: t`Loading...`,
        disabled: true,
      };
    }

    const onSubmit = () => {
      setIsSubmitting(true);

      let txnPromise: Promise<any>;

      if (operation === Operation.Deposit) {
        txnPromise = onCreateDeposit();
      } else if (operation === Operation.Withdrawal) {
        txnPromise = onCreateWithdrawal();
      } else {
        txnPromise = onCreateShift();
      }

      txnPromise
        .then(() => {
          onSubmitted();
        })
        .catch((error) => {
          throw error;
        })
        .finally(() => {
          setIsSubmitting(false);
        });
    };

    if (error) {
      return {
        text: error,
        disabled: !shouldDisableValidation,
        onClick: onSubmit,
      };
    }

    if (isHighFeeConsentError) {
      return {
        text: t`High Network Fee not yet acknowledged`,
        disabled: true,
      };
    }

    if (isSubmitting) {
      return {
        text: _(processingTextMap[operation]),
        disabled: true,
      };
    }

    if (tokensToApprove.length > 0 && marketToken) {
      const symbols = tokensToApprove.map((address) => {
        const token = getTokenData(tokensData, address) || getTokenData(marketTokensData, address);
        return address === marketToken.address ? "GM" : token?.assetSymbol ?? token?.symbol;
      });

      const symbolsText = symbols.join(", ");

      return {
        text: plural(symbols.length, {
          one: `Pending ${symbolsText} approval`,
          other: `Pending ${symbolsText} approvals`,
        }),
        disabled: true,
      };
    }

    const operationText = _(operationTextMap[operation]);
    const text = t`Confirm ${operationText}`;

    return {
      text,
      onClick: onSubmit,
    };
  })();

  useKey(
    "Enter",
    () => {
      if (isVisible && submitButtonState.onClick && !submitButtonState.disabled) {
        submitButtonState.onClick();
      }
    },
    {},
    [isVisible, submitButtonState]
  );

  function onCreateDeposit() {
    if (
      !account ||
      !executionFee ||
      !marketToken ||
      !market ||
      marketTokenAmount === undefined ||
      !tokensData ||
      !signer
    ) {
      return Promise.resolve();
    }

    const initialLongTokenAddress = longToken?.address || market.longTokenAddress;
    const initialShortTokenAddress = market.isSameCollaterals
      ? initialLongTokenAddress
      : shortToken?.address || market.shortTokenAddress;

    return createDepositTxn(chainId, signer, {
      account,
      initialLongTokenAddress,
      initialShortTokenAddress,
      longTokenSwapPath: [],
      shortTokenSwapPath: [],
      longTokenAmount: longTokenAmount ?? 0n,
      shortTokenAmount: shortTokenAmount ?? 0n,
      marketTokenAddress: marketToken.address,
      minMarketTokens: marketTokenAmount,
      executionFee: executionFee.feeTokenAmount,
      allowedSlippage: DEFAULT_SLIPPAGE_AMOUNT,
      skipSimulation: shouldDisableValidation,
      tokensData,
      setPendingTxns,
      setPendingDeposit,
    });
  }

  function onCreateWithdrawal() {
    if (
      !account ||
      !market ||
      !marketToken ||
      !executionFee ||
      longTokenAmount === undefined ||
      shortTokenAmount === undefined ||
      !tokensData ||
      !signer
    ) {
      return Promise.resolve();
    }

    return createWithdrawalTxn(chainId, signer, {
      account,
      initialLongTokenAddress: longToken?.address || market.longTokenAddress,
      initialShortTokenAddress: shortToken?.address || market.shortTokenAddress,
      longTokenSwapPath: [],
      shortTokenSwapPath: [],
      marketTokenAmount: marketTokenAmount,
      minLongTokenAmount: longTokenAmount,
      minShortTokenAmount: shortTokenAmount,
      marketTokenAddress: marketToken.address,
      executionFee: executionFee.feeTokenAmount,
      allowedSlippage: DEFAULT_SLIPPAGE_AMOUNT,
      tokensData,
      skipSimulation: shouldDisableValidation,
      setPendingTxns,
      setPendingWithdrawal,
    });
  }

  function onCreateShift() {
    if (
      !signer ||
      !account ||
      !fromMarketToken ||
      !executionFee ||
      !marketToken ||
      fromMarketTokenAmount === undefined ||
      marketTokenAmount === undefined ||
      !tokensData
    ) {
      return Promise.resolve();
    }

    return createShiftTxn(chainId, signer, {
      account,
      fromMarketTokenAddress: fromMarketToken.address,
      fromMarketTokenAmount: fromMarketTokenAmount,
      toMarketTokenAddress: marketToken.address,
      minToMarketTokenAmount: marketTokenAmount,
      executionFee: executionFee.feeTokenAmount,
      allowedSlippage: DEFAULT_SLIPPAGE_AMOUNT,
      skipSimulation: shouldDisableValidation,
      tokensData,
      setPendingTxns,
      setPendingShift,
    });
  }

  const renderTokenInfo = ({
    amount,
    className,
    overrideSymbol,
    token,
    usd,
  }: {
    amount?: bigint;
    usd?: bigint;
    token?: TokenData;
    className?: string;
    overrideSymbol?: string;
  }) => {
    if (amount === undefined || usd === undefined || !token) return;
    return (
      <div className={className ?? ""}>
        <div className="trade-token-amount">
          <span>
            {formatTokenAmount(amount, token?.decimals, overrideSymbol ?? token?.symbol, {
              useCommas: true,
            })}
          </span>
        </div>
        <div className="trade-amount-usd">{formatUsd(usd)}</div>
      </div>
    );
  };

  const shouldRenderDivider = Boolean(tokensToApprove?.length > 0) || Boolean(highExecutionFeeAcknowledgement);

  return (
    <div className="Confirmation-box GmConfirmationBox">
      <Modal isVisible={isVisible} setIsVisible={onClose} label={t`Confirm ${operationText}`}>
        {isVisible && (
          <>
            {operation === Operation.Deposit && (
              <div className="Confirmation-box-main trade-info-wrapper">
                <div className="trade-info">
                  <Trans>Pay</Trans>{" "}
                  {market?.isSameCollaterals ? (
                    renderTokenInfo({
                      amount: longTokenAmount !== undefined ? longTokenAmount + shortTokenAmount! : undefined,
                      usd: longTokenUsd !== undefined ? longTokenUsd + shortTokenUsd! : undefined,
                      token: longToken,
                    })
                  ) : (
                    <>
                      {renderTokenInfo({
                        amount: longTokenAmount,
                        usd: longTokenUsd,
                        token: longToken,
                        overrideSymbol: longSymbol,
                      })}
                      {renderTokenInfo({
                        amount: shortTokenAmount,
                        usd: shortTokenUsd,
                        token: shortToken,
                        overrideSymbol: shortSymbol,
                        className: "mt-5",
                      })}
                    </>
                  )}
                </div>
                <FaArrowRight className="arrow-icon" fontSize={12} color="#ffffffb3" />
                <div className="trade-info">
                  <Trans>Receive</Trans>{" "}
                  {renderTokenInfo({
                    amount: marketTokenAmount,
                    usd: marketTokenUsd,
                    token: marketToken,
                  })}
                </div>
              </div>
            )}
            {operation === Operation.Withdrawal && (
              <div className="Confirmation-box-main trade-info-wrapper">
                <div className="trade-info">
                  <Trans>Pay</Trans>{" "}
                  {renderTokenInfo({
                    amount: marketTokenAmount,
                    usd: marketTokenUsd,
                    token: marketToken,
                  })}
                </div>
                <FaArrowRight className="arrow-icon" fontSize={12} color="#ffffffb3" />
                <div className="trade-info">
                  <Trans>Receive</Trans>{" "}
                  {market?.isSameCollaterals ? (
                    renderTokenInfo({
                      amount: longTokenAmount ? longTokenAmount + shortTokenAmount! : undefined,
                      usd: longTokenUsd ? longTokenUsd + shortTokenUsd! : undefined,
                      token: longToken,
                    })
                  ) : (
                    <>
                      {renderTokenInfo({
                        amount: longTokenAmount,
                        usd: longTokenUsd,
                        token: longToken,
                        overrideSymbol: longSymbol,
                      })}
                      {renderTokenInfo({
                        amount: shortTokenAmount,
                        usd: shortTokenUsd,
                        token: shortToken,
                        overrideSymbol: shortSymbol,
                        className: "mt-5",
                      })}
                    </>
                  )}
                </div>
              </div>
            )}
            {operation === Operation.Shift && (
              <div className="Confirmation-box-main trade-info-wrapper">
                <div className="trade-info">
                  <Trans>Pay</Trans>{" "}
                  {renderTokenInfo({
                    amount: fromMarketTokenAmount,
                    usd: fromMarketTokenUsd,
                    token: fromMarketToken,
                  })}
                </div>
                <FaArrowRight className="arrow-icon" fontSize={12} color="#ffffffb3" />
                <div className="trade-info">
                  <Trans>Receive</Trans>{" "}
                  {renderTokenInfo({
                    amount: marketTokenAmount,
                    usd: marketTokenUsd,
                    token: marketToken,
                  })}
                </div>
              </div>
            )}

            <div className="line-divider" />

            <GmFees
              isDeposit={operation === Operation.Deposit || operation === Operation.Shift}
              totalFees={fees?.totalFees}
              uiFee={fees?.uiFee}
              swapFee={fees?.swapFee}
              swapPriceImpact={fees?.swapPriceImpact}
            />
            <NetworkFeeRow executionFee={executionFee} />

            {shouldRenderDivider && <div className="line-divider" />}

            {tokensToApprove && tokensToApprove.length > 0 && (
              <div>
                {tokensToApprove.map((address) => {
                  const token = getTokenData(tokensData, address)!;
                  let marketTokenData =
                    address === marketToken?.address && getByKey(marketsInfoData, marketToken?.address);
                  if (operation === Operation.Shift) {
                    marketTokenData = getByKey(marketsInfoData, fromMarketToken?.address);
                  }

                  return (
                    <div key={address}>
                      <ApproveTokenButton
                        key={address}
                        tokenAddress={address}
                        tokenSymbol={
                          marketTokenData ? `GM: ${marketTokenData.name}` : token.assetSymbol ?? token.symbol
                        }
                        spenderAddress={routerAddress}
                      />
                    </div>
                  );
                })}
              </div>
            )}

            {highExecutionFeeAcknowledgement ? (
              <div className="GmConfirmationBox-high-fee">{highExecutionFeeAcknowledgement}</div>
            ) : null}

            <div className="Confirmation-box-row">
              <Button
                className="w-full"
                variant="primary-action"
                type="submit"
                onClick={submitButtonState.onClick}
                disabled={submitButtonState.disabled}
              >
                {submitButtonState.text}
              </Button>
            </div>
          </>
        )}
      </Modal>
    </div>
  );
}

import { Trans, plural, t } from "@lingui/macro";
import cx from "classnames";
import { ApproveTokenButton } from "components/ApproveTokenButton/ApproveTokenButton";
import Modal from "components/Modal/Modal";
import { getContract } from "config/contracts";
import { getToken } from "config/tokens";
import { ExecutionFee } from "domain/synthetics/fees";
import { useMarkets } from "domain/synthetics/markets";
import { createDepositTxn } from "domain/synthetics/markets/createDepositTxn";
import { createWithdrawalTxn } from "domain/synthetics/markets/createWithdrawalTxn";
import { getNeedTokenApprove, getTokenData, useTokensData } from "domain/synthetics/tokens";
import { TokenData } from "domain/synthetics/tokens/types";
import { useTokensAllowanceData } from "domain/synthetics/tokens/useTokenAllowanceData";
import { GmSwapFees } from "domain/synthetics/trade";
import { BigNumber } from "ethers";
import { useChainId } from "lib/chains";
import { formatTokenAmountWithUsd } from "lib/numbers";
import { getByKey } from "lib/objects";
import { uniq } from "lodash";
import { GmFees } from "../GmFees/GmFees";

import Button from "components/Button/Button";
import { DEFAULT_SLIPPAGE_AMOUNT } from "config/factors";
import { useSyntheticsEvents } from "context/SyntheticsEvents";
import { useState } from "react";
import "./GmConfirmationBox.scss";
import { useKey } from "react-use";
import useWallet from "lib/wallets/useWallet";

type Props = {
  isVisible: boolean;
  marketToken?: TokenData;
  longToken?: TokenData;
  shortToken?: TokenData;
  marketTokenAmount: BigNumber;
  marketTokenUsd: BigNumber;
  longTokenAmount?: BigNumber;
  longTokenUsd?: BigNumber;
  shortTokenAmount?: BigNumber;
  shortTokenUsd?: BigNumber;
  fees?: GmSwapFees;
  error?: string;
  isDeposit: boolean;
  executionFee?: ExecutionFee;
  isHighPriceImpact: boolean;
  isHighPriceImpactAccepted: boolean;
  setIsHighPriceImpactAccepted: (value: boolean) => void;
  onSubmitted: () => void;
  onClose: () => void;
  setPendingTxns: (txns: any) => void;
  shouldDisableValidation?: boolean;
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
  isDeposit,
  executionFee,
  onSubmitted,
  onClose,
  setPendingTxns,
  shouldDisableValidation,
}: Props) {
  const { signer, account } = useWallet();
  const { chainId } = useChainId();
  const { marketsData } = useMarkets(chainId);
  const { tokensData } = useTokensData(chainId);
  const { setPendingDeposit, setPendingWithdrawal } = useSyntheticsEvents();

  const [isSubmitting, setIsSubmitting] = useState(false);

  const market = getByKey(marketsData, marketToken?.address);

  const routerAddress = getContract(chainId, "SyntheticsRouter");

  const payTokenAddresses = (function getPayTokenAddresses() {
    if (!marketToken) {
      return [];
    }

    const addresses: string[] = [];

    if (isDeposit) {
      if (longTokenAmount?.gt(0) && longToken) {
        addresses.push(longToken.address);
      }
      if (shortTokenAmount?.gt(0) && shortToken) {
        addresses.push(shortToken.address);
      }
    } else {
      addresses.push(marketToken.address);
    }

    return uniq(addresses);
  })();

  const { tokensAllowanceData } = useTokensAllowanceData(chainId, {
    spenderAddress: routerAddress,
    tokenAddresses: payTokenAddresses,
    skip: !isVisible,
  });

  const tokensToApprove = (function getTokensToApprove() {
    const addresses: string[] = [];

    if (!tokensAllowanceData) {
      return addresses;
    }

    if (isDeposit) {
      if (
        longTokenAmount?.gt(0) &&
        longToken &&
        getNeedTokenApprove(tokensAllowanceData, longToken?.address, longTokenAmount)
      ) {
        addresses.push(longToken.address);
      }

      if (
        shortTokenAmount?.gt(0) &&
        shortToken &&
        getNeedTokenApprove(tokensAllowanceData, shortToken?.address, shortTokenAmount)
      ) {
        addresses.push(shortToken.address);
      }
    } else {
      if (
        marketTokenAmount.gt(0) &&
        marketToken &&
        getNeedTokenApprove(tokensAllowanceData, marketToken.address, marketTokenAmount)
      ) {
        addresses.push(marketToken.address);
      }
    }

    return uniq(addresses);
  })();

  const longSymbol = market?.isSameCollaterals ? `${longToken?.symbol} Long` : longToken?.symbol;
  const shortSymbol = market?.isSameCollaterals ? `${shortToken?.symbol} Short` : shortToken?.symbol;

  const longTokenText = longTokenAmount?.gt(0)
    ? formatTokenAmountWithUsd(longTokenAmount, longTokenUsd, longSymbol, longToken?.decimals)
    : undefined;

  const shortTokenText = shortTokenAmount?.gt(0)
    ? formatTokenAmountWithUsd(shortTokenAmount, shortTokenUsd, shortSymbol, shortToken?.decimals)
    : undefined;

  const marketTokenText = formatTokenAmountWithUsd(
    marketTokenAmount,
    marketTokenUsd,
    marketToken?.symbol,
    marketToken?.decimals
  );

  const operationText = isDeposit ? t`Buy` : t`Sell`;

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

      if (isDeposit) {
        txnPromise = onCreateDeposit();
      } else {
        txnPromise = onCreateWithdrawal();
      }

      txnPromise
        .then(() => {
          onSubmitted();
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

    if (isSubmitting) {
      return {
        text: isDeposit ? t`Buying GM...` : t`Selling GM...`,
        disabled: true,
      };
    }

    if (tokensToApprove.length > 0 && marketToken) {
      const symbols = tokensToApprove.map((address) => {
        return address === marketToken.address ? "GM" : getTokenData(tokensData, address)!.symbol;
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

    const operationText = isDeposit ? t`Buy` : `Sell`;
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
    if (!account || !executionFee || !marketToken || !market || !marketTokenAmount || !tokensData || !signer) {
      return Promise.resolve();
    }

    return createDepositTxn(chainId, signer, {
      account,
      initialLongTokenAddress: longToken?.address || market.longTokenAddress,
      initialShortTokenAddress: shortToken?.address || market.shortTokenAddress,
      longTokenSwapPath: [],
      shortTokenSwapPath: [],
      longTokenAmount: longTokenAmount || BigNumber.from(0),
      shortTokenAmount: shortTokenAmount || BigNumber.from(0),
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
      !longTokenAmount ||
      !shortTokenAmount ||
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

  return (
    <div className="Confirmation-box GmConfirmationBox">
      <Modal isVisible={isVisible} setIsVisible={onClose} label={t`Confirm ${operationText}`} allowContentTouchMove>
        {isVisible && (
          <>
            <div className={cx("Confirmation-box-main GmConfirmationBox-main")}>
              {isDeposit && (
                <>
                  {[longTokenText, shortTokenText].filter(Boolean).map((text) => (
                    <div key={text}>
                      <Trans>Pay</Trans> {text}
                    </div>
                  ))}
                  <div className="Confirmation-box-main-icon"></div>
                  <div>
                    <Trans>Receive</Trans> {marketTokenText}
                  </div>
                </>
              )}
              {!isDeposit && (
                <>
                  <div>
                    <Trans>Pay</Trans>&nbsp;{marketTokenText}
                  </div>
                  <div className="Confirmation-box-main-icon"></div>
                  {[longTokenText, shortTokenText].filter(Boolean).map((text) => (
                    <div key={text}>
                      <Trans>Receive</Trans>&nbsp;{text}
                    </div>
                  ))}
                </>
              )}
            </div>

            <GmFees
              isDeposit={isDeposit}
              totalFees={fees?.totalFees}
              swapFee={fees?.swapFee}
              swapPriceImpact={fees?.swapPriceImpact}
              executionFee={executionFee}
            />
            {tokensToApprove?.length > 0 && <div className="line-divider" />}

            {tokensToApprove && tokensToApprove.length > 0 && (
              <div>
                {tokensToApprove.map((address) => (
                  <div key={address}>
                    <ApproveTokenButton
                      key={address}
                      tokenAddress={address}
                      tokenSymbol={address === marketToken?.address ? "GM" : getToken(chainId, address).symbol}
                      spenderAddress={routerAddress}
                    />
                  </div>
                ))}
              </div>
            )}

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

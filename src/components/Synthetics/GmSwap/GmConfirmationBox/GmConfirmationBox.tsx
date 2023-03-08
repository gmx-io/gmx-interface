import { Trans, plural, t } from "@lingui/macro";
import { useWeb3React } from "@web3-react/core";
import cx from "classnames";
import { ApproveTokenButton } from "components/ApproveTokenButton/ApproveTokenButton";
import ExchangeInfoRow from "components/Exchange/ExchangeInfoRow";
import Modal from "components/Modal/Modal";
import { SubmitButton } from "components/SubmitButton/SubmitButton";
import { getContract } from "config/contracts";
import { getToken } from "config/tokens";
import { ExecutionFee } from "domain/synthetics/fees";
import { getMarket, useMarketsData } from "domain/synthetics/markets";
import { createDepositTxn } from "domain/synthetics/markets/createDepositTxn";
import { createWithdrawalTxn } from "domain/synthetics/markets/createWithdrawalTxn";
import { getTokenData, needTokenApprove, useAvailableTokensData } from "domain/synthetics/tokens";
import { TokenData } from "domain/synthetics/tokens/types";
import { useTokenAllowanceData } from "domain/synthetics/tokens/useTokenAllowanceData";
import { BigNumber } from "ethers";
import { useChainId } from "lib/chains";
import { formatTokenAmount, formatTokenAmountWithUsd } from "lib/numbers";
import { GmFees } from "../GmFees/GmFees";
import { GmSwapFees } from "domain/synthetics/trade";

import "./GmConfirmationBox.scss";

type Props = {
  marketToken: TokenData;
  longToken?: TokenData;
  shortToken?: TokenData;
  marketTokenAmount: BigNumber;
  marketTokenUsd: BigNumber;
  longTokenAmount?: BigNumber;
  longTokenUsd?: BigNumber;
  shortTokenAmount?: BigNumber;
  shortTokenUsd?: BigNumber;
  fees: GmSwapFees;
  error?: string;
  isDeposit: boolean;
  executionFee?: ExecutionFee;
  onSubmitted: () => void;
  onClose: () => void;
  setPendingTxns: (txns: any) => void;
};

export function GmConfirmationBox({
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
}: Props) {
  const { library, account } = useWeb3React();
  const { chainId } = useChainId();
  const { marketsData } = useMarketsData(chainId);
  const { tokensData } = useAvailableTokensData(chainId);

  const market = getMarket(marketsData, marketToken?.address);

  const routerAddress = getContract(chainId, "SyntheticsRouter");

  const payTokenAddresses = (function getPayTokenAddresses() {
    const addresses: string[] = [];

    if (isDeposit) {
      if (longTokenAmount?.gt(0) && longToken) {
        addresses.push(longToken.address);
      }
      if (shortTokenAmount?.gt(0) && shortToken) {
        addresses.push(shortToken.address);
      }
    }

    return addresses;
  })();

  const { tokenAllowanceData } = useTokenAllowanceData(chainId, {
    spenderAddress: routerAddress,
    tokenAddresses: payTokenAddresses,
  });

  const tokensToApprove = (function getTokensToApprove() {
    const addresses: string[] = [];

    if (isDeposit) {
      if (
        longTokenAmount?.gt(0) &&
        longToken &&
        needTokenApprove(tokenAllowanceData, longToken?.address, longTokenAmount)
      ) {
        addresses.push(longToken.address);
      }

      if (
        shortTokenAmount?.gt(0) &&
        shortToken &&
        needTokenApprove(tokenAllowanceData, shortToken?.address, shortTokenAmount)
      ) {
        addresses.push(shortToken.address);
      }
    }

    return addresses;
  })();

  const longTokenText = longTokenAmount?.gt(0)
    ? formatTokenAmountWithUsd(longTokenAmount, longTokenUsd, longToken?.symbol, longToken?.decimals)
    : undefined;

  const shortTokenText = shortTokenAmount?.gt(0)
    ? formatTokenAmountWithUsd(shortTokenAmount, shortTokenUsd, shortToken?.symbol, shortToken?.decimals)
    : undefined;

  const marketTokenText = formatTokenAmountWithUsd(
    marketTokenAmount,
    marketTokenUsd,
    marketToken.symbol,
    marketToken.decimals
  );

  const operationText = isDeposit ? t`Deposit` : t`Withdrawal`;

  const isAllowanceLoaded = Object.keys(tokenAllowanceData).length > 0;

  const submitButtonState = (function getSubmitButtonState() {
    if (error) {
      return {
        text: error,
        disabled: true,
      };
    }

    if (payTokenAddresses.length > 0 && !isAllowanceLoaded) {
      return {
        text: t`Loading...`,
        disabled: true,
      };
    }

    if (tokensToApprove.length > 0) {
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
    const text = t`Confirm ${operationText} ${formatTokenAmount(marketTokenAmount, marketToken.decimals)} GM`;

    return {
      text,
      onClick: () => {
        if (isDeposit) {
          onCreateDeposit();
        } else {
          onCreateWithdrawal();
        }
      },
    };
  })();

  function onCreateDeposit() {
    if (!account || !executionFee || !marketToken || !market || !marketTokenAmount) return;

    createDepositTxn(chainId, library, {
      account,
      initialLongTokenAddress: longToken?.address || market.longTokenAddress,
      initialShortTokenAddress: shortToken?.address || market.shortTokenAddress,
      longTokenAmount: longTokenAmount || BigNumber.from(0),
      shortTokenAmount: shortTokenAmount || BigNumber.from(0),
      marketTokenAddress: marketToken.address,
      minMarketTokens: marketTokenAmount,
      executionFee: executionFee.feeTokenAmount,
      setPendingTxns,
    }).then(onSubmitted);
  }

  function onCreateWithdrawal() {
    if (!account || !market || !executionFee || !longTokenAmount || !shortTokenAmount) return;

    createWithdrawalTxn(chainId, library, {
      account,
      longTokenAddress: market.longTokenAddress,
      shortTokenAddress: market.shortTokenAddress,
      marketTokenAmount: marketTokenAmount,
      minLongTokenAmount: longTokenAmount,
      minShortTokenAmount: shortTokenAmount,
      marketTokenAddress: marketToken.address,
      executionFee: executionFee.feeTokenAmount,
      setPendingTxns,
    }).then(onSubmitted);
  }

  return (
    <div className="Confirmation-box">
      <Modal isVisible={true} setIsVisible={onClose} label={t`Confirm ${operationText}`} allowContentTouchMove>
        <div className={cx("Confirmation-box-main GmConfirmationBox-main")}>
          {isDeposit && (
            <>
              {[longTokenText, shortTokenText].filter(Boolean).map((text) => (
                <div key={text}>
                  <Trans>Pay</Trans>&nbsp;{text}
                </div>
              ))}
              <div className="Confirmation-box-main-icon"></div>
              <div>
                <Trans>Receive</Trans>&nbsp;{marketTokenText}
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

        <GmFees totalFees={fees?.totalFees} swapFee={fees?.swapFee} swapPriceImpact={fees?.swapPriceImpact} />

        <ExchangeInfoRow
          label={t`Execution Fee`}
          value={formatTokenAmountWithUsd(
            executionFee?.feeTokenAmount,
            executionFee?.feeUsd,
            executionFee?.feeToken.symbol,
            executionFee?.feeToken.decimals
          )}
        />

        {tokensToApprove && tokensToApprove.length > 0 && (
          <>
            <div className="App-card-divider" />

            <div className="GmConfirmationBox-approve-tokens">
              {tokensToApprove.map((address) => (
                <div className="GmConfirmationBox-approve-token">
                  <ApproveTokenButton
                    key={address}
                    tokenAddress={address}
                    tokenSymbol={address === marketToken.address ? "GM" : getToken(chainId, address).symbol}
                    spenderAddress={routerAddress}
                  />
                </div>
              ))}
            </div>

            <div className="App-card-divider" />
          </>
        )}
        <div className="Confirmation-box-row">
          <SubmitButton onClick={submitButtonState.onClick} disabled={submitButtonState.disabled}>
            {submitButtonState.text}
          </SubmitButton>
        </div>
      </Modal>
    </div>
  );
}

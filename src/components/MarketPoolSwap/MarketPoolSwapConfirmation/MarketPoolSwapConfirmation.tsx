import { plural, t, Trans } from "@lingui/macro";
import { useWeb3React } from "@web3-react/core";
import cx from "classnames";
import { ApproveTokenButton } from "components/ApproveTokenButton/ApproveTokenButton";
import Modal from "components/Modal/Modal";
import { SubmitButton } from "components/SubmitButton/SubmitButton";
import { getContract } from "config/contracts";
import { getToken } from "config/tokens";
import { PriceImpact } from "domain/synthetics/fees/types";
import { createDepositTxn } from "domain/synthetics/markets/createDepositTxn";
import { createWithdrawalTxn } from "domain/synthetics/markets/createWithdrawalTxn";
import { TokensData } from "domain/synthetics/tokens/types";
import { useTokenAllowance } from "domain/synthetics/tokens/useTokenAllowance";
import {
  formatTokenAmount,
  formatTokenAmountWithUsd,
  getTokenAmountFromUsd,
  getTokenData,
  getUsdFromTokenAmount,
  needTokenApprove,
} from "domain/synthetics/tokens/utils";
import { Token } from "domain/tokens";
import { BigNumber } from "ethers";
import { useChainId } from "lib/chains";
import { useMemo } from "react";
import { Operation, operationTexts, PoolDelta } from "../constants";

import { MarketPoolFees } from "components/MarketPoolFees/MarketPoolFees";
import { getMarket, getMarketTokenData, useMarketsData, useMarketTokensData } from "domain/synthetics/markets";
import { useAvailableTradeTokensData } from "domain/synthetics/tokens";

import "./MarketPoolSwapConfirmation.scss";

type Props = {
  onClose: () => void;
  marketTokenAddress: string;
  marketTokenAmount?: BigNumber;
  longDelta?: PoolDelta;
  shortDelta?: PoolDelta;
  priceImpact?: PriceImpact;
  tokensData: TokensData;
  operationType: Operation;
  feesUsd: BigNumber;
  executionFee?: BigNumber;
  executionFeeUsd?: BigNumber;
  executionFeeToken?: Token;
  onSubmitted: () => void;
};

function getTokenText(tokensData: TokensData, tokenAddress?: string, swapAmount?: BigNumber) {
  if (!tokenAddress || !swapAmount) return undefined;

  const usdAmount = getUsdFromTokenAmount(tokensData, tokenAddress, swapAmount);
  const token = getTokenData(tokensData, tokenAddress);

  if (!usdAmount || !token) return undefined;

  return formatTokenAmountWithUsd(swapAmount, usdAmount, token.symbol, token.decimals);
}

export function MarketPoolSwapConfirmation(p: Props) {
  const { library, account } = useWeb3React();
  const { chainId } = useChainId();
  const routerAddress = getContract(chainId, "SyntheticsRouter");

  const tokenAddresses = [p.longDelta?.tokenAddress, p.shortDelta?.tokenAddress, p.marketTokenAddress].filter(
    Boolean
  ) as string[];

  const marketsData = useMarketsData(chainId);
  const marketTokensData = useMarketTokensData(chainId);
  const tokensData = useAvailableTradeTokensData(chainId);

  const tokenAllowanceData = useTokenAllowance(chainId, {
    spenderAddress: routerAddress,
    tokenAddresses,
  });

  const isDeposit = p.operationType === Operation.deposit;

  const firstTokenText = getTokenText(tokensData, p.longDelta?.tokenAddress, p.longDelta?.tokenAmount);
  const secondTokenText = getTokenText(tokensData, p.shortDelta?.tokenAddress, p.shortDelta?.tokenAmount);
  const marketTokenText = getTokenText(marketTokensData, p.marketTokenAddress, p.marketTokenAmount);

  const market = getMarket(marketsData, p.marketTokenAddress);

  const marketToken = getMarketTokenData(marketTokensData, p.marketTokenAddress);

  const isAllowanceLoaded = Object.keys(tokenAllowanceData).length > 0;

  const tokensToApprove = useMemo(() => {
    if (isDeposit) {
      return [p.longDelta, p.shortDelta]
        .filter(
          (delta) => delta?.tokenAddress && needTokenApprove(tokenAllowanceData, delta.tokenAddress, delta.tokenAmount)
        )
        .map((delta) => delta!.tokenAddress);
    } else {
      if (needTokenApprove(tokenAllowanceData, p.marketTokenAddress, p.marketTokenAmount)) {
        return [p.marketTokenAddress];
      }

      return [];
    }
  }, [isDeposit, p.longDelta, p.marketTokenAddress, p.marketTokenAmount, p.shortDelta, tokenAllowanceData]);

  function getSubmitButtonState(): { text: string; disabled?: boolean; onClick?: () => void } {
    if (!isAllowanceLoaded || !marketToken) {
      return {
        text: t`Loading...`,
        disabled: true,
      };
    }

    if (tokensToApprove.length > 0) {
      const symbols = tokensToApprove.map((address) => {
        return address === p.marketTokenAddress ? "GM" : getTokenData(tokensData, address)!.symbol;
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

    const operationText = p.operationType === Operation.deposit ? t`Buy` : `Sell`;
    const text = t`Confirm ${operationText} ${formatTokenAmount(p.marketTokenAmount, marketToken.decimals)} GM`;

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
  }

  function onCreateDeposit() {
    if (!account || !p.executionFee) return;

    createDepositTxn(chainId, library, {
      account,
      longTokenAddress: p.longDelta?.tokenAddress,
      shortTokenAddress: p.shortDelta?.tokenAddress,
      longTokenAmount: p.longDelta?.tokenAmount,
      shortTokenAmount: p.shortDelta?.tokenAmount,
      marketTokenAddress: p.marketTokenAddress,
      minMarketTokens: p.marketTokenAmount!,
      executionFee: p.executionFee,
    }).then(p.onSubmitted);
  }

  function onCreateWithdrawal() {
    if (!account || !market || !p.executionFee) return;

    const marketLongAmount = p.longDelta
      ? getTokenAmountFromUsd(marketTokensData, p.marketTokenAddress, p.longDelta.usdAmount)
      : undefined;

    const marketShortAmount = p.shortDelta
      ? getTokenAmountFromUsd(marketTokensData, p.marketTokenAddress, p.shortDelta.usdAmount)
      : undefined;

    createWithdrawalTxn(chainId, library, {
      account,
      longTokenAddress: market?.longTokenAddress!,
      marketLongAmount,
      marketShortAmount,
      minLongTokenAmount: p.longDelta?.tokenAmount,
      minShortTokenAmount: p.shortDelta?.tokenAmount,
      marketTokenAddress: p.marketTokenAddress,
      executionFee: p.executionFee,
    }).then(p.onSubmitted);
  }

  const submitButtonState = getSubmitButtonState();

  return (
    <div className="Confirmation-box">
      <Modal
        isVisible={true}
        setIsVisible={p.onClose}
        label={t`Confirm ${operationTexts[p.operationType]}`}
        allowContentTouchMove
      >
        <div className={cx("Confirmation-box-main MarketPoolSwapConfirmation-main")}>
          {p.operationType === Operation.deposit && (
            <>
              <div>
                <Trans>Pay</Trans>&nbsp;{firstTokenText}
              </div>
              {secondTokenText && (
                <div>
                  <Trans>Pay</Trans>&nbsp;{secondTokenText}
                </div>
              )}
              <div className="Confirmation-box-main-icon"></div>
              <div>
                <Trans>Receive</Trans>&nbsp;{marketTokenText}
              </div>
            </>
          )}
          {p.operationType === Operation.withdraw && (
            <>
              <div>
                <Trans>Pay</Trans>&nbsp;{marketTokenText}
              </div>
              <div className="Confirmation-box-main-icon"></div>
              <div>
                <Trans>Receive</Trans>&nbsp;{firstTokenText}
              </div>
              {secondTokenText && (
                <div>
                  <Trans>Receive</Trans>&nbsp;{secondTokenText}
                </div>
              )}
            </>
          )}
        </div>

        <MarketPoolFees
          priceImpact={p.priceImpact}
          executionFeeToken={p.executionFeeToken}
          totalFeeUsd={p.feesUsd}
          executionFee={p.executionFee}
          executionFeeUsd={p.executionFeeUsd}
        />

        {tokensToApprove && tokensToApprove.length > 0 && (
          <>
            <div className="App-card-divider" />

            <div className="MarketPoolSwapConfirmation-approve-tokens">
              {tokensToApprove.map((address) => (
                <div className="MarketPoolSwapConfirmation-approve-token">
                  <ApproveTokenButton
                    key={address}
                    tokenAddress={address}
                    tokenSymbol={address === p.marketTokenAddress ? "GM" : getToken(chainId, address).symbol}
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

import { t, Trans } from "@lingui/macro";
import cx from "classnames";
import Modal from "components/Modal/Modal";
import { SubmitButton } from "components/SubmitButton/SubmitButton";
import { TokenAllowanceData, TokensData } from "domain/synthetics/tokens/types";

import { ApproveTokenButton } from "components/ApproveTokenButton/ApproveTokenButton";
import {
  convertToUsdByPrice,
  formatTokenAmount,
  formatTokenAmountWithUsd,
  getTokenAllowance,
  getTokenConfig,
  getUsdFromTokenAmount,
} from "domain/synthetics/tokens/utils";
import { BigNumber } from "ethers";
import { GM_DECIMALS, USD_DECIMALS } from "lib/legacy";
import { Operation, operationTexts } from "../constants";

import { useWeb3React } from "@web3-react/core";
import { getContract } from "config/contracts";
import { getToken } from "config/tokens";
import { createMarketDepositTxn } from "domain/synthetics/markets/createMarketDepositTxn";
import { useMarkets } from "domain/synthetics/markets/useMarkets";
import { getMarket, getMarketName } from "domain/synthetics/markets/utils";
import { PriceImpactData } from "domain/synthetics/fees/types";
import { useTokenAllowance } from "domain/synthetics/tokens/useTokenAllowance";
import { useChainId } from "lib/chains";
import "./MarketPoolSwapConfirmation.scss";
import { expandDecimals } from "lib/numbers";
import { useEffect, useMemo, useState } from "react";
import { useTokenConfigs } from "domain/synthetics/tokens/useTokenConfigs";
import Tooltip from "components/Tooltip/Tooltip";
import StatsTooltipRow from "components/StatsTooltip/StatsTooltipRow";
import { formatFee } from "domain/synthetics/fees/utils";
import { InfoRow } from "components/InfoRow/InfoRow";
import { HIGH_PRICE_IMPACT_BP } from "config/synthetics";
import Checkbox from "components/Checkbox/Checkbox";

type Props = {
  onClose: () => void;
  priceImpact?: PriceImpactData;
  firstSwapTokenAddress: string;
  firstSwapTokenAmount: BigNumber;
  secondSwapTokenAddress?: string;
  secondSwapTokenAmount?: BigNumber;
  marketTokenAddress: string;
  gmSwapAmount: BigNumber;
  tokensData: TokensData;
  operationType: Operation;
  fees: BigNumber;
  executionFee: BigNumber;
  onSubmit: () => void;
};

function getTokenText(tokensData: TokensData, tokenAddress?: string, swapAmount?: BigNumber) {
  if (!tokenAddress || !swapAmount) return undefined;

  const usdAmount = getUsdFromTokenAmount(tokensData, tokenAddress, swapAmount);
  const token = getTokenConfig(tokensData, tokenAddress);

  if (!usdAmount || !token) return undefined;

  return formatTokenAmountWithUsd(swapAmount, usdAmount, token.symbol, token.decimals);
}

function needTokenApprove(tokenAllowanceData: TokenAllowanceData, tokenAddress?: string, tokenAmount?: BigNumber) {
  if (!tokenAddress || !tokenAmount) return false;

  const allowance = getTokenAllowance(tokenAllowanceData, tokenAddress);

  return !allowance || tokenAmount.gt(allowance);
}

export function MarketPoolSwapConfirmation(p: Props) {
  const { library, account } = useWeb3React();
  const { chainId } = useChainId();
  const routerAddress = getContract(chainId, "SyntheticsRouter");

  const tokenAllowanceData = useTokenAllowance(chainId, {
    spenderAddress: routerAddress,
    tokenAddresses: [p.firstSwapTokenAddress, p.marketTokenAddress, p.secondSwapTokenAddress!].filter(Boolean),
  });

  const marketsData = useMarkets(chainId);

  const tokenConfigsData = useTokenConfigs(chainId);

  const [tokensToApprove, setTokensToApprove] = useState<string[]>();
  const [isHighPriceImpactAccepted, setIsHighPriceImpactAccepted] = useState(false);

  const isHighPriceImpact =
    p.priceImpact?.priceImpact.lt(0) && p.priceImpact?.priceImpactBasisPoints.gte(HIGH_PRICE_IMPACT_BP);

  const swapAmountByToken = useMemo(
    () => ({
      [p.firstSwapTokenAddress]: p.firstSwapTokenAmount,
      [p.secondSwapTokenAddress || "nope"]: p.secondSwapTokenAmount,
      [p.marketTokenAddress]: p.gmSwapAmount,
    }),
    [
      p.firstSwapTokenAddress,
      p.firstSwapTokenAmount,
      p.gmSwapAmount,
      p.marketTokenAddress,
      p.secondSwapTokenAddress,
      p.secondSwapTokenAmount,
    ]
  );

  const isDeposit = p.operationType === Operation.deposit;

  const firstTokenText = getTokenText(p.tokensData, p.firstSwapTokenAddress, p.firstSwapTokenAmount);
  const secondTokenText = getTokenText(p.tokensData, p.secondSwapTokenAddress, p.secondSwapTokenAmount);

  const MOCK_GM_PRICE = expandDecimals(100, USD_DECIMALS);

  const gmUsdAmount = convertToUsdByPrice(p.gmSwapAmount, GM_DECIMALS, MOCK_GM_PRICE);
  const gmTokenText = formatTokenAmountWithUsd(p.gmSwapAmount, gmUsdAmount, "GM", GM_DECIMALS);

  const market = getMarket(marketsData, p.marketTokenAddress);
  const marketName = getMarketName(chainId, { ...marketsData, ...tokenConfigsData }, p.marketTokenAddress);

  const isAllowanceLoaded = Object.keys(tokenAllowanceData).length > 0;

  const submitButtonState = getSubmitButtonState();

  function getSubmitButtonState(): { text: string; disabled?: boolean; onClick?: () => void } {
    const operationText = p.operationType === Operation.deposit ? t`Buy` : `Sell`;
    const text = t`Confirm ${operationText} ${formatTokenAmount(p.gmSwapAmount, GM_DECIMALS)} GM`;

    if (!isAllowanceLoaded) {
      return {
        text: t`Loading...`,
        disabled: true,
      };
    }

    if (tokensToApprove?.some((address) => needTokenApprove(tokenAllowanceData, address))) {
      return {
        text: t`Need tokens approval`,
        disabled: true,
      };
    }

    if (isHighPriceImpact && !isHighPriceImpactAccepted) {
      return {
        text: t`Need to accept price impact`,
        disabled: true,
      };
    }

    return {
      text,
      onClick: onCreateDeposit,
    };
  }

  function onCreateDeposit() {
    if (!account) return;

    let longTokenAmount;
    let shortTokenAmount;

    if (p.firstSwapTokenAddress === market?.longTokenAddress) {
      longTokenAmount = p.firstSwapTokenAmount;
    } else if (p.firstSwapTokenAddress === market?.shortTokenAddress) {
      shortTokenAmount = p.firstSwapTokenAmount;
    }

    if (p.secondSwapTokenAddress === market?.longTokenAddress) {
      longTokenAmount = p.firstSwapTokenAmount;
    } else if (p.secondSwapTokenAddress === market?.shortTokenAddress) {
      shortTokenAmount = p.firstSwapTokenAmount;
    }

    createMarketDepositTxn(
      chainId,
      library,
      {
        account,
        longTokenAddress: market?.longTokenAddress!,
        shortTokenAddress: market?.shortTokenAddress!,
        longTokenAmount,
        shortTokenAmount,
        marketTokenAddress: p.marketTokenAddress,
        minMarketTokens: p.gmSwapAmount,
      },
      {
        successMsg: t`Deposit created`,
        failMsg: t`Deposit failed`,
        sentMsg: t`Deposit submitted`,
      }
    );
  }

  useEffect(
    function updateTokensToApproveEff() {
      if (Object.keys(tokenAllowanceData.tokenAllowance).length > 0 && !tokensToApprove) {
        const payTokens = isDeposit
          ? ([p.firstSwapTokenAddress, p.secondSwapTokenAddress].filter(Boolean) as string[])
          : [p.marketTokenAddress];

        const toApproveAddresses = payTokens.filter(
          (address) =>
            swapAmountByToken[address]?.gt(0) &&
            needTokenApprove(tokenAllowanceData, address, swapAmountByToken[address])
        );

        setTokensToApprove(toApproveAddresses);
      }
    },
    [
      isDeposit,
      p.firstSwapTokenAddress,
      p.marketTokenAddress,
      p.secondSwapTokenAddress,
      swapAmountByToken,
      tokenAllowanceData,
      tokensToApprove,
    ]
  );

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
                <Trans>Receive</Trans>&nbsp;{gmTokenText}
              </div>
            </>
          )}
          {p.operationType === Operation.withdraw && (
            <>
              <div>
                <Trans>Pay</Trans>&nbsp;{gmTokenText}
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

        <InfoRow
          label={<Trans>Fees and price impact</Trans>}
          value={
            <Tooltip
              handle={formatFee(p.fees)}
              position="right-bottom"
              renderContent={() => (
                <div className="text-white">
                  <StatsTooltipRow
                    label={t`Price impact`}
                    value={formatFee(p.priceImpact?.priceImpact, p.priceImpact?.priceImpactBasisPoints)}
                    showDollar={false}
                  />
                  <StatsTooltipRow label={t`Execution fee`} value={formatFee(p.executionFee)} showDollar={false} />
                </div>
              )}
            />
          }
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
                    tokenSymbol={address === p.marketTokenAddress ? marketName! : getToken(chainId, address).symbol}
                    spenderAddress={routerAddress}
                    isApproved={!needTokenApprove(tokenAllowanceData, address, swapAmountByToken[address])}
                  />
                </div>
              ))}
            </div>

            <div className="App-card-divider" />
          </>
        )}

        {isHighPriceImpact && (
          <div className="MarketPoolSwapBox-warnings">
            <Checkbox asRow isChecked={isHighPriceImpactAccepted} setIsChecked={setIsHighPriceImpactAccepted}>
              <span className="muted font-sm">
                <Trans>I am aware of the high price impact</Trans>
              </span>
            </Checkbox>
          </div>
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

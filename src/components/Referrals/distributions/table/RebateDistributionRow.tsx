import { t, Trans } from "@lingui/macro";
import { useLingui } from "@lingui/react";
import cx from "classnames";
import { useMemo } from "react";

import { getExplorerUrl } from "config/chains";
import { RebateDistribution, RebateDistributionType } from "domain/referrals";
import { shortenAddress } from "lib/legacy";
import { formatBalanceAmount, formatBigUsd } from "lib/numbers";
import { getNativeToken, getToken, getTokenBySymbol, isValidTokenSafe } from "sdk/configs/tokens";

import ExternalLink from "components/ExternalLink/ExternalLink";
import StatsTooltipRow from "components/StatsTooltip/StatsTooltipRow";
import TooltipWithPortal from "components/Tooltip/TooltipWithPortal";

import ChevronDownIcon from "img/ic_chevron_down.svg?react";
import WarnIcon from "img/ic_warn.svg?react";

import { GridCell, GridRow } from "./Grid";

export type AmountsByTokens = Record<string, bigint>;

export function getAmountsByTokens(rebate: RebateDistribution, chainId: number): AmountsByTokens {
  return rebate.tokens.reduce((acc, tokenAddress, i) => {
    let token;
    try {
      token = getToken(chainId, tokenAddress);
    } catch {
      token = getNativeToken(chainId);
    }
    acc[token.address] = acc[token.address] ?? 0n;
    acc[token.address] = acc[token.address] + rebate.amounts[i];
    return acc;
  }, {} as AmountsByTokens);
}

type RebateDistributionRowProps = {
  rebate: RebateDistribution;
  chainId: number;
  amountsByTokens: AmountsByTokens;
  isSelected: boolean;
  onClick: (id: string) => void;
};

export function RebateDistributionRow({
  rebate,
  chainId,
  amountsByTokens,
  isSelected,
  onClick,
}: RebateDistributionRowProps) {
  const { i18n } = useLingui();
  const formattedDate = useMemo(
    () =>
      new Intl.DateTimeFormat(i18n.locale, {
        day: "numeric",
        month: "short",
        year: "numeric",
      }).format(new Date(rebate.timestamp * 1000)),
    [rebate.timestamp, i18n.locale]
  );
  const esGmxAddress = getTokenBySymbol(chainId, "esGMX").address;

  let rebateType = "-";

  if (rebate.typeId === RebateDistributionType.Rebate) {
    rebateType = rebate.tokens[0] === esGmxAddress ? t`Referrals esGMX` : t`Referrals V1 WETH`;
  } else if (rebate.typeId === RebateDistributionType.Claim) {
    rebateType = t`Rebate Claim`;
  }

  const tokensWithoutPrices: string[] = [];
  const totalUsd = rebate.amountsInUsd.reduce((acc, usdAmount, i) => {
    if (usdAmount === 0n && rebate.amounts[i] !== 0n) {
      tokensWithoutPrices.push(rebate.tokens[i]);
    }
    return acc + usdAmount;
  }, 0n);

  const explorerURL = getExplorerUrl(chainId);

  return (
    <GridRow className="text-typography-primary" onClick={() => onClick(rebate.id)}>
      <GridCell>{formattedDate}</GridCell>
      <GridCell>{rebateType}</GridCell>
      <GridCell>
        <TooltipWithPortal
          className="whitespace-nowrap"
          variant="none"
          as="div"
          handle={
            <div className="flex items-center numbers">
              {tokensWithoutPrices.length > 0 && (
                <>
                  <WarnIcon className="-my-5 size-20 text-yellow-300" />
                  &nbsp;
                </>
              )}
              {formatBigUsd(totalUsd)}
            </div>
          }
          content={
            <>
              {tokensWithoutPrices.length > 0 && (
                <>
                  <Trans>
                    USD value may not be accurate because prices are missing for{" "}
                    {tokensWithoutPrices
                      .map((address) =>
                        isValidTokenSafe(chainId, address) ? getToken(chainId, address).symbol : address
                      )
                      .join(", ")}
                    .
                  </Trans>
                  <br />
                  <br />
                </>
              )}
              {Object.keys(amountsByTokens).map((tokenAddress) => {
                const token = getToken(chainId, tokenAddress);

                return (
                  <StatsTooltipRow
                    key={tokenAddress}
                    showDollar={false}
                    label={token.symbol}
                    value={formatBalanceAmount(amountsByTokens[tokenAddress], token.decimals, undefined, {
                      isStable: token.isStable,
                    })}
                    valueClassName="numbers"
                  />
                );
              })}
            </>
          }
        />
      </GridCell>
      <GridCell className="text-right">
        <ExternalLink
          className="text-typography-secondary hover:text-typography-primary"
          variant="icon"
          href={explorerURL + `tx/${rebate.transactionHash}`}
        >
          {shortenAddress(rebate.transactionHash, 20)}
        </ExternalLink>
      </GridCell>
      <GridCell className="flex items-center justify-end">
        <ChevronDownIcon className={cx("size-16 text-typography-secondary", { "rotate-180": isSelected })} />
      </GridCell>
    </GridRow>
  );
}

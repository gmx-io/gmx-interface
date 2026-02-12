import { t, Trans } from "@lingui/macro";

import { ContractsChainId, getExplorerUrl } from "config/chains";
import { RebateDistributionType, TotalReferralsStats } from "domain/referrals";
import { useChainId } from "lib/chains";
import { formatDate } from "lib/dates";
import { shortenAddress } from "lib/legacy";
import { formatBalanceAmount, formatBigUsd } from "lib/numbers";
import { getNativeToken, getToken, getTokenBySymbol } from "sdk/configs/tokens";

import ExternalLink from "components/ExternalLink/ExternalLink";
import Loader from "components/Loader/Loader";
import { BottomTablePagination } from "components/Pagination/BottomTablePagination";
import StatsTooltipRow from "components/StatsTooltip/StatsTooltipRow";
import { TableTd, TableTh, TableTheadTr, TableTr } from "components/Table/Table";
import { TableScrollFadeContainer } from "components/TableScrollFade/TableScrollFade";
import Tooltip from "components/Tooltip/Tooltip";

import WarnIcon from "img/ic_warn.svg?react";

import EmptyMessage from "./EmptyMessage";
import usePagination, { DEFAULT_PAGE_SIZE } from "./usePagination";
import Card from "../Card/Card";

type ReferralsDistributionsTabProps = {
  loading: boolean;
  account: string | undefined;
  referralsData: TotalReferralsStats | undefined;
};

export function ReferralsDistributionsTab({ loading, account, referralsData }: ReferralsDistributionsTabProps) {
  const { chainId } = useChainId();
  const chains = referralsData?.chains || {};
  const currentReferralsData = chains[chainId as ContractsChainId];
  const affiliateDistributions = currentReferralsData?.affiliateDistributions;
  const esGmxAddress = getTokenBySymbol(chainId, "esGMX").address;

  const {
    currentPage: currentRebatePage,
    getCurrentData: getCurrentRebateData,
    setCurrentPage: setCurrentRebatePage,
    pageCount: rebatePageCount,
  } = usePagination("Rebates", affiliateDistributions);

  const currentRebateData = getCurrentRebateData();

  if (loading) return <Loader />;

  if (!account) {
    return (
      <EmptyMessage
        tooltipText={t`Connect your wallet to view your rebates distribution history.`}
        message={t`Connect wallet to view distributions`}
      />
    );
  }

  return (
    <div className="flex flex-col gap-8">
      {currentRebateData.length > 0 ? (
        <Card
          title={
            <span className="text-body-large">
              <Trans>Rebates Distribution History</Trans>
            </span>
          }
          tooltipText={t`Distribution history for claimed rebates and airdrops.`}
          bodyPadding={false}
          divider={true}
        >
          <TableScrollFadeContainer>
            <table className="w-full min-w-max">
              <thead>
                <TableTheadTr>
                  <TableTh scope="col">
                    <Trans>Date</Trans>
                  </TableTh>
                  <TableTh scope="col">
                    <Trans>Type</Trans>
                  </TableTh>
                  <TableTh scope="col">
                    <Trans>Amount</Trans>
                  </TableTh>
                  <TableTh scope="col">
                    <Trans>Transaction</Trans>
                  </TableTh>
                </TableTheadTr>
              </thead>
              <tbody>
                {currentRebateData.map((rebate, index) => {
                  let rebateType = "-";

                  if (rebate.typeId === RebateDistributionType.Rebate) {
                    if (rebate.tokens[0] === esGmxAddress) {
                      rebateType = t`V1 esGMX`;
                    } else {
                      rebateType = t`V1 Airdrop`;
                    }
                  } else if (rebate.typeId === RebateDistributionType.Claim) {
                    rebateType = t`V2 Claim`;
                  }

                  const amountsByTokens = rebate.tokens.reduce(
                    (acc, tokenAddress, i) => {
                      let token;
                      try {
                        token = getToken(chainId, tokenAddress);
                      } catch (error) {
                        token = getNativeToken(chainId);
                      }
                      acc[token.address] = acc[token.address] ?? 0n;
                      acc[token.address] = acc[token.address] + rebate.amounts[i];
                      return acc;
                    },
                    {} as { [address: string]: bigint }
                  );

                  const tokensWithoutPrices: string[] = [];

                  const totalUsd = rebate.amountsInUsd.reduce((acc, usdAmount, i) => {
                    if (usdAmount == 0n && rebate.amounts[i] != 0n) {
                      tokensWithoutPrices.push(rebate.tokens[i]);
                    }

                    return acc + usdAmount;
                  }, 0n);

                  const explorerURL = getExplorerUrl(chainId);
                  return (
                    <TableTr key={index}>
                      <TableTd data-label="Date">{formatDate(rebate.timestamp)}</TableTd>
                      <TableTd data-label="Type">{rebateType}</TableTd>
                      <TableTd data-label="Amount">
                        <Tooltip
                          className="whitespace-nowrap"
                          handle={
                            <div className="Rebate-amount-value numbers">
                              {tokensWithoutPrices.length > 0 && (
                                <>
                                  <WarnIcon className="size-20 text-yellow-300" />
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
                                    USD Value may not be accurate since the data does not contain prices for{" "}
                                    {tokensWithoutPrices.map((address) => getToken(chainId, address).symbol).join(", ")}
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
                                    value={formatBalanceAmount(
                                      amountsByTokens[tokenAddress],
                                      token.decimals,
                                      undefined,
                                      { isStable: token.isStable }
                                    )}
                                    valueClassName="numbers"
                                  />
                                );
                              })}
                            </>
                          }
                        />
                      </TableTd>
                      <TableTd data-label="Transaction">
                        <ExternalLink
                          className="text-typography-secondary hover:text-typography-primary"
                          variant="icon"
                          href={explorerURL + `tx/${rebate.transactionHash}`}
                        >
                          {shortenAddress(rebate.transactionHash, 13)}
                        </ExternalLink>
                      </TableTd>
                    </TableTr>
                  );
                })}
                {currentRebateData.length < DEFAULT_PAGE_SIZE && (
                  // eslint-disable-next-line react-perf/jsx-no-new-object-as-prop
                  <tr style={{ height: 42.5 * (DEFAULT_PAGE_SIZE - currentRebateData.length) }}></tr>
                )}
              </tbody>
            </table>
          </TableScrollFadeContainer>
          <BottomTablePagination
            page={currentRebatePage}
            pageCount={rebatePageCount}
            onPageChange={setCurrentRebatePage}
          />
        </Card>
      ) : (
        <EmptyMessage
          tooltipText={t`Distribution history for claimed rebates and airdrops.`}
          message={t`No rebates distribution history yet.`}
        />
      )}
    </div>
  );
}

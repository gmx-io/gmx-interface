import { t, Trans } from "@lingui/macro";
import { useRef, useState } from "react";

import { ARBITRUM, AVALANCHE, AVALANCHE_FUJI, getExplorerUrl, ContractsChainId } from "config/chains";
import { isDevelopment } from "config/env";
import { TotalReferralsStats, useTiers } from "domain/referrals";
import { formatDate } from "lib/dates";
import { shortenAddress } from "lib/legacy";
import { formatBalanceAmount, formatBigUsd } from "lib/numbers";
import useWallet from "lib/wallets/useWallet";
import { getNativeToken, getToken } from "sdk/configs/tokens";

import ExternalLink from "components/ExternalLink/ExternalLink";
import { BottomTablePagination } from "components/Pagination/BottomTablePagination";
import StatsTooltipRow from "components/StatsTooltip/StatsTooltipRow";
import { TableTd, TableTh, TableTheadTr, TableTr } from "components/Table/Table";
import { TableScrollFadeContainer } from "components/TableScrollFade/TableScrollFade";

import EditIcon from "img/ic_edit.svg?react";
import WarnIcon from "img/ic_warn.svg?react";

import EmptyMessage from "./EmptyMessage";
import { ReferralCodeEditFormContainer } from "./JoinReferralCode";
import ReferralInfoCard from "./ReferralInfoCard";
import { getSharePercentage, getTierIdDisplay, getUsdValue, tierDiscountInfo } from "./referralsHelper";
import usePagination, { DEFAULT_PAGE_SIZE } from "./usePagination";
import Card from "../Card/Card";
import Modal from "../Modal/Modal";
import Tooltip from "../Tooltip/Tooltip";

import "./TradersStats.scss";

type Props = {
  referralsData?: TotalReferralsStats;
  traderTier?: number;
  chainId: ContractsChainId;
  userReferralCodeString?: string;
  discountShare: bigint | undefined;
};

function TradersStats({ referralsData, traderTier, chainId, userReferralCodeString, discountShare }: Props) {
  const { signer } = useWallet();
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const editModalRef = useRef<HTMLDivElement>(null);

  const { chains, total } = referralsData || {};
  const {
    [chainId]: currentReferralsData,
    [ARBITRUM]: arbitrumData,
    [AVALANCHE]: avalancheData,
    [AVALANCHE_FUJI]: fujiData,
  } = chains || {};

  const { getCurrentData, currentPage, setCurrentPage, pageCount } = usePagination(
    "TradersStats",
    currentReferralsData?.traderDistributions
  );

  const currentDiscountDistributions = getCurrentData();
  const { totalRebate } = useTiers(signer, chainId, traderTier);
  const currentTierDiscount = getSharePercentage(traderTier, discountShare, totalRebate);

  const open = () => setIsEditModalOpen(true);
  const close = () => setIsEditModalOpen(false);
  return (
    <div className="flex flex-col gap-8">
      <div className="grid grid-cols-3 max-lg:grid-cols-1">
        <ReferralInfoCard
          label={t`Active referral code`}
          value={
            <div className="flex items-center gap-4">
              <span>{userReferralCodeString}</span>
              <EditIcon
                className="size-16 cursor-pointer text-typography-secondary hover:text-typography-primary"
                onClick={open}
              />
            </div>
          }
        >
          <div className="active-referral-code">
            {traderTier !== undefined ? (
              <div className="tier">
                <Tooltip
                  handle={t`Tier ${getTierIdDisplay(traderTier)}: ${currentTierDiscount}% discount`}
                  position="bottom"
                  variant="icon"
                  handleClassName="text-body-small rounded-full bg-cold-blue-900 px-12 py-8 font-medium leading-[1.25] text-typography-primary"
                  iconClassName="text-typography-secondary ml-4"
                  renderContent={() => (
                    <p className="text-typography-primary">
                      <Trans>Your discount: {currentTierDiscount}% off trading fees.</Trans>
                      {((discountShare ?? 0) > 0 && (
                        <>
                          <br />
                          <br />
                          <Trans>
                            Code owner set a custom {currentTierDiscount}% discount instead of the standard{" "}
                            {(tierDiscountInfo as any)[traderTier]}% for Tier {getTierIdDisplay(traderTier)}.
                          </Trans>
                        </>
                      )) ||
                        null}
                    </p>
                  )}
                />
              </div>
            ) : null}
          </div>
        </ReferralInfoCard>
        <ReferralInfoCard
          value={formatBigUsd(currentReferralsData?.traderReferralTotalStats?.volume)}
          label={t`Trading volume`}
          labelTooltipText={t`Your trading volume with referral discount`}
          tooltipContent={
            <>
              <StatsTooltipRow
                label={t`V1 Arbitrum`}
                value={getUsdValue(arbitrumData?.traderReferralTotalStats.v1Data.volume)}
                valueClassName="numbers"
              />
              <StatsTooltipRow
                label={t`V1 Avalanche`}
                value={getUsdValue(avalancheData?.traderReferralTotalStats.v1Data.volume)}
                valueClassName="numbers"
              />
              {isDevelopment() && (
                <StatsTooltipRow
                  label={t`V1 Avalanche Fuji`}
                  value={getUsdValue(fujiData?.traderReferralTotalStats.v1Data.volume)}
                  valueClassName="numbers"
                />
              )}
              <StatsTooltipRow
                label={t`V2 Arbitrum`}
                value={getUsdValue(arbitrumData?.traderReferralTotalStats.v2Data.volume)}
                valueClassName="numbers"
              />
              <StatsTooltipRow
                label={t`V2 Avalanche`}
                value={getUsdValue(avalancheData?.traderReferralTotalStats.v2Data.volume)}
                valueClassName="numbers"
              />
              {isDevelopment() && (
                <StatsTooltipRow
                  label={t`V2 Avalanche Fuji`}
                  value={getUsdValue(fujiData?.traderReferralTotalStats.v2Data.volume)}
                  valueClassName="numbers"
                />
              )}
              <div className="Tooltip-divider" />
              <StatsTooltipRow label={t`Total`} value={getUsdValue(total?.traderVolume)} valueClassName="numbers" />
            </>
          }
        />
        <ReferralInfoCard
          value={formatBigUsd(currentReferralsData?.traderReferralTotalStats?.discountUsd)}
          label={t`Rebates`}
          labelTooltipText={t`Your fee savings from referral discounts`}
          tooltipContent={
            <>
              <StatsTooltipRow
                label={t`V1 Arbitrum`}
                value={getUsdValue(arbitrumData?.traderReferralTotalStats.v1Data.discountUsd)}
                valueClassName="numbers"
              />
              <StatsTooltipRow
                label={t`V1 Avalanche`}
                value={getUsdValue(avalancheData?.traderReferralTotalStats.v1Data.discountUsd)}
                valueClassName="numbers"
              />
              {isDevelopment() && (
                <StatsTooltipRow
                  label={t`V1 Avalanche Fuji`}
                  value={getUsdValue(avalancheData?.traderReferralTotalStats.v1Data.discountUsd)}
                  valueClassName="numbers"
                />
              )}
              <StatsTooltipRow
                label={t`V2 Arbitrum`}
                value={getUsdValue(arbitrumData?.traderReferralTotalStats.v2Data.discountUsd)}
                valueClassName="numbers"
              />
              <StatsTooltipRow
                label={t`V2 Avalanche`}
                value={getUsdValue(avalancheData?.traderReferralTotalStats.v2Data.discountUsd)}
                valueClassName="numbers"
              />
              {isDevelopment() && (
                <StatsTooltipRow
                  label={t`V2 Avalanche Fuji`}
                  value={getUsdValue(fujiData?.traderReferralTotalStats.v2Data.discountUsd)}
                  valueClassName="numbers"
                />
              )}
              <div className="Tooltip-divider" />
              <StatsTooltipRow label={t`Total`} value={getUsdValue(total?.discountUsd)} valueClassName="numbers" />
            </>
          }
        />
        <Modal
          className="Connect-wallet-modal"
          isVisible={isEditModalOpen}
          setIsVisible={close}
          label={t`Edit referral code`}
          onAfterOpen={() => editModalRef.current?.focus()}
        >
          <div className="edit-referral-modal">
            <ReferralCodeEditFormContainer
              userReferralCodeString={userReferralCodeString}
              type="edit"
              callAfterSuccess={() => setIsEditModalOpen(false)}
            />
          </div>
        </Modal>
      </div>
      {currentDiscountDistributions.length > 0 ? (
        <Card
          title={t`Rebates distribution history`}
          tooltipText={t`V2 discounts apply automatically and aren't shown here`}
          bodyPadding={false}
          divider={true}
        >
          <TableScrollFadeContainer>
            <table className="w-full min-w-max">
              <thead>
                <TableTheadTr>
                  <TableTh scope="col">
                    <Trans>DATE</Trans>
                  </TableTh>
                  <TableTh scope="col">
                    <Trans>TYPE</Trans>
                  </TableTh>
                  <TableTh scope="col">
                    <Trans>AMOUNT</Trans>
                  </TableTh>
                  <TableTh scope="col">
                    <Trans>TRANSACTION</Trans>
                  </TableTh>
                </TableTheadTr>
              </thead>
              <tbody>
                {currentDiscountDistributions.map((rebate) => {
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

                  const totalUsd = rebate.amountsInUsd.reduce((acc, amount, i) => {
                    if (amount == 0n && rebate.amounts[i] != 0n) {
                      tokensWithoutPrices.push(rebate.tokens[i]);
                    }

                    return acc + amount;
                  }, 0n);

                  const explorerURL = getExplorerUrl(chainId);
                  return (
                    <TableTr key={rebate.id}>
                      <TableTd data-label={t`Date`}>{formatDate(rebate.timestamp)}</TableTd>
                      <TableTd data-label={t`Type`}>
                        <Trans>V1 airdrop</Trans>
                      </TableTd>
                      <TableTd data-label={t`Amount`} className="Rebate-amount">
                        <Tooltip
                          position="bottom"
                          className="whitespace-nowrap"
                          handle={
                            <div className="Rebate-amount-value numbers">
                              {tokensWithoutPrices.length > 0 && (
                                <>
                                  <WarnIcon className="size-16 text-yellow-300" />
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
                                    {tokensWithoutPrices.map((address) => getToken(chainId, address).symbol).join(", ")}
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
                          {shortenAddress(rebate.transactionHash, 20)}
                        </ExternalLink>
                      </TableTd>
                    </TableTr>
                  );
                })}
                {currentDiscountDistributions.length > 0 && currentDiscountDistributions.length < DEFAULT_PAGE_SIZE && (
                  // eslint-disable-next-line react-perf/jsx-no-new-object-as-prop
                  <tr style={{ height: 42.5 * (DEFAULT_PAGE_SIZE - currentDiscountDistributions.length) }}></tr>
                )}
              </tbody>
            </table>
          </TableScrollFadeContainer>
          <BottomTablePagination page={currentPage} pageCount={pageCount} onPageChange={setCurrentPage} />
        </Card>
      ) : (
        <EmptyMessage
          tooltipText={t`V2 rebates apply automatically as fee discounts and aren't shown here`}
          message={t`No rebates distribution history yet`}
        />
      )}
    </div>
  );
}

export default TradersStats;

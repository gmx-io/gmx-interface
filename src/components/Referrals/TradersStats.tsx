import { Trans, t } from "@lingui/macro";
import ExternalLink from "components/ExternalLink/ExternalLink";
import Pagination from "components/Pagination/Pagination";
import StatsTooltipRow from "components/StatsTooltip/StatsTooltipRow";
import { getExplorerUrl } from "config/chains";
import { getNativeToken, getToken } from "config/tokens";
import { ReferralsStatsData } from "domain/referrals";
import { BigNumber } from "ethers";
import { formatDate } from "lib/dates";
import { shortenAddress } from "lib/legacy";
import { formatTokenAmount } from "lib/numbers";
import { useRef, useState } from "react";
import { BiEditAlt } from "react-icons/bi";
import Card from "../Common/Card";
import Modal from "../Modal/Modal";
import Tooltip from "../Tooltip/Tooltip";
import EmptyMessage from "./EmptyMessage";
import InfoCard from "./InfoCard";
import { ReferralCodeForm } from "./JoinReferralCode";
import { getTierIdDisplay, getUSDValue, tierDiscountInfo } from "./referralsHelper";
import usePagination from "./usePagination";

type Props = {
  referralsData?: ReferralsStatsData;
  traderTier?: BigNumber;
  chainId: number;
  userReferralCodeString?: string;
  setPendingTxns: (txns: string[]) => void;
  pendingTxns: string[];
};

function TradersStats({
  referralsData,
  traderTier,
  chainId,
  userReferralCodeString,
  setPendingTxns,
  pendingTxns,
}: Props) {
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const editModalRef = useRef<HTMLDivElement>(null);
  const { getCurrentData, currentPage, setCurrentPage, pageCount } = usePagination(referralsData?.traderDistributions);

  const currentDiscountDistributions = getCurrentData();

  const open = () => setIsEditModalOpen(true);
  const close = () => setIsEditModalOpen(false);
  return (
    <div className="rebate-container">
      <div className="referral-stats">
        <InfoCard
          label={t`Total Trading Volume`}
          tooltipText={t`Volume traded by this account with an active referral code.`}
          data={
            <Tooltip
              handle={getUSDValue(referralsData?.traderReferralTotalStats?.volume)}
              position="left-bottom"
              renderContent={() => (
                <>
                  <StatsTooltipRow
                    label={t`Volume on V1`}
                    value={getUSDValue(referralsData?.traderReferralTotalStats?.v1Data.volume)}
                    showDollar={false}
                  />
                  <StatsTooltipRow
                    label={t`Volume on V2`}
                    value={getUSDValue(referralsData?.traderReferralTotalStats?.v2Data.volume)}
                    showDollar={false}
                  />
                </>
              )}
            />
          }
        />
        <InfoCard
          label={t`Total Rebates`}
          tooltipText={t`Rebates earned by this account as a trader.`}
          data={
            <Tooltip
              handle={getUSDValue(referralsData?.traderReferralTotalStats?.discountUsd)}
              position="left-bottom"
              renderContent={() => (
                <>
                  <StatsTooltipRow
                    label={t`Rebates on V1`}
                    value={getUSDValue(referralsData?.traderReferralTotalStats?.v1Data.discountUsd)}
                    showDollar={false}
                  />
                  <StatsTooltipRow
                    label={t`Rebates on V2`}
                    value={getUSDValue(referralsData?.traderReferralTotalStats?.v2Data.discountUsd)}
                    showDollar={false}
                  />
                </>
              )}
            />
          }
        />
        <InfoCard
          label={t`Active Referral Code`}
          data={
            <div className="active-referral-code">
              <div className="edit">
                <span>{userReferralCodeString}</span>
                <BiEditAlt onClick={open} />
              </div>
              {traderTier ? (
                <div className="tier">
                  <Tooltip
                    handle={t`Tier ${getTierIdDisplay(traderTier)} (${tierDiscountInfo[traderTier]}% discount)`}
                    position="right-bottom"
                    renderContent={() => (
                      <p className="text-white">
                        <Trans>
                          You will receive a {tierDiscountInfo[traderTier]}% discount on your opening and closing fees,
                          this discount will be airdropped to your account every Wednesday
                        </Trans>
                      </p>
                    )}
                  />
                </div>
              ) : null}
            </div>
          }
        />
        <Modal
          className="Connect-wallet-modal"
          isVisible={isEditModalOpen}
          setIsVisible={close}
          label={t`Edit Referral Code`}
          onAfterOpen={() => editModalRef.current?.focus()}
        >
          <div className="edit-referral-modal">
            <ReferralCodeForm
              userReferralCodeString={userReferralCodeString}
              setPendingTxns={setPendingTxns}
              pendingTxns={pendingTxns}
              type="edit"
              callAfterSuccess={() => setIsEditModalOpen(false)}
            />
          </div>
        </Modal>
      </div>
      {currentDiscountDistributions.length > 0 ? (
        <div className="reward-history">
          <Card
            title={t`Rebates Distribution History`}
            tooltipText={t`V1 rebates are airdropped weekly, V2 rebates are automatically applied as fee discounts on each trade.`}
          >
            <div className="table-wrapper">
              <table className="referral-table">
                <thead>
                  <tr>
                    <th className="table-head" scope="col">
                      <Trans>Date</Trans>
                    </th>
                    <th className="table-head" scope="col">
                      <Trans>Type</Trans>
                    </th>
                    <th className="table-head" scope="col">
                      <Trans>Amount</Trans>
                    </th>
                    <th className="table-head" scope="col">
                      <Trans>Transaction</Trans>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {currentDiscountDistributions.map((rebate, index) => {
                    const amountsByTokens = rebate.tokens.reduce((acc, tokenAddress, i) => {
                      let token;
                      try {
                        token = getToken(chainId, tokenAddress);
                      } catch {
                        token = getNativeToken(chainId);
                      }
                      acc[token.address] = acc[token.address] || BigNumber.from(0);
                      acc[token.address] = acc[token.address].add(rebate.amounts[i]);
                      return acc;
                    }, {} as { [address: string]: BigNumber });

                    const explorerURL = getExplorerUrl(chainId);
                    return (
                      <tr key={index}>
                        <td data-label="Date">{formatDate(rebate.timestamp)}</td>
                        <td data-label="Type">V1 AIRDROP</td>
                        <td data-label="Amount">
                          {Object.keys(amountsByTokens).map((tokenAddress) => {
                            const token = getToken(chainId, tokenAddress);
                            return (
                              <>
                                <div key={tokenAddress}>
                                  {formatTokenAmount(amountsByTokens[tokenAddress], token.decimals, token.symbol, {
                                    displayDecimals: 6,
                                    useCommas: true,
                                  })}
                                </div>
                              </>
                            );
                          })}
                        </td>
                        <td data-label="Transaction">
                          <ExternalLink href={explorerURL + `tx/${rebate.transactionHash}`}>
                            {shortenAddress(rebate.transactionHash, 20)}
                          </ExternalLink>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Card>
          <Pagination page={currentPage} pageCount={pageCount} onPageChange={(page) => setCurrentPage(page)} />
        </div>
      ) : (
        <EmptyMessage
          tooltipText={t`V1 rebates are airdropped weekly, V2 rebates are automatically applied as fee discounts on each trade.`}
          message={t`No rebates distribution history yet.`}
        />
      )}
    </div>
  );
}

export default TradersStats;

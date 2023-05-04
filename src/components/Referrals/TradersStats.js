import { useRef, useState } from "react";
import { Trans, t } from "@lingui/macro";
import { BiEditAlt } from "react-icons/bi";
import Card from "../Common/Card";
import Modal from "../Modal/Modal";
import Tooltip from "../Tooltip/Tooltip";
import { shortenAddress } from "lib/legacy";
import EmptyMessage from "./EmptyMessage";
import { getTierIdDisplay, getUSDValue, tierDiscountInfo } from "./referralsHelper";
import { ReferralCodeForm } from "./JoinReferralCode";
import { ARBITRUM, AVALANCHE, getExplorerUrl } from "config/chains";
import { formatAmount } from "lib/numbers";
import { getNativeToken, getToken } from "config/tokens";
import { formatDate } from "lib/dates";
import ExternalLink from "components/ExternalLink/ExternalLink";
import usePagination from "./usePagination";
import Pagination from "components/Pagination/Pagination";
import ReferralInfoCard from "./ReferralInfoCard";
import StatsTooltipRow from "components/StatsTooltip/StatsTooltipRow";

function TradersStats({ referralsData, traderTier, chainId, userReferralCodeString, setPendingTxns, pendingTxns }) {
  const {
    [chainId]: currentReferralsData,
    [ARBITRUM]: arbitrumData,
    [AVALANCHE]: avalancheData,
    total,
  } = referralsData || {};
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const editModalRef = useRef(null);
  const { getCurrentData, currentPage, setCurrentPage, pageCount } = usePagination(
    currentReferralsData?.discountDistributions
  );

  const currentDiscountDistributions = getCurrentData();

  const open = () => setIsEditModalOpen(true);
  const close = () => setIsEditModalOpen(false);
  return (
    <div className="rebate-container">
      <div className="referral-stats">
        <ReferralInfoCard label={[t`Active Referral Code`]}>
          <div className="active-referral-code">
            <div className="edit">
              <span>{userReferralCodeString}</span>
              <BiEditAlt onClick={open} />
            </div>
            {traderTier && (
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
            )}
          </div>
        </ReferralInfoCard>
        <ReferralInfoCard
          value={`$${getUSDValue(currentReferralsData?.referralTotalStats?.volume)}`}
          label={t`Trading Volume`}
          labelTooltipText={t`Volume traded by this account with an active referral code.`}
          tooltipContent={
            <>
              <StatsTooltipRow
                label={t`Trading Volume on Arbitrum`}
                value={getUSDValue(arbitrumData?.referralTotalStats.volume)}
              />
              <StatsTooltipRow
                label={t`Trading Volume on Avalanche`}
                value={getUSDValue(avalancheData?.referralTotalStats.volume)}
              />
              <div className="Tooltip-divider" />
              <StatsTooltipRow label={t`Total`} value={getUSDValue(total?.tradersVolume)} />
            </>
          }
        />
        <ReferralInfoCard
          value={`$${getUSDValue(currentReferralsData?.referralTotalStats?.discountUsd)}`}
          label={t`Rebates`}
          labelTooltipText={t`Rebates earned by this account as a trader.`}
          tooltipContent={
            <>
              <StatsTooltipRow
                label={t`Rebates on Arbitrum`}
                value={getUSDValue(arbitrumData?.referralTotalStats.discountUsd)}
              />
              <StatsTooltipRow
                label={t`Rebates on Avalanche`}
                value={getUSDValue(avalancheData?.referralTotalStats.discountUsd)}
              />
              <div className="Tooltip-divider" />
              <StatsTooltipRow label={t`Total`} value={getUSDValue(total?.discountUsd)} />
            </>
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
          <Card title={t`Rebates Distribution History`} tooltipText={t`Rebates are airdropped weekly.`}>
            <div className="table-wrapper">
              <table className="referral-table">
                <thead>
                  <tr>
                    <th className="table-head" scope="col">
                      <Trans>Date</Trans>
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
                    let tokenInfo;
                    try {
                      tokenInfo = getToken(chainId, rebate.token);
                    } catch {
                      tokenInfo = getNativeToken(chainId);
                    }
                    const explorerURL = getExplorerUrl(chainId);
                    return (
                      <tr key={index}>
                        <td data-label="Date">{formatDate(rebate.timestamp)}</td>
                        <td data-label="Amount">
                          {formatAmount(rebate.amount, tokenInfo.decimals, 6, true)} {tokenInfo.symbol}
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
          message={t`No rebates distribution history yet.`}
          tooltipText={t`Rebates are airdropped weekly.`}
        />
      )}
    </div>
  );
}

export default TradersStats;

import { t, Trans } from "@lingui/macro";
import Card from "components/Common/Card";
import ExternalLink from "components/ExternalLink/ExternalLink";
import Pagination from "components/Pagination/Pagination";
import EmptyMessage from "components/Referrals/EmptyMessage";
import usePagination from "components/Referrals/usePagination";
import { getExplorerUrl } from "config/chains";
import useUserIncentiveData from "domain/synthetics/common/useUserIncentiveData";
import { useChainId } from "lib/chains";
import { formatDate } from "lib/dates";
import { shortenAddressOrEns } from "lib/wallets";
import useWallet from "lib/wallets/useWallet";

const INCENTIVE_DISTRIBUTION_TYPES = {
  1: "GM Airdrop",
  2: "GLP to GM Airdrop",
  1003: "TRADING Airdrop",
};

export default function UserIncentiveTable() {
  const { account } = useWallet();
  const { chainId } = useChainId();
  const userIncentiveData = useUserIncentiveData(chainId, account);

  const { currentPage, getCurrentData, setCurrentPage, pageCount } = usePagination(userIncentiveData.data);

  const currentIncentiveData = getCurrentData();

  if (!userIncentiveData?.data?.length) {
    return (
      <EmptyMessage
        tooltipText={t`Incentives are airdropped weekly.`}
        message={t`No incentives distribution history yet.`}
      />
    );
  }

  return (
    <div>
      <Card title={t`Incentives Distribution History`}>
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
              {currentIncentiveData?.map((incentive) => {
                const explorerURL = getExplorerUrl(chainId);

                return (
                  <tr key={incentive.id}>
                    <td data-label="Date">{formatDate(incentive.timestamp)}</td>
                    <td data-label="Type">{INCENTIVE_DISTRIBUTION_TYPES[incentive.typeId]}</td>
                    <td data-label="Amount">$12.56</td>
                    <td data-label="Transaction">
                      <ExternalLink href={explorerURL + `tx/${incentive.transactionHash}`}>
                        {shortenAddressOrEns(incentive.transactionHash, 13)}
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
  );
}

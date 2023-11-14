import { t, Trans } from "@lingui/macro";
import Card from "components/Common/Card";
import EmptyMessage from "components/Referrals/EmptyMessage";
import useUserIncentiveData from "domain/synthetics/common/useUserIncentiveData";
import { useChainId } from "lib/chains";
import useWallet from "lib/wallets/useWallet";

const INCENTIVE_DISTRIBUTION_TYPES = {
  1001: "GM Airdrop",
  1002: "GLP to GM Airdrop",
  1003: "TRADING Airdrop",
};

export default function UserIncentiveTable() {
  const { account } = useWallet();
  const { chainId } = useChainId();
  const userIncentiveData = useUserIncentiveData(chainId, account);

  if (!userIncentiveData?.data?.length) {
    return (
      <EmptyMessage
        tooltipText={t`Incentives are airdropped weekly.`}
        message={t`No incentives distribution history yet.`}
      />
    );
  }

  return (
    <div className="reward-history">
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
              {userIncentiveData?.data?.map((item, index) => {
                return (
                  <tr key={index}>
                    <td data-label="Date"></td>
                    <td data-label="Type">{INCENTIVE_DISTRIBUTION_TYPES[item.typeId]}</td>
                    <td data-label="Amount"></td>
                    <td data-label="Transaction"></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

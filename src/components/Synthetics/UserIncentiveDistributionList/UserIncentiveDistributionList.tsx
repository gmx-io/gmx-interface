import { t, Trans } from "@lingui/macro";
import Card from "components/Common/Card";
import ExternalLink from "components/ExternalLink/ExternalLink";
import Pagination from "components/Pagination/Pagination";
import EmptyMessage from "components/Referrals/EmptyMessage";
import usePagination from "components/Referrals/usePagination";
import StatsTooltipRow from "components/StatsTooltip/StatsTooltipRow";
import Tooltip from "components/Tooltip/Tooltip";
import { getExplorerUrl } from "config/chains";
import { getTokens } from "config/tokens";
import useUserIncentiveData from "domain/synthetics/common/useUserIncentiveData";
import { BigNumber } from "ethers";
import { useChainId } from "lib/chains";
import { formatDate } from "lib/dates";
import { formatTokenAmount, formatTokenAmountWithUsd, formatUsd } from "lib/numbers";
import { shortenAddressOrEns } from "lib/wallets";
import useWallet from "lib/wallets/useWallet";

const INCENTIVE_DISTRIBUTION_TYPEID_MAP = {
  1001: "GM Airdrop",
  1002: "GLP to GM Airdrop",
  1003: "TRADING Airdrop",
};

function getNormalizedIncentive(incentive, tokens) {
  return incentive.tokens.map((tokenAddress, index) => {
    const tokenInfo = tokens.find((token) => token.address.toLowerCase() === tokenAddress);
    return {
      tokenInfo,
      tokenAmount: BigNumber.from(incentive.amounts[index]),
      tokenUsd: BigNumber.from(incentive.amountsInUsd[index]),
    };
  });
}

export default function UserIncentiveDistributionList() {
  const { account } = useWallet();
  const { chainId } = useChainId();
  const tokens = getTokens(chainId);
  const userIncentiveData = useUserIncentiveData(chainId, account);
  const { currentPage, getCurrentData, setCurrentPage, pageCount } = usePagination(userIncentiveData.data);
  const currentIncentiveData = getCurrentData();

  if (!userIncentiveData?.data?.length) {
    return (
      <EmptyMessage
        tooltipText={t`Incentives are airdropped weekly.`}
        message={t`No incentives distribution history yet.`}
        className="mt-sm"
      />
    );
  }

  return (
    <div>
      <Card title={t`Incentives Distribution History`} tooltipText={t`Incentives are airdropped weekly.`}>
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

                const incentiveInfo = getNormalizedIncentive(incentive, tokens);
                const totalUsd = incentiveInfo.reduce(
                  (total, tokenInfo) => total.add(tokenInfo.tokenUsd),
                  BigNumber.from(0)
                );

                return (
                  <tr key={incentive.id}>
                    <td data-label="Date">{formatDate(incentive.timestamp)}</td>
                    <td data-label="Type">{INCENTIVE_DISTRIBUTION_TYPEID_MAP[incentive.typeId]}</td>
                    <td data-label="Amount">
                      <Tooltip
                        handle={formatUsd(totalUsd)}
                        renderContent={() => {
                          return incentiveInfo.map((tokenInfo) => (
                            <StatsTooltipRow
                              showDollar={false}
                              label={tokenInfo.tokenInfo?.symbol}
                              value={formatTokenAmount(
                                tokenInfo.tokenAmount,
                                tokenInfo.tokenInfo?.decimals,
                                tokenInfo.tokenInfo?.symbol
                              )}
                            />
                          ));
                        }}
                      />
                    </td>
                    <td data-label="Transaction">
                      <ExternalLink href={`${explorerURL}tx/${incentive.transactionHash}`}>
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

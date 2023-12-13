import { t, Trans } from "@lingui/macro";
import { useConnectModal } from "@rainbow-me/rainbowkit";
import Button from "components/Button/Button";
import Card from "components/Common/Card";
import ExternalLink from "components/ExternalLink/ExternalLink";
import Pagination from "components/Pagination/Pagination";
import EmptyMessage from "components/Referrals/EmptyMessage";
import usePagination from "components/Referrals/usePagination";
import StatsTooltipRow from "components/StatsTooltip/StatsTooltipRow";
import Tooltip from "components/Tooltip/Tooltip";
import { getExplorerUrl } from "config/chains";
import { getTokens } from "config/tokens";
import useUserIncentiveData, { UserIncentiveData } from "domain/synthetics/common/useUserIncentiveData";
import { Token } from "domain/tokens";
import { BigNumber } from "ethers";
import { useChainId } from "lib/chains";
import { formatDate } from "lib/dates";
import { formatTokenAmount, formatUsd } from "lib/numbers";
import { shortenAddressOrEns } from "lib/wallets";
import useWallet from "lib/wallets/useWallet";
import { useMemo } from "react";

const INCENTIVE_DISTRIBUTION_TYPEID_MAP = {
  1001: "GM Airdrop",
  1002: "GLP to GM Airdrop",
  1003: "TRADING Airdrop",
};

function getNormalizedIncentive(incentive: UserIncentiveData, tokens: Token[]) {
  const tokenIncentiveDetails = incentive.tokens.map((tokenAddress, index) => {
    const tokenInfo = tokens.find((token) => token.address.toLowerCase() === tokenAddress);
    return {
      tokenInfo,
      tokenAmount: BigNumber.from(incentive.amounts[index]),
      tokenUsd: BigNumber.from(incentive.amountsInUsd[index]),
      id: `${incentive.id}-${tokenAddress}`,
    };
  });

  const totalUsd = tokenIncentiveDetails.reduce((total, tokenInfo) => total.add(tokenInfo.tokenUsd), BigNumber.from(0));

  return {
    tokenIncentiveDetails,
    totalUsd,
  };
}

export default function UserIncentiveDistributionList() {
  const { account, active } = useWallet();
  const { openConnectModal } = useConnectModal();
  const { chainId } = useChainId();
  const tokens = getTokens(chainId);
  const userIncentiveData = useUserIncentiveData(chainId, account);

  const normalizedIncentiveData = useMemo(() => {
    return userIncentiveData?.data?.map((incentive) => {
      return {
        ...incentive,
        ...getNormalizedIncentive(incentive, tokens),
      };
    });
  }, [userIncentiveData, tokens]);

  const { currentPage, getCurrentData, setCurrentPage, pageCount } = usePagination(
    "UserIncentiveDistributionList",
    normalizedIncentiveData
  );
  const currentIncentiveData = getCurrentData();

  if (!userIncentiveData?.data?.length) {
    return (
      <EmptyMessage
        tooltipText={t`Incentives are airdropped weekly.`}
        message={t`No incentives distribution history yet.`}
        className="mt-sm"
      >
        {!active && (
          <div className="mt-md">
            <Button variant="secondary" onClick={openConnectModal}>
              <Trans>Connect Wallet</Trans>
            </Button>
          </div>
        )}
      </EmptyMessage>
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
                const { tokenIncentiveDetails, totalUsd, id, timestamp, typeId, transactionHash } = incentive;
                const explorerURL = getExplorerUrl(chainId);
                return (
                  <tr key={id}>
                    <td data-label="Date">{formatDate(timestamp)}</td>
                    <td data-label="Type">{INCENTIVE_DISTRIBUTION_TYPEID_MAP[typeId]}</td>
                    <td data-label="Amount">
                      <Tooltip
                        handle={formatUsd(totalUsd)}
                        renderContent={() => {
                          return tokenIncentiveDetails.map((tokenInfo) => (
                            <StatsTooltipRow
                              key={tokenInfo.id}
                              showDollar={false}
                              label={tokenInfo.tokenInfo?.symbol}
                              value={formatTokenAmount(tokenInfo.tokenAmount, tokenInfo.tokenInfo?.decimals, "", {
                                useCommas: true,
                              })}
                            />
                          ));
                        }}
                      />
                    </td>
                    <td data-label="Transaction">
                      <ExternalLink href={`${explorerURL}tx/${transactionHash}`}>
                        {shortenAddressOrEns(transactionHash, 13)}
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

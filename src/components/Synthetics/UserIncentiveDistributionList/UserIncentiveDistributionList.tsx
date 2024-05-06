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
import { useCallback, useMemo } from "react";
import { Link } from "react-router-dom";

const INCENTIVE_TYPE_MAP = {
  1001: t`GM Airdrop`,
  1002: t`GLP to GM Airdrop`,
  1003: t`TRADING Airdrop`,
};

const INCENTIVE_TOOLTIP_MAP = {
  2001: { link: "/competitions/march_13-20_2024", text: t`EIP-4844, 13-20 Mar` },
  2002: { link: "/competitions/march_20-27_2024", text: t`EIP-4844, 20-27 Mar` },
};

type NormalizedIncentiveData = ReturnType<typeof getNormalizedIncentive>;

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
    ...incentive,
    tokenIncentiveDetails,
    totalUsd,
    typeId: Number(incentive.typeId),
  };
}

export default function UserIncentiveDistributionList() {
  const { account, active } = useWallet();
  const { openConnectModal } = useConnectModal();
  const { chainId } = useChainId();
  const tokens = getTokens(chainId);
  const userIncentiveData = useUserIncentiveData(chainId, account);

  const normalizedIncentiveData: NormalizedIncentiveData[] = useMemo(
    () => userIncentiveData?.data?.map((incentive) => getNormalizedIncentive(incentive, tokens)) ?? [],
    [userIncentiveData, tokens]
  );

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
        className="!mt-10"
      >
        {!active && (
          <div className="mt-24">
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
              {currentIncentiveData?.map((incentive) => (
                <IncentiveItem incentive={incentive} key={incentive.id} />
              ))}
            </tbody>
          </table>
        </div>
      </Card>
      <Pagination page={currentPage} pageCount={pageCount} onPageChange={(page) => setCurrentPage(page)} />
    </div>
  );
}

function IncentiveItem({ incentive }: { incentive: NormalizedIncentiveData }) {
  const { tokenIncentiveDetails, totalUsd, timestamp, typeId, transactionHash } = incentive;
  const { chainId } = useChainId();
  const explorerURL = getExplorerUrl(chainId);

  const isCompetition = typeId >= 2000 && typeId < 3000;
  const typeStr = isCompetition ? t`COMPETITION Airdrop` : INCENTIVE_TYPE_MAP[typeId];
  const tooltipData = INCENTIVE_TOOLTIP_MAP[typeId];

  const renderTotalTooltipContent = useCallback(() => {
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
  }, [tokenIncentiveDetails]);
  const renderTooltipTypeContent = useCallback(
    () =>
      tooltipData ? (
        <Link className="link-underline" to={tooltipData.link}>
          {tooltipData.text}
        </Link>
      ) : null,
    [tooltipData]
  );
  const type = tooltipData ? <Tooltip handle={typeStr} renderContent={renderTooltipTypeContent} /> : typeStr;

  return (
    <tr>
      <td data-label="Date">{formatDate(timestamp)}</td>
      <td data-label="Type">{type}</td>
      <td data-label="Amount">
        <Tooltip handle={formatUsd(totalUsd)} className="whitespace-nowrap" renderContent={renderTotalTooltipContent} />
      </td>
      <td data-label="Transaction">
        <ExternalLink href={`${explorerURL}tx/${transactionHash}`}>
          {shortenAddressOrEns(transactionHash, 13)}
        </ExternalLink>
      </td>
    </tr>
  );
}

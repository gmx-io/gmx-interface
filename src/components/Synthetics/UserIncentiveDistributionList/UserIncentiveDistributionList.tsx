import { t, Trans } from "@lingui/macro";
import { useLingui } from "@lingui/react";
import { useConnectModal } from "@rainbow-me/rainbowkit";
import { useCallback, useMemo } from "react";
import { Link } from "react-router-dom";

import { getExplorerUrl } from "config/chains";
import { selectGmMarkets } from "context/SyntheticsStateContext/selectors/globalSelectors";
import { useSelector } from "context/SyntheticsStateContext/utils";
import { INCENTIVE_TOOLTIP_MAP, INCENTIVE_TYPE_MAP } from "domain/synthetics/common/incentivesAirdropMessages";
import useUserIncentiveData, { UserIncentiveData } from "domain/synthetics/common/useUserIncentiveData";
import { MarketsData, useMarketTokensData } from "domain/synthetics/markets";
import { TokensData } from "domain/synthetics/tokens";
import { Token } from "domain/tokens";
import { useChainId } from "lib/chains";
import { formatDate } from "lib/dates";
import { GM_DECIMALS } from "lib/legacy";
import { expandDecimals, formatBalanceAmount, formatUsd } from "lib/numbers";
import { shortenAddressOrEns } from "lib/wallets";
import useWallet from "lib/wallets/useWallet";
import { getTokens } from "sdk/configs/tokens";
import { bigMath } from "sdk/utils/bigmath";

import Button from "components/Button/Button";
import Card from "components/Common/Card";
import ExternalLink from "components/ExternalLink/ExternalLink";
import { BottomTablePagination } from "components/Pagination/BottomTablePagination";
import EmptyMessage from "components/Referrals/EmptyMessage";
import usePagination, { DEFAULT_PAGE_SIZE } from "components/Referrals/usePagination";
import StatsTooltipRow from "components/StatsTooltip/StatsTooltipRow";
import { TableTd, TableTh, TableTheadTr, TableTr } from "components/Table/Table";
import { TableScrollFadeContainer } from "components/TableScrollFade/TableScrollFade";
import Tooltip from "components/Tooltip/Tooltip";

type NormalizedIncentiveData = ReturnType<typeof getNormalizedIncentive>;

function getNormalizedIncentive(
  incentive: UserIncentiveData,
  tokens: Token[],
  gmMarkets: MarketsData | undefined,
  marketTokensData: TokensData | undefined
) {
  const tokenIncentiveDetails = incentive.tokens.map((tokenAddressRaw, index) => {
    // backend should send tokenAddress in lowercase but we double-check here to not break the logic
    const tokenAddress = tokenAddressRaw.toLowerCase();
    const marketTokenKey = gmMarkets ? Object.keys(gmMarkets).find((key) => key.toLowerCase() === tokenAddress) : null;
    const marketToken = marketTokenKey ? gmMarkets?.[marketTokenKey] : undefined;
    const tokenInfo = marketToken ? undefined : tokens.find((token) => token.address.toLowerCase() === tokenAddress);
    const amountInUsd =
      marketTokensData && marketToken
        ? bigMath.mulDiv(
            BigInt(incentive.amounts[index]),
            marketTokensData[marketToken.marketTokenAddress].prices.maxPrice,
            expandDecimals(1, GM_DECIMALS)
          )
        : BigInt(incentive.amountsInUsd[index]);

    return {
      symbol: tokenInfo ? tokenInfo.symbol : marketToken?.name,
      decimals: tokenInfo ? tokenInfo.decimals : GM_DECIMALS,
      amount: BigInt(incentive.amounts[index]),
      amountInUsd,
      id: `${incentive.id}-${tokenAddress}`,
    };
  });

  const totalUsd = tokenIncentiveDetails.reduce((total, tokenInfo) => total + tokenInfo.amountInUsd, 0n);

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
  const gmMarkets = useSelector(selectGmMarkets);
  const { marketTokensData } = useMarketTokensData(chainId, { isDeposit: false });
  const userIncentiveData = useUserIncentiveData(chainId, account);

  const normalizedIncentiveData: NormalizedIncentiveData[] = useMemo(
    () =>
      userIncentiveData?.data?.map((incentive) =>
        getNormalizedIncentive(incentive, tokens, gmMarkets, marketTokensData)
      ) ?? [],
    [userIncentiveData?.data, tokens, gmMarkets, marketTokensData]
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
          <div className="mt-15">
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
      <Card
        title={t`Incentives Distribution History`}
        tooltipText={t`Incentives are airdropped weekly.`}
        bodyPadding={false}
        divider={false}
      >
        <TableScrollFadeContainer>
          <table className="w-full min-w-max">
            <thead>
              <TableTheadTr bordered>
                <TableTh>
                  <Trans>Date</Trans>
                </TableTh>
                <TableTh>
                  <Trans>Type</Trans>
                </TableTh>
                <TableTh>
                  <Trans>Amount</Trans>
                </TableTh>
                <TableTh>
                  <Trans>Transaction</Trans>
                </TableTh>
              </TableTheadTr>
            </thead>
            <tbody>
              {currentIncentiveData?.map((incentive) => <IncentiveItem incentive={incentive} key={incentive.id} />)}
              {currentIncentiveData &&
                currentIncentiveData.length > 0 &&
                currentIncentiveData.length < DEFAULT_PAGE_SIZE && (
                  // eslint-disable-next-line react-perf/jsx-no-new-object-as-prop
                  <tr style={{ height: 42.5 * (DEFAULT_PAGE_SIZE - currentIncentiveData.length) }} />
                )}
            </tbody>
          </table>
        </TableScrollFadeContainer>
        <BottomTablePagination page={currentPage} pageCount={pageCount} onPageChange={setCurrentPage} />
      </Card>
    </div>
  );
}

function IncentiveItem({ incentive }: { incentive: NormalizedIncentiveData }) {
  const { tokenIncentiveDetails, totalUsd, timestamp, typeId, transactionHash } = incentive;
  const { chainId } = useChainId();
  const explorerURL = getExplorerUrl(chainId);
  const { _ } = useLingui();

  const isCompetition = typeId >= 2000 && typeId < 3000;
  const typeStr = isCompetition ? t`COMPETITION Airdrop` : _(INCENTIVE_TYPE_MAP[typeId] ?? t`Airdrop`);
  const tooltipData = INCENTIVE_TOOLTIP_MAP[typeId];

  const renderTotalTooltipContent = useCallback(() => {
    return tokenIncentiveDetails.map((tokenInfo) => (
      <StatsTooltipRow
        key={tokenInfo.id}
        showDollar={false}
        label={tokenInfo.symbol}
        value={formatBalanceAmount(tokenInfo.amount, tokenInfo.decimals)}
      />
    ));
  }, [tokenIncentiveDetails]);
  const renderTooltipTypeContent = useCallback(
    () =>
      tooltipData ? (
        <Link className="link-underline" to={tooltipData.link}>
          {_(tooltipData.text.id)}
        </Link>
      ) : null,
    [_, tooltipData]
  );
  const type = tooltipData ? <Tooltip handle={typeStr} renderContent={renderTooltipTypeContent} /> : typeStr;

  return (
    <TableTr bordered={false} hoverable={false}>
      <TableTd data-label="Date">{formatDate(timestamp)}</TableTd>
      <TableTd data-label="Type">{type}</TableTd>
      <TableTd data-label="Amount">
        <Tooltip handle={formatUsd(totalUsd)} className="whitespace-nowrap" renderContent={renderTotalTooltipContent} />
      </TableTd>
      <TableTd data-label="Transaction">
        <ExternalLink href={`${explorerURL}tx/${transactionHash}`}>
          {shortenAddressOrEns(transactionHash, 13)}
        </ExternalLink>
      </TableTd>
    </TableTr>
  );
}

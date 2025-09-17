import { t, Trans } from "@lingui/macro";
import { useLingui } from "@lingui/react";
import { useConnectModal } from "@rainbow-me/rainbowkit";
import cn from "classnames";
import { useCallback, useMemo } from "react";
import { Link } from "react-router-dom";
import { useMedia } from "react-use";

import { ARBITRUM, AVALANCHE_FUJI, getExplorerUrl } from "config/chains";
import { selectGmMarkets } from "context/SyntheticsStateContext/selectors/globalSelectors";
import { useSelector } from "context/SyntheticsStateContext/utils";
import { GLP_DISTRIBUTION_ID, GLP_DISTRIBUTION_TEST_ID } from "domain/synthetics/claims/useUserClaimableAmounts";
import { INCENTIVE_TOOLTIP_MAP, INCENTIVE_TYPE_MAP } from "domain/synthetics/common/incentivesAirdropMessages";
import useUserIncentiveData from "domain/synthetics/common/useUserIncentiveData";
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
import { Distribution } from "sdk/types/subsquid";
import { bigMath } from "sdk/utils/bigmath";

import Button from "components/Button/Button";
import Card from "components/Card/Card";
import ExternalLink from "components/ExternalLink/ExternalLink";
import { BottomTablePagination } from "components/Pagination/BottomTablePagination";
import EmptyMessage from "components/Referrals/EmptyMessage";
import usePagination, { DEFAULT_PAGE_SIZE } from "components/Referrals/usePagination";
import StatsTooltipRow from "components/StatsTooltip/StatsTooltipRow";
import { TableTd, TableTh, TableTheadTr, TableTr } from "components/Table/Table";
import { TableScrollFadeContainer } from "components/TableScrollFade/TableScrollFade";
import Tooltip from "components/Tooltip/Tooltip";

import { AboutGlpIncident } from "./AboutGlpIncident";
import ClaimableAmounts from "./ClaimableAmounts";

type NormalizedIncentiveData = ReturnType<typeof getNormalizedIncentive>;

function getNormalizedIncentive(
  incentive: Distribution,
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
        : BigInt(incentive.amountsInUsd?.[index] ?? 0);

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
    typeId: BigInt(incentive.typeId),
  };
}

export default function UserIncentiveDistributionList() {
  const { account, active } = useWallet();
  const { openConnectModal } = useConnectModal();
  const { chainId, srcChainId } = useChainId();
  const tokens = getTokens(chainId);
  const gmMarkets = useSelector(selectGmMarkets);
  const { marketTokensData } = useMarketTokensData(chainId, srcChainId, { isDeposit: false });
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

  const isSmallResolution = useMedia("(max-width: 1024px)");

  return (
    <div
      className={cn("flex gap-18", {
        "flex-row": !isSmallResolution,
        "flex-col-reverse": isSmallResolution,
      })}
    >
      <div className="flex flex-grow flex-col gap-18">
        {account ? (
          <Card title={t`Claimable Balance`} bodyPadding={false} divider={false}>
            {chainId !== AVALANCHE_FUJI ? (
              <ClaimableAmounts />
            ) : (
              <p className="p-18 text-gray-500">
                <Trans>Claims are not available on Avalanche Fuji</Trans>
              </p>
            )}
          </Card>
        ) : null}
        <Card title={t`Distribution History`} bodyPadding={false} divider={false}>
          {!userIncentiveData?.data?.length ? (
            <EmptyMessage
              tooltipText={t`The distribution history for your incentives, airdrops, and prizes will be displayed here.`}
              message={t`No distribution history yet`}
              className="!mt-10"
            >
              {!active && (
                <div className="mt-15">
                  <Button variant="secondary" onClick={openConnectModal}>
                    <Trans>Connect wallet</Trans>
                  </Button>
                </div>
              )}
            </EmptyMessage>
          ) : (
            <TableScrollFadeContainer>
              <table className="w-full min-w-max">
                <thead>
                  <TableTheadTr>
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
          )}
          <BottomTablePagination page={currentPage} pageCount={pageCount} onPageChange={setCurrentPage} />
        </Card>
      </div>
      {chainId === ARBITRUM ? <AboutGlpIncident /> : null}
    </div>
  );
}

function getTypeStr(_: ReturnType<typeof useLingui>["_"], typeId: bigint) {
  const isTestGlpIncident = typeId === GLP_DISTRIBUTION_TEST_ID;

  if (isTestGlpIncident) {
    return t`GLP Distribution (test)`;
  }

  if (typeId === GLP_DISTRIBUTION_ID) {
    return t`GLP Distribution`;
  }

  const isCompetition = typeId >= 2000 && typeId < 3000;
  return isCompetition ? t`COMPETITION Airdrop` : _(INCENTIVE_TYPE_MAP[String(typeId)] ?? t`Airdrop`);
}

function IncentiveItem({ incentive }: { incentive: NormalizedIncentiveData }) {
  const { tokenIncentiveDetails, totalUsd, transaction, typeId } = incentive;
  const { chainId } = useChainId();
  const explorerURL = getExplorerUrl(chainId);
  const { _ } = useLingui();
  const typeStr = getTypeStr(_, typeId);
  const tooltipData = INCENTIVE_TOOLTIP_MAP[String(typeId)];

  const renderTotalTooltipContent = useCallback(() => {
    return tokenIncentiveDetails.map((tokenInfo) => (
      <StatsTooltipRow
        key={tokenInfo.id}
        showDollar={false}
        label={tokenInfo.symbol}
        value={formatBalanceAmount(tokenInfo.amount, tokenInfo.decimals)}
        valueClassName="numbers"
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
    <TableTr>
      <TableTd data-label="Date">{formatDate(transaction.timestamp)}</TableTd>
      <TableTd data-label="Type" className="font-medium">
        {type}
      </TableTd>
      <TableTd data-label="Amount">
        <Tooltip
          handle={formatUsd(totalUsd)}
          handleClassName="numbers"
          className="whitespace-nowrap"
          renderContent={renderTotalTooltipContent}
        />
      </TableTd>
      <TableTd data-label="Transaction">
        <ExternalLink href={`${explorerURL}tx/${transaction.hash}`}>
          {shortenAddressOrEns(transaction.hash, 13)}
        </ExternalLink>
      </TableTd>
    </TableTr>
  );
}

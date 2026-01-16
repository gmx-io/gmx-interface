import { t, Trans } from "@lingui/macro";
import { useLingui } from "@lingui/react";
import { useConnectModal } from "@rainbow-me/rainbowkit";
import cx from "classnames";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";

import { ARBITRUM, AVALANCHE_FUJI, ContractsChainId, getExplorerUrl } from "config/chains";
import { getIsGlv } from "config/markets";
import { selectGmMarkets } from "context/SyntheticsStateContext/selectors/globalSelectors";
import { useSelector } from "context/SyntheticsStateContext/utils";
import { INCENTIVE_TOOLTIP_MAP, INCENTIVE_TYPE_MAP } from "domain/synthetics/common/incentivesAirdropMessages";
import useUserIncentiveData from "domain/synthetics/common/useUserIncentiveData";
import { MarketsData, useMarketTokensData } from "domain/synthetics/markets";
import type { TokensData } from "domain/synthetics/tokens";
import type { Token } from "domain/tokens";
import { useChainId } from "lib/chains";
import { formatDate, formatDateTime, getDaysAgo } from "lib/dates";
import { GM_DECIMALS } from "lib/legacy";
import { expandDecimals, formatBalanceAmount, formatUsd } from "lib/numbers";
import { useBreakpoints } from "lib/useBreakpoints";
import { shortenAddressOrEns } from "lib/wallets";
import useWallet from "lib/wallets/useWallet";
import { getTokens } from "sdk/configs/tokens";
import type { Distribution } from "sdk/types/subsquid";
import { bigMath } from "sdk/utils/bigmath";

import Button from "components/Button/Button";
import { EmptyTableContent } from "components/EmptyTableContent/EmptyTableContent";
import ExternalLink from "components/ExternalLink/ExternalLink";
import { BottomTablePagination } from "components/Pagination/BottomTablePagination";
import usePagination from "components/Referrals/usePagination";
import StatsTooltipRow from "components/StatsTooltip/StatsTooltipRow";
import { TableTdActionable, TableTh, TableTheadTr, TableTrActionable } from "components/Table/Table";
import { TableScrollFadeContainer } from "components/TableScrollFade/TableScrollFade";
import TokenIcon from "components/TokenIcon/TokenIcon";
import Tooltip from "components/Tooltip/Tooltip";
import TooltipWithPortal from "components/Tooltip/TooltipWithPortal";

import CheckIcon from "img/ic_check.svg?react";
import ChevronDownIcon from "img/ic_chevron_down.svg?react";
import CloseIcon from "img/ic_close.svg?react";
import WalletIcon from "img/ic_wallet.svg?react";

import { AboutGlpIncident } from "./AboutGlpIncident";
import ClaimableAmounts from "./ClaimableAmounts";

type NormalizedIncentiveData = ReturnType<typeof getNormalizedIncentive>;

function getNormalizedIncentive(
  chainId: ContractsChainId,
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

    let symbol: string | undefined = tokenInfo ? tokenInfo.symbol : marketToken?.name;
    if (!symbol) {
      symbol = getIsGlv(chainId, tokenAddress) ? "GLV" : undefined;
    }

    return {
      symbol,
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

export default function UserIncentiveDistribution() {
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
        getNormalizedIncentive(chainId, incentive, tokens, gmMarkets, marketTokensData)
      ) ?? [],
    [userIncentiveData?.data, chainId, tokens, gmMarkets, marketTokensData]
  );

  const { currentPage, getCurrentData, setCurrentPage, pageCount } = usePagination(
    "UserIncentiveDistributionList",
    normalizedIncentiveData,
    15
  );
  const currentIncentiveData = getCurrentData();

  const { isMobile, isTablet } = useBreakpoints();

  const claimableBalance = account ? (
    <div className="flex flex-col gap-20 rounded-8 bg-slate-900 p-20">
      <div className="text-body-large font-medium text-typography-primary">
        <Trans>Claimable Balance</Trans>
      </div>
      {chainId !== AVALANCHE_FUJI ? (
        <ClaimableAmounts />
      ) : (
        <p className="p-18 text-gray-500">
          <Trans>Claims are not available on Avalanche Fuji</Trans>
        </p>
      )}
    </div>
  ) : null;

  return (
    <div className={cx("grid grid-cols-[1fr_400px] gap-8 max-xl:grid-cols-[1fr]")}>
      <div className="flex grow flex-col gap-8">
        {isTablet && claimableBalance}
        <div className="flex grow flex-col gap-8 overflow-hidden rounded-8 bg-slate-900">
          {!userIncentiveData?.data?.length ? (
            <EmptyTableContent
              emptyText={
                <div className="flex flex-col items-center">
                  <TooltipWithPortal
                    handle={t`No distribution history yet`}
                    content={t`The distribution history for your incentives, airdrops, and prizes will be displayed here.`}
                  />
                  {!active ? (
                    <div className="mt-15">
                      <Button variant="primary" onClick={openConnectModal}>
                        <WalletIcon className="size-16" />
                        <Trans>Connect wallet</Trans>
                      </Button>
                    </div>
                  ) : null}
                </div>
              }
              isEmpty={true}
              isLoading={!userIncentiveData}
            />
          ) : (
            <TableScrollFadeContainer className="grow px-8">
              <table className="w-full min-w-max">
                <thead>
                  <TableTheadTr>
                    <TableTh className="w-[25%]">
                      <Trans>Date</Trans>
                    </TableTh>
                    {!isMobile && (
                      <TableTh>
                        <Trans>Type</Trans>
                      </TableTh>
                    )}
                    <TableTh className="max-xl:text-right">
                      <Trans>Amount</Trans>
                    </TableTh>
                    {!isMobile && (
                      <TableTh className="text-right">
                        <Trans>Transaction</Trans>
                      </TableTh>
                    )}
                    <TableTh className="w-24" />
                  </TableTheadTr>
                </thead>
                <tbody>
                  {currentIncentiveData?.map((incentive) => <IncentiveItem incentive={incentive} key={incentive.id} />)}
                </tbody>
              </table>
            </TableScrollFadeContainer>
          )}
          <BottomTablePagination
            page={currentPage}
            pageCount={pageCount}
            onPageChange={setCurrentPage}
            className="border-t-1/2 border-slate-600"
          />
        </div>
      </div>
      <div className="min-w-400 flex flex-col gap-8">
        {!isTablet && claimableBalance}
        {chainId === ARBITRUM ? <AboutGlpIncident /> : null}
      </div>
    </div>
  );
}

function getTypeStr(_: ReturnType<typeof useLingui>["_"], typeId: bigint) {
  const isCompetition = typeId >= 2000n && typeId < 3000n;
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
    return tokenIncentiveDetails.map((tokenInfo) => {
      const symbol = tokenInfo.symbol;

      return (
        <StatsTooltipRow
          key={tokenInfo.id}
          showDollar={false}
          label={
            <div className="flex items-center gap-4">
              {symbol ? <TokenIcon symbol={symbol} displaySize={16} /> : null}
              <span>{symbol}</span>
            </div>
          }
          value={formatBalanceAmount(tokenInfo.amount, tokenInfo.decimals)}
          valueClassName="numbers"
        />
      );
    });
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

  const [isExpanded, setIsExpanded] = useState(false);

  const onClick = useCallback(() => {
    setIsExpanded((prev) => !prev);
  }, []);

  const { isMobile } = useBreakpoints();

  const txnTimestamp = (
    <span>
      {formatDateTime(transaction.timestamp)}{" "}
      <span className="text-typography-secondary">({getDaysAgo(transaction.timestamp)} days ago)</span>
    </span>
  );
  const txnLink = (
    <ExternalLink href={`${explorerURL}tx/${transaction.hash}`} variant="icon">
      {shortenAddressOrEns(transaction.hash, 27)}
    </ExternalLink>
  );
  const txnStatus = <TxnStatus hash={transaction.hash} />;

  return (
    <>
      <TableTrActionable onClick={onClick}>
        <TableTdActionable data-label="Date">{formatDate(transaction.timestamp)}</TableTdActionable>
        {!isMobile && <TableTdActionable data-label="Type">{type}</TableTdActionable>}
        <TableTdActionable className="max-xl:text-right" data-label="Amount">
          <Tooltip
            handle={formatUsd(totalUsd)}
            handleClassName="numbers"
            className="whitespace-nowrap"
            renderContent={renderTotalTooltipContent}
          />
        </TableTdActionable>
        {!isMobile && (
          <TableTdActionable data-label="Transaction" className="text-right">
            <ExternalLink
              className="font-medium text-typography-secondary"
              href={`${explorerURL}tx/${transaction.hash}`}
              variant="icon"
            >
              {shortenAddressOrEns(transaction.hash, 13)}
            </ExternalLink>
          </TableTdActionable>
        )}
        <TableTdActionable className="w-24">
          <ChevronDownIcon className={cx("size-16 text-typography-secondary", { "rotate-180": isExpanded })} />
        </TableTdActionable>
      </TableTrActionable>
      {isExpanded && (
        <tr>
          <td colSpan={isMobile ? 4 : 1} className="px-4 py-10 pl-20">
            <div className="flex flex-col gap-2">
              <div
                className={cx("flex items-center justify-between font-medium text-typography-secondary", {
                  "text-13": isMobile,
                  "h-28": !isMobile,
                })}
              >
                <Trans>Status</Trans>
                {isMobile && txnStatus}
              </div>
              <div
                className={cx("flex font-medium text-typography-secondary", {
                  "flex-col justify-center gap-2 text-13": isMobile,
                  "h-28 items-center": !isMobile,
                })}
              >
                <Trans>Type</Trans>

                {isMobile && <span className="text-14 text-typography-primary">{type}</span>}
              </div>
              {tokenIncentiveDetails.map((tokenInfo) => (
                <div
                  key={tokenInfo.id}
                  className={cx("flex font-medium text-typography-secondary", {
                    "flex-col justify-center gap-2 text-13": isMobile,
                    "h-28 items-center": !isMobile,
                  })}
                >
                  <Trans>{tokenInfo.symbol} Amount</Trans>

                  {isMobile && (
                    <span className="text-14 text-typography-primary">
                      {formatBalanceAmount(tokenInfo.amount, tokenInfo.decimals)}{" "}
                      <span className="text-typography-secondary">{tokenInfo.symbol}</span>
                    </span>
                  )}
                </div>
              ))}
              <div
                className={cx("flex font-medium text-typography-secondary", {
                  "flex-col justify-center gap-2 text-13": isMobile,
                  "h-28 items-center": !isMobile,
                })}
              >
                <Trans>Transaction hash</Trans>
                {isMobile && <span className="text-14 text-typography-primary">{txnLink}</span>}
              </div>
              <div
                className={cx("flex font-medium text-typography-secondary", {
                  "flex-col justify-center gap-2 text-13": isMobile,
                  "h-28 items-center": !isMobile,
                })}
              >
                <Trans>Timestamp</Trans>
                {isMobile && <span className="text-14 text-typography-primary">{txnTimestamp}</span>}
              </div>
            </div>
          </td>
          {!isMobile && (
            <td colSpan={4} className="px-4 py-10">
              <div className="flex flex-col gap-2">
                <div className="flex h-28 items-center font-medium text-typography-primary">{txnStatus}</div>
                <div className="flex h-28 items-center font-medium text-typography-primary">{type}</div>
                {tokenIncentiveDetails.map((tokenInfo) => (
                  <div key={tokenInfo.id} className="flex h-28 items-center gap-2 font-medium text-typography-primary">
                    {formatBalanceAmount(tokenInfo.amount, tokenInfo.decimals)}
                    <span className="text-typography-secondary">{tokenInfo.symbol}</span>
                  </div>
                ))}
                <div className="flex h-28 items-center font-medium text-typography-primary">{txnLink}</div>
                <div className="flex h-28 items-center gap-2 font-medium text-typography-primary">{txnTimestamp}</div>
              </div>
            </td>
          )}
        </tr>
      )}
    </>
  );
}

const TxnStatus = ({ hash }: { hash: string }) => {
  const { signer } = useWallet();
  const [status, setStatus] = useState<"success" | "failed" | null>(null);

  useEffect(() => {
    signer?.provider?.getTransactionReceipt(hash).then((receipt) => {
      setStatus(receipt?.status === 0 ? "failed" : "success");
    });
  }, [hash, signer?.provider]);

  return (
    <div className="flex h-28 items-center font-medium text-typography-primary">
      {!status && <span>...</span>}
      {status === "success" && (
        <div className="flex items-center gap-2 rounded-full bg-green-100/20 px-8 py-2 text-green-500">
          <CheckIcon className="size-16" />
          <Trans>Success</Trans>
        </div>
      )}
      {status === "failed" && (
        <div className="flex items-center gap-2 rounded-full bg-red-100/20 px-8 py-2 text-red-500">
          <CloseIcon className="size-16" />
          <Trans>Failed</Trans>
        </div>
      )}
    </div>
  );
};

import { t, Trans } from "@lingui/macro";
import { useMemo, useState } from "react";
import { useCopyToClipboard } from "react-use";

import { GMTRADE_URL } from "config/links";
import { type GtBuybackRequest } from "domain/gtBuyback/useGtBuybackSummary"; // rewards-tester (was: also imported useGtBuybackSummary)
import { useRewardsTesterEarnGtBuybackSummary as useGtBuybackSummary } from "pages/RewardsPage/tester/useRewardsTesterEarn"; // rewards-tester
import { formatTimeLeft } from "lib/dates";
import { helperToast } from "lib/helperToast";
import { formatUsd } from "lib/numbers";
import { useCurrentUnixTimestamp } from "lib/useCurrentUnixTimestamp";
import { sendEarnPortfolioItemClickEvent } from "lib/userAnalytics/earnEvents";
import { bigMath } from "sdk/utils/bigmath";

import { AlertInfoCard } from "components/AlertInfo/AlertInfoCard";
import Button from "components/Button/Button";
import { ColorfulBanner } from "components/ColorfulBanner/ColorfulBanner";
import { SyntheticsInfoRow } from "components/SyntheticsInfoRow";
import Tooltip from "components/Tooltip/Tooltip";

import HistoryIcon from "img/ic_clock.svg?react";
import CopyIcon from "img/ic_copy.svg?react";
import NewLinkIcon from "img/ic_new_link.svg?react";
import gtIcon from "img/tokens/ic_gt.svg";

import { BaseAssetCard } from "./BaseAssetCard";
import { formatGt, formatGtNumber, formatUsdc } from "./gtBuybackFormat";
import { GtBuybackHistoryModal, GtBuybackModal } from "./GtBuybackModal";
import { GtReferralCodeModal } from "./GtReferralCodeModal";

const EMPTY_HISTORY: GtBuybackRequest[] = [];

function ActiveRequestNotice({ request }: { request: GtBuybackRequest }) {
  const now = useCurrentUnixTimestamp(60_000);
  const amount = formatGt(request.gtAmount);
  const timeLeft = request.windowEndsAt ? formatTimeLeft(request.windowEndsAt - now) : "";

  switch (request.status) {
    case "waitingSignature":
      return <Trans>Your request to sell {amount} is waiting for your signature.</Trans>;
    case "submitting":
      return <Trans>Submitting your request to sell {amount}…</Trans>;
    case "inBuyback":
      return timeLeft ? (
        <Trans>
          {amount} is in today's buyback. The window ends in {timeLeft}.
        </Trans>
      ) : (
        <Trans>{amount} is in today's buyback.</Trans>
      );
    case "awaitingPayout":
      return <Trans>{amount} was bought back. The payout is being confirmed.</Trans>;
    default:
      return null;
  }
}

export function GtAssetCard({
  gtRewards,
  gtRewardsUsd,
  account,
}: {
  gtRewards: bigint;
  gtRewardsUsd: bigint | undefined;
  account: string | undefined;
}) {
  const buybackResult = useGtBuybackSummary(account);
  const { data: buyback, isLoading, requestSale, signWithdraw, approveSolanaWithdraw } = buybackResult;
  const [, copyToClipboard] = useCopyToClipboard();
  const [isBuybackModalVisible, setIsBuybackModalVisible] = useState(false);
  const [buybackModalView, setBuybackModalView] = useState<"overview" | "withdraw">("overview");
  const [isHistoryModalVisible, setIsHistoryModalVisible] = useState(false);
  const [isReferralModalVisible, setIsReferralModalVisible] = useState(false);

  const gtBalance = buyback?.gtBalance ?? gtRewards;
  const gtBalanceUsd =
    gtRewardsUsd === undefined ? undefined : gtRewards > 0n ? (gtRewardsUsd * gtBalance) / gtRewards : 0n;
  const quotaAvailable = buyback
    ? bigMath.min(bigMath.max(buyback.quotaTotal - buyback.quotaUsed, 0n), gtBalance)
    : undefined;
  const quotaUsedText = buyback ? formatGtNumber(buyback.quotaUsed) : "";
  const quotaTotalText = buyback ? formatGtNumber(buyback.quotaTotal) : "";
  const quotaUsedPercent =
    buyback && buyback.quotaTotal > 0n
      ? Math.min(Number((buyback.quotaUsed * 10000n) / buyback.quotaTotal) / 100, 100)
      : 0;
  const quotaBarStyle = useMemo(() => ({ width: `${quotaUsedPercent}%` }), [quotaUsedPercent]);
  const hasActiveRequest =
    buyback?.activeRequest !== undefined && !["paid", "withdrawn"].includes(buyback.activeRequest.status);
  const needsReferralCode = buyback !== undefined && !buyback.isSmartContractWallet && !buyback.referralCode;
  const canOpenBuyback = buyback !== undefined && !buyback.isSmartContractWallet;

  const handleCopyReferralCode = () => {
    if (!buyback?.referralCode) return;
    copyToClipboard(buyback.referralCode);
    helperToast.success(t`Referral code copied to your clipboard`);
  };

  return (
    <>
      <BaseAssetCard
        className="grow"
        stretchContent
        icon={<img src={gtIcon} alt="GT" className="size-40" />}
        title={
          <Tooltip
            variant="iconStroke"
            handle="GT"
            content={
              <Trans>
                GT is the GM Trade token. You can sell GT for USDC in the daily buyback on GMTrade, up to your sellable
                amount.
              </Trans>
            }
          />
        }
        subtitle={<Trans>GM Trade token</Trans>}
        headerButton={
          <div className="flex items-center gap-8">
            {buyback ? (
              <Button
                variant="secondary"
                className="w-32 !p-0"
                aria-label={t`Buyback history`}
                onClick={() => setIsHistoryModalVisible(true)}
              >
                <HistoryIcon className="size-16" />
              </Button>
            ) : null}
            <Button
              variant="secondary"
              className="w-32 !p-0"
              to={GMTRADE_URL}
              newTab
              showExternalLinkArrow={false}
              onClick={() => sendEarnPortfolioItemClickEvent({ item: "GT", type: "details" })}
            >
              <NewLinkIcon className="size-16" />
            </Button>
          </div>
        }
        footer={
          needsReferralCode ? (
            <Button variant="secondary" className="w-full" onClick={() => setIsReferralModalVisible(true)}>
              <Trans>Create referral code</Trans>
            </Button>
          ) : (
            <Button
              variant="secondary"
              className="w-full"
              disabled={!canOpenBuyback}
              onClick={() => {
                sendEarnPortfolioItemClickEvent({ item: "GT", type: "sell" });
                setBuybackModalView("overview");
                setIsBuybackModalVisible(true);
              }}
            >
              <Trans>Open buyback</Trans>
            </Button>
          )
        }
      >
        <div className="flex flex-col gap-12">
          <div className="flex flex-col gap-2">
            <span className="text-body-small text-typography-secondary">
              <Tooltip
                variant="iconStroke"
                handle={<Trans>GT balance</Trans>}
                content={
                  <Trans>
                    GT you earned on GMX, on Arbitrum and Avalanche combined, minus any GT you sold in the buyback.
                  </Trans>
                }
              />
            </span>
            <span className="text-h3 block font-bold numbers">
              {formatGt(gtBalance)}{" "}
              {gtBalanceUsd !== undefined && (
                <span className="text-body-medium relative -top-2 font-normal text-typography-secondary">
                  ({formatUsd(gtBalanceUsd)})
                </span>
              )}
            </span>
          </div>

          <div className="flex flex-col gap-8 border-t-1/2 border-slate-600 pt-12">
            <SyntheticsInfoRow
              label={
                <Tooltip
                  variant="iconStroke"
                  handle={<Trans>Sellable GT</Trans>}
                  content={
                    needsReferralCode ? (
                      <Trans>Your GT unlocks as the people you refer use GMX on Solana. Create a code to start.</Trans>
                    ) : (
                      <Trans>
                        How much of your GT you can sell in the buyback this season. Your referees unlock it as they use
                        GMX on Solana, and it can't be more than your GT balance.
                      </Trans>
                    )
                  }
                />
              }
              value={
                needsReferralCode ? (
                  <span className="font-medium text-typography-secondary numbers">{formatGt(0n)}</span>
                ) : (
                  <span className="font-medium numbers">
                    {isLoading ? "…" : quotaAvailable !== undefined ? formatGt(quotaAvailable) : "—"}
                  </span>
                )
              }
            />
            <SyntheticsInfoRow
              label={
                <Tooltip
                  variant="iconStroke"
                  handle={<Trans>Season quota</Trans>}
                  content={
                    <Trans>
                      Your total sellable quota this season and how much of it you already used. Recent trades can take
                      a while to show up.
                    </Trans>
                  }
                />
              }
              value={
                buyback ? (
                  <span className="numbers">
                    <Trans>
                      {quotaUsedText} / {quotaTotalText} GT used
                    </Trans>
                  </span>
                ) : (
                  "—"
                )
              }
            />
            {buyback && buyback.quotaTotal > 0n ? (
              <div className="h-4 overflow-hidden rounded-full bg-cold-blue-900">
                <div className="h-full rounded-full bg-blue-300" style={quotaBarStyle} />
              </div>
            ) : null}
            <SyntheticsInfoRow
              label={<Trans>Referral code</Trans>}
              value={
                buyback?.referralCode ? (
                  <span className="flex items-center gap-6">
                    <span className="font-medium">{buyback.referralCode}</span>
                    <button
                      type="button"
                      className="text-typography-secondary gmx-hover:text-typography-primary"
                      aria-label={t`Copy referral code`}
                      onClick={handleCopyReferralCode}
                    >
                      <CopyIcon className="size-16" />
                    </button>
                  </span>
                ) : buyback ? (
                  <span className="text-typography-secondary">
                    <Trans>Not set</Trans>
                  </span>
                ) : isLoading ? (
                  "…"
                ) : (
                  "—"
                )
              }
            />
            <SyntheticsInfoRow
              label={<Trans>Total bought back</Trans>}
              value={buyback ? <span className="numbers">{formatUsdc(buyback.totalBoughtBackUsdc)}</span> : "—"}
            />
          </div>

          {buyback?.isSmartContractWallet ? (
            <AlertInfoCard type="warning" hideClose>
              <Trans>
                Multisig and other smart-contract wallets can't join the buyback. Connect a regular wallet to sell GT.
              </Trans>
            </AlertInfoCard>
          ) : null}

          {needsReferralCode ? (
            <AlertInfoCard type="info" hideClose>
              <Trans>Create a referral code on Solana to participate in the GT buyback.</Trans>
            </AlertInfoCard>
          ) : null}

          {buyback && !buyback.isSmartContractWallet && buyback.referralCode && quotaAvailable === 0n ? (
            <AlertInfoCard type="info" hideClose>
              <Trans>
                No sellable GT right now. Share your referral code — your GT unlocks as the people you refer use GMX on
                Solana.
              </Trans>
            </AlertInfoCard>
          ) : null}

          {hasActiveRequest && buyback?.activeRequest ? (
            <AlertInfoCard type="info" hideClose>
              <ActiveRequestNotice request={buyback.activeRequest} />
            </AlertInfoCard>
          ) : null}

          {buyback && buyback.withdrawableUsdc > 0n ? (
            <ColorfulBanner color="green">
              <div className="flex items-center justify-between gap-8">
                <Trans>{formatUsdc(buyback.withdrawableUsdc)} is ready to withdraw.</Trans>
                <Button
                  variant="primary"
                  className="shrink-0 !bg-green-700 font-medium !text-black gmx-hover:!bg-green-400"
                  onClick={() => {
                    setBuybackModalView("withdraw");
                    setIsBuybackModalVisible(true);
                  }}
                >
                  <Trans>Withdraw</Trans>
                </Button>
              </div>
            </ColorfulBanner>
          ) : null}
        </div>
      </BaseAssetCard>
      <GtReferralCodeModal
        isVisible={isReferralModalVisible}
        setIsVisible={setIsReferralModalVisible}
        actions={buybackResult}
      />
      {buyback ? (
        <GtBuybackHistoryModal
          isVisible={isHistoryModalVisible}
          setIsVisible={setIsHistoryModalVisible}
          history={buyback.history ?? EMPTY_HISTORY}
        />
      ) : null}
      {buyback ? (
        <GtBuybackModal
          isVisible={isBuybackModalVisible}
          setIsVisible={setIsBuybackModalVisible}
          gtBalance={gtBalance}
          gtBalanceUsd={gtBalanceUsd}
          buyback={buyback}
          onRequestSale={requestSale}
          initialView={buybackModalView}
          onSignWithdraw={signWithdraw}
          onApproveSolanaWithdraw={approveSolanaWithdraw}
          onCreateReferralCode={() => {
            setIsBuybackModalVisible(false);
            setIsReferralModalVisible(true);
          }}
        />
      ) : null}
    </>
  );
}

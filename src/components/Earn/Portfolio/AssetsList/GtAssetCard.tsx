import { Trans } from "@lingui/macro";

import { GMTRADE_URL } from "config/links";
import { GT_DECIMALS } from "domain/gtAirdrop/useGtAirdrop";
import { formatBalanceAmount } from "lib/numbers";
import { sendEarnPortfolioItemClickEvent } from "lib/userAnalytics/earnEvents";

import { AmountWithUsdBalance } from "components/AmountWithUsd/AmountWithUsd";
import Button from "components/Button/Button";
import { SyntheticsInfoRow } from "components/SyntheticsInfoRow";

import NewLinkIcon from "img/ic_new_link.svg?react";
import gtIcon from "img/tokens/ic_gt.svg";

import { BaseAssetCard } from "./BaseAssetCard";

export function GtAssetCard({ gtAmount, gtAmountUsd }: { gtAmount: bigint; gtAmountUsd: bigint | undefined }) {
  return (
    <BaseAssetCard
      icon={<img src={gtIcon} alt="GT" className="size-40" />}
      title="GT"
      headerButton={
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
      }
      footer={
        <Button variant="secondary" className="w-full" disabled>
          <Trans>Buyback available soon</Trans>
        </Button>
      }
    >
      <div className="flex flex-col gap-12">
        <SyntheticsInfoRow
          label={<Trans>Amount</Trans>}
          value={
            gtAmountUsd !== undefined ? (
              <AmountWithUsdBalance amount={gtAmount} decimals={GT_DECIMALS} usd={gtAmountUsd} symbol="GT" />
            ) : (
              <span className="numbers">{formatBalanceAmount(gtAmount, GT_DECIMALS, "GT", { showZero: true })}</span>
            )
          }
        />
        <p className="text-body-small text-typography-secondary">
          <Trans>GT are the points from GMX on Solana. GMX buys back GT with 99% of Solana protocol fees.</Trans>
        </p>
      </div>
    </BaseAssetCard>
  );
}

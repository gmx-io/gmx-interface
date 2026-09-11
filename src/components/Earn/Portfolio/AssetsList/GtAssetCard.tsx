import { Trans } from "@lingui/macro";

import { GMTRADE_URL } from "config/links";
import { GT_DECIMALS } from "domain/synthetics/incentives/v2/constants";
import { formatBalanceAmount } from "lib/numbers";
import { sendEarnPortfolioItemClickEvent } from "lib/userAnalytics/earnEvents";

import { AmountWithUsdBalance } from "components/AmountWithUsd/AmountWithUsd";
import Button from "components/Button/Button";
import { SyntheticsInfoRow } from "components/SyntheticsInfoRow";

import MinusCircleIcon from "img/ic_minus_circle.svg?react";
import NewLinkIcon from "img/ic_new_link.svg?react";
import PlusCircleIcon from "img/ic_plus_circle.svg?react";
import gtIcon from "img/tokens/ic_gt.svg";

import { BaseAssetCard } from "./BaseAssetCard";

export function GtAssetCard({ gtRewards, gtRewardsUsd }: { gtRewards: bigint; gtRewardsUsd: bigint | undefined }) {
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
        <div className="grid w-full grid-cols-2 gap-8">
          <Button variant="secondary" disabled>
            <PlusCircleIcon className="size-16" />
            <Trans>Buy</Trans>
          </Button>
          <Button variant="secondary" disabled>
            <MinusCircleIcon className="size-16" />
            <Trans>Sell</Trans>
          </Button>
        </div>
      }
    >
      <div className="flex flex-col gap-12">
        <SyntheticsInfoRow
          label={<Trans>Amount</Trans>}
          value={
            gtRewardsUsd !== undefined ? (
              <AmountWithUsdBalance amount={gtRewards} decimals={GT_DECIMALS} usd={gtRewardsUsd} symbol="GT" />
            ) : (
              <span className="numbers">{formatBalanceAmount(gtRewards, GT_DECIMALS, "GT", { showZero: true })}</span>
            )
          }
        />
        <p className="text-body-small text-typography-secondary">
          <Trans>
            GT is the native token of the GM Trade project. It currently has no utility; additional functionality will
            become available after the token generation event (TGE).
          </Trans>
        </p>
      </div>
    </BaseAssetCard>
  );
}

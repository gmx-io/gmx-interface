import { Trans, t } from "@lingui/macro";

import { RATIO_VESTER_PAIR_RATIO_DECIMALS, type OrphanVestingData } from "domain/vesting/vestingVaults";
import { formatDate, SECONDS_IN_DAY } from "lib/dates";
import { formatAmountFree } from "lib/numbers";
import { bigMath } from "sdk/utils/bigmath";

import Button from "components/Button/Button";
import BuyInputSection from "components/BuyInputSection/BuyInputSection";
import { ProgressRow } from "components/ProgressRow/ProgressRow";
import { SyntheticsInfoRow } from "components/SyntheticsInfoRow";
import TooltipWithPortal from "components/Tooltip/TooltipWithPortal";

import EsGmxIcon from "img/tokens/ic_esgmx.svg?react";

import { formatVaultAmount, VaultAmountRatio } from "./VaultAmountRatio";

export function OrphanVaultPanel({
  data,
  walletEsGmxBalance,
  stakedAmount,
}: {
  data: OrphanVestingData;
  walletEsGmxBalance: bigint | undefined;
  stakedAmount: bigint | undefined;
}) {
  const leftAmount = data.eligibleAmount > data.usedAmount ? data.eligibleAmount - data.usedAmount : 0n;
  const maxDepositAmount = walletEsGmxBalance === undefined ? undefined : bigMath.min(walletEsGmxBalance, leftAmount);
  const pairRatio = formatAmountFree(data.pairRatioFactor, RATIO_VESTER_PAIR_RATIO_DECIMALS);
  const vestingDays = Math.round(Number(data.vestingDuration) / SECONDS_IN_DAY);

  return (
    <div className="flex flex-col gap-20 px-20 pb-20" data-qa="vesting-orphan-vault">
      <p className="text-body-small leading-[1.4] text-typography-secondary">
        <Trans>
          Vest the esGMX you held at the snapshot. Each esGMX reserves {pairRatio} staked GMX or esGMX and vests over{" "}
          {vestingDays} days.
        </Trans>
      </p>

      <div className="flex flex-col gap-12">
        <BuyInputSection
          topLeftLabel={t`Deposit`}
          topRightLabel={t`Max`}
          topRightValue={formatVaultAmount(maxDepositAmount)}
          inputValue=""
          isDisabled
          maxDecimals={18}
        >
          <div className="flex items-center gap-4">
            <EsGmxIcon />
            {t`esGMX`}
          </div>
        </BuyInputSection>

        <Button variant="primary-action" className="w-full" disabled>
          <Trans>Opening soon</Trans>
        </Button>
      </div>

      <div className="flex flex-col gap-12">
        <SyntheticsInfoRow
          label={
            <TooltipWithPortal
              handle={<Trans>Eligible amount</Trans>}
              position="top-start"
              content={
                <Trans>
                  esGMX in your wallet, staked and unclaimed at the snapshot. esGMX already in the GMX, GLP and
                  Affiliate vaults doesn't count.
                </Trans>
              }
            />
          }
          value={<span className="numbers">{formatVaultAmount(data.eligibleAmount)} esGMX</span>}
        />
        <ProgressRow
          label={<Trans>Vault capacity</Trans>}
          value={<VaultAmountRatio current={data.usedAmount} total={data.eligibleAmount} />}
          currentValue={data.usedAmount}
          totalValue={data.eligibleAmount}
        />
        <ProgressRow
          label={<Trans>Staked tokens reserved for vesting</Trans>}
          value={<VaultAmountRatio current={data.reservedAmount} total={stakedAmount} />}
          currentValue={data.reservedAmount}
          totalValue={stakedAmount}
        />
      </div>

      <div className="flex flex-col gap-16 rounded-8 border-1/2 border-slate-600 bg-slate-950/50 p-16">
        <ProgressRow
          label={<Trans>Vesting status</Trans>}
          value={<VaultAmountRatio current={data.convertedAmount} total={data.depositedAmount} />}
          currentValue={data.convertedAmount}
          totalValue={data.depositedAmount}
        />
        {data.vestingEndTime !== undefined && (
          <SyntheticsInfoRow label={<Trans>Fully vested on</Trans>} value={formatDate(Number(data.vestingEndTime))} />
        )}
        <SyntheticsInfoRow
          label={<Trans>Claimable</Trans>}
          value={<span className="numbers">{formatVaultAmount(data.claimableAmount)} GMX</span>}
        />

        <div className="grid grid-cols-2 gap-12 max-smallMobile:grid-cols-1">
          <Button variant="primary" size="medium" className="w-full" disabled>
            <Trans>Claim GMX</Trans>
          </Button>
          <Button variant="secondary" size="medium" className="w-full" disabled>
            <Trans>Withdraw</Trans>
          </Button>
        </div>
      </div>
    </div>
  );
}

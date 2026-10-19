import { Trans } from "@lingui/macro";

import { Faq, type FaqItem } from "components/Faq/Faq";

function getRewardsVestingFaqItems(isTestnet: boolean): FaqItem[] {
  return [
    {
      title: <Trans>What is vesting?</Trans>,
      content: (
        <Trans>
          Vesting is the gradual conversion of esGMX into liquid GMX. As GMX becomes vested, it can be claimed and used
          like any other liquid GMX token.
        </Trans>
      ),
    },
    {
      title: <Trans>How does vesting work?</Trans>,
      content: isTestnet ? (
        <Trans>Sepolia vesting uses test GMX, esGMX, and sbfGMX collateral tokens.</Trans>
      ) : (
        <Trans>
          To convert 1 esGMX into 1 GMX over one year, you must stake 5 GMX as collateral. The required GMX must remain
          staked throughout the vesting period.
        </Trans>
      ),
    },
    {
      title: <Trans>How long does vesting take?</Trans>,
      content: (
        <Trans>
          The full vesting period is one year. GMX becomes available to claim gradually throughout this period.
        </Trans>
      ),
    },
    {
      title: <Trans>Can I stop vesting?</Trans>,
      content: isTestnet ? (
        <Trans>
          Stopping vesting returns your collateral and unvested esGMX. Vested GMX remains available to claim separately.
        </Trans>
      ) : (
        <div className="flex flex-col gap-12">
          <p>
            <Trans>
              Yes. You can stop vesting at any time. Any GMX that has already vested will remain available to claim, and
              the GMX used as collateral will be unlocked.
            </Trans>
          </p>
          <p>
            <Trans>
              You can restart vesting at any time by depositing esGMX and providing the required GMX collateral.
            </Trans>
          </p>
        </div>
      ),
    },
    {
      title: <Trans>What happens to my unvested esGMX if I stop vesting?</Trans>,
      content: (
        <Trans>
          Any esGMX that has not yet vested will be returned to you and can be deposited into vesting again later.
        </Trans>
      ),
    },
    ...(!isTestnet
      ? [
          {
            title: <Trans>Does staked collateral continue earning staking rewards?</Trans>,
            content: (
              <Trans>
                Yes. GMX used as vesting collateral remains staked and continues earning staking rewards throughout the
                vesting period.
              </Trans>
            ),
          },
        ]
      : []),
  ];
}

const REWARDS_VESTING_FAQ_ITEMS = getRewardsVestingFaqItems(false);
const TESTNET_REWARDS_VESTING_FAQ_ITEMS = getRewardsVestingFaqItems(true);

export function RewardsVestingFaq({ isTestnet = false }: { isTestnet?: boolean }) {
  return (
    <Faq items={isTestnet ? TESTNET_REWARDS_VESTING_FAQ_ITEMS : REWARDS_VESTING_FAQ_ITEMS} title={<Trans>FAQ</Trans>} />
  );
}

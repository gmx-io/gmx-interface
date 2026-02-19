import { Trans } from "@lingui/macro";
import { ReactNode, useCallback, useState } from "react";

import { ExpandableRow } from "components/ExpandableRow";

export default function EarnFaq() {
  return (
    <div className="flex flex-col gap-12 rounded-8 bg-slate-900 p-20">
      <h4 className="text-body-large font-medium text-typography-primary">
        <Trans>FAQ</Trans>
      </h4>
      <div className="flex flex-col">
        <EarnFaqItem
          question={<Trans>Where do GMX staking rewards come from?</Trans>}
          answer={
            <Trans>
              GMX staking rewards come from a buyback-and-distribute model: protocol revenue purchases GMX on the open
              market, which is then distributed to stakers. No new GMX tokens are minted.
            </Trans>
          }
        />
        <EarnFaqItem
          question={<Trans>What's the difference between GLV and GM?</Trans>}
          answer={
            <Trans>
              GM earns fees from one market. GLV holds multiple GM tokens and auto-rebalances across related markets.
              Both auto-compound returns. Choose GM for single-market exposure or GLV to diversify across multiple
              pools.
            </Trans>
          }
        />
        <EarnFaqItem
          question={<Trans>Can I unstake anytime?</Trans>}
          answer={
            <Trans>
              Yes, staking and liquidity provision are fully permissionless. GMX, GLV, and GM tokens can be unstaked and
              withdrawn anytime. In rare cases where your liquidity is being used for active trades, you can withdraw as
              soon as those positions close.
            </Trans>
          }
        />
        <EarnFaqItem
          question={<Trans>What networks are supported?</Trans>}
          answer={
            <Trans>
              GMX staking is available on Arbitrum and Avalanche. GLV vaults and GM tokens vary by chain. Visit the
              pools page to see liquidity options for your connected network.
            </Trans>
          }
        />
      </div>
    </div>
  );
}

function EarnFaqItem({ question, answer }: { question: ReactNode; answer: ReactNode }) {
  const [open, setOpen] = useState(false);

  const handleToggle = useCallback(() => {
    setOpen((stateOpen) => !stateOpen);
  }, []);

  return (
    <ExpandableRow
      open={open}
      onToggle={handleToggle}
      title={question}
      contentClassName="text-body-medium text-typography-primary"
      handleClassName="text-body-medium pt-16 text-left font-medium"
      className="border-b-1/2 border-slate-600 pb-16 last:border-b-0 last:pb-0"
      chevronClassName="mr-8 mt-12"
    >
      {answer}
    </ExpandableRow>
  );
}

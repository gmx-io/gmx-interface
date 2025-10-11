import { Trans } from "@lingui/macro";
import { ReactNode, useCallback, useState } from "react";

import { ExpandableRow } from "components/ExpandableRow";

export default function EarnFaq() {
  return (
    <div className="flex flex-col gap-12 rounded-8 bg-slate-900 p-20">
      <h4 className="text-16 font-medium text-typography-primary">
        <Trans>FAQ</Trans>
      </h4>
      <div className="flex flex-col">
        <EarnFaqItem
          question={<Trans>Where do GMX staking rewards come from?</Trans>}
          answer={
            <Trans>
              GMX staking rewards get distributed from a buyback and distribute model. GMX tokens get bought back from
              the open market with revenue generated from the protocol and then distributed back to stakers. No new GMX
              tokens are minted during this process.
            </Trans>
          }
        />
        <EarnFaqItem
          question={<Trans>What's the difference between providing liquidity in GLV or GM?</Trans>}
          answer={
            <Trans>
              GLV consists of a vault holding multiple separate GM tokens with the same backing tokens. For example, GLV
              [ETH-USDC] holds several markets that are also exposed to ETH and USDC. GLV allows users to make more
              passive decisions rather than finding a specific GM pool to join, as GLV gives a wider, more optimized
              exposure for passive liquidity providers. GM is mainly focused on liquidity providers who aim to have
              exposure to only a few markets.
            </Trans>
          }
        />
        <EarnFaqItem
          question={<Trans>Can I unstake anytime?</Trans>}
          answer={
            <Trans>
              Yes. All tokens (GMX, GLV and GM) are liquid and can be unstaked and withdrawn at any time. For LP tokens,
              there could be some edge cases where your liquidity is being used by active trades.
            </Trans>
          }
        />
        <EarnFaqItem
          question={<Trans>What networks are supported?</Trans>}
          answer={
            <Trans>
              For staking GMX, only Avalanche and Arbitrum are currently supported. Different compositions of GLV and GM
              tokens exist per chain, please check the pools page to get an overview of what's available.
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
      contentClassName="text-13 text-typography-primary"
      handleClassName="text-body-medium pt-16 text-left font-medium"
      className="border-b-1/2 border-slate-600 pb-16 last:border-b-0 last:pb-0"
      chevronClassName="mr-8 mt-12"
    >
      {answer}
    </ExpandableRow>
  );
}

import { Trans } from "@lingui/macro";

import { Faq, FaqItem } from "components/Faq/Faq";

const BUYBACK_FAQ_ITEMS: FaqItem[] = [
  {
    title: <Trans>How is the buyback price set?</Trans>,
    content: (
      <Trans>
        Each buyback spends its max buyback value on all GT submitted for sale. The price is that value divided by the
        GT submitted, and it never goes above the current minting price.
      </Trans>
    ),
  },
  {
    title: <Trans>Why can my proceeds differ from the estimate?</Trans>,
    content: (
      <Trans>
        The estimate uses the GT submitted so far. If more GT is submitted before the buyback, the price per GT goes
        down. The final price is set when the buyback runs.
      </Trans>
    ),
  },
  {
    title: <Trans>How and when do I receive USDC?</Trans>,
    content: <Trans>Proceeds are sent to your wallet in USDC within 24 hours after the buyback.</Trans>,
  },
  {
    title: <Trans>What is the sellable quota?</Trans>,
    content: (
      <Trans>
        It's how much GT you can sell this season. You earn quota when the traders you refer use GMX on Solana, and each
        sale uses part of it. You can't sell more GT than you hold.
      </Trans>
    ),
  },
];

export function BuybackFaq() {
  return <Faq items={BUYBACK_FAQ_ITEMS} title={<Trans>FAQ</Trans>} />;
}

import { useMemo } from "react";

import { ARBITRUM } from "config/chains";

import { AnnouncementBanner } from "components/AnnouncementBanner/AnnouncementBanner";

const DEPOSIT_LINK = { text: "Deposit in GLV [USDG] or GM [USDG]", to: `/pools?chainId=${ARBITRUM}` };

export function UsdgPoolsAnnouncement({ onDismiss }: { onDismiss: () => void }) {
  const depositLink = useMemo(() => ({ ...DEPOSIT_LINK, onClick: onDismiss }), [onDismiss]);

  return (
    <AnnouncementBanner
      className="pointer-events-auto"
      variant="info"
      headerLabel="GMX is moving off 50/50 pools: boosted USDG line is live"
      headerIcon="info"
      truncateHeader={false}
      onClose={onDismiss}
      footerLink={depositLink}
    >
      <div className="flex flex-col gap-8">
        <p>
          GMX is shifting LP product focus from 50/50 pools to single-asset pools, with the new USDG line as GMX&apos;s
          flagship: existing trading will move there and all new markets launch there.
        </p>
        <p>
          The USDG line comes with a 20-week boost program on top of trading fees. For the first 8 weeks (to Nov 30),
          GLV [USDG] will have 8%+ additional boosted APR and the GM [USDG] pools 5%. Boost slowly tapers from Week 9 to
          20.
        </p>
        <p>
          This address is whitelisted for direct GM [USDG] deposits and 0-fee USDC-to-USDG conversion. Withdrawals from
          the main 50/50 pools are fee-free until Oct 31.
        </p>
        <p>GMX never DMs first or asks for signatures outside app.gmx.io.</p>
      </div>
    </AnnouncementBanner>
  );
}

import { GMX_PARTNER_TELEGRAM_URL } from "config/links";

import { AnnouncementBanner } from "components/AnnouncementBanner/AnnouncementBanner";

export function UsdgPoolsAnnouncement({ onDismiss }: { onDismiss: () => void }) {
  return (
    <AnnouncementBanner
      className="pointer-events-auto"
      variant="info"
      headerLabel="Early access: new USDG LP pools with 8% boost APR at launch"
      headerIcon="info"
      truncateHeader={false}
      onClose={onDismiss}
    >
      <div className="flex flex-col gap-8">
        <p>
          GMX is launching a new LP product line: pools fully denominated in <span className="font-medium">USDG</span>{" "}
          (Global Dollar: a Paxos-issued, fully-backed stablecoin). Deposit dollars, earn dollars. No crypto exposure,
          unlike the existing 50/50 pools.
        </p>
        <p>This wallet&apos;s GM/GLV liquidity pre-qualifies it for whitelist onboarding, opening in early October.</p>
        <p>
          Whitelist terms: a planned <span className="font-medium">8% launch boost APR for the first 8 weeks</span>, on
          top of the variable base trading-fee yield, plus zero-fee USDC→USDG conversion windows, and reserved capacity
          ahead of public access.
        </p>
        <p className="font-medium">
          To activate your whitelist spot, message{" "}
          <a href={GMX_PARTNER_TELEGRAM_URL} target="_blank" rel="noopener noreferrer">
            @GMXPartners
          </a>{" "}
          on Telegram and mention &quot;USDG whitelist.&quot;
        </p>
        <p>
          GMX will never DM you first or ask you to sign anything to participate. Nor will GMX Partners ever ask for a
          seed phrase, signature or token approval.
        </p>
      </div>
    </AnnouncementBanner>
  );
}

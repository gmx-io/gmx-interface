import { AnnouncementBanner } from "components/AnnouncementBanner/AnnouncementBanner";

const TELEGRAM_URL = "https://t.me/GMXPartners";
const PROGRAM_ANNOUNCEMENT_URL = "https://x.com/GMX_IO/status/2079201995190338026";
const PROGRAM_ANNOUNCEMENT_LINK = { text: "See program announcement", href: PROGRAM_ANNOUNCEMENT_URL };

export function BalancerProgramAnnouncement({ onDismiss }: { onDismiss: () => void }) {
  return (
    <AnnouncementBanner
      className="pointer-events-auto"
      variant="info"
      headerLabel="You're eligible for Balancer Program rewards"
      headerIcon="info"
      truncateHeader={false}
      onClose={onDismiss}
      footerLink={PROGRAM_ANNOUNCEMENT_LINK}
    >
      Your trading on this account already qualifies for additional rewards, paid directly on top of what you earn
      today. Message{" "}
      <a href={TELEGRAM_URL} target="_blank" rel="noopener noreferrer" className="font-medium">
        @GMXPartners
      </a>{" "}
      on Telegram and mention <span className="font-medium">&quot;balancer invite&quot;</span> to activate. GMX will
      never DM you first or ask you to sign anything to receive rewards.
    </AnnouncementBanner>
  );
}

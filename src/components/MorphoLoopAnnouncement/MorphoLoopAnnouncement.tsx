import { AnnouncementBanner } from "components/AnnouncementBanner/AnnouncementBanner";

const MORPHO_MARKET_LINK = {
  text: "Open the Morpho market",
  href: "https://app.morpho.org/arbitrum/variable/0xe0efd408da3b410004daccdc9c8b42c05dfd9d33afa679329029f62ac2cb534a/usdg-glv-usdg-usdg#market",
};

export function MorphoLoopAnnouncement({ onDismiss }: { onDismiss: () => void }) {
  return (
    <AnnouncementBanner
      className="pointer-events-auto"
      variant="info"
      headerLabel="Loop GLV [USDG] on Morpho for a higher yield"
      headerIcon="info"
      truncateHeader={false}
      onClose={onDismiss}
      footerLink={MORPHO_MARKET_LINK}
    >
      <span className="flex flex-col gap-8">
        <span>
          GLV [USDG] is now accepted as collateral on Morpho (Arbitrum), in a market curated by Gauntlet. Post GLV
          [USDG], borrow USDG against it, and buy more GLV [USDG]. GLV [USDG] earns over 12% today. At 2x leverage (50%
          LTV), that's over 20% APY on your capital. Only GLV [USDG] is accepted, so holders of other pools need to move
          into it first.
        </span>
        <span>
          Estimates, not guarantees: GLV yield and the Morpho borrow rate both change. Looping adds leverage, and
          positions are liquidated at 62.5% LTV. Morpho is a separate protocol.
        </span>
      </span>
    </AnnouncementBanner>
  );
}

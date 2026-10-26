import cx from "classnames";
import { type ReactNode, useMemo } from "react";

import { DocsSection, DocsSectionInfo } from "../DocsLayout";

// Typography page of the design system site (/ui/typography).
// Examples: the text styles after the Changelog (samples use the current classes plus inline overrides for the new values).
// Changelog: what developers change in the code.

type TextStyle = {
  // The class name once the Changelog steps are done; the sample renders with the current class (className)
  name: string;
  className: string;
  // New values the code doesn't have yet, shown on the sample
  line: string;
  fontSize?: string;
  letterSpacing?: string;
  spec: string;
  sample: string;
};

type TextStyleGroup = DocsSectionInfo & { styles: TextStyle[] };

const BODY_SAMPLE = "Pick a market, set the size and confirm the order.";
const NUMBERS_SAMPLE = "$12,345.67";

// When the Changelog lands: set className to the name and drop line, fontSize and letterSpacing
const TEXT_STYLES: TextStyleGroup[] = [
  {
    id: "typography-headings",
    title: "Headings",
    styles: [
      {
        name: "text-h1",
        className: "font-medium",
        fontSize: "40px",
        letterSpacing: "-0.016em",
        line: "48px",
        spec: "40px · line 48px · −1.6% · Medium",
        sample: "Create a code",
      },
      {
        name: "text-h2",
        className: "text-h1",
        line: "40px",
        spec: "32px · line 40px · −1.6% · Medium",
        sample: "Open a position",
      },
      {
        name: "text-h3",
        className: "text-h2",
        line: "32px",
        spec: "24px · line 32px · −1.6% · Medium",
        sample: "Your positions",
      },
      {
        name: "text-h4",
        className: "text-h3",
        line: "28px",
        spec: "20px · line 28px · −1.6% · Medium",
        sample: "Order details",
      },
    ],
  },
  {
    id: "typography-body",
    title: "Body",
    styles: [
      {
        name: "text-body-xlarge",
        className: "text-20",
        line: "28px",
        spec: "20px · line 28px · 0% · Regular",
        sample: BODY_SAMPLE,
      },
      {
        name: "text-body-xlarge font-medium",
        className: "text-20 font-medium",
        line: "28px",
        spec: "20px · line 28px · 0% · Medium",
        sample: BODY_SAMPLE,
      },
      {
        name: "text-body-large",
        className: "text-body-large",
        line: "24px",
        spec: "16px · line 24px · 0% · Regular",
        sample: BODY_SAMPLE,
      },
      {
        name: "text-body-large font-medium",
        className: "text-body-large font-medium",
        line: "24px",
        spec: "16px · line 24px · 0% · Medium",
        sample: BODY_SAMPLE,
      },
      {
        name: "text-body-medium",
        className: "text-body-medium",
        line: "20px",
        spec: "14px · line 20px · 0% · Regular",
        sample: BODY_SAMPLE,
      },
      {
        name: "text-body-medium font-medium",
        className: "text-body-medium font-medium",
        line: "20px",
        spec: "14px · line 20px · 0% · Medium",
        sample: BODY_SAMPLE,
      },
    ],
  },
  {
    id: "typography-small",
    title: "Small",
    styles: [
      {
        name: "text-body-small",
        className: "text-body-small",
        line: "16px",
        spec: "12px · line 16px · 0% · Regular",
        sample: BODY_SAMPLE,
      },
      {
        name: "text-body-small font-medium",
        className: "text-body-small font-medium",
        line: "16px",
        spec: "12px · line 16px · 0% · Medium",
        sample: BODY_SAMPLE,
      },
      {
        name: "text-caption",
        className: "text-caption",
        fontSize: "12px",
        line: "16px",
        spec: "12px · line 16px · +8% · Medium · uppercase",
        sample: "Collateral",
      },
    ],
  },
  {
    id: "typography-numbers",
    title: "Numbers",
    styles: [
      {
        name: "text-body-large numbers",
        className: "text-body-large numbers",
        line: "24px",
        spec: "16px · line 24px · +3% · Regular · no line break",
        sample: NUMBERS_SAMPLE,
      },
      {
        name: "text-body-large font-medium numbers",
        className: "text-body-large font-medium numbers",
        letterSpacing: "0.03em",
        line: "24px",
        spec: "16px · line 24px · +3% · Medium · no line break",
        sample: NUMBERS_SAMPLE,
      },
    ],
  },
];

const EXAMPLES_SECTION: DocsSectionInfo = { id: "typography-styles", title: "Text styles" };

function TextStyleRow({ style }: { style: TextStyle }) {
  const sampleStyle = useMemo(
    () => ({ lineHeight: style.line, fontSize: style.fontSize, letterSpacing: style.letterSpacing }),
    [style.line, style.fontSize, style.letterSpacing]
  );

  return (
    <div className="grid grid-cols-1 items-baseline gap-8 md:grid-cols-[minmax(0,1fr)_300px] md:gap-24">
      <div className={cx(style.className, "min-w-0")} style={sampleStyle}>
        {style.sample}
      </div>
      <div className="flex min-w-0 flex-col gap-2">
        <span className="break-words font-mono text-15">{style.name}</span>
        <span className="text-body-small text-typography-secondary">{style.spec}</span>
      </div>
    </div>
  );
}

/**
 * Examples tab: the text styles after the Changelog, each rendered with the current classes plus inline overrides for
 * the values the code doesn't have yet.
 */
export function TypographyExamples() {
  return (
    <DocsSection section={EXAMPLES_SECTION} flush>
      <p className="text-body-large px-24 pt-24 text-typography-secondary max-md:px-16 max-md:pt-16">
        These are the names and values after the Changelog steps. Until then, H2 to H4 are named text-h1 to text-h3 in
        the code, and the 40px text-h1 and text-body-xlarge don't exist yet. All text uses equal-width digits.
      </p>
      {TEXT_STYLES.map((group, index) => (
        // data-docs-section also lists each group in the "On this page" menu
        <div
          key={group.id}
          id={group.id}
          data-docs-section={group.title}
          className={cx("flex scroll-mt-16 flex-col gap-24 p-24 max-md:p-16", {
            "border-t border-fill-surfaceElevated": index > 0,
          })}
        >
          <h3 className="text-body-large font-medium">{group.title}</h3>
          {group.styles.map((style) => (
            <TextStyleRow key={style.name} style={style} />
          ))}
        </div>
      ))}
    </DocsSection>
  );
}

const TH_CLASSNAME = "pb-8 pr-16 font-normal";

type StyleChange = { name: string; size: string; before: string; after: string };

// Step 1: the line-height rule (size × 1.4 up to 24px, × 1.2 above, nearest 4px), and the caption at 12px
const CLASS_CHANGES: StyleChange[] = [
  { name: "text-h1", size: "32px", before: "110% (35.2px)", after: "4rem (40px)" },
  { name: "text-h2", size: "24px", before: "110% (26.4px)", after: "3.2rem (32px)" },
  { name: "text-h3", size: "20px", before: "110% (22px)", after: "2.8rem (28px)" },
  { name: "text-body-large", size: "16px", before: "2.1rem (21px)", after: "2.4rem (24px)" },
  { name: "text-body-medium", size: "14px", before: "1.75rem (17.5px)", after: "2rem (20px)" },
  { name: "text-caption", size: "1.1rem → 1.2rem (12px)", before: "1.4rem (14px)", after: "1.6rem (16px)" },
];

// Step 2: the variables with the same names, so they match the classes
const VARIABLE_CHANGES: StyleChange[] = [
  { name: "--line-height-h1", size: "32px", before: "34px", after: "40px" },
  { name: "--line-height-h2", size: "24px", before: "24px", after: "32px" },
  { name: "--line-height-h3", size: "20px", before: "20px", after: "28px" },
  { name: "--line-height-body-large", size: "16px", before: "2.1rem (21px)", after: "2.4rem (24px)" },
  { name: "--line-height-body-medium", size: "14px", before: "1.8rem (18px)", after: "2rem (20px)" },
  { name: "--line-height-caption", size: "12px", before: "1.4rem (14px)", after: "1.6rem (16px)" },
  { name: "--font-size-caption", size: "12px", before: "1rem (10px)", after: "1.2rem (12px)" },
];

type Rename = { from: string; to: string };

// Step 3: the headings move one name down, so the new 40px heading can be H1. In this order, so no name is taken twice.
const HEADING_RENAMES: Rename[] = [
  { from: "text-h3", to: "text-h4" },
  { from: "text-h2", to: "text-h3" },
  { from: "text-h1", to: "text-h2" },
  { from: "--line-height-h3", to: "--line-height-h4" },
  { from: "--line-height-h2", to: "--line-height-h3" },
  { from: "--font-size-h2", to: "--font-size-h3" },
  { from: "--line-height-h1", to: "--line-height-h2" },
  { from: "--font-size-h1", to: "--font-size-h2" },
];

type NewStyle = { name: string; values: string; replaces: string };

// Step 4: named styles for sizes the code types by hand
const NEW_STYLES: NewStyle[] = [
  {
    name: "text-h1",
    values:
      "4rem (40px) · line 4.8rem (48px) · −1.6% · Medium. Variables --font-size-h1 and --line-height-h1 too, and --font-size-h4: 2rem for the renamed H4.",
    replaces:
      "text-[40px] font-medium in 5 places: the PnL share card and the create-code and join-code referral wizards (2 headings each). Drop font-medium. In 3 of them, max-md:text-[32px] becomes max-md:text-h2.",
  },
  {
    name: "text-body-xlarge",
    values: "2rem (20px) · line 2.8rem (28px) · 0% · Regular, with font-medium for Medium.",
    replaces:
      "text-20 in 2 places (BuyInputSection, MultichainMarketTokenSelector): keep leading-1, drop tracking-wide. The 9 text-20 font-medium titles become text-h4 instead (drop font-medium, and leading-1 in HowToStartEarning and HowToStartSaving), like the other 20px titles. The text-20 in ColorfulBanner only sizes an icon: keep it.",
  },
];

type Replacement = { from: string; to: string; places: string };

// Step 5: no 13px, no faked bold, one letter spacing for all numbers
const REPLACEMENTS: Replacement[] = [
  {
    from: "text-13, text-[13px]",
    to: "text-body-small",
    places:
      "79 places in the app, including the 2 button-label places in Button.tsx. In .button (Button.scss), change line-height: 1 to var(--line-height-body-small). Buttons keep their height: min-h-32 and min-h-40, and the fixed heights on controlled buttons, set it.",
  },
  {
    from: "font-size: 13px, 1.3rem (style files)",
    to: "var(--font-size-body-small)",
    places:
      "8 places: the 6 in steps 7 and 8, plus .network-dropdown-items .menu-item (NetworkDropdown.scss) and .TableOptionsFilter-group-name (TableOptionsFilter.scss). Add line-height: var(--line-height-body-small) to each. 2 more are in unused rules that step 9 deletes.",
  },
  { from: "font-semibold, font-bold", to: "font-medium", places: "76 places." },
  {
    from: 'font-weight: bold, 700 (style files); fontWeight "bold"',
    to: "500",
    places:
      "2 places: .Page-title in App.scss and the market-price tick in DepthChart.tsx (line 681). The other 6 are in unused rules that step 9 deletes. The <strong> in ReferralsTier.tsx gets font-medium.",
  },
  {
    from: "normal-nums",
    to: "delete",
    places:
      "5 places (BuyGmxModal, OpportunityAssets, GmxAccountModal/MainView, MarketGraphs, Pools): all text keeps equal-width digits.",
  },
  {
    from: "form controls",
    to: "font-variant-numeric: inherit",
    places:
      "Equal-width digits come from :root and don't reach inputs, buttons, selects and text areas. Add button, input, select, textarea { font-variant-numeric: inherit; } to Shared.scss.",
  },
  {
    from: ".font-medium.numbers (Shared.scss)",
    to: "delete",
    places: "Medium numbers then get +3% like all other numbers.",
  },
];

// Step 6: size-only classes that move to the named style of the same size. text-16 stays as it is.
const SIZE_CLASS_MOVES: Replacement[] = [
  { from: "text-12", to: "text-body-small", places: "70 places." },
  {
    from: "text-14",
    to: "text-body-medium",
    places: "65 places. In TransactionStatus.tsx (line 27) also delete text-body-small, so the text stays 14px.",
  },
  {
    from: "text-24",
    to: "text-h3",
    places:
      "12 places, 8 of them on the dev-only /ui page (pages/UiPage). Drop font-medium; amounts keep the numbers class. The referral code gets the heading letter spacing (−1.6%). Update the .text-24 selector in autotests/regression/live-state/affiliate.spec.ts to .text-h3.",
  },
  {
    from: "text-11",
    to: "text-caption, text-body-small",
    places:
      "4 places, 11px → 12px. The PnL share card labels become text-caption; the chart crosshair label and the breadcrumb “/” become text-body-small.",
  },
  { from: "text-15", to: "text-body-medium", places: "1 place, 15px → 14px: the “GMX on Solana” modal." },
  {
    from: "text-32",
    to: "text-h2",
    places:
      "1 place: the referral share card headline. Drop font-medium and leading-1; its line grows from 32px to 40px, so check the card.",
  },
  {
    from: "theme.fontSize (tailwind.config.ts)",
    to: "keep 16 and 20",
    places:
      "Once their places have moved, delete 11, 12, 13, 14, 15, 24 and 32, so these sizes can't come back. 20 stays for the ColorfulBanner icon. The design system pages (src/pages/DesignSystem) still use text-13 and text-15: move them first.",
  },
];

type Cleanup = { where: string; change: string };

// Step 7: hand-typed values that give way to the named style. Classes in .tsx files, the CSS variables
// in style files.
const CLEANUPS: Cleanup[] = [
  {
    where: "styles/Shared.scss · th",
    change:
      "font-size: 11px → var(--font-size-caption); add line-height: var(--line-height-caption). The weight and letter spacing already match the caption.",
  },
  {
    where: "TVChart/ChartHeader.tsx, line 440",
    change: "text-[11px] font-medium uppercase tracking-[0.08em] → text-caption",
  },
  { where: "SideNav.tsx (2 places), BottomMenuSection.tsx", change: "Delete tracking-[-1.2%]." },
  {
    where: "Slider/Slider.scss · .rc-slider-mark-text",
    change: "font-size: 11px → var(--font-size-body-small); add line-height: var(--line-height-body-small).",
  },
  {
    where: "WhatsNewToast.tsx (2 places), AnnouncementBanner.tsx, AnnouncementCard.tsx",
    change: "Delete leading-[1.3]: text-body-medium already sets the line height.",
  },
  { where: "ColorfulBanner.tsx, line 64", change: "text-13 leading-[1.3] → text-body-small" },
  {
    where: "PageTitle/PageTitle.scss",
    change:
      "Delete line-height: 1 (.Page-title-wrapper) and font-weight: 500 (.Page-title__text): the classes already set them. No visible change.",
  },
  {
    where: "App/App.scss · .App-card-title",
    change: "Delete letter-spacing: -0.012em; add line-height: var(--line-height-body-large).",
  },
  {
    where: "styles/Shared.scss · .subtext",
    change:
      "font-size: 1.2rem → var(--font-size-body-small); add line-height: var(--line-height-body-small). The 11 places that pair subtext with leading-1 keep their tight line: change leading-1 to !leading-1 there (ClaimFundingFeesHistoryRow 82/115, MarketsList 246/276, NetFeeTooltip 21/80, OrderItem 727/750, PositionItem 527, TradeHistoryRow 233/247). In 3 more places the parent sets leading-1 (PoolListItem 134/138, LeaderboardPositionsTable 322): add !leading-1 to the subtext span.",
  },
  { where: "Breadcrumbs.tsx, line 38", change: "text-13 font-medium leading-[1.15] → text-body-small font-medium" },
  {
    where: "Announcements.tsx, line 221",
    change:
      "max-lg:text-12 max-lg:font-medium max-lg:leading-[1.25] max-lg:tracking-[-0.012em] → max-lg:text-body-small max-lg:font-medium",
  },
  { where: "ChartTokenSelector.tsx, line 402", change: "text-[11px] font-medium uppercase → text-caption" },
  {
    where: "ChartTokenSelector.tsx, line 862",
    change: "text-12 font-medium leading-[1.25] → text-body-small font-medium",
  },
  { where: "FavoriteTabs.tsx, line 15", change: "text-13 leading-[18px] → text-body-small" },
  { where: "SettingsModal/shared.tsx, line 157", change: "text-[10px] font-medium → text-body-small font-medium" },
  { where: "BlockField.tsx, line 100", change: "leading-[20px] → text-body-medium" },
  {
    where: "SelectorBase.tsx, line 226",
    change: "Delete leading-[20px]: the selector handle sets the size and line, as in the disabled branch (line 207).",
  },
  {
    where: "PoolsDetailsCard.tsx, line 13; MarketComposition.tsx, line 18",
    change: "text-[20px] font-medium → text-h4; max-md:text-14 → max-md:text-body-medium max-md:tracking-normal",
  },
  { where: "Earn/OpportunityAssets.tsx, line 61", change: "text-[11px] font-medium → text-body-small font-medium" },
  {
    where: "Button/Button.scss · .button.secondary, .button.ghost",
    change:
      "Delete letter-spacing: 0, and delete tracking-wide from the SelectorBase handle (SelectorBase.tsx, line 219) and the market selector (MarketSelector.tsx, line 218): body text has no letter spacing.",
  },
  {
    where: "SuggestionInput/SuggestionInput.scss (3 rules)",
    change:
      "font-size: 13px → var(--font-size-body-small); line-height: 1.3 → var(--line-height-body-small) (add it in .Suggestion-list, which has none).",
  },
  {
    where: "NetworkDropdown/NetworkDropdown.scss · .network-dropdown-item-label",
    change: "Delete font-weight: 500; the label gets font-medium.",
  },
  {
    where: "TokenSelector/TokenSelector.scss · .text-accent",
    change:
      "font-size: 1.2rem → var(--font-size-body-small); line-height: 1.5 → var(--line-height-body-small); delete letter-spacing: 0.",
  },
  {
    where: "styles/_toasts.scss · .Toastify__toast-body",
    change:
      "In the font shorthand, 1.4rem/1.6rem → var(--font-size-body-medium)/var(--line-height-body-medium); delete line-height: 2rem, and add font-variant-numeric: tabular-nums lining-nums after the shorthand (it resets the digits). The line stays 20px.",
  },
  {
    where: "StatusNotification/StatusNotification.scss · .StatusNotification-title",
    change: "Delete letter-spacing: -0.012em.",
  },
  { where: "GmSwap/GmSwapBox/GmSwapBox.scss · .gm-toast", change: "line-height: 1.4 → var(--line-height-body-small)." },
  {
    where: "GmxAccountModal/MainView.tsx, line 78",
    change: "Delete leading-[30px]: the heading style sets the line height.",
  },
  {
    where: "TradeHistoryRow.scss (time, account), ClaimHistoryRow.scss (time)",
    change: "font-size: 1.25rem → var(--font-size-body-small); add line-height: var(--line-height-body-small).",
  },
  { where: "TVChart/ChartHeader.tsx, lines 167, 168 and 450", change: "Delete leading-[1.25]." },
  {
    where: "DateRangeSelect/DateRangeSelect.scss (3 rules)",
    change:
      "Month (.react-calendar__navigation button): font-size: 14px → var(--font-size-body-medium), add line-height: var(--line-height-body-medium). Weekdays (.react-calendar__month-view__weekdays): font-size: 11px → var(--font-size-caption), add line-height: var(--line-height-caption) and letter-spacing: 0.08em. Days (.react-calendar__tile): font-size: 13px → var(--font-size-body-small), add line-height: var(--line-height-body-small).",
  },
  {
    where: "CrosshairPercentageLabel.tsx, lines 36–37",
    change:
      "text-14 leading-[16px] → text-body-medium; text-11 leading-[13px] → text-body-small. The label gets about 7px taller.",
  },
];

type RuleCleanup = Cleanup & { rule: string };

// Step 8: more places, each following one of the rules above (or left as they are)
const RULE_CLEANUPS: RuleCleanup[] = [
  {
    where: "TableOptionsFilter/TableOptionsFilter.scss · .TableOptionsFilter-option",
    change: "font-size: 13px → var(--font-size-body-small); add line-height: var(--line-height-body-small).",
    rule: "No 13px.",
  },
  {
    where: "AddressDropdown/AddressDropdownWithoutMultichain.scss · .menu-items .menu-item",
    change: "font-size: 13px → var(--font-size-body-small); add line-height: var(--line-height-body-small).",
    rule: "No 13px.",
  },
  {
    where: "ShareModal/CreateReferralCode.tsx, line 583",
    change: "text-13 leading-[13px] → text-body-small",
    rule: "No 13px.",
  },
  {
    where: "Claims/ClaimableCardUI.tsx, line 30",
    change: "text-[11px] font-medium uppercase → text-caption",
    rule: "Uppercase labels are captions.",
  },
  {
    where: "Referrals/affiliates/dashboard/AffiliatesStats.tsx, line 146",
    change: "text-12 font-medium leading-[1.25] → text-body-small font-medium",
    rule: "Same change as the market list pill (ChartTokenSelector.tsx, line 862, step 7).",
  },
  {
    where: "AccountDashboard/GeneralPerformanceDetails.tsx, lines 241 and 260",
    change: "Delete leading-[1.35]: the text style already sets the line height.",
    rule: "Same change as the banners in step 7.",
  },
  {
    where: "SideNav/SupportChatNavItem.tsx, line 116",
    change: "Delete leading-[1].",
    rule: "The other side menu items set no line height.",
  },
  {
    where: "BuyInputSection/BuyInputSection.scss · .PercentSelector-item",
    change: "font-size: 1.4rem → var(--font-size-body-medium); add line-height: var(--line-height-body-medium).",
    rule: "Same size, named line height.",
  },
  {
    where: "ShareBar/ShareBar.scss · .ShareBar-fill__percentage",
    change: "font-size: 1.2rem → var(--font-size-body-small); add line-height: var(--line-height-body-small).",
    rule: "Same size, named line height.",
  },
  {
    where: "NotifyModal/NotifyModal.scss · .NotifyModal",
    change: "line-height: 1.5 → var(--line-height-body-medium).",
    rule: "Named line height; the line gets 1px shorter (21px to 20px).",
  },
  {
    where: "Dashboard/DashboardV2.css · .stats-label",
    change: "Delete letter-spacing: 0.4px.",
    rule: "No letter spacing in body text.",
  },
  {
    where: "App/App.scss · .App-button-option",
    change: "Delete line-height: 2rem, font-weight: normal and letter-spacing: 0px.",
    rule: "No visible change: the button is a 36px flex box, and the weight and letter spacing repeat the defaults.",
  },
  {
    where:
      "PoolSelector2.scss (2 rules), SelectorBase.scss · .SelectorBaseUtils-mobile-row, Dashboard/AssetDropdown.scss · .asset-item p, Card/Card.css · .card-header",
    change:
      "Hand-typed font-weight: 500 / 400 → font-medium / font-normal on the element; delete letter-spacing: 0px in Card.css. .asset-item p also styles GmAssetDropdown: add font-medium to the <p> in both AssetDropdown.tsx and GmAssetDropdown.tsx.",
    rule: "No visible change.",
  },
  {
    where: "PriceImpactRebatesStats.scss, ReferralsTier.scss, TestPermits.tsx",
    change:
      "12px → var(--font-size-body-small); 16px → var(--font-size-body-large); text-[11px] → text-body-small; delete tracking-wide in TestPermits.tsx.",
    rule: "Pages the app doesn't link to (/price_impact_rebates_stats, /referrals-tier and the dev-only /permits); same rules.",
  },
  {
    where: "DepthChart.tsx, line 69; BuybackChart.tsx, line 27; DailyAndCumulativePnLChart.tsx, line 56",
    change: "SVG chart labels fontSize 10 / 11 → 12.",
    rule: "No text below 12px, like the 11px classes in step 6.",
  },
  {
    where: "Loader/SpinningLoader.css · .spinning-loader; DeprecatedExchageStyles.scss · .position-loading-icon",
    change: "Keep.",
    rule: "Not text: font-size sets an icon's size.",
  },
  {
    where: "GmxAccountModal: DepositView, TransferDetailsView (2), WalletSendView, WithdrawalView · leading-[14px]",
    change: "Keep.",
    rule: "Not text: it sets a loading bar's height.",
  },
  {
    where: "Referrals/shared/cards/ShareReferralCardModal.tsx, line 232",
    change: "Keep text-16 font-medium leading-[20px].",
    rule: "text-16 stays.",
  },
  {
    where: "Tooltip/Tooltip.scss · .Tooltip-popup, .Tooltip-popup--standard",
    change: "Keep for now.",
    rule: "Belongs to the standard tooltip (StandardTooltip); change it there.",
  },
  {
    where: "DeprecatedExchageStyles.scss · .Confirmation-box",
    change: "Keep for now.",
    rule: "It sets the 2rem base size of four modals (claim funding fees, settle funding fees and the two price impact rebate modals); check them with a connected wallet before changing it.",
  },
];

type UnusedStyle = { file: string; rules: string };

// Step 9: style rules no component uses anymore, and EntryButton, which nothing renders
const UNUSED_STYLES: UnusedStyle[] = [
  {
    file: "App/App.scss",
    rules:
      ".App-header-menu-icon · .App-card-info-title · .App-card-info-subtitle · .section-title-content .section-title-content__title · .section-title-content .section-title-content__description · .App-hero-primary · .App-header a.App-header-link-main, .App-header .App-header-link-main · .App-header-container-left .a, .App-header-container-left a · .App-title · .App-subtitle · a.App-social-link · .App-input-unit · button.App-button · .App-note",
  },
  {
    file: "styles/DeprecatedExchageStyles.scss",
    rules:
      ".Exchange-swap-leverage-unlock-icon · .ExchangeChart-main-price · .Exchange-price-tooltip · .Exchange-price-time · .PositionEditor-token-symbol · .Order-list-item-text · table.Exchange-list th, table.Exchange-list td · .Exchange-swap-section-top · .Exchange-swap-ball-icon · table.Exchange-list-small th, table.Exchange-list-small td · .ExchangeChart-bottom-controls .Tab .Tab-option (max-width: 1024px) · .Confirmation-box-info, .Confirmation-box-warning",
  },
  {
    file: "pages/LeaderboardPage/LeaderboardPage.scss",
    rules:
      ".Leaderboard-Title h1 (screen and (max-width: 990px)) · .CompetitionPrizes__prize-title · .CompetitionPrizes__prize-title (screen and (max-width: 1024px)) · .CompetitionPrizes__prize-description · .CompetitionPrizes__prize-description (screen and (max-width: 1024px)) · .CompetitionPrizes__prize-winners-container · .CompetitionCountdown_desktop .CompetitionCountdown__time · .CompetitionCountdown_desktop .CompetitionCountdown__time (screen and (max-width: 990px)) · .LeaderboardNavigation__chip",
  },
  {
    file: "styles/Shared.scss",
    rules: ".Card-title · .default-btn · .secondary-btn · .logout-icon · .strong",
  },
  {
    file: "components/Pagination/Pagination.css",
    rules: ".pagination-btn · .pagination-button-secondary, .pagination-btn (screen and (max-width: 450px))",
  },
  {
    file: "components/AcceptablePriceImpactInputRow/AcceptablePriceImpactInputRow.scss",
    rules: ".AcceptablePriceImpactInputRow-na .AllowedSwapSlippageInputRow-na",
  },
  {
    file: "components/Claims/Claims.scss",
    rules: ".Claims-title",
  },
  {
    file: "components/GmSwap/GmSwapBox/GmSwapBox.scss",
    rules: ".GmSwapBox-market-dropdown .Dropdown-current",
  },
  {
    file: "components/PositionDropdown/PositionDropdown.css",
    rules: ".PositionDropdown-dots-icon",
  },
  {
    file: "pages/Dashboard/Dashboard.css",
    rules: ".Dashboard-fee-info",
  },
  {
    file: "pages/Dashboard/DashboardV2.css",
    rules: ".token-symbol-text",
  },
  {
    file: "components/TVChart/TVChart.scss",
    rules: ".chart-token-selector, with everything inside it",
  },
  {
    file: "components/TableOptionsFilter/TableOptionsFilter.scss",
    rules: ".TableOptionsFilter-clear",
  },
  {
    file: "pages/Jobs/Jobs.css",
    rules: ".jobs-contact",
  },
  {
    file: "components/TradeBox/components/EntryButton.tsx",
    rules: "the whole component: nothing renders it",
  },
];

const CHANGELOG_SECTIONS = {
  values: { id: "typography-change-values", title: "1. Change these text styles" },
  variables: { id: "typography-change-variables", title: "2. Change these CSS variables" },
  renames: { id: "typography-rename-headings", title: "3. Rename the headings" },
  added: { id: "typography-add-styles", title: "4. Add these text styles" },
  replaced: { id: "typography-replace", title: "5. Replace these" },
  sizeClasses: { id: "typography-move-size-classes", title: "6. Move these size-only classes" },
  cleanups: { id: "typography-clean-up", title: "7. Clean up hand-typed values" },
  ruleCleanups: { id: "typography-clean-up-by-rule", title: "8. More cleanup" },
  unused: { id: "typography-delete-unused", title: "9. Delete these unused styles" },
} satisfies Record<string, DocsSectionInfo>;

const CODE_CELL_CLASSNAME = "whitespace-nowrap py-10 pr-16 font-mono text-15";
const NEW_NAME_CLASSNAME = cx(CODE_CELL_CLASSNAME, "text-blue-400 dark:text-blue-300");

function ChangeTable({
  nameTitle,
  valueTitle,
  changes,
}: {
  nameTitle: string;
  valueTitle: string;
  changes: StyleChange[];
}) {
  return (
    <div className="overflow-x-auto">
      <table className="text-body-large w-full min-w-[560px] border-collapse text-left">
        <thead>
          <tr className="text-body-medium uppercase text-typography-secondary">
            <th className={TH_CLASSNAME}>{nameTitle}</th>
            <th className={TH_CLASSNAME}>Size</th>
            <th className="pb-8 font-normal">{valueTitle}</th>
          </tr>
        </thead>
        <tbody>
          {changes.map((change) => (
            <tr key={change.name} className="border-t-1/2 border-slate-600">
              <td className={CODE_CELL_CLASSNAME}>{change.name}</td>
              <td className="py-10 pr-16">{change.size}</td>
              <td className="whitespace-nowrap py-10">
                {change.before} <span className="text-typography-secondary">→</span>{" "}
                <span className="font-medium">{change.after}</span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function SectionIntro({ children }: { children: ReactNode }) {
  return <p className="text-body-large text-typography-secondary">{children}</p>;
}

/**
 * Changelog tab: what developers change in the code, step by step. Values first, with the current names; then the heading
 * renames and the new styles; then the replacements and the size-only classes; then the cleanups; then the unused
 * styles.
 */
export function TypographyChangelog() {
  return (
    <div className="flex flex-col gap-16">
      <SectionIntro>
        Steps to move tailwind.config.ts and the app to these text styles, in this order. None of them are done yet.
      </SectionIntro>
      <DocsSection section={CHANGELOG_SECTIONS.values}>
        <div className="flex flex-col gap-16">
          <SectionIntro>
            In tailwind.config.ts (fontComponentsPlugin), with the current names. Line heights follow the rule: size ×
            1.4 up to 24px, × 1.2 above, rounded to the nearest 4px. The caption also grows to 12px. 1rem is 10px here.
            text-body-small stays 1.6rem (16px).
          </SectionIntro>
          <ChangeTable nameTitle="Class" valueTitle="Line height old → new" changes={CLASS_CHANGES} />
        </div>
      </DocsSection>
      <DocsSection section={CHANGELOG_SECTIONS.variables}>
        <div className="flex flex-col gap-16">
          <SectionIntro>
            Same file, in :root, so the variables match the classes. --line-height-body-small stays 1.6rem.
          </SectionIntro>
          <ChangeTable nameTitle="Variable" valueTitle="Value old → new" changes={VARIABLE_CHANGES} />
        </div>
      </DocsSection>
      <DocsSection section={CHANGELOG_SECTIONS.renames}>
        <div className="flex flex-col gap-16">
          <SectionIntro>
            Each heading moves down one name, to free text-h1 for the new 40px heading in step 4. Rename in this order,
            everywhere the name is used, so no name is in use twice. Values don't change.
          </SectionIntro>
          <div className="overflow-x-auto">
            <table className="text-body-large w-full min-w-[480px] border-collapse text-left">
              <thead>
                <tr className="text-body-medium uppercase text-typography-secondary">
                  <th className={TH_CLASSNAME}>Old name</th>
                  <th className="pb-8 font-normal">New name</th>
                </tr>
              </thead>
              <tbody>
                {HEADING_RENAMES.map((rename) => (
                  <tr key={rename.from} className="border-t-1/2 border-slate-600">
                    <td className={CODE_CELL_CLASSNAME}>{rename.from}</td>
                    <td className={NEW_NAME_CLASSNAME}>{rename.to}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </DocsSection>
      <DocsSection section={CHANGELOG_SECTIONS.added}>
        <div className="flex flex-col gap-16">
          <SectionIntro>
            In tailwind.config.ts, next to the other styles. Then move the places that type them by hand.
          </SectionIntro>
          <div className="overflow-x-auto">
            <table className="text-body-large w-full min-w-[640px] border-collapse text-left">
              <thead>
                <tr className="text-body-medium uppercase text-typography-secondary">
                  <th className={TH_CLASSNAME}>New class</th>
                  <th className={TH_CLASSNAME}>Values</th>
                  <th className="pb-8 font-normal">Replaces</th>
                </tr>
              </thead>
              <tbody>
                {NEW_STYLES.map((style) => (
                  <tr key={style.name} className="border-t-1/2 border-slate-600 align-top">
                    <td className={NEW_NAME_CLASSNAME}>{style.name}</td>
                    <td className="py-10 pr-16">{style.values}</td>
                    <td className="py-10 text-typography-secondary">{style.replaces}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </DocsSection>
      <DocsSection section={CHANGELOG_SECTIONS.replaced}>
        <div className="flex flex-col gap-16">
          <SectionIntro>
            Across the app: no 13px text, no browser-faked bold (only Regular and Medium are loaded), and one letter
            spacing for all numbers.
          </SectionIntro>
          <div className="overflow-x-auto">
            <table className="text-body-large w-full min-w-[640px] border-collapse text-left">
              <thead>
                <tr className="text-body-medium uppercase text-typography-secondary">
                  <th className={TH_CLASSNAME}>Old</th>
                  <th className={TH_CLASSNAME}>New</th>
                  <th className="pb-8 font-normal">Where</th>
                </tr>
              </thead>
              <tbody>
                {REPLACEMENTS.map((change) => (
                  <tr key={change.from} className="border-t-1/2 border-slate-600 align-top">
                    <td className={cx(CODE_CELL_CLASSNAME, "!whitespace-normal")}>{change.from}</td>
                    <td className={NEW_NAME_CLASSNAME}>{change.to}</td>
                    <td className="py-10 text-typography-secondary">{change.places}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </DocsSection>
      <DocsSection section={CHANGELOG_SECTIONS.sizeClasses}>
        <div className="flex flex-col gap-16">
          <SectionIntro>
            After step 3, because text-h2 and text-h3 are the new heading names. Each class becomes the named style of
            the same or nearest size, so the line height stops depending on what's around the text. text-16 stays as it
            is.
          </SectionIntro>
          <div className="overflow-x-auto">
            <table className="text-body-large w-full min-w-[640px] border-collapse text-left">
              <thead>
                <tr className="text-body-medium uppercase text-typography-secondary">
                  <th className={TH_CLASSNAME}>Old</th>
                  <th className={TH_CLASSNAME}>New</th>
                  <th className="pb-8 font-normal">Where</th>
                </tr>
              </thead>
              <tbody>
                {SIZE_CLASS_MOVES.map((change) => (
                  <tr key={change.from} className="border-t-1/2 border-slate-600 align-top">
                    <td className={CODE_CELL_CLASSNAME}>{change.from}</td>
                    <td className={NEW_NAME_CLASSNAME}>{change.to}</td>
                    <td className="py-10 text-typography-secondary">{change.places}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </DocsSection>
      <DocsSection section={CHANGELOG_SECTIONS.cleanups}>
        <div className="flex flex-col gap-16">
          <SectionIntro>
            After steps 1–6. The Change column shows the code as it was before steps 5 and 6, so a size class may
            already be replaced: what's left is to delete the hand-typed line height or letter spacing, so each place
            uses the named style (the class in .tsx files, the CSS variables in style files). The V1 badge in
            Footer/constants.tsx keeps its 8px.
          </SectionIntro>
          <div className="overflow-x-auto">
            <table className="text-body-large w-full min-w-[640px] border-collapse text-left">
              <thead>
                <tr className="text-body-medium uppercase text-typography-secondary">
                  <th className={TH_CLASSNAME}>Where</th>
                  <th className="pb-8 font-normal">Change</th>
                </tr>
              </thead>
              <tbody>
                {CLEANUPS.map((cleanup) => (
                  <tr key={cleanup.where} className="border-t-1/2 border-slate-600 align-top">
                    <td className="py-10 pr-16">{cleanup.where}</td>
                    <td className="py-10 font-mono text-15">{cleanup.change}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </DocsSection>
      <DocsSection section={CHANGELOG_SECTIONS.ruleCleanups}>
        <div className="flex flex-col gap-16">
          <SectionIntro>
            More places. Each one follows one of the rules above, has no visible change, isn't text, or stays as it is
            for now. The Why column says which.
          </SectionIntro>
          <div className="overflow-x-auto">
            <table className="text-body-large w-full min-w-[720px] border-collapse text-left">
              <thead>
                <tr className="text-body-medium uppercase text-typography-secondary">
                  <th className={TH_CLASSNAME}>Where</th>
                  <th className={TH_CLASSNAME}>Change</th>
                  <th className="pb-8 font-normal">Why</th>
                </tr>
              </thead>
              <tbody>
                {RULE_CLEANUPS.map((cleanup) => (
                  <tr key={cleanup.where} className="border-t-1/2 border-slate-600 align-top">
                    <td className="py-10 pr-16">{cleanup.where}</td>
                    <td className="py-10 pr-16 font-mono text-15">{cleanup.change}</td>
                    <td className="py-10 text-typography-secondary">{cleanup.rule}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </DocsSection>
      <DocsSection section={CHANGELOG_SECTIONS.unused}>
        <div className="flex flex-col gap-16">
          <SectionIntro>
            No component uses these rules anymore, so they never show. Delete the rules, and the EntryButton component,
            which nothing renders.
          </SectionIntro>
          <div className="overflow-x-auto">
            <table className="text-body-large w-full min-w-[640px] border-collapse text-left">
              <thead>
                <tr className="text-body-medium uppercase text-typography-secondary">
                  <th className={TH_CLASSNAME}>File</th>
                  <th className="pb-8 font-normal">Rules</th>
                </tr>
              </thead>
              <tbody>
                {UNUSED_STYLES.map((style) => (
                  <tr key={style.file} className="border-t-1/2 border-slate-600 align-top">
                    <td className="py-10 pr-16">{style.file}</td>
                    <td className="py-10 font-mono text-15">{style.rules}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </DocsSection>
    </div>
  );
}

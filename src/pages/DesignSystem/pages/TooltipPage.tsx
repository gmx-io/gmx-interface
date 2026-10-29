import { Fragment, ReactNode } from "react";

import Button from "components/Button/Button";
import ExternalLink from "components/ExternalLink/ExternalLink";
import StatsTooltipRow from "components/StatsTooltip/StatsTooltipRow";
import StandardTooltip from "components/Tooltip/StandardTooltip";
import type { TooltipPosition } from "components/Tooltip/Tooltip";
import {
  TooltipContent,
  TooltipDivider,
  TooltipFootnote,
  TooltipLink,
  TooltipRow,
  TooltipRows,
  TooltipTable,
  TooltipTableColumn,
  TooltipText,
  TooltipTitle,
  TooltipTotal,
} from "components/Tooltip/TooltipBlocks";
import { TooltipGroup } from "components/Tooltip/TooltipGroup";

import AnnouncementIcon from "img/ic_announcement.svg?react";
import BurgerMenuIcon from "img/ic_burger_menu.svg?react";
import CalendarIcon from "img/ic_calendar.svg?react";
import CardIcon from "img/ic_card.svg?react";
import ClockIcon from "img/ic_clock.svg?react";
import CopyIcon from "img/ic_copy_stroke.svg?react";
import EarnIcon from "img/ic_earn.svg?react";
import ExpressIcon from "img/ic_express.svg?react";
import InfoCircleStrokeIcon from "img/ic_info_circle_stroke.svg?react";
import MessageIcon from "img/ic_message.svg?react";
import PnlAnalysisIcon from "img/ic_pnl_analysis.svg?react";
import RepeatIcon from "img/ic_repeat.svg?react";
import SelectIcon from "img/ic_select.svg?react";
import SettingsIcon from "img/ic_settings.svg?react";
import DisconnectIcon from "img/ic_sign_out_20.svg?react";
import SortableIcon from "img/ic_sortable.svg?react";
import StarIcon from "img/ic_star.svg?react";

import {
  DocsCard,
  DocsCards,
  DocsCode,
  DocsChangelog,
  DocsChangelogEntry,
  DocsProp,
  DocsPropsTable,
  DocsRule,
  DocsRules,
  DocsSection,
  DocsSectionInfo,
} from "../DocsLayout";
import { TooltipAnatomy } from "./TooltipAnatomy";
import { LegacyTooltipPreview, StandardTooltipPreview } from "./TooltipPreview";
import usageSource from "./TooltipUsage.tsx?raw";

// Tooltip page of the design system site (/ui/tooltip).
// Examples: live tooltips only. Guidelines: the specs and rules behind them.
// Everything here is sample content; hover any trigger to see the tooltip.

const DOCS_URL = "https://docs.gmx.io/docs/trading/fees/";

function Usd({ value, negative }: { value: string; negative?: boolean }) {
  return (
    <>
      {negative && "-"}
      <span className="numeric-affix">$</span>
      {value}
    </>
  );
}

function Rate({ value }: { value: string }) {
  return <span className={value.startsWith("-") ? "text-red-500" : "text-green-500"}>{value}</span>;
}

function Market({ name, pool }: { name: string; pool: string }) {
  return (
    <>
      {name} <span className="whitespace-nowrap text-typography-secondary">{pool}</span>
    </>
  );
}

const PLAIN_TEXT = "Tooltip text explains one thing in plain words. It stays short and goes straight to the point.";

const PRICE_IMPACT = (
  <TooltipContent>
    <TooltipText>No price impact on increases — orders execute at mark price.</TooltipText>
    <TooltipLink href={DOCS_URL}>Read more</TooltipLink>
  </TooltipContent>
);

const FEES_BY_CHAIN = (
  <TooltipRows>
    <TooltipRow label="Arbitrum" value={<Usd value="390.49m" />} />
    <TooltipRow label="Avalanche" value={<Usd value="80.71m" />} />
    <TooltipRow label="Solana" value={<Usd value="20.80m" />} />
    <TooltipRow label="MegaETH" value={<Usd value="18.48k" />} />
    <TooltipTotal label="Total" value={<Usd value="492.03m" />} />
  </TooltipRows>
);

const WALLET_PARAGRAPHS = [
  "You can open isolated positions on GMX using funds from either your wallet or your GMX Account.",
  "Wallet uses funds directly from your connected wallet.",
  "GMX Account uses a separate trading balance linked to that wallet. To use it, fund your wallet first, then deposit to your GMX Account.",
  "All positions belong to the same connected wallet and are shown together, whether they were opened with wallet funds or GMX Account funds.",
];

const WALLET_INFO = (
  <TooltipContent>
    {WALLET_PARAGRAPHS.map((paragraph) => (
      <TooltipText key={paragraph}>{paragraph}</TooltipText>
    ))}
    <TooltipLink href={DOCS_URL}>Read more</TooltipLink>
  </TooltipContent>
);

const NET_RATE_COLUMNS: TooltipTableColumn[] = [
  { label: "Pool" },
  { label: "Longs / 1h", align: "right" },
  { label: "Shorts / 1h", align: "right" },
];

const NET_RATE_ROWS: ReactNode[][] = [
  [
    <Market key="m" name="BTC/USD" pool="[BTC-USDC]" />,
    <Rate key="l" value="+0.0001%" />,
    <Rate key="s" value="-0.0006%" />,
  ],
  [
    <Market key="m" name="BTC/USD" pool="[BTC-BTC]" />,
    <Rate key="l" value="-0.0042%" />,
    <Rate key="s" value="+0.0026%" />,
  ],
  [
    <Market key="m" name="BTC/USD" pool="[TBTC-TBTC]" />,
    <Rate key="l" value="-0.0021%" />,
    <Rate key="s" value="+0.0036%" />,
  ],
];

function NetRateTable() {
  return <TooltipTable columns={NET_RATE_COLUMNS} rows={NET_RATE_ROWS} />;
}

const NET_RATE = <NetRateTable />;

const FEE_ROWS: [string, ReactNode, string?][] = [
  ["Open fees", <Usd key="v" value="0.00" />],
  ["Close fees", <Usd key="v" value="0.00" />],
  ["Borrow fees", <Usd key="v" value="0.00" />],
  ["Negative funding fees", <Usd key="v" value="0.00" />],
  ["Other realized fees", <Usd key="v" value="0.00" />],
  ["Unrealized fee contribution", <Usd key="v" value="70.44" negative />, "text-red-500"],
  ["Net price impact", <Usd key="v" value="0.00" />],
  ["Swap fees", <Usd key="v" value="0.00" />],
  ["Swap price impact", <Usd key="v" value="0.00" />],
];

const PNL_BREAKDOWN = (
  <TooltipContent>
    <TooltipRows>
      <TooltipTitle value={<Usd value="197,883.95" />}>Capital used</TooltipTitle>
      <TooltipText>
        Capital used = max(sum of collateral of open positions − realized PnL + starting pending PnL).
      </TooltipText>
    </TooltipRows>
    <TooltipDivider />
    <TooltipRows>
      <TooltipTitle value={<Usd value="967.71" />} valueClassName="text-green-500">
        PnL
      </TooltipTitle>
      <TooltipRow label="Realized PnL before fees" value={<Usd value="0.00" />} />
      <TooltipRow
        label="Live unrealized PnL before fees"
        value={<Usd value="159,962.05" />}
        valueClassName="text-green-500"
      />
      <TooltipRow
        label="Start unrealized PnL before fees"
        value={<Usd value="158,923.89" negative />}
        valueClassName="text-red-500"
      />
    </TooltipRows>
    <TooltipDivider />
    <TooltipRows>
      <TooltipTitle>Fees and impacts</TooltipTitle>
      {FEE_ROWS.map(([label, value, className]) => (
        <TooltipRow key={label} label={label} value={value} valueClassName={className} />
      ))}
    </TooltipRows>
    <TooltipFootnote>Outstanding claimable amounts are not included.</TooltipFootnote>
  </TooltipContent>
);

const FOOTNOTE_EXAMPLE = (
  <TooltipContent>
    <TooltipRows>
      <TooltipRow label="Max network fee" value={<Usd value="0.29" />} />
      <TooltipRow label="Estimated fee refund" value={<Usd value="0.08" />} valueClassName="text-green-500" />
    </TooltipRows>
    <TooltipFootnote>Unused network fees are refunded after execution.</TooltipFootnote>
  </TooltipContent>
);

const MOTION_ROW = ["Open fee", "Close fee", "Borrow fee"];

const PLACEMENTS: [string, TooltipPosition][] = [
  ["Below · start", "bottom-start"],
  ["Below · center", "bottom"],
  ["Below · end", "bottom-end"],
  ["Above · start", "top-start"],
  ["Above · center", "top"],
  ["Above · end", "top-end"],
];

// "Before" versions, built the way the app builds them today
const BEFORE_PRICE_IMPACT = (
  <>
    No price impact on increases — orders execute at mark price. <ExternalLink href={DOCS_URL}>Read more</ExternalLink>.
  </>
);

const BEFORE_FEES = (
  <>
    <StatsTooltipRow label="Arbitrum" value="390.49m" />
    <StatsTooltipRow label="Avalanche" value="80.71m" />
    <StatsTooltipRow label="Solana" value="20.80m" />
    <StatsTooltipRow label="MegaETH" value="18.48k" />
    <div className="Tooltip-divider" />
    <StatsTooltipRow label="Total" value="492.03m" />
  </>
);

const BEFORE_WALLET = (
  <div className="flex flex-col gap-16 text-typography-secondary">
    <div className="flex flex-col gap-12">
      {WALLET_PARAGRAPHS.map((paragraph) => (
        <div key={paragraph}>{paragraph}</div>
      ))}
    </div>
    <ExternalLink href={DOCS_URL} variant="icon-arrow" className="font-medium text-blue-300">
      Read more
    </ExternalLink>
  </div>
);

const BEFORE_NET_RATE = (
  <div className="flex flex-col gap-4">
    <div className="text-body-small grid grid-cols-[1fr_auto_auto] gap-x-20 uppercase text-typography-secondary">
      <span>Pool</span>
      <span className="text-right">Longs net rate / 1h</span>
      <span className="text-right">Shorts net rate / 1h</span>
    </div>
    {NET_RATE_ROWS.map((row, index) => (
      <div key={index} className="grid grid-cols-[1fr_auto_auto] gap-x-20">
        {row.map((cell, cellIndex) => (
          <span key={cellIndex} className={cellIndex > 0 ? "text-right" : undefined}>
            {cell}
          </span>
        ))}
      </div>
    ))}
  </div>
);

// Something behind the tooltip, so the blur has content to work on
const BACKDROP_ROWS = [
  ["ETH/USD", "$2,431.20", "+1.24%"],
  ["BTC/USD", "$63,912.05", "-0.58%"],
  ["SOL/USD", "$142.87", "+3.10%"],
];

function BlurBackdrop() {
  return (
    <div className="text-body-medium grid w-fit grid-cols-[repeat(3,auto)] gap-x-16 gap-y-4" aria-hidden>
      {BACKDROP_ROWS.map(([market, price, change]) => (
        <Fragment key={market}>
          <span className="text-typography-secondary">{market}</span>
          <span>{price}</span>
          <span className={change.startsWith("-") ? "text-red-500" : "text-green-500"}>{change}</span>
        </Fragment>
      ))}
    </div>
  );
}

// The Usage code in the Props tab: TooltipUsage.tsx without its note for maintainers
const USAGE_CODE = usageSource.replace(/^(\/\/.*\n)+/, "");

const SECTIONS = {
  anatomy: { id: "tooltip-anatomy", title: "Anatomy", icon: SelectIcon },
  panel: { id: "tooltip-panel", title: "Sizes and placement", icon: CardIcon },
  examples: { id: "tooltip-examples", title: "In the app", icon: MessageIcon },
  motion: { id: "tooltip-motion", title: "Motion", icon: ExpressIcon },
  seeThrough: { id: "tooltip-see-through", title: "See-through", icon: StarIcon },
  beforeAfter: { id: "tooltip-before-after", title: "Before → after", icon: RepeatIcon },
  specs: { id: "tooltip-specs", title: "Specs", icon: SettingsIcon },
  placementRules: { id: "tooltip-placement-rules", title: "Placement and triggers", icon: SortableIcon },
  contentRules: { id: "tooltip-content-rules", title: "Content", icon: AnnouncementIcon },
  behavior: { id: "tooltip-behavior", title: "Behavior and motion", icon: ClockIcon },
  usage: { id: "tooltip-usage", title: "Usage", icon: CopyIcon },
  standardProps: { id: "tooltip-props", title: "StandardTooltip", icon: InfoCircleStrokeIcon },
  groupProps: { id: "tooltip-group-props", title: "TooltipGroup", icon: BurgerMenuIcon },
  blockProps: { id: "tooltip-block-props", title: "Content blocks", icon: PnlAnalysisIcon },
} satisfies Record<string, DocsSectionInfo>;

const SPECS: DocsRule[] = [
  [
    "Panel",
    "See-through with a 12px background blur, light or dark with the app theme. Light: DS Fill/SurfaceElevated at 80%. Dark: Fill/SurfaceElevated + Fill/SurfaceHover at 70%.",
  ],
  ["Padding and corners", "12px on the sides, 8px at the top and bottom, 8px corners, 8px between blocks."],
  ["Border", "1px, DS Stroke/Primary, on the panel and the pointer."],
  [
    "Sizes",
    "Default grows up to 350px, for text, rows and links. Wide grows up to 480px, only for tables. Short tooltips shrink to fit.",
  ],
  [
    "Text",
    "Main text is TextIcon/Primary in the light theme and gray-100 in the dark theme, slightly softer than white. Muted text for row labels and footnotes.",
  ],
  ["Type", "14/18 for text, 14/18 medium for titles, 12/16 for footnotes and table headers."],
  ["Shadow", "0 4 14: 25% black in the dark theme, 8% slate-950 in the light theme."],
  ["Pointer", "14 × 7px, the panel color."],
];

const PLACEMENT_RULES: DocsRule[] = [
  [
    "Placement",
    "Below the trigger by default, above when there's no room. The panel lines up with the trigger at the start, center or end; the pointer stays under the middle of the trigger. No side placements.",
  ],
  ["Dotted underline", "Values and labels in rows and tables."],
  ["Info icon", "Outline only. Headers, titles and settings."],
  ["No marker", "Only on icon buttons and disabled buttons, where the element itself is the trigger."],
  ["Cursor", "A normal arrow over a trigger, not the question-mark help cursor."],
];

const CONTENT_RULES: DocsRule[] = [
  ["Block order", "Title → Text → Rows → Table → Link or footnote."],
  ["Short text", "Plain text that fits in one or two lines is centered. Longer text and blocks align left."],
  ["Rows", "No colons. Muted label on the left, value on the right with tabular numbers. A divider above the total."],
  ["$ and units", "Always the same color as their number: main text, green, red or yellow."],
  ["Colors", "Green and red only for values, yellow only for warnings."],
  ["Links", 'One style: underlined, blue on hover. "Read more" goes last, on its own line.'],
  ["Not a tooltip", "Menus and buttons go in dropdowns. No bullets: use Title + Text pairs."],
];

const BEHAVIOR_RULES: DocsRule[] = [
  ["Delay", "The first tooltip waits 200 ms, so passing over a trigger doesn't open it."],
  ["Enter", "Fades in, grows from 94% out of the pointer and moves 4px away from the trigger, in 200 ms."],
  ["Next tooltips", "While one is open, the next ones open instantly, with no animation."],
  ["Exit", "The same way back, in 120 ms."],
  [
    "Keyboard",
    "Tab reaches every trigger, disabled buttons too, and focus opens it instantly. If it has a link, the next Tab moves into it. Tabbing past it closes it; Escape closes it and puts focus back on the trigger.",
  ],
  [
    "Screen readers",
    "The focused trigger points to its tooltip, so it's read after the trigger: text, buttons and links. A disabled button reads as an unavailable button, with the tooltip as the reason. An icon button whose tooltip repeats its name uses type=\"label\", so it isn't read twice.",
  ],
  ["Reduce motion", "Fade only."],
  ["Phones", "A tap opens it; a tap outside or scrolling closes it. It stays 8px inside the screen edges."],
  ["Copy", "It stays open while you move into it, so you can select and copy the text."],
];

export function TooltipExamples() {
  return (
    <TooltipGroup>
      <div className="flex flex-col gap-16">
        <DocsSection section={SECTIONS.anatomy} flush>
          <TooltipAnatomy />
        </DocsSection>

        <DocsSection section={SECTIONS.panel} flush>
          <DocsCards columns={2}>
            <DocsCard label="Default · up to 350px">
              <StandardTooltip handle="Price impact / fees" content={PRICE_IMPACT} />
            </DocsCard>
            <DocsCard label="Wide · up to 480px, tables only">
              <StandardTooltip handle="+0.0001% / +0.0036%" size="wide" content={NET_RATE} />
            </DocsCard>
          </DocsCards>
          <DocsCards>
            {PLACEMENTS.map(([label, position]) => (
              <DocsCard key={position} label={label}>
                <StandardTooltip handle="Hover me" content={PLAIN_TEXT} position={position} />
              </DocsCard>
            ))}
          </DocsCards>
        </DocsSection>

        <DocsSection section={SECTIONS.examples} flush>
          <DocsCards>
            <DocsCard label="Trade box · price impact">
              <StandardTooltip handle="Price impact / fees" content={PRICE_IMPACT} />
            </DocsCard>
            <DocsCard label="Trade box · network fee">
              <StandardTooltip handle="Network fee" content={FOOTNOTE_EXAMPLE} />
            </DocsCard>
            <DocsCard label="Stats · fees by chain">
              <StandardTooltip handle="$492.03m" content={FEES_BY_CHAIN} position="bottom-end" />
            </DocsCard>
            <DocsCard label="Markets · net rate">
              <StandardTooltip handle="+0.0001% / +0.0036%" size="wide" content={NET_RATE} />
            </DocsCard>
            <DocsCard label="Trader page · PnL breakdown">
              <StandardTooltip handle={<span className="text-green-500">$967.71</span>} content={PNL_BREAKDOWN} />
            </DocsCard>
            <DocsCard label="Wallet & GMX Account">
              <StandardTooltip
                handle="Wallet & GMX Account"
                variant="iconStroke"
                content={WALLET_INFO}
                position="bottom-end"
              />
            </DocsCard>
            <DocsCard label="Pools · fee APY header">
              <StandardTooltip
                handle="FEE APY"
                variant="iconStroke"
                content="Projected yearly return from trading fees only."
              />
            </DocsCard>
            <DocsCard label="Wallet · disconnect button">
              <StandardTooltip variant="none" type="label" content="Disconnect" position="bottom">
                <button
                  type="button"
                  aria-label="Disconnect"
                  className="flex size-28 items-center justify-center rounded-8 text-typography-secondary hover:bg-fill-surfaceHover hover:text-typography-primary"
                >
                  <DisconnectIcon className="size-16" />
                </button>
              </StandardTooltip>
            </DocsCard>
            <DocsCard label="Claims · disabled button">
              <StandardTooltip
                variant="none"
                content="Nothing is claimable on Arbitrum right now."
                position="bottom"
                isHandlerDisabled
                shouldPreventDefault={false}
              >
                <Button variant="primary" disabled>
                  <EarnIcon className="size-16" />
                  Claim rewards
                </Button>
              </StandardTooltip>
            </DocsCard>
          </DocsCards>
        </DocsSection>

        {/* Two small blocks share one row */}
        <div className="grid grid-cols-1 gap-16 md:grid-cols-2">
          <DocsSection section={SECTIONS.motion} flush>
            <DocsCards columns={1}>
              <DocsCard label="Hover across: only the first tooltip waits">
                <div className="flex flex-wrap items-center gap-24">
                  {MOTION_ROW.map((label) => (
                    <StandardTooltip key={label} handle={label} content={PLAIN_TEXT} />
                  ))}
                </div>
              </DocsCard>
            </DocsCards>
          </DocsSection>

          <DocsSection section={SECTIONS.seeThrough} flush>
            <DocsCards columns={1}>
              <DocsCard label="Over content: the panel blurs what's behind it">
                <StandardTooltip handle="Hover me" content={PLAIN_TEXT} />
                <BlurBackdrop />
              </DocsCard>
            </DocsCards>
          </DocsSection>
        </div>
      </div>
    </TooltipGroup>
  );
}

const STANDARD_TOOLTIP_PROPS: DocsProp[] = [
  { name: "handle", type: "ReactNode", description: "The trigger. Takes precedence over children." },
  { name: "content", type: "ReactNode", description: "What the tooltip shows. Build it from the content blocks." },
  {
    name: "size",
    type: '"default" | "wide"',
    defaultValue: '"default"',
    description: "Default grows up to 350px. Wide grows up to 480px and is only for tables.",
  },
  {
    name: "position",
    type: '"bottom-start" | "bottom" | "bottom-end" | "top-start" | "top" | "top-end"',
    defaultValue: '"bottom-start"',
    description: "Where it opens. It flips to the opposite side when there's no room.",
  },
  {
    name: "variant",
    type: '"underline" | "iconStroke" | "none"',
    defaultValue: '"underline"',
    description: "The trigger style: dotted underline, outline info icon, or no marker for icon and disabled buttons.",
  },
  {
    name: "interactive",
    type: "boolean",
    defaultValue: "true",
    description:
      "Stays open while the cursor moves into it, so links work and text can be copied. Set false to let the cursor pass through.",
  },
  {
    name: "openDelay",
    type: "number",
    defaultValue: "200",
    description: "Hover delay in ms. Inside a TooltipGroup only the first tooltip waits.",
  },
  {
    name: "type",
    type: '"description" | "label"',
    defaultValue: '"description"',
    description:
      'Screen readers read a description after the trigger. Use "label" when the tooltip only repeats the trigger\'s own name (an icon button with the same aria-label).',
  },
  { name: "disabled", type: "boolean", defaultValue: "false", description: "Turns the tooltip off." },
  {
    name: "isHandlerDisabled",
    type: "boolean",
    defaultValue: "false",
    description: "For disabled buttons: the tooltip still opens while the button stays disabled.",
  },
];

const GROUP_PROPS: DocsProp[] = [
  {
    name: "children",
    type: "ReactNode",
    description: "Wrap a page, a table or a list: only the first tooltip waits, the next ones open instantly.",
  },
];

const BLOCK_PROPS: DocsProp[] = [
  { name: "TooltipContent", type: "children", description: "Stacks blocks 8px apart." },
  {
    name: "TooltipTitle",
    type: "children, value?, valueClassName?",
    description: "Title, with an optional value on the right (e.g. PnL $967.71).",
  },
  { name: "TooltipText", type: "children", description: "A paragraph." },
  { name: "TooltipRows", type: "children", description: "Stacks rows 8px apart." },
  {
    name: "TooltipRow",
    type: "label, value, valueClassName?, isTotal?",
    description: "Label + value, no colon. Use valueClassName only for green, red or yellow values.",
  },
  { name: "TooltipTotal", type: "label, value, valueClassName?", description: "A divider and the total row." },
  { name: "TooltipDivider", type: "—", description: "A 1px line between sections." },
  {
    name: "TooltipTable",
    type: "columns, rows",
    description: 'A multi-column table with headers. Use with size="wide".',
  },
  { name: "TooltipLink", type: "href, children", description: "A link on its own line, always last." },
  { name: "TooltipFootnote", type: "children", description: "A small note, always last." },
];

export function TooltipPropsReference() {
  return (
    <div className="flex flex-col gap-16">
      <DocsSection section={SECTIONS.usage} flush>
        <DocsCode code={USAGE_CODE} collapsedHeight={320} />
      </DocsSection>
      <DocsSection section={SECTIONS.standardProps}>
        <DocsPropsTable props={STANDARD_TOOLTIP_PROPS} />
      </DocsSection>
      <DocsSection section={SECTIONS.groupProps}>
        <DocsPropsTable props={GROUP_PROPS} />
      </DocsSection>
      <DocsSection section={SECTIONS.blockProps}>
        <DocsPropsTable props={BLOCK_PROPS} />
      </DocsSection>
    </div>
  );
}

export function TooltipGuidelines() {
  return (
    <div className="flex flex-col gap-16">
      <DocsSection section={SECTIONS.specs}>
        <DocsRules rules={SPECS} />
      </DocsSection>
      <DocsSection section={SECTIONS.placementRules}>
        <DocsRules rules={PLACEMENT_RULES} />
      </DocsSection>
      <DocsSection section={SECTIONS.contentRules}>
        <DocsRules rules={CONTENT_RULES} />
      </DocsSection>
      <DocsSection section={SECTIONS.behavior}>
        <DocsRules rules={BEHAVIOR_RULES} />
      </DocsSection>
    </div>
  );
}

const CHANGELOG: DocsChangelogEntry[] = [
  {
    id: "tooltip-v1-0",
    title: "v1.0 · Proposal",
    icon: CalendarIcon,
    date: "Oct 3, 2026",
    changes: [
      "One see-through, blurred panel for every tooltip, light or dark with the app theme, with a 1px border and 8px corners.",
      "Two sizes: Default up to 350px; Wide up to 480px, for tables only.",
      "Five content blocks (title, text, rows, table, link or footnote) replace hand-built layouts.",
      "Opens after 200 ms, grows out of the pointer and leaves quickly; neighbouring tooltips open instantly.",
      "Works with the keyboard, screen readers and phones, and stays open so text can be copied.",
    ],
  },
];

export function TooltipChangelog() {
  return (
    <div className="flex flex-col gap-16">
      <DocsChangelog entries={CHANGELOG} />
      {/* Both versions are drawn open, so the difference shows without hovering */}
      <DocsSection section={SECTIONS.beforeAfter} flush>
        <div className="flex flex-col divide-y divide-fill-surfaceElevated">
          <BeforeAfter
            label="Price impact"
            change="See-through with a blur. 12px on the sides, 8px at the top and bottom. The link moves to its own line."
            before={<LegacyTooltipPreview handle="Price impact / fees" content={BEFORE_PRICE_IMPACT} />}
            after={<StandardTooltipPreview handle="Price impact / fees" content={PRICE_IMPACT} />}
          />
          <BeforeAfter
            label="Fees by chain"
            change="No colons. The total label and the $ take the main text color."
            before={<LegacyTooltipPreview handle="$492.03m" content={BEFORE_FEES} position="bottom-end" />}
            after={<StandardTooltipPreview handle="$492.03m" content={FEES_BY_CHAIN} position="bottom-end" />}
          />
          <BeforeAfter
            label="Wallet & GMX Account"
            change="Main text color instead of muted. The standard link instead of a blue one with an arrow. 350px instead of 320px."
            before={
              <LegacyTooltipPreview
                handle="Wallet & GMX Account"
                variant="iconStroke"
                content={BEFORE_WALLET}
                maxWidth={320}
                position="bottom-end"
              />
            }
            after={
              <StandardTooltipPreview
                handle="Wallet & GMX Account"
                variant="iconStroke"
                content={WALLET_INFO}
                position="bottom-end"
              />
            }
          />
          <BeforeAfter
            label="Net rate"
            change="Shorter headers and 8px between rows, in the Wide size made for tables. Same colors."
            before={<LegacyTooltipPreview handle="+0.0001% / +0.0036%" content={BEFORE_NET_RATE} maxWidth={510} />}
            after={<StandardTooltipPreview handle="+0.0001% / +0.0036%" size="wide" content={NET_RATE} />}
          />
        </div>
      </DocsSection>
    </div>
  );
}

function BeforeAfter({
  label,
  change,
  before,
  after,
}: {
  label: string;
  change: string;
  before: ReactNode;
  after: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-16 p-24 max-md:p-16">
      <div className="flex flex-col gap-4">
        <span className="text-body-large font-medium text-typography-primary">{label}</span>
        <span className="text-body-medium text-typography-secondary">{change}</span>
      </div>
      <div className="grid grid-cols-1 gap-24 lg:grid-cols-2">
        <div className="flex min-w-0 flex-col items-start gap-8">
          <span className="text-body-medium text-typography-secondary">Before</span>
          {before}
        </div>
        <div className="flex min-w-0 flex-col items-start gap-8">
          <span className="text-body-medium font-medium text-typography-primary">After</span>
          {after}
        </div>
      </div>
    </div>
  );
}

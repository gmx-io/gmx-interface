import cx from "classnames";
import { Fragment } from "react";

import CopyIcon from "img/ic_copy_stroke.svg?react";
import InfoCircleStrokeIcon from "img/ic_info_circle_stroke.svg?react";
import SelectIcon from "img/ic_select.svg?react";

import { DocsChangelog } from "../DocsChangelog";
import { DocsCode, DocsRule, DocsRules, DocsSection, DocsSectionInfo } from "../DocsLayout";
import { SPACING_CHANGELOG_NOTES, SPACING_CHANGELOG_STEPS } from "./spacingChangelog";

// Spacing page of the design system site (/ui/spacing).
// Examples: the spacing scale.
// Guidelines: how to use spacing in code, and what the app uses each step for today.
// Changelog: exact edits that move the values off the scale onto it.

const SECTIONS = {
  scale: { id: "spacing-scale", title: "Scale", icon: SelectIcon },
  rules: { id: "spacing-rules", title: "Rules", icon: InfoCircleStrokeIcon },
  steps: { id: "spacing-steps", title: "Steps", icon: SelectIcon },
  usage: { id: "spacing-usage", title: "Usage", icon: CopyIcon },
} satisfies Record<string, DocsSectionInfo>;

type SpacingStep = { px: number; uses: number; usedFor: string };

// 0–24 in 4px steps inside components, then layout steps for pages and sections. uses counts the spacing classes
// (padding, margin, gap, space, inset) in src and landing.
const COMPONENT_SCALE: SpacingStep[] = [
  { px: 0, uses: 194, usedFor: "Resets: p-0, m-0, inset-0" },
  { px: 4, uses: 413, usedFor: "An icon next to text, small buttons (gap-4)" },
  { px: 8, uses: 668, usedFor: "The default gap between items in a row or list; button and tooltip padding (py-8)" },
  { px: 12, uses: 370, usedFor: "Button side padding (px-12), small cards and fields (p-12), stacked blocks (gap-12)" },
  { px: 16, uses: 283, usedFor: "Card and modal padding on phones (p-adaptive), sections inside a card (gap-16)" },
  { px: 20, uses: 200, usedFor: "Card and modal padding from 768px up (p-adaptive, px-20)" },
  { px: 24, uses: 170, usedFor: "Space under headings on long text pages (mb-24); primary action side padding" },
];

const LAYOUT_SCALE: SpacingStep[] = [
  { px: 32, uses: 18, usedFor: "Page-level spacing" },
  { px: 40, uses: 32, usedFor: "Landing section padding (px-40)" },
  { px: 48, uses: 1, usedFor: "Large layout spacing" },
  { px: 56, uses: 3, usedFor: "Large layout spacing" },
  { px: 64, uses: 1, usedFor: "Large layout spacing" },
  { px: 80, uses: 10, usedFor: "Landing section padding (py-80)" },
  { px: 96, uses: 3, usedFor: "Large layout spacing" },
  { px: 120, uses: 18, usedFor: "Landing page sections (today py-[120px])" },
];

const SCALE_GROUPS = [
  { title: "Inside components · 0–24", steps: COMPONENT_SCALE },
  { title: "Page and section layout · 32–120", steps: LAYOUT_SCALE },
];

const SCALE = [...COMPONENT_SCALE, ...LAYOUT_SCALE];

// The bar is as wide as the step (0 shows as a 1px line)
const BAR_STYLES: Record<number, { width: number }> = Object.fromEntries(
  SCALE.map((step) => [step.px, { width: Math.max(step.px, 1) }])
);

const STEPS_COLUMNS_CLASSNAME = "grid grid-cols-[120px_1fr] items-center gap-x-16 md:grid-cols-[160px_56px_1fr]";
const HEADER_CLASSNAME = "text-body-small text-textIcon-secondary";

function StepRow({ step }: { step: SpacingStep }) {
  return (
    <div className={cx(STEPS_COLUMNS_CLASSNAME, "gap-y-4 border-t-1/2 border-stroke-primary py-10")}>
      <span className="flex flex-col">
        <span className="text-body-medium font-medium">space/{step.px}</span>
        <span className="text-body-small font-mono text-textIcon-secondary">
          p-{step.px} · gap-{step.px}
        </span>
      </span>
      <span className="text-body-medium text-textIcon-secondary max-md:hidden">{step.uses}</span>
      <span className="text-body-medium text-textIcon-secondary">{step.usedFor}</span>
    </div>
  );
}

/**
 * Examples tab: every step of the scale as a bar.
 */
export function SpacingExamples() {
  return (
    <DocsSection section={SECTIONS.scale}>
      <div className="flex flex-col">
        {SCALE.map((step, index) => (
          <div
            key={step.px}
            className={cx("grid grid-cols-[160px_104px] items-center gap-x-16 py-10", {
              "border-t-1/2 border-stroke-primary": index > 0,
            })}
          >
            <span className="text-body-medium font-medium">space/{step.px}</span>
            <span className="flex h-16 items-center">
              <span className="h-16 rounded-2 bg-blue-strong" style={BAR_STYLES[step.px]} />
            </span>
          </div>
        ))}
      </div>
    </DocsSection>
  );
}

/**
 * Changelog tab: exact edits that move the values off the scale onto it.
 */
export function SpacingChangelog() {
  return (
    <DocsChangelog
      title="Spacing changelog"
      summary="8 steps that move the 753 spacing classes off the scale onto it, area by area. All of them are applied. Each edit gives the file, the exact text to find at release 0f9e06e991 and the text to put instead."
      notes={SPACING_CHANGELOG_NOTES}
      steps={SPACING_CHANGELOG_STEPS}
    />
  );
}

const RULES: DocsRule[] = [
  [
    "The scale",
    "0–24 in 4px steps inside components, plus 32 to 120 for page and section layout: 15 values. The number is the size in px, and the Tailwind class uses the same number (space/8 = p-8, gap-8, m-8). Uses under Steps counts the spacing classes in the app and the landing page today.",
  ],
  [
    "Off the scale today",
    "About 775 classes in 255 files use values off the scale: mostly the 2px steps (2, 6, 10, 14), 28, 36 and 1px nudges. The Changelog moves them onto the scale: 1 goes to 0, 2 and 3 go to 4, any other value rounds down to the step below, a padding pair keeps its total where it can (11 above and 9 below become 12 and 8), and a control with a fixed height keeps it.",
  ],
  [
    "Use the scale",
    "Pick padding, margin and gap from the 15 steps: 0–24 inside components, 32 and up for page and section layout. The class number is the size in px: p-8 is 8px.",
  ],
  [
    "Gap over margin",
    "Space items with gap on their parent rather than margins on each item, so the spacing lives in one place.",
  ],
  ["Cards and modals", "Use p-adaptive: 16px on phones, 20px from 768px up."],
  ["Components", "Button, Tooltip and the other components set their own spacing. Don't override it from outside."],
  ["No nudges", "Don't add arbitrary values (p-[10px]), 2px steps or 1px fixes. Take the nearest step."],
];

const USAGE_CODE = `// A row: gap on the parent
<div className="flex items-center gap-8">
  <TokenIcon symbol="ETH" displaySize={20} />
  <span>Ethereum</span>
</div>

// A card: adaptive padding, sections 16px apart
<div className="flex flex-col gap-16 rounded-8 bg-fill-surfaceElevated p-adaptive">
  …
</div>`;

/**
 * Guidelines tab: the rules, what the app uses each step for, then a usage snippet.
 */
export function SpacingGuidelines() {
  return (
    <div className="flex flex-col gap-16">
      <DocsSection section={SECTIONS.rules}>
        <DocsRules rules={RULES} />
      </DocsSection>
      <DocsSection section={SECTIONS.steps}>
        <div className="flex flex-col">
          <div className={cx(STEPS_COLUMNS_CLASSNAME, "pb-8 max-md:hidden")}>
            <span className={HEADER_CLASSNAME}>Step and classes</span>
            <span className={HEADER_CLASSNAME}>Uses</span>
            <span className={HEADER_CLASSNAME}>Mostly for</span>
          </div>
          {SCALE_GROUPS.map((group) => (
            <Fragment key={group.title}>
              <span className="text-body-small border-t-1/2 border-stroke-primary pb-4 pt-16 font-medium text-textIcon-secondary">
                {group.title}
              </span>
              {group.steps.map((step) => (
                <StepRow key={step.px} step={step} />
              ))}
            </Fragment>
          ))}
        </div>
      </DocsSection>
      <DocsSection section={SECTIONS.usage} flush>
        <DocsCode code={USAGE_CODE} />
      </DocsSection>
    </div>
  );
}

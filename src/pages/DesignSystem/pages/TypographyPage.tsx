import cx from "classnames";
import { useMemo } from "react";

import { DocsChangelog } from "../DocsChangelog";
import { DocsSection, DocsSectionInfo } from "../DocsLayout";
import { TYPOGRAPHY_CHANGELOG_NOTES, TYPOGRAPHY_CHANGELOG_STEPS } from "./typographyChangelog";

// Typography page of the design system site (/ui/typography).
// Examples: the text styles after the Changelog (samples use the current classes plus inline overrides for the new values).
// Changelog: the exact edits and scripts that move the code to the text styles.

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
        <span className="text-body-small text-textIcon-secondary">{style.spec}</span>
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
      <p className="text-body-large px-24 pt-24 text-textIcon-secondary max-md:px-16 max-md:pt-16">
        Names and values after the Changelog steps.
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

/**
 * Changelog tab: the steps that move the code to the text styles, as exact edits and rename scripts.
 */
export function TypographyChangelog() {
  return (
    <DocsChangelog
      title="Typography changelog"
      summary="10 steps that move the app to the text styles: the line-height rule, no 13px, named styles for the hand-typed sizes. None of them are done yet. Each edit gives the file, the exact text to find at release 0f9e06e991 and the text to put instead; the renames come as scripts."
      notes={TYPOGRAPHY_CHANGELOG_NOTES}
      steps={TYPOGRAPHY_CHANGELOG_STEPS}
    />
  );
}

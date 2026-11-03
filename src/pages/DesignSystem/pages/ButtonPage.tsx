import cx from "classnames";

import Button from "components/Button/Button";
import { EmbeddedActionButton } from "components/Button/EmbeddedActionButton";
import ExternalLink from "components/ExternalLink/ExternalLink";

import CloseIcon from "img/ic_close.svg?react";
import CopyStrokeIcon from "img/ic_copy_stroke.svg?react";
import InfoCircleStrokeIcon from "img/ic_info_circle_stroke.svg?react";
import MenuDotsIcon from "img/ic_menu_dots.svg?react";
import PlusCircleIcon from "img/ic_plus_circle.svg?react";
import SelectIcon from "img/ic_select.svg?react";
import gmxIcon from "img/tokens/ic_gmx.svg";

import { BUTTON_CHANGELOG_NOTES, BUTTON_CHANGELOG_STEPS } from "./buttonChangelog";
import { DocsChangelog } from "../DocsChangelog";
import {
  DocsCode,
  DocsExample,
  DocsPreview,
  DocsProp,
  DocsPropsTable,
  DocsSection,
  DocsSectionInfo,
} from "../DocsLayout";

// Button page of the design system site (/ui/button).
// Examples: one section per kind of button, each with a live preview; the code of each is on Props.
// Props: usage, the Button, EmbeddedActionButton and ExternalLink props, and the code of each example. Changelog: what
// developers change in the components.

const DOCS_URL = "https://docs.gmx.io/docs/trading/fees/";

// Preview of Typography step 5: text-body-small in Button.tsx wins over a plain class, so the 12px label is forced
const LABEL_PREVIEW_CLASSNAME = "!text-body-small";

// Preview of Colors step 4: the gray of EmbeddedActionButton (gray-400 today) becomes textIcon-secondary
const EMBEDDED_DEFAULT_PREVIEW_CLASSNAME =
  "!text-textIcon-secondary !decoration-textIcon-secondary hover:!text-textIcon-primary hover:!decoration-textIcon-primary focus-visible:!text-textIcon-primary focus-visible:!decoration-textIcon-primary";

// The blue tone of EmbeddedActionButton (tone="link"), drawn with its classes: this copy of the component predates it
const LINK_TONE_PREVIEW_CLASSNAME =
  "!text-blue-strong !decoration-blue-strong hover:!text-blue-secondary hover:!decoration-blue-secondary";

// tone="destructive" comes with Changelog step 12, so it's drawn with its colors by today's names: red-900 is
// red-background and red-500 is red-strong after the Colors renames
const DESTRUCTIVE_PREVIEW_CLASSNAME = {
  secondary: "!bg-red-background !text-red-strong hover:!bg-red-strong/25 active:!bg-red-background",
  ghost: "!text-red-strong hover:!bg-red-background active:!bg-red-strong/25",
};

// Preview of Changelog step 8: a logo as close to the label as an icon
const IMAGE_PREVIEW_CLASSNAME = "!mr-0";

// The two selected looks, as the product sets them today
const SELECTED_GRAY_CLASSNAME = "!bg-button-secondary !text-textIcon-primary";
const SELECTED_BLUE_CLASSNAME = "!bg-button-primary !text-textIcon-onButton";

const GRID_LABEL_CLASSNAME = "text-body-small text-textIcon-secondary";

const EXAMPLES = {
  size: { id: "button-size", title: "Size" },
  primary: { id: "button-primary", title: "Primary" },
  secondary: { id: "button-secondary", title: "Secondary" },
  ghost: { id: "button-ghost", title: "Ghost" },
  destructive: { id: "button-destructive", title: "Destructive" },
  iconOnly: { id: "button-icon-only", title: "Icon only" },
  withIcon: { id: "button-with-icon", title: "With icon" },
  image: { id: "button-image", title: "Image" },
  selectedGhost: { id: "button-selected-ghost", title: "Selected · Ghost" },
  selectedSecondary: { id: "button-selected-secondary", title: "Selected · Secondary" },
  asLink: { id: "button-link", title: "Link" },
  embedded: { id: "button-embedded", title: "Embedded action" },
} satisfies Record<string, DocsSectionInfo>;

// Large is the big main button, variant="primary-action": only primary has it
const SIZE_EXAMPLES = [
  {
    label: "Small",
    button: (
      <Button variant="primary" size="small" className={LABEL_PREVIEW_CLASSNAME}>
        Trade
      </Button>
    ),
  },
  {
    label: "Medium",
    button: (
      <Button variant="primary" size="medium" className={LABEL_PREVIEW_CLASSNAME}>
        Trade
      </Button>
    ),
  },
  { label: "Large", button: <Button variant="primary-action">Trade</Button> },
];

const USAGE_CODE = `import Button from "components/Button/Button";

<Button variant="secondary" onClick={openSettings}>
  Settings
</Button>`;

const SIZE_CODE = `<Button variant="primary" size="small" onClick={trade}>
  Trade
</Button>
<Button variant="primary" size="medium" onClick={trade}>
  Trade
</Button>

// Large: the main button of a form or modal
<Button variant="primary-action" className="w-full" type="submit">
  Trade
</Button>`;

const PRIMARY_CODE = `<Button variant="primary" onClick={deposit}>
  Deposit
</Button>`;

const SECONDARY_CODE = `<Button variant="secondary" onClick={share}>
  Share
</Button>`;

const GHOST_CODE = `<Button variant="ghost" onClick={edit}>
  Edit
</Button>`;

const DESTRUCTIVE_CODE = `// After Changelog step 12
<Button variant="secondary" tone="destructive" onClick={cancelOrder}>
  Cancel
  <CloseIcon className="size-16" />
</Button>
<Button
  variant="ghost"
  tone="destructive"
  size="controlled"
  className="size-32 !p-0"
  aria-label={t\`Cancel order\`}
  onClick={cancelOrder}
>
  <CloseIcon className="size-16" />
</Button>`;

const EMBEDDED_CODE = `import { EmbeddedActionButton } from "components/Button/EmbeddedActionButton";

<p>
  Leverage is above the market limit.{" "}
  <EmbeddedActionButton onClick={setMaxLeverage}>Set max leverage</EmbeddedActionButton>
</p>
<p>
  Not enough balance.{" "}
  <EmbeddedActionButton tone="link" onClick={useMax}>
    Use max
  </EmbeddedActionButton>
</p>`;

const ICON_CODE = `import MenuDotsIcon from "img/ic_menu_dots.svg?react";

// size-24 inside fields and filter rows, size-32 by default, size-40 in the header
<Button
  variant="secondary"
  size="controlled"
  className="size-32 !p-0"
  aria-label={t\`More actions\`}
  onClick={openMenu}
>
  <MenuDotsIcon className="size-16" />
</Button>`;

const WITH_ICON_CODE = `<div className="flex gap-8">
  <Button variant="secondary" onClick={deposit}>
    <PlusCircleIcon className="size-16" />
    Deposit
  </Button>
  <Button variant="secondary" onClick={copy}>
    Copy
    <CopyStrokeIcon className="size-16" />
  </Button>
</div>`;

const IMAGE_CODE = `import gmxIcon from "img/tokens/ic_gmx.svg";

<Button variant="secondary" imgSrc={gmxIcon} imgClassName="size-16">
  GMX
</Button>`;

const SELECTED_GHOST_CODE = `// A tab row of ghost buttons: the selected one gets the secondary fill and the primary text color
<Button
  variant="ghost"
  className={cx({ "!bg-button-secondary !text-textIcon-primary": isSelected })}
  onClick={select}
>
  1D
</Button>`;

const SELECTED_SECONDARY_CODE = `// Page numbers: secondary squares, the current one blue
<Button
  variant="secondary"
  size="controlled"
  className={cx("size-32 !p-0", { "!bg-button-primary !text-textIcon-onButton": isCurrent })}
  onClick={openPage}
>
  2
</Button>`;

const AS_LINK_CODE = `// A text link: underlined, with an icon, or with an arrow. It takes the color of the text around it.
import ExternalLink from "components/ExternalLink/ExternalLink";

<ExternalLink href="${DOCS_URL}">Read more</ExternalLink>
<ExternalLink href="${DOCS_URL}" variant="icon">Read more</ExternalLink>
<ExternalLink href="${DOCS_URL}" variant="icon-arrow">Read more</ExternalLink>`;

const CONTROLLED_CODE = `<div className="flex items-center gap-8">
  <Button variant="secondary" size="controlled">
    Trade
  </Button>
  <Button variant="secondary" size="controlled" className="h-48 px-24">
    Trade
  </Button>
</div>`;

/**
 * Examples tab: one section per kind of button, each with its own canvas. The code of each example is on the Props
 * tab.
 */
export function ButtonExamples() {
  return (
    <div className="flex flex-col gap-48">
      <DocsExample section={EXAMPLES.size}>
        <div className="grid gap-12 md:grid-cols-3">
          {SIZE_EXAMPLES.map((example) => (
            <div key={example.label} className="flex flex-col gap-8">
              <DocsPreview>{example.button}</DocsPreview>
              <span className={GRID_LABEL_CLASSNAME}>{example.label}</span>
            </div>
          ))}
        </div>
      </DocsExample>

      <DocsExample section={EXAMPLES.primary}>
        <DocsPreview>
          <Button variant="primary" className={LABEL_PREVIEW_CLASSNAME}>
            Deposit
          </Button>
        </DocsPreview>
      </DocsExample>

      <DocsExample section={EXAMPLES.secondary}>
        <DocsPreview>
          <Button variant="secondary" className={LABEL_PREVIEW_CLASSNAME}>
            Share
          </Button>
        </DocsPreview>
      </DocsExample>

      <DocsExample section={EXAMPLES.ghost}>
        <DocsPreview>
          <Button variant="ghost" className={LABEL_PREVIEW_CLASSNAME}>
            Edit
          </Button>
        </DocsPreview>
      </DocsExample>

      <DocsExample section={EXAMPLES.destructive}>
        <DocsPreview>
          <Button variant="secondary" className={cx(LABEL_PREVIEW_CLASSNAME, DESTRUCTIVE_PREVIEW_CLASSNAME.secondary)}>
            Cancel
            <CloseIcon className="size-16" />
          </Button>
          <Button
            variant="ghost"
            size="controlled"
            className={cx("size-32 !p-0", DESTRUCTIVE_PREVIEW_CLASSNAME.ghost)}
            aria-label="Cancel order"
          >
            <CloseIcon className="size-16" />
          </Button>
        </DocsPreview>
      </DocsExample>

      <DocsExample section={EXAMPLES.iconOnly}>
        <DocsPreview>
          {["size-24", "size-32", "size-40"].map((sizeClassName) => (
            <Button
              key={sizeClassName}
              variant="secondary"
              size="controlled"
              className={cx(sizeClassName, "!p-0")}
              aria-label="More actions"
            >
              <MenuDotsIcon className="size-16" />
            </Button>
          ))}
        </DocsPreview>
      </DocsExample>

      <DocsExample section={EXAMPLES.withIcon}>
        <DocsPreview>
          <Button variant="secondary" className={LABEL_PREVIEW_CLASSNAME}>
            <PlusCircleIcon className="size-16" />
            Deposit
          </Button>
          <Button variant="secondary" className={LABEL_PREVIEW_CLASSNAME}>
            Copy
            <CopyStrokeIcon className="size-16" />
          </Button>
        </DocsPreview>
      </DocsExample>

      <DocsExample section={EXAMPLES.image}>
        <DocsPreview>
          <Button
            variant="secondary"
            className={LABEL_PREVIEW_CLASSNAME}
            imgSrc={gmxIcon}
            imgClassName={cx("size-16", IMAGE_PREVIEW_CLASSNAME)}
          >
            GMX
          </Button>
        </DocsPreview>
      </DocsExample>

      <DocsExample section={EXAMPLES.selectedGhost}>
        <DocsPreview previewClassName="flex-wrap items-center justify-center gap-4">
          {["1H", "1D", "1W"].map((label, index) => (
            <Button
              key={label}
              variant="ghost"
              className={cx(LABEL_PREVIEW_CLASSNAME, { [SELECTED_GRAY_CLASSNAME]: index === 1 })}
            >
              {label}
            </Button>
          ))}
        </DocsPreview>
      </DocsExample>

      <DocsExample section={EXAMPLES.selectedSecondary}>
        <DocsPreview previewClassName="flex-wrap items-center justify-center gap-8">
          {[1, 2, 3].map((pageNumber) => (
            <Button
              key={pageNumber}
              variant="secondary"
              size="controlled"
              className={cx(LABEL_PREVIEW_CLASSNAME, "size-32 !p-0", {
                [SELECTED_BLUE_CLASSNAME]: pageNumber === 2,
              })}
            >
              {pageNumber}
            </Button>
          ))}
        </DocsPreview>
      </DocsExample>

      <DocsExample section={EXAMPLES.asLink}>
        <DocsPreview previewClassName="flex-wrap items-center justify-center gap-x-24 gap-y-16">
          <span className="text-body-small text-textIcon-secondary">
            <ExternalLink href={DOCS_URL}>Read more</ExternalLink>
          </span>
          <span className="text-body-small text-textIcon-secondary">
            <ExternalLink href={DOCS_URL} variant="icon">
              Read more
            </ExternalLink>
          </span>
          <span className="text-body-small text-textIcon-secondary">
            <ExternalLink href={DOCS_URL} variant="icon-arrow">
              Read more
            </ExternalLink>
          </span>
        </DocsPreview>
      </DocsExample>

      <DocsExample section={EXAMPLES.embedded}>
        <DocsPreview previewClassName="flex-col items-center justify-center gap-16">
          <p className="text-body-small text-textIcon-secondary">
            Leverage is above the market limit.{" "}
            <EmbeddedActionButton className={cx(LABEL_PREVIEW_CLASSNAME, EMBEDDED_DEFAULT_PREVIEW_CLASSNAME)}>
              Set max leverage
            </EmbeddedActionButton>
          </p>
          <p className="text-body-small text-textIcon-secondary">
            Not enough balance.{" "}
            <EmbeddedActionButton className={cx(LABEL_PREVIEW_CLASSNAME, LINK_TONE_PREVIEW_CLASSNAME)}>
              Use max
            </EmbeddedActionButton>
          </p>
        </DocsPreview>
      </DocsExample>
    </div>
  );
}

const SECTIONS = {
  usage: { id: "button-usage", title: "Usage", icon: SelectIcon },
  buttonProps: { id: "button-props", title: "Button", icon: InfoCircleStrokeIcon },
  embeddedProps: { id: "button-embedded-props", title: "EmbeddedActionButton", icon: SelectIcon },
  linkProps: { id: "button-link-props", title: "ExternalLink", icon: SelectIcon },
  code: { id: "button-code", title: "Code", icon: SelectIcon },
} satisfies Record<string, DocsSectionInfo>;

const BUTTON_PROPS: DocsProp[] = [
  {
    name: "variant",
    type: '"primary" | "primary-action" | "secondary" | "ghost"',
    defaultValue: "required",
    description:
      "primary: the main action, one per area. primary-action: the large main button at the bottom of a form or modal, 56px tall: 16px text, 24px side padding, 18px top and bottom padding (16px on the 24px line after Changelog step 7); the w-full class makes it as wide as its box. secondary: other actions. ghost: no fill until hover. For an underlined action inside text, use EmbeddedActionButton.",
  },
  {
    name: "size",
    type: '"small" | "medium" | "controlled"',
    defaultValue: '"small"',
    description:
      "Large (56px) isn't a size: it's variant=\"primary-action\". small: at least 32px high, 4px gap. medium: at least 40px high, 6px gap (8px after Changelog step 9). controlled: no minimum height or gap (the padding stays); set them with className. primary-action ignores it. A button with only an icon is controlled with !p-0 and size-24 inside fields and filter rows, size-32 by default or size-40 in the header, plus an aria-label (Changelog steps 11 and 4).",
  },
  {
    name: "tone",
    type: '"default" | "destructive"',
    defaultValue: '"default"',
    description:
      "destructive: a red label, for an action that cancels or deletes. Secondary gets a red fill; ghost shows it on hover. For secondary and ghost only. Comes with Changelog step 12.",
  },
  {
    name: "children",
    type: "ReactNode",
    defaultValue: "required",
    description:
      "The label, with icons before or after it. 12px after Typography step 5 (13px in the code today); the previews on this page show 12px.",
  },
  {
    name: "onClick",
    type: "(event) => void",
    description: "Not called while disabled. Exception: a disabled http(s) link still calls it (Changelog step 5).",
  },
  {
    name: "disabled",
    type: "boolean",
    defaultValue: "false",
    description: "Grays out the button and blocks clicks. A disabled http(s) link loses its address.",
  },
  {
    name: "to",
    type: "string",
    description:
      "Renders a link styled as the button. An address starting with http becomes a plain <a href>; any other path uses the app's router.",
  },
  { name: "newTab", type: "boolean", defaultValue: "false", description: "Opens an http(s) link in a new tab." },
  {
    name: "type",
    type: '"button" | "submit" | "reset"',
    defaultValue: '"button"',
    description: "The HTML button type.",
  },
  {
    name: "textAlign",
    type: '"center" | "left" | "right"',
    defaultValue: '"center"',
    description: "Where the content sits when the button is wider than it.",
  },
  {
    name: "imgSrc, imgAlt, imgClassName",
    type: "string",
    description:
      "An image before the label. Secondary and ghost add 11.5px after it, on top of the gap, until Changelog step 8 (then it sits like an icon). imgAlt defaults to an empty string.",
  },
  {
    name: "className",
    type: "string",
    description:
      "Extra classes, for example the width, a custom size or the selected look (see Selected · Ghost and Selected · Secondary).",
  },
  {
    name: "buttonRef",
    type: "RefObject<HTMLButtonElement>",
    description: "A ref to the <button>. Not set when the to prop renders a link.",
  },
  { name: "qa", type: "string", description: "Sets data-qa for tests." },
  {
    name: "...rest",
    type: "button attributes",
    description:
      "Any other HTML attribute, for example aria-label. Links inside the app (a to prop without http) drop them today (Changelog step 4).",
  },
];

const EMBEDDED_PROPS: DocsProp[] = [
  {
    name: "children",
    type: "ReactNode",
    description:
      "The label of an underlined action inside a message, tooltip, alert or toast, for example Set max leverage. Gray (gray-400) today, textIcon-secondary after Colors step 4; primary text color on hover and keyboard focus.",
  },
  {
    name: "tone",
    type: '"default" | "link"',
    defaultValue: '"default"',
    description:
      "link: blue text and underline (blue-300), lighter blue on hover (blue-100), for an action that reads as a link, like the USDG conversion messages of the trade box. After the Colors steps both blues are #2D42FC in light theme, so there the hover keeps the same color.",
  },
  { name: "onClick", type: "(event) => void", description: "The action." },
  { name: "className", type: "string", description: "Extra classes." },
  {
    name: "...rest",
    type: "button attributes",
    description:
      "Any other HTML button attribute, for example aria-label. disabled blocks clicks but doesn't change the look.",
  },
];

// components/ExternalLink: the text link of the app, 147 uses
const LINK_PROPS: DocsProp[] = [
  { name: "href", type: "string", defaultValue: "required", description: "The address." },
  {
    name: "children",
    type: "ReactNode",
    defaultValue: "required",
    description: "The link text. It takes the size and color of the text around it and turns blue (blue-300) on hover.",
  },
  {
    name: "variant",
    type: '"underline" | "icon" | "icon-arrow"',
    defaultValue: '"underline"',
    description:
      "underline: underlined text (126 uses). icon: a 12px new-tab icon after the text, no underline (17). icon-arrow: a 12px arrow after the text, no underline (4).",
  },
  { name: "newTab", type: "boolean", defaultValue: "true", description: "Opens the link in a new tab." },
  { name: "className", type: "string", description: "Extra classes." },
];

// The code of the examples on the Examples tab, in the same order, plus Controlled size (no example) after Size
const CODE_SNIPPETS: { title: string; code: string }[] = [
  { title: "Size", code: SIZE_CODE },
  { title: "Controlled size", code: CONTROLLED_CODE },
  { title: "Primary", code: PRIMARY_CODE },
  { title: "Secondary", code: SECONDARY_CODE },
  { title: "Ghost", code: GHOST_CODE },
  { title: "Destructive", code: DESTRUCTIVE_CODE },
  { title: "Icon only", code: ICON_CODE },
  { title: "With icon", code: WITH_ICON_CODE },
  { title: "Image", code: IMAGE_CODE },
  { title: "Selected · Ghost", code: SELECTED_GHOST_CODE },
  { title: "Selected · Secondary", code: SELECTED_SECONDARY_CODE },
  { title: "Link", code: AS_LINK_CODE },
  { title: "Embedded action", code: EMBEDDED_CODE },
];

/**
 * Props tab: usage, the props of Button, EmbeddedActionButton and ExternalLink, then the code of every example.
 */
export function ButtonPropsReference() {
  return (
    <div className="flex flex-col gap-16">
      <DocsSection section={SECTIONS.usage}>
        <div className="overflow-hidden rounded-12 border border-button-background bg-fill-background">
          <DocsCode code={USAGE_CODE} />
        </div>
      </DocsSection>
      <DocsSection section={SECTIONS.buttonProps}>
        <DocsPropsTable props={BUTTON_PROPS} />
      </DocsSection>
      <DocsSection section={SECTIONS.embeddedProps}>
        <DocsPropsTable props={EMBEDDED_PROPS} />
      </DocsSection>
      <DocsSection section={SECTIONS.linkProps}>
        <DocsPropsTable props={LINK_PROPS} />
      </DocsSection>
      <DocsSection section={SECTIONS.code}>
        <div className="flex flex-col gap-24">
          {CODE_SNIPPETS.map((snippet) => (
            <div key={snippet.title} className="flex flex-col gap-8">
              <span className="text-body-medium font-medium">{snippet.title}</span>
              <div className="overflow-hidden rounded-12 border border-button-background bg-fill-background">
                <DocsCode code={snippet.code} />
              </div>
            </div>
          ))}
        </div>
      </DocsSection>
    </div>
  );
}

/**
 * Changelog tab: the exact edits for developers, step by step, with the rules for all steps on top.
 */
export function ButtonChangelog() {
  return (
    <DocsChangelog
      title="Button changelog"
      summary="12 steps for Button, ButtonLink, EmbeddedActionButton and the places that use them. None of them are done yet. Each edit gives the file, the exact text to find at release 0f9e06e991 and the text to put instead."
      notes={BUTTON_CHANGELOG_NOTES}
      steps={BUTTON_CHANGELOG_STEPS}
    />
  );
}

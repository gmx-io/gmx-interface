import cx from "classnames";
import { ReactNode, useEffect, useRef } from "react";

import Button from "components/Button/Button";
import { EmbeddedActionButton } from "components/Button/EmbeddedActionButton";

import CopyIcon from "img/ic_copy.svg?react";
import CopyStrokeIcon from "img/ic_copy_stroke.svg?react";
import InfoCircleStrokeIcon from "img/ic_info_circle_stroke.svg?react";
import MenuDotsIcon from "img/ic_menu_dots.svg?react";
import PlusCircleIcon from "img/ic_plus_circle.svg?react";
import SelectIcon from "img/ic_select.svg?react";
import gmxIcon from "img/tokens/ic_gmx.svg";

import { DocsCode, DocsProp, DocsPropsTable, DocsSection, DocsSectionInfo } from "../DocsLayout";

// Button page of the design system site (/ui/button).
// Examples: each variant in its states, drawn with the state tokens (not interactive), plus icons, links and sizes.
// Props: the Button and EmbeddedActionButton props. Changelog: what developers change in the components.

const DOCS_URL = "https://docs.gmx.io/docs/trading/fees/";

type ButtonState = "default" | "hover" | "pressed" | "disabled";
type StateVariant = "primary" | "secondary" | "ghost";

const ALL_STATES: ButtonState[] = ["default", "hover", "pressed", "disabled"];

const STATE_HEADERS = ["Default", "Hover", "Pressed", "Disabled"];
const LINK_HEADERS = ["Default", "Hover", "Disabled"];
const EMBEDDED_HEADERS = ["Default", "Hover", "Keyboard focus"];

// Preview of Typography step 5: text-[13px] in Button.tsx wins over a plain class, so the 12px label is forced
const LABEL_PREVIEW_CLASSNAME = "!text-body-small";

// Hover and pressed are drawn with the tokens Button.scss uses for :hover and :active, so they show without the mouse
const FORCED_STATE: Record<StateVariant, Partial<Record<ButtonState, string>>> = {
  primary: { hover: "!bg-button-primaryHover", pressed: "!bg-button-primaryActive" },
  secondary: {
    hover: "!bg-button-secondaryHover !text-typography-primary",
    pressed: "!bg-button-secondary !text-typography-primary",
  },
  ghost: {
    hover: "!bg-fill-surfaceHover !text-typography-primary",
    pressed: "!bg-slate-800 !text-typography-primary",
  },
};

const STATE_ROWS: { variant: StateVariant; size: "small" | "medium"; label: string }[] = [
  { variant: "primary", size: "small", label: "Primary · Small" },
  { variant: "primary", size: "medium", label: "Primary · Medium" },
  { variant: "secondary", size: "small", label: "Secondary · Small" },
  { variant: "secondary", size: "medium", label: "Secondary · Medium" },
  { variant: "ghost", size: "small", label: "Ghost · Small" },
  { variant: "ghost", size: "medium", label: "Ghost · Medium" },
];

const GROUPS = {
  variants: { id: "button-variants", title: "Primary, secondary and ghost" },
  primaryAction: { id: "button-primary-action", title: "Primary action" },
  link: { id: "button-link", title: "Link" },
  embedded: { id: "button-embedded", title: "Embedded action" },
  icons: { id: "button-icons", title: "Icons and images" },
  asLink: { id: "button-as-link", title: "As a link" },
  controlled: { id: "button-controlled", title: "Controlled size" },
} satisfies Record<string, DocsSectionInfo>;

const EXAMPLES_SECTION: DocsSectionInfo = { id: "button-examples", title: "Buttons" };

const GRID_LABEL_CLASSNAME = "text-body-small text-typography-secondary";

// On wider screens the state grids all use four columns, so their columns line up from group to group (Link and
// Embedded action fill three). On phones there is one column per state, as wide as the buttons, and the grid scrolls
// sideways when they don't fit.
const GRID_CLASSNAME = "grid items-center gap-x-16 gap-y-12 md:grid-cols-[160px_repeat(4,minmax(0,1fr))]";

const PHONE_COLUMNS_CLASSNAME: Record<number, string> = {
  3: "grid-cols-[repeat(3,max-content)]",
  4: "grid-cols-[repeat(4,max-content)]",
};

/**
 * Rows of buttons under state headers. On phones each row label sits above its buttons.
 */
function StateGrid({
  label,
  headers,
  rows,
}: {
  label: string;
  headers: string[];
  rows: { label: string; cells: ReactNode[] }[];
}) {
  const gridRef = useRef<HTMLDivElement>(null);

  // The grid only shows the states: its buttons do nothing, so they stay out of the Tab order and screen readers
  useEffect(() => {
    gridRef.current?.setAttribute("inert", "");
  }, []);

  return (
    // The padding leaves room for the focus ring in the Keyboard focus column; the label names the box when it scrolls
    <div role="region" aria-label={label} className="-m-4 overflow-x-auto p-4">
      <div ref={gridRef} className={cx(GRID_CLASSNAME, PHONE_COLUMNS_CLASSNAME[headers.length])}>
        <span className="max-md:hidden" />
        {headers.map((header) => (
          <span key={header} className={GRID_LABEL_CLASSNAME}>
            {header}
          </span>
        ))}
        {rows.map((row) => (
          <StateRow key={row.label} label={row.label} cells={row.cells} />
        ))}
      </div>
    </div>
  );
}

function StateRow({ label, cells }: { label: string; cells: ReactNode[] }) {
  return (
    <>
      <span className={cx(GRID_LABEL_CLASSNAME, "col-span-full md:col-span-1 md:col-start-1")}>{label}</span>
      {cells.map((cell, index) => (
        <div key={index} className="flex min-w-0 items-center">
          {cell}
        </div>
      ))}
    </>
  );
}

function ExampleGroup({ group, first, children }: { group: DocsSectionInfo; first?: boolean; children: ReactNode }) {
  return (
    // data-docs-section also lists each group in the "On this page" menu
    <div
      id={group.id}
      data-docs-section={group.title}
      className={cx("flex scroll-mt-16 flex-col gap-16 p-24 max-md:p-16", {
        "border-t border-fill-surfaceElevated": !first,
      })}
    >
      <h3 className="text-body-large font-medium">{group.title}</h3>
      {children}
    </div>
  );
}

function Example({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex flex-col items-start gap-8">
      <span className={GRID_LABEL_CLASSNAME}>{label}</span>
      {children}
    </div>
  );
}

const VARIANT_ROWS = STATE_ROWS.map((row) => ({
  label: row.label,
  cells: ALL_STATES.map((state) => (
    <Button
      key={state}
      variant={row.variant}
      size={row.size}
      disabled={state === "disabled"}
      className={cx(LABEL_PREVIEW_CLASSNAME, FORCED_STATE[row.variant][state])}
    >
      Label
    </Button>
  )),
}));

const PRIMARY_ACTION_ROWS = [
  {
    label: "Primary action",
    cells: ALL_STATES.map((state) => (
      <Button
        key={state}
        variant="primary-action"
        disabled={state === "disabled"}
        className={FORCED_STATE.primary[state]}
      >
        Label
      </Button>
    )),
  },
];

const LINK_ROWS = [
  {
    label: "Link",
    cells: [
      <Button key="default" variant="link" className={LABEL_PREVIEW_CLASSNAME}>
        Label
      </Button>,
      <Button key="hover" variant="link" className={cx(LABEL_PREVIEW_CLASSNAME, "!text-typography-primary")}>
        Label
      </Button>,
      <Button key="disabled" variant="link" className={LABEL_PREVIEW_CLASSNAME} disabled>
        Label
      </Button>,
    ],
  },
];

const EMBEDDED_ROWS = [
  {
    label: "Embedded action",
    cells: [
      <EmbeddedActionButton key="default" className={LABEL_PREVIEW_CLASSNAME}>
        Set max leverage
      </EmbeddedActionButton>,
      <EmbeddedActionButton
        key="hover"
        className={cx(LABEL_PREVIEW_CLASSNAME, "!text-typography-primary !decoration-typography-primary")}
      >
        Set max leverage
      </EmbeddedActionButton>,
      <EmbeddedActionButton
        key="focus"
        className={cx(
          LABEL_PREVIEW_CLASSNAME,
          "rounded-2 !text-typography-primary !decoration-typography-primary outline outline-2 outline-offset-2 outline-blue-300"
        )}
      >
        Set max leverage
      </EmbeddedActionButton>,
    ],
  },
];

/**
 * Examples tab: one section, with a group per kind of button and a divider line between groups. The state grids are
 * static; the icon, link and size examples can be clicked.
 */
export function ButtonExamples() {
  return (
    <DocsSection section={EXAMPLES_SECTION} flush>
      <ExampleGroup group={GROUPS.variants} first>
        <StateGrid label="Button states" headers={STATE_HEADERS} rows={VARIANT_ROWS} />
        <p className="text-body-medium text-typography-secondary">
          Labels show the planned 12px size (Typography step 5). Colors are today&apos;s until the Colors steps.
        </p>
      </ExampleGroup>
      <ExampleGroup group={GROUPS.primaryAction}>
        <StateGrid label="Primary action states" headers={STATE_HEADERS} rows={PRIMARY_ACTION_ROWS} />
      </ExampleGroup>
      <ExampleGroup group={GROUPS.link}>
        <StateGrid label="Link states" headers={LINK_HEADERS} rows={LINK_ROWS} />
      </ExampleGroup>
      <ExampleGroup group={GROUPS.embedded}>
        <StateGrid label="Embedded action states" headers={EMBEDDED_HEADERS} rows={EMBEDDED_ROWS} />
      </ExampleGroup>
      <ExampleGroup group={GROUPS.icons}>
        <div className="flex flex-wrap items-start gap-24">
          <Example label="Icon before">
            <Button variant="secondary" className={LABEL_PREVIEW_CLASSNAME}>
              <PlusCircleIcon className="size-16" />
              Deposit
            </Button>
          </Example>
          <Example label="Icon after">
            <Button variant="secondary" className={LABEL_PREVIEW_CLASSNAME}>
              Copy
              <CopyIcon className="size-16" />
            </Button>
          </Example>
          <Example label="Icon only, with aria-label">
            <Button variant="secondary" size="controlled" className="size-32 !p-0" aria-label="More actions">
              <MenuDotsIcon className="size-16" />
            </Button>
          </Example>
          <Example label="Image (imgSrc)">
            <Button variant="secondary" className={LABEL_PREVIEW_CLASSNAME} imgSrc={gmxIcon} imgClassName="size-16">
              GMX
            </Button>
          </Example>
        </div>
      </ExampleGroup>
      <ExampleGroup group={GROUPS.asLink}>
        <div className="flex flex-wrap items-start gap-24">
          <Example label="Inside the app">
            <Button variant="secondary" className={LABEL_PREVIEW_CLASSNAME} to="/ui/colors">
              Colors
            </Button>
          </Example>
          <Example label="Another site (secondary): arrow">
            <Button variant="secondary" className={LABEL_PREVIEW_CLASSNAME} to={DOCS_URL} newTab>
              Read the docs
            </Button>
          </Example>
          <Example label="Another site (primary): no arrow">
            <Button variant="primary" className={LABEL_PREVIEW_CLASSNAME} to={DOCS_URL} newTab>
              Read the docs
            </Button>
          </Example>
        </div>
      </ExampleGroup>
      <ExampleGroup group={GROUPS.controlled}>
        <div className="flex flex-wrap items-start gap-24">
          <Example label="No minimum height or gap">
            <Button variant="secondary" size="controlled" className={LABEL_PREVIEW_CLASSNAME}>
              Label
            </Button>
          </Example>
          <Example label="Sized with className">
            <Button variant="secondary" size="controlled" className={cx(LABEL_PREVIEW_CLASSNAME, "h-48 px-24")}>
              Label
            </Button>
          </Example>
        </div>
      </ExampleGroup>
    </DocsSection>
  );
}

const SECTIONS = {
  usage: { id: "button-usage", title: "Usage", icon: CopyStrokeIcon },
  buttonProps: { id: "button-props", title: "Button", icon: InfoCircleStrokeIcon },
  embeddedProps: { id: "button-embedded-props", title: "EmbeddedActionButton", icon: SelectIcon },
} satisfies Record<string, DocsSectionInfo>;

const USAGE_CODE = `import Button from "components/Button/Button";
import { EmbeddedActionButton } from "components/Button/EmbeddedActionButton";
import MenuDotsIcon from "img/ic_menu_dots.svg?react";

<Button variant="primary" size="medium" onClick={deposit}>
  Deposit
</Button>

// A link to another site, opened in a new tab
<Button variant="secondary" to="${DOCS_URL}" newTab>
  Read the docs
</Button>

// Icon only: give it a name for screen readers
<Button
  variant="secondary"
  size="controlled"
  className="size-32 !p-0"
  aria-label={t\`More actions\`}
  onClick={openMenu}
>
  <MenuDotsIcon className="size-16" />
</Button>

<EmbeddedActionButton onClick={setMaxLeverage}>Set max leverage</EmbeddedActionButton>`;

const BUTTON_PROPS: DocsProp[] = [
  {
    name: "variant",
    type: '"primary" | "primary-action" | "secondary" | "ghost" | "link"',
    defaultValue: "required",
    description:
      "primary: the main action. primary-action: the large main button at the bottom of a form or modal, with 16px text, 24px side padding and 18px top and bottom padding. secondary: other actions. ghost: no fill until hover. link: underlined text with no padding.",
  },
  {
    name: "size",
    type: '"small" | "medium" | "controlled"',
    defaultValue: '"small"',
    description:
      "small: at least 32px high, 4px gap. medium: at least 40px high, 6px gap. controlled: no minimum height or gap (the padding stays); set them with className. primary-action ignores it.",
  },
  {
    name: "children",
    type: "ReactNode",
    defaultValue: "required",
    description: "The label, with icons before or after it.",
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
    name: "showExternalLinkArrow",
    type: "boolean",
    defaultValue: "true for secondary",
    description: "Shows a small arrow on an http(s) link, in the top-right corner on secondary and ghost.",
  },
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
      "An image before the label. Secondary and ghost add 11.5px after it, on top of the gap. imgAlt defaults to an empty string.",
  },
  { name: "className", type: "string", description: "Extra classes, for example the width or a custom size." },
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
      "The label of an underlined action inside a message, tooltip or alert, for example Set max leverage. Gray (gray-400) today, textIcon-secondary after Colors step 4; primary text color on hover and keyboard focus.",
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

/**
 * Props tab: a usage snippet, then the props of Button and EmbeddedActionButton.
 */
export function ButtonPropsReference() {
  return (
    <div className="flex flex-col gap-16">
      <DocsSection section={SECTIONS.usage} flush>
        <DocsCode code={USAGE_CODE} />
      </DocsSection>
      <DocsSection section={SECTIONS.buttonProps}>
        <DocsPropsTable props={BUTTON_PROPS} />
      </DocsSection>
      <DocsSection section={SECTIONS.embeddedProps}>
        <DocsPropsTable props={EMBEDDED_PROPS} />
      </DocsSection>
    </div>
  );
}

type ComponentChange = { where: string; change: string };

type ChangelogStep = DocsSectionInfo & { intro: string; changes: ComponentChange[] };

// What developers change in components/Button and where buttons are used. Nothing here is done yet.
const CHANGELOG_STEPS: ChangelogStep[] = [
  {
    id: "button-change-label",
    title: "1. Finish the 12px labels",
    intro:
      "Typography step 5 moves button labels from 13px to text-body-small (12px on a 16px line) in Button.tsx, Button.scss and EmbeddedActionButton. Do these rows in the same change. One-line buttons keep their height, because min-h-32, min-h-40 and the fixed heights of controlled buttons set it. Labels that wrap onto two lines get 6px taller. The primary-action button keeps its 16px label.",
    changes: [
      {
        where: "Footer/constants.tsx · V1 badge",
        change:
          "Add leading-1. Otherwise the 8px badge takes the button's 16px line, and the V1 interface button grows from 32px to 36px.",
      },
      {
        where: "BuyGmxModal.tsx · Button className",
        change:
          "Delete text-14. Today text-[13px] in Button.tsx wins over it; after Typography step 5, text-14 would win and make these labels 14px. Typography step 6 also counts this text-14: skip it there.",
      },
      {
        where: "DailyAndCumulativePnLControls.tsx · grouping selector",
        change:
          "It copies the ghost button classes, so it also takes the new .button line height. Its text-[13px] is already in Typography step 5.",
      },
    ],
  },
  {
    id: "button-change-phone-padding",
    title: "2. Use the same padding on phones",
    intro:
      "Under 768px wide, Button.tsx gives every button except primary-action and link a smaller padding today: 10px on the sides and 6px above and below, instead of 12px and 8px. These classes also override padding passed in className, so the Controlled size example loses its px-24 on phones. After this step, buttons on phones without their own padding classes get 4px wider. They get taller only when the content is taller than the minimum height allows (over 16px in a small button, over 24px in a medium one), by up to 4px. Buttons with their own padding classes show that padding.",
    changes: [
      { where: "Button.tsx · every variant except primary-action", change: "Delete max-md:px-10 max-md:py-6." },
      {
        where: "NetworkDropdown.tsx · network button",
        change:
          "Its own max-md:p-6 would take over and make it 56px wide instead of 64px. Change max-md:p-6 to max-md:px-10 max-md:py-6 to keep today's size.",
      },
      {
        where: "DailyAndCumulativePnLControls.tsx · grouping selector",
        change: "Delete max-md:px-10 max-md:py-6 there too, and change py-6 to py-8, like other ghost buttons.",
      },
      {
        where: "AddressDropdownWithoutMultichain.tsx · address button",
        change:
          'Its own padding would make it 36px tall on phones, next to 32px header buttons. Use size="controlled" with h-32 md:h-40, like AddressDropdownWithMultichain.',
      },
      {
        where: "ConnectWalletPlaceholder.tsx",
        change: "Delete max-md:px-10, so the loading placeholder stays as wide as the header buttons it stands in for.",
      },
      {
        where: "ErrorBoundary, OrderItem, PositionItemOrders, Modal, BuyGmxModal, Pagination",
        change:
          "These buttons set their own padding, which now shows on phones too. Check that each one still looks right.",
      },
    ],
  },
  {
    id: "button-change-focus",
    title: "3. Show keyboard focus",
    intro:
      "Shared.scss removes the outline from every <button>, so keyboard focus on a Button is invisible today (a Button with the to prop is a link and shows only the browser's default ring). Use the ring from Checkbox step 3. Do this after the Colors steps, which rename blue-300 to blue-strong.",
    changes: [
      {
        where: "Button.tsx · classNames",
        change:
          "Add focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-strong. Links made with the to prop get the same classes.",
      },
      {
        where: "EmbeddedActionButton.tsx",
        change:
          "Nothing to add: it already has this ring, and the Colors renames turn outline-blue-300 into outline-blue-strong.",
      },
    ],
  },
  {
    id: "button-change-name",
    title: "4. Name the icon-only buttons",
    intro: "A button with only an icon has no name, so screen readers say just “button”.",
    changes: [
      { where: "ButtonLink.tsx · <Link>", change: "Pass {...rest}, so aria-label also reaches links inside the app." },
      {
        where:
          "PoolsDetailsHeader, PositionDropdown (2), MobileSideNav, SettingsButton, GmxAssetCard, GmGlvAssetCard, TPSLOrdersList (2), PositionItemOrders (2), OrderItem",
        change:
          'Pass aria-label with what the button does, for example Settings, Menu or Edit order. Wrap it in t`…` and run yarn extract. If a tooltip repeats the name, use StandardTooltip with type="label", as the Tooltip page shows.',
      },
      {
        where: "ChartTokenSelector (2), GmListItem (2), MarketSelector, PoolListItem",
        change: "The favorite star: aria-label Add to favorites or Remove from favorites, translated the same way.",
      },
      { where: "Pagination (4)", change: "aria-label First page, Previous page, Next page and Last page." },
      { where: "SearchInput · clear button", change: "aria-label Clear search." },
      {
        where: "OpportunityCard · Explore link",
        change: "The label is hidden under 640px. Use sr-only instead of hidden there, so the link keeps its name.",
      },
    ],
  },
  {
    id: "button-change-new-tab",
    title: "5. Mark links that open a new tab",
    intro:
      "The arrow on secondary links to other sites is drawn at 20% opacity (about 1.4:1 in dark theme and 1.3:1 in light), and screen readers aren't told that the link opens a new tab.",
    changes: [
      {
        where: "img/open-new-tab.svg",
        change:
          'Delete opacity=".2" from the path, so the arrow shows at full strength in the label\'s color. ButtonLink is its only user.',
      },
      { where: "ButtonLink.tsx · OpenInNewTabIcon", change: "Add aria-hidden." },
      {
        where: "ButtonLink.tsx · newTab",
        change:
          'After the label, add <span className="sr-only"> (opens in a new tab)</span>, with the text wrapped in t`…`.',
      },
      {
        where: "ButtonLink.tsx · disabled http(s) link",
        change:
          'Don\'t pass onClick while disabled, and add aria-disabled="true". Today the link loses its address, but onClick still runs.',
      },
    ],
  },
  {
    id: "button-change-high-contrast",
    title: "6. Show a border in high contrast mode",
    intro: "Buttons have no border, so in high contrast mode they look like plain text. Nothing changes otherwise.",
    changes: [
      {
        where: "Button.scss · .button, except .link",
        change: "Add @media (forced-colors: active) { border: 1px solid ButtonBorder; }.",
      },
    ],
  },
];

const TH_CLASSNAME = "pb-8 pr-16 font-normal";

/**
 * Changelog tab: the component fixes for developers, step by step.
 */
export function ButtonChangelog() {
  return (
    <div className="flex flex-col gap-16">
      <p className="text-body-large text-typography-secondary">
        Steps to make Button, ButtonLink and EmbeddedActionButton accessible and consistent. None of them are done yet.
        The Colors and Typography pages change these files too: Colors steps 1 to 4 update the button colors and token
        names, and Typography moves the labels to text-body-small with equal-width digits (step 5) and deletes
        letter-spacing: 0 from .secondary and .ghost (step 7).
      </p>
      <p className="text-body-large text-typography-secondary">
        Known gap: in light theme, secondary labels (textIcon-secondary on button-secondary) are 3.8:1, and ghost and
        link labels are 4.3:1 on fill-background and fill-surfaceElevated, below the 4.5:1 that text needs. They follow
        the design system colors for now.
      </p>
      {CHANGELOG_STEPS.map((step) => (
        <DocsSection key={step.id} section={step}>
          <div className="flex flex-col gap-16">
            <p className="text-body-large text-typography-secondary">{step.intro}</p>
            <div className="overflow-x-auto">
              <table className="text-body-large w-full min-w-[560px] border-collapse text-left">
                <thead>
                  <tr className="text-body-medium uppercase text-typography-secondary">
                    <th className={TH_CLASSNAME}>Where</th>
                    <th className="pb-8 font-normal">Change</th>
                  </tr>
                </thead>
                <tbody>
                  {step.changes.map((change) => (
                    <tr key={change.where} className="border-t-1/2 border-slate-600 align-top">
                      <td className="w-[240px] py-10 pr-16">{change.where}</td>
                      <td className="text-body-medium py-10 font-mono">{change.change}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </DocsSection>
      ))}
    </div>
  );
}

import cx from "classnames";
import { Fragment, useEffect, useRef, useState } from "react";

import Checkbox from "components/Checkbox/Checkbox";

import CopyIcon from "img/ic_copy_stroke.svg?react";
import InfoCircleStrokeIcon from "img/ic_info_circle_stroke.svg?react";
import MessageIcon from "img/ic_message.svg?react";
import SelectIcon from "img/ic_select.svg?react";

import { DocsCard, DocsCards, DocsCode, DocsProp, DocsPropsTable, DocsSection, DocsSectionInfo } from "../DocsLayout";

// Checkbox page of the design system site (/ui/checkbox).
// Examples: the live component in every state, and how screens use it. Props: a usage snippet and the props table.
// Changelog: what developers change in the component.

const SECTIONS = {
  states: { id: "checkbox-states", title: "States", icon: SelectIcon },
  inTheApp: { id: "checkbox-in-the-app", title: "In the app", icon: MessageIcon },
  usage: { id: "checkbox-usage", title: "Usage", icon: CopyIcon },
  props: { id: "checkbox-props", title: "Checkbox", icon: InfoCircleStrokeIcon },
} satisfies Record<string, DocsSectionInfo>;

type CheckboxState = "unchecked" | "checked" | "partial";
type CheckboxInteraction = "default" | "hover" | "disabled";

const STATES: { value: CheckboxState; label: string }[] = [
  { value: "unchecked", label: "Unchecked" },
  { value: "checked", label: "Checked" },
  { value: "partial", label: "Partial" },
];

const INTERACTIONS: { value: CheckboxInteraction; label: string }[] = [
  { value: "default", label: "Default" },
  { value: "hover", label: "Hover" },
  { value: "disabled", label: "Disabled" },
];

// Preview of the Changelog step 4 hover border. stroke-accent doesn't exist until the Colors steps add it, so
// typography-primary stands in.
const HOVER_LOOK_CLASSNAME = "[&>span:first-child]:border-typography-primary";

// The checkbox doesn't style its label, so each screen sets its own text style. These examples use body text.
const LABEL_CLASSNAME = "text-body-medium text-typography-secondary";

function StateCell({ state, interaction }: { state: CheckboxState; interaction: CheckboxInteraction }) {
  return (
    <Checkbox
      isChecked={state === "checked"}
      isPartialChecked={state === "partial"}
      disabled={interaction === "disabled"}
      className={cx({ [HOVER_LOOK_CLASSNAME]: interaction === "hover" })}
    >
      <span className={LABEL_CLASSNAME}>Label</span>
    </Checkbox>
  );
}

const GRID_LABEL_CLASSNAME = "text-body-small text-typography-secondary";

function StatesGrid() {
  const gridRef = useRef<HTMLDivElement>(null);

  // The grid only shows the states: its checkboxes do nothing, so they stay out of the Tab order and screen readers
  useEffect(() => {
    gridRef.current?.setAttribute("inert", "");
  }, []);

  return (
    <div className="flex flex-col gap-24">
      <div
        ref={gridRef}
        className="grid grid-cols-[96px_repeat(3,minmax(0,1fr))] items-center gap-x-16 gap-y-20 max-md:grid-cols-[72px_repeat(3,minmax(0,1fr))]"
      >
        <span />
        {INTERACTIONS.map((interaction) => (
          <span key={interaction.value} className={GRID_LABEL_CLASSNAME}>
            {interaction.label}
          </span>
        ))}
        {STATES.map((state) => (
          <Fragment key={state.value}>
            <span className={GRID_LABEL_CLASSNAME}>{state.label}</span>
            {INTERACTIONS.map((interaction) => (
              <StateCell key={interaction.value} state={state.value} interaction={interaction.value} />
            ))}
          </Fragment>
        ))}
      </div>
      <p className="text-body-medium text-typography-secondary">
        Hover shows the border from Changelog step 4. Only the empty box has a border, so checked and partial boxes look
        the same on hover. The “In the app” examples still use today&apos;s hover.
      </p>
    </div>
  );
}

function LabelExample() {
  const [isChecked, setIsChecked] = useState(false);

  return (
    <Checkbox isChecked={isChecked} setIsChecked={setIsChecked}>
      <span className={LABEL_CLASSNAME}>Don&apos;t ask again</span>
    </Checkbox>
  );
}

function BoxAloneExample() {
  const [isChecked, setIsChecked] = useState(true);

  return <Checkbox isChecked={isChecked} setIsChecked={setIsChecked} />;
}

// The order type filter: a group checkbox above its items, partial while only some items are selected. Like the
// filter in the app, the items sit 15px in from the group.
const TRIGGER_ORDERS = ["Limit", "Stop Market", "Take-Profit", "Stop-Loss"];

const FILTER_LABEL_CLASSNAME = "text-body-small font-medium text-typography-primary";

function FilterGroupExample() {
  const [selected, setSelected] = useState<string[]>([TRIGGER_ORDERS[0]]);
  const areAllSelected = selected.length === TRIGGER_ORDERS.length;

  return (
    <div className="flex flex-col gap-12">
      <Checkbox
        isChecked={areAllSelected}
        isPartialChecked={selected.length > 0 && !areAllSelected}
        setIsChecked={() => setSelected(areAllSelected ? [] : TRIGGER_ORDERS)}
      >
        <span className={FILTER_LABEL_CLASSNAME}>Trigger orders</span>
      </Checkbox>
      <div className="flex flex-col gap-12 pl-15">
        {TRIGGER_ORDERS.map((order) => (
          <Checkbox
            key={order}
            isChecked={selected.includes(order)}
            setIsChecked={(checked) =>
              setSelected((current) => (checked ? [...current, order] : current.filter((item) => item !== order)))
            }
          >
            <span className={FILTER_LABEL_CLASSNAME}>{order}</span>
          </Checkbox>
        ))}
      </div>
    </div>
  );
}

/**
 * Examples tab: every state in a static grid, then three places in the app that use it, which can be clicked.
 */
export function CheckboxExamples() {
  return (
    <div className="flex flex-col gap-16">
      <DocsSection section={SECTIONS.states}>
        <StatesGrid />
      </DocsSection>
      <DocsSection section={SECTIONS.inTheApp} flush>
        <DocsCards>
          <DocsCard label="Close position · don't ask again" className="justify-start">
            <LabelExample />
          </DocsCard>
          <DocsCard label="Orders · table row, no label" className="justify-start">
            <BoxAloneExample />
          </DocsCard>
          <DocsCard label="Orders · type filter" className="justify-start">
            <FilterGroupExample />
          </DocsCard>
        </DocsCards>
      </DocsSection>
    </div>
  );
}

const USAGE_CODE = `import Checkbox from "components/Checkbox/Checkbox";

// With a label: the checkbox doesn't style the label, so give the label its own text style
<Checkbox isChecked={dontAskAgain} setIsChecked={setDontAskAgain}>
  <span className="text-body-medium text-typography-secondary">Don't ask again</span>
</Checkbox>

// Box alone, e.g. in a table row
<Checkbox isChecked={isSelected} setIsChecked={onToggle} />

// "Select all": a dash while only some items are selected, a check mark when all are
<Checkbox isChecked={areAllSelected} isPartialChecked={areOnlySomeSelected} setIsChecked={onToggleAll} />`;

const CHECKBOX_PROPS: DocsProp[] = [
  { name: "isChecked", type: "boolean", defaultValue: "false", description: "Fills the box and shows a check mark." },
  {
    name: "setIsChecked",
    type: "(checked: boolean) => void",
    description:
      "Called on click with !isChecked. The click doesn't bubble up (stopPropagation), so a checkbox inside a clickable table row doesn't also trigger the row's onClick.",
  },
  {
    name: "isPartialChecked",
    type: "boolean",
    defaultValue: "false",
    description:
      "Fills the box and shows a dash instead of the check mark. Takes precedence over isChecked. Use it on a “select all” checkbox while only some items are selected.",
  },
  {
    name: "disabled",
    type: "boolean",
    defaultValue: "false",
    description:
      "Dims the box to 50% opacity and ignores clicks. The global button:disabled style also sets the whole checkbox, box and label, to 90% opacity with a not-allowed cursor.",
  },
  {
    name: "children",
    type: "ReactNode",
    description:
      "The label, 8px to the right of the box. The checkbox doesn't style it, so give the label a text style, for example text-body-medium text-typography-secondary.",
  },
  {
    name: "className",
    type: "string",
    description:
      "Classes for the root <button>, which holds the box and the label. It already has flex items-center gap-8.",
  },
  {
    name: "asRow",
    type: "boolean",
    defaultValue: "false",
    description: "Adds a fullRow class. No style or screen uses it.",
  },
  { name: "qa", type: "string", description: "Test id, set as data-qa." },
];

/**
 * Props tab: a usage snippet, then every prop.
 */
export function CheckboxPropsReference() {
  return (
    <div className="flex flex-col gap-16">
      <DocsSection section={SECTIONS.usage} flush>
        <DocsCode code={USAGE_CODE} />
      </DocsSection>
      <DocsSection section={SECTIONS.props}>
        <DocsPropsTable props={CHECKBOX_PROPS} />
      </DocsSection>
    </div>
  );
}

type ComponentChange = { where: string; change: string };

type ChangelogStep = DocsSectionInfo & { intro: string; changes: ComponentChange[] };

// What developers change in components/Checkbox/Checkbox.tsx and where it is used. Nothing here is done yet.
const CHANGELOG_STEPS: ChangelogStep[] = [
  {
    id: "checkbox-change-role",
    title: "1. Announce it as a checkbox",
    intro: "Screen readers hear a plain button today, so checked, empty and partial sound the same.",
    changes: [
      {
        where: "Checkbox.tsx · <button>",
        change:
          'Add role="checkbox", aria-checked={isPartialChecked ? "mixed" : Boolean(isChecked)} and type="button" (without a type it submits a surrounding form).',
      },
      { where: "Checkbox.tsx · CheckIcon, MinusIcon", change: "Add aria-hidden: the role already says the state." },
      {
        where: "Autotests: chartLines.spec.ts, fixtures/liveWallet.ts, funded/uiEarn.ts",
        change:
          'Find these checkboxes with getByRole("checkbox", …) instead of getByRole("button", …). Keep the selected class on the <button>: the tests read it.',
      },
    ],
  },
  {
    id: "checkbox-change-name",
    title: "2. Name the checkboxes without a label",
    intro: "A box without a label has no name for screen readers, and the component can't take one yet.",
    changes: [
      { where: "Checkbox.tsx", change: "Add an aria-label prop and pass it to the <button>." },
      {
        where:
          "OrderItem.tsx (row checkbox, table and card), OrderList.tsx (select all in the table header), ClaimAffiliatesModal.tsx (select all), ClaimRewardRow.tsx, ClaimableDistribution.tsx",
        change:
          "Pass aria-label: the item's name on row checkboxes, “Select all …” on header checkboxes. Wrap each label in t`…` and run yarn extract.",
      },
      {
        where: "OrderList.tsx · select all on small screens",
        change:
          'The checkbox sits inside a secondary Button, a button inside a button. Keep the look: give the Button role="checkbox", aria-checked and aria-label “Select all orders”, and show only the box inside it. For that, export the box from Checkbox.tsx as CheckboxBox.',
      },
    ],
  },
  {
    id: "checkbox-change-focus",
    title: "3. Show keyboard focus",
    intro:
      "Shared.scss removes the outline from every button, so focus on a checkbox is invisible today. Do this after the Colors steps, which rename blue-300 to blue-strong. In dark theme it's the blue of the ring EmbeddedActionButton uses; in light theme it's a darker blue, so the ring has at least 3:1 contrast on every surface.",
    changes: [
      {
        where: "Checkbox.tsx · <button>",
        change:
          "Add focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-strong.",
      },
      {
        where: "GmxAssetCard/ClaimModal.tsx · both checkboxes",
        change:
          "The card has overflow-hidden, which cuts off a ring outside the row. Pass focus-visible:outline-offset-[-2px] in className, so the ring sits inside the row.",
      },
    ],
  },
  {
    id: "checkbox-change-hover",
    title: "4. Hover border",
    intro:
      "Do this after the Colors steps, which add stroke-accent. In light theme the hover border is fainter than the normal one today (contrast 4.8:1 → 2.4:1); stroke-accent makes it stronger in both themes.",
    changes: [
      {
        where: "Checkbox.tsx · box",
        change:
          "group-hover:border-slate-400 → group-hover:group-enabled:border-stroke-accent, so a disabled box no longer changes on hover.",
      },
    ],
  },
  {
    id: "checkbox-change-target",
    title: "5. Click area and high contrast",
    intro: "Neither changes the look.",
    changes: [
      {
        where: "Checkbox.tsx · box",
        change:
          "Add relative after:absolute after:left-1/2 after:top-1/2 after:size-24 after:-translate-x-1/2 after:-translate-y-1/2 after:content-['']: a 24 × 24 click area centered on the 14px box.",
      },
      {
        where: "Checkbox.tsx · filled box",
        change:
          "Keep border-none and add forced-colors:border-solid, so high contrast mode still draws the square around the fill.",
      },
    ],
  },
];

const TH_CLASSNAME = "pb-8 pr-16 font-normal";

/**
 * Changelog tab: the component fixes for developers, step by step.
 */
export function CheckboxChangelog() {
  return (
    <div className="flex flex-col gap-16">
      <p className="text-body-large text-typography-secondary">
        Steps to make the checkbox accessible and consistent with the semantic colors. None of them are done yet.
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

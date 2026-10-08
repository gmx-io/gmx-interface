import cx from "classnames";
import { type CSSProperties, type ReactNode, useMemo } from "react";

import StandardTooltip, { STANDARD_TOOLTIP_LOOK, STANDARD_TOOLTIP_MAX_WIDTH } from "components/Tooltip/StandardTooltip";
import { TOOLTIP_OFFSET } from "components/Tooltip/Tooltip";
import {
  TooltipContent,
  TooltipDivider,
  TooltipFootnote,
  TooltipRow,
  TooltipRows,
  TooltipText,
  TooltipTitle,
} from "components/Tooltip/TooltipBlocks";

import { DocsCard, DocsCards } from "../DocsLayout";
import { TooltipPreview, type TooltipLook, type TooltipPreviewGeometry } from "./TooltipPreview";

// Anatomy block of the Tooltip page: a standard tooltip drawn open with its parts numbered, and the list of parts.

const PARTS = [
  { id: "trigger", name: "Trigger", description: "Dotted underline, outline info icon, or no marker." },
  { id: "pointer", name: "Pointer", description: "14 × 7px, under the middle of the trigger." },
  { id: "panel", name: "Panel", description: "1px border, 8px corners. 12px on the sides, 8px at the top and bottom." },
  { id: "title", name: "Title", description: "Medium weight, with an optional value on the right." },
  { id: "text", name: "Text", description: "Plain words in the main text color (gray-100)." },
  { id: "rows", name: "Rows", description: "Muted label, value on the right. No colons." },
  { id: "total", name: "Total", description: "A divider above it. The label is in the main color." },
  { id: "footnote", name: "Link or footnote", description: "Always last." },
] as const;

type PartId = (typeof PARTS)[number]["id"];

// Markers sit in a column this far from the panel, on both sides
const MARKER_GAP = 24;
const MARKER_SIZE = 20;
const PANEL_BORDER = 1;
// From a block's left edge to the panel's outer edge: 12px padding + the border
const PANEL_INSET = 12 + PANEL_BORDER;
// Lines stop this far before the text, so they don't read as dashes
const TEXT_GAP = 4;
// A group (the rows) gets a bracket this wide, between the line and the text
const BRACKET_WIDTH = 4;
// Middle of the first line: 14/18 text, and 12/16 for the footnote
const FIRST_LINE_MIDDLE = 9;
const FOOTNOTE_FIRST_LINE_MIDDLE = 8;
// The pointer: FloatingArrow draws it 14 × 7, in an svg widened by the 1px outline on both sides
const POINTER_WIDTH = 14;
const POINTER_HEIGHT = 7;
const POINTER_HALF_SVG_WIDTH = (POINTER_WIDTH + 2 * STANDARD_TOOLTIP_LOOK.arrowStrokeWidth) / 2;
// The pointer's marker sits this far right of the trigger, at the trigger's height
const POINTER_MARKER_GAP = 32;

// The markers sit outside the panel, so it must not clip them
const ANATOMY_LOOK: TooltipLook = {
  ...STANDARD_TOOLTIP_LOOK,
  popupClassName: cx(STANDARD_TOOLTIP_LOOK.popupClassName, "overflow-visible"),
};

// No fill: the markers inside the panel's markup would pick up its dark-theme colors in the light theme
const MARKER_CLASSNAME = `text-body-small flex size-20 shrink-0 items-center justify-center rounded-full border
  border-blue-400 font-medium text-blue-400 dark:border-blue-300 dark:text-blue-300`;
const LINE_CLASSNAME = "h-1 shrink-0 bg-blue-400 dark:bg-blue-300";
// The panel is dark in both themes, so the part of a line inside it is always the lighter blue
const LINE_IN_PANEL_CLASSNAME = "h-1 shrink-0 bg-blue-300";

function Marker({ id }: { id: PartId }) {
  return <span className={MARKER_CLASSNAME}>{PARTS.findIndex((part) => part.id === id) + 1}</span>;
}

/**
 * Wraps a part and draws its marker in the column left of the panel, with a line to the part's first line.
 * `inset` is how far the part's left edge sits inside the panel's outer edge (0 for the trigger, outside the panel).
 * A `group` (the rows) gets a bracket along its whole height, and the line points at the bracket's middle.
 */
function LeftCallout({
  id,
  inset = PANEL_INSET,
  firstLineMiddle = FIRST_LINE_MIDDLE,
  group,
  className,
  children,
}: {
  id: PartId;
  inset?: number;
  firstLineMiddle?: number;
  group?: boolean;
  className?: string;
  children: ReactNode;
}) {
  const endGap = group ? TEXT_GAP + BRACKET_WIDTH : TEXT_GAP;

  const [calloutStyle, outerLineStyle, innerLineStyle, bracketStyle] = useMemo(
    () =>
      [
        { right: `calc(100% + ${endGap}px)`, top: group ? "50%" : firstLineMiddle },
        { width: inset > 0 ? MARKER_GAP : MARKER_GAP - endGap },
        { width: Math.max(inset - endGap, 0) },
        { right: `calc(100% + ${TEXT_GAP}px)`, width: BRACKET_WIDTH },
      ] as CSSProperties[],
    [inset, firstLineMiddle, group, endGap]
  );

  return (
    <div className={cx("relative", className)}>
      <span aria-hidden className="absolute flex -translate-y-1/2 items-center" style={calloutStyle}>
        <Marker id={id} />
        <span className={LINE_CLASSNAME} style={outerLineStyle} />
        {inset > 0 && <span className={LINE_IN_PANEL_CLASSNAME} style={innerLineStyle} />}
      </span>
      {group && (
        <span aria-hidden className="absolute inset-y-0 border-y border-l border-blue-300" style={bracketStyle} />
      )}
      {children}
    </div>
  );
}

// The panel's marker in the column right of the panel, with a line from its right edge
function PanelCallout() {
  const style = useMemo<CSSProperties>(() => ({ width: PANEL_BORDER + MARKER_GAP + MARKER_SIZE }), []);

  return (
    <span aria-hidden className="absolute left-full top-1/2 flex -translate-y-1/2 items-center" style={style}>
      <span className={cx(LINE_CLASSNAME, "grow")} />
      <Marker id="panel" />
    </span>
  );
}

/**
 * The pointer's marker sits right of the trigger, with a slanted line down to the lower part of the pointer's
 * right slope, clear of the trigger's underline. Positions are inside the panel's border: its top edge is y = 0.
 */
function PointerCallout({ arrowX, triggerWidth, triggerHeight }: TooltipPreviewGeometry) {
  const [lineStyle, markerStyle] = useMemo(() => {
    // Two thirds of the way down the pointer's right slope
    const slopeX = arrowX + POINTER_HALF_SVG_WIDTH + ((POINTER_WIDTH / 2) * 2) / 3;
    const slopeY = -POINTER_HEIGHT / 3;
    // The trigger starts at the panel's outer edge, one border to the left
    const markerX = triggerWidth - PANEL_BORDER + POINTER_MARKER_GAP + MARKER_SIZE / 2;
    const markerY = -(PANEL_BORDER + TOOLTIP_OFFSET + triggerHeight / 2);
    const dx = markerX - slopeX;
    const dy = markerY - slopeY;
    const length = Math.hypot(dx, dy);
    // Like the other lines, it stops short of what it points at
    const startX = slopeX + (dx / length) * TEXT_GAP;
    const startY = slopeY + (dy / length) * TEXT_GAP;

    return [
      {
        left: startX,
        top: startY,
        width: length - TEXT_GAP - MARKER_SIZE / 2,
        transform: `rotate(${Math.atan2(dy, dx)}rad)`,
      },
      { left: markerX, top: markerY },
    ] as CSSProperties[];
  }, [arrowX, triggerWidth, triggerHeight]);

  return (
    <>
      <span aria-hidden className={cx(LINE_CLASSNAME, "absolute origin-left")} style={lineStyle} />
      <span aria-hidden className="absolute -translate-x-1/2 -translate-y-1/2" style={markerStyle}>
        <Marker id="pointer" />
      </span>
    </>
  );
}

function renderAnatomyOverlay(geometry: TooltipPreviewGeometry) {
  return (
    <>
      <PointerCallout {...geometry} />
      <PanelCallout />
    </>
  );
}

const TRIGGER = (
  <LeftCallout id="trigger" inset={0}>
    <StandardTooltip handle="Fees" disabled />
  </LeftCallout>
);

const CONTENT = (
  <TooltipContent>
    <LeftCallout id="title">
      <TooltipTitle>Fees and price impact</TooltipTitle>
    </LeftCallout>
    <LeftCallout id="text">
      <TooltipText>Paid when the order executes.</TooltipText>
    </LeftCallout>
    <TooltipRows>
      <LeftCallout id="rows" group className="flex flex-col gap-8">
        <TooltipRow label="Open fee" value="$3.20" />
        <TooltipRow label="Price impact" value="$0.84" />
        <TooltipRow label="Network fee" value="$0.29" />
      </LeftCallout>
      <TooltipDivider />
      <LeftCallout id="total">
        <TooltipRow label="Total" value="$4.33" isTotal />
      </LeftCallout>
    </TooltipRows>
    <LeftCallout id="footnote" firstLineMiddle={FOOTNOTE_FIRST_LINE_MIDDLE}>
      <TooltipFootnote>Unused network fees are refunded after execution.</TooltipFootnote>
    </LeftCallout>
  </TooltipContent>
);

export function TooltipAnatomy() {
  return (
    <DocsCards columns={2}>
      {/* A drawing of the parts; the list next to it says the same in words */}
      <DocsCard>
        {/* Room for the markers on both sides; the drawing is as wide as its panel, so it centers */}
        <div aria-hidden className="flex w-full justify-center px-48 py-8 max-md:px-44">
          <div className="min-w-0 max-w-[350px]">
            <TooltipPreview
              trigger={TRIGGER}
              content={CONTENT}
              look={ANATOMY_LOOK}
              maxWidth={STANDARD_TOOLTIP_MAX_WIDTH.default}
              renderOverlay={renderAnatomyOverlay}
            />
          </div>
        </div>
      </DocsCard>
      <DocsCard>
        {/* role="list": Safari drops list semantics from lists without bullets */}
        <ol role="list" className="flex flex-col gap-12">
          {PARTS.map((part) => (
            // pb-0 resets the padding that Shared.scss adds under every li
            <li key={part.id} className="flex items-start gap-12 pb-0">
              <Marker id={part.id} />
              <div className="flex flex-col gap-2">
                <span className="text-body-large">{part.name}</span>
                <span className="text-body-medium text-typography-secondary">{part.description}</span>
              </div>
            </li>
          ))}
        </ol>
      </DocsCard>
    </DocsCards>
  );
}

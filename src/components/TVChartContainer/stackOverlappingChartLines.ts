import { formatTokenAmount, formatUsd } from "lib/numbers";

import type { DynamicChartLine, StaticChartLine } from "./types";

const BASE_LINE_LENGTH_PX = -40;
const BASE_FONT_SIZE_PT = 12;
const ORDER_LABEL_WIDTH_PX = 190;
const POSITION_LABEL_MIN_WIDTH_PX = 220;
const POSITION_LABEL_MAX_WIDTH_PX = 470;
const POSITION_LABEL_EXTRA_WIDTH_PX = 30;
const POSITION_LABEL_COLLISION_SCALE = 0.61;
const POSITION_LABEL_FALLBACK_CHAR_WIDTH_PX = 6.5;
const OVERLAP_THRESHOLD_PX = 20;
const MIXED_OVERLAP_THRESHOLD_PX = 18;
const COLUMN_GAP_PX = 6;
const MIN_COLUMN_REVEAL_PX = 16;
const HARD_MIN_COLUMN_REVEAL_PX = 8;
const RIGHT_BOUND_GAP_PX = 8;

type StackedStaticChartLine = StaticChartLine & { lineLength: number };
type StackedDynamicChartLine = DynamicChartLine & { lineLength: number };
type StackableLineKind = "position" | "order";
let labelMeasureContext: CanvasRenderingContext2D | null | undefined;

type StackableItem =
  | {
      kind: "dynamic";
      price: number;
      widthPx: number;
      columnId?: number;
      lineLength?: number;
      line: DynamicChartLine;
    }
  | {
      kind: "static";
      price: number;
      widthPx: number;
      columnId?: number;
      lineLength?: number;
      line: StaticChartLine;
    };

function fontScale(fontSizePt: number) {
  return fontSizePt / BASE_FONT_SIZE_PT;
}

function makeLabelFont(fontSizePt: number) {
  return `normal ${fontSizePt}pt "Relative", sans-serif`;
}

function getStaticLabelWidthPx(line: StaticChartLine, fontSizePt: number) {
  const scale = fontScale(fontSizePt);

  if (!line.positionData) {
    return Math.round(ORDER_LABEL_WIDTH_PX * scale);
  }

  const pnlFormatted = formatUsd(line.positionData.pnl, { displayPlus: true }) ?? "$0.00";
  const sizeUsdFormatted = formatUsd(line.positionData.sizeInUsd) ?? "$0.00";
  const sizeTokenFormatted = formatTokenAmount(line.positionData.sizeInTokens, line.positionData.tokenDecimals) ?? "0";

  const prefix = `${line.title} · PnL ${pnlFormatted} · `;
  const displayTextUsd = `${prefix}${sizeUsdFormatted}`;
  const displayTextToken = `${prefix}${sizeTokenFormatted} ${line.positionData.tokenSymbol}`;
  const textWidthPx = Math.max(
    measureTextWidthPx(displayTextUsd, fontSizePt),
    measureTextWidthPx(displayTextToken, fontSizePt)
  );
  const estimated = POSITION_LABEL_EXTRA_WIDTH_PX * scale + textWidthPx * POSITION_LABEL_COLLISION_SCALE;

  return Math.max(POSITION_LABEL_MIN_WIDTH_PX * scale, Math.min(POSITION_LABEL_MAX_WIDTH_PX * scale, estimated));
}

function measureTextWidthPx(text: string, fontSizePt: number) {
  const fallbackCharWidth = POSITION_LABEL_FALLBACK_CHAR_WIDTH_PX * fontScale(fontSizePt);
  let width = Math.ceil(text.length * fallbackCharWidth);

  if (typeof document !== "undefined") {
    if (labelMeasureContext === undefined) {
      labelMeasureContext = document.createElement("canvas").getContext("2d");
    }

    if (labelMeasureContext) {
      labelMeasureContext.font = makeLabelFont(fontSizePt);
      width = Math.ceil(labelMeasureContext.measureText(text).width);
    }
  }

  return width;
}

function getStackableLineKind(item: StackableItem): StackableLineKind {
  return item.kind === "static" && item.line.positionData ? "position" : "order";
}

function getPairProximityThreshold(
  firstKind: StackableLineKind,
  secondKind: StackableLineKind,
  overlapThreshold: number,
  mixedOverlapThreshold: number
) {
  return firstKind === secondKind ? overlapThreshold : mixedOverlapThreshold;
}

export function stackOverlappingChartLines(p: {
  staticLines: StaticChartLine[];
  dynamicLines: DynamicChartLine[];
  pricePerPixel: number;
  isMobile: boolean;
  plotWidthPx?: number;
  bodyFontSizePt?: number;
}): {
  staticLines: StackedStaticChartLine[];
  dynamicLines: StackedDynamicChartLine[];
} {
  const { staticLines, dynamicLines, pricePerPixel, isMobile, plotWidthPx, bodyFontSizePt = BASE_FONT_SIZE_PT } = p;

  if (isMobile) {
    return {
      staticLines: staticLines.map((line) => ({ ...line, lineLength: BASE_LINE_LENGTH_PX })),
      dynamicLines: dynamicLines.map((line) => ({ ...line, lineLength: -1 })),
    };
  }

  const scaledOrderLabelWidth = Math.round(ORDER_LABEL_WIDTH_PX * fontScale(bodyFontSizePt));

  const items: StackableItem[] = [
    ...dynamicLines.map(
      (line): StackableItem => ({
        kind: "dynamic",
        price: line.price,
        widthPx: scaledOrderLabelWidth,
        line,
      })
    ),
    ...staticLines.map(
      (line): StackableItem => ({
        kind: "static",
        price: line.price,
        widthPx: getStaticLabelWidthPx(line, bodyFontSizePt),
        line,
      })
    ),
  ];

  if (items.length === 0) {
    return { staticLines: [], dynamicLines: [] };
  }

  const overlapThreshold = pricePerPixel > 0 ? OVERLAP_THRESHOLD_PX * pricePerPixel : 0;
  const mixedOverlapThreshold = pricePerPixel > 0 ? MIXED_OVERLAP_THRESHOLD_PX * pricePerPixel : 0;

  items.sort((a, b) => {
    if (a.price !== b.price) {
      return a.price - b.price;
    }

    // Deterministic order for equal price, doesn't affect grouping.
    if (a.kind !== b.kind) {
      return a.kind === "dynamic" ? -1 : 1;
    }

    if (a.kind === "dynamic" && b.kind === "dynamic") {
      return Number(b.line.updatedAtTime - a.line.updatedAtTime);
    }

    if (a.kind === "static" && b.kind === "static") {
      return a.line.id.localeCompare(b.line.id);
    }

    return 0;
  });

  if (overlapThreshold <= 0 || mixedOverlapThreshold <= 0) {
    return {
      staticLines: staticLines.map((line) => ({ ...line, lineLength: BASE_LINE_LENGTH_PX })),
      dynamicLines: dynamicLines.map((line) => ({ ...line, lineLength: BASE_LINE_LENGTH_PX })),
    };
  }

  const baseX = -BASE_LINE_LENGTH_PX;
  const plotWidth = plotWidthPx && plotWidthPx > 0 ? plotWidthPx : undefined;
  const availableWidth =
    plotWidth && plotWidth > baseX + RIGHT_BOUND_GAP_PX ? plotWidth - RIGHT_BOUND_GAP_PX - baseX : undefined;

  const groups: StackableItem[][] = [];
  let currentGroup: StackableItem[] = [];

  for (const item of items) {
    if (currentGroup.length === 0) {
      currentGroup = [item];
      continue;
    }

    const prev = currentGroup[currentGroup.length - 1];
    const priceDiff = Math.abs(item.price - prev.price);
    const pairThreshold = getPairProximityThreshold(
      getStackableLineKind(item),
      getStackableLineKind(prev),
      overlapThreshold,
      mixedOverlapThreshold
    );

    if (priceDiff === 0 || priceDiff < pairThreshold) {
      currentGroup.push(item);
    } else {
      groups.push(currentGroup);
      currentGroup = [item];
    }
  }

  if (currentGroup.length > 0) {
    groups.push(currentGroup);
  }

  type Column = { id: number; lastPrice: number; widthPx: number; lastLineKind: StackableLineKind };

  for (const group of groups) {
    const columns: Column[] = [];

    // Assign each item to the leftmost possible column.
    // This keeps labels glued to the left whenever vertical space allows.
    for (const item of group) {
      const itemKind = getStackableLineKind(item);
      const selected = columns.find((col) => {
        const pairThreshold = getPairProximityThreshold(
          itemKind,
          col.lastLineKind,
          overlapThreshold,
          mixedOverlapThreshold
        );

        return item.price - col.lastPrice >= pairThreshold;
      });

      if (!selected) {
        const col = { id: columns.length, lastPrice: item.price, widthPx: item.widthPx, lastLineKind: itemKind };
        columns.push(col);
        item.columnId = col.id;
      } else {
        selected.lastPrice = item.price;
        selected.widthPx = Math.max(selected.widthPx, item.widthPx);
        selected.lastLineKind = itemKind;
        item.columnId = selected.id;
      }
    }

    const widths = columns.map((column) => column.widthPx);
    const offsets: number[] = new Array(widths.length).fill(0);

    for (let i = 1; i < widths.length; i++) {
      offsets[i] = offsets[i - 1] + widths[i - 1] + COLUMN_GAP_PX;
    }

    const totalWidth = offsets[offsets.length - 1] + widths[widths.length - 1];

    if (availableWidth !== undefined && offsets.length > 1 && totalWidth > availableWidth) {
      // Compress start offsets while preserving relative column widths.
      const originalGaps: number[] = [];
      for (let i = 1; i < widths.length; i++) {
        originalGaps.push(widths[i - 1] + COLUMN_GAP_PX);
      }

      const lastWidth = widths[widths.length - 1];
      const minTotalWidth = originalGaps.reduce((sum) => sum + MIN_COLUMN_REVEAL_PX, 0) + lastWidth;
      const hardMinTotalWidth = originalGaps.reduce((sum) => sum + HARD_MIN_COLUMN_REVEAL_PX, 0) + lastWidth;

      let compressedGaps: number[];

      if (availableWidth >= minTotalWidth) {
        const originalGapSum = originalGaps.reduce((sum, gap) => sum + gap, 0);
        const minGapSum = MIN_COLUMN_REVEAL_PX * originalGaps.length;
        const rawFactor =
          originalGapSum > minGapSum ? (availableWidth - minTotalWidth) / (originalGapSum - minGapSum) : 0;
        const factor = Math.max(0, Math.min(1, rawFactor));
        const easedFactor = Math.pow(factor, 1.35);

        compressedGaps = originalGaps.map((gap) => MIN_COLUMN_REVEAL_PX + (gap - MIN_COLUMN_REVEAL_PX) * easedFactor);
      } else if (availableWidth >= hardMinTotalWidth) {
        const minGapSum = MIN_COLUMN_REVEAL_PX * originalGaps.length;
        const hardMinGapSum = HARD_MIN_COLUMN_REVEAL_PX * originalGaps.length;
        const rawFactor =
          minGapSum > hardMinGapSum ? (availableWidth - hardMinTotalWidth) / (minGapSum - hardMinGapSum) : 0;
        const factor = Math.max(0, Math.min(1, rawFactor));
        const easedFactor = Math.pow(factor, 1.2);

        compressedGaps = originalGaps.map(
          () => HARD_MIN_COLUMN_REVEAL_PX + (MIN_COLUMN_REVEAL_PX - HARD_MIN_COLUMN_REVEAL_PX) * easedFactor
        );
      } else {
        const forcedGap = Math.max(1, (availableWidth - lastWidth) / originalGaps.length);
        compressedGaps = originalGaps.map(() => forcedGap);
      }

      offsets[0] = 0;
      for (let i = 1; i < offsets.length; i++) {
        offsets[i] = offsets[i - 1] + compressedGaps[i - 1];
      }
    }

    for (const item of group) {
      const offsetPx = offsets[item.columnId ?? 0] ?? 0;
      item.lineLength = -(baseX + offsetPx);
    }
  }

  return {
    staticLines: items
      .filter((i): i is Extract<StackableItem, { kind: "static" }> => i.kind === "static")
      .map((i) => ({ ...i.line, lineLength: i.lineLength ?? BASE_LINE_LENGTH_PX })),
    dynamicLines: items
      .filter((i): i is Extract<StackableItem, { kind: "dynamic" }> => i.kind === "dynamic")
      .map((i) => ({ ...i.line, lineLength: i.lineLength ?? BASE_LINE_LENGTH_PX })),
  };
}

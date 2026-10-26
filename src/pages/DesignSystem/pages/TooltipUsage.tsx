// How to use the standard tooltip. The Props tab shows this file as it is, so keep it short and real (it compiles).
import Button from "components/Button/Button";
import StandardTooltip from "components/Tooltip/StandardTooltip";
import {
  TooltipContent,
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

import DisconnectIcon from "img/ic_sign_out_20.svg?react";

const NET_RATE_COLUMNS: TooltipTableColumn[] = [
  { label: "Pool" },
  { label: "Longs / 1h", align: "right" },
  { label: "Shorts / 1h", align: "right" },
];
const NET_RATE_ROWS = [["BTC/USD", "+0.0001%", "-0.0006%"]];

export function TooltipUsage() {
  return (
    // Tooltips next to each other: after the first one opens, the next ones open instantly
    <TooltipGroup>
      {/* Plain text: a string is enough. One or two lines are centered */}
      <StandardTooltip handle="Funding fee" content="Paid every hour to the other side of the market." />

      {/* Title and text */}
      <StandardTooltip
        handle="PnL"
        content={
          <TooltipContent>
            <TooltipTitle value="$967.71" valueClassName="text-green-500">
              PnL
            </TooltipTitle>
            <TooltipText>Total PnL after fees and price impact.</TooltipText>
          </TooltipContent>
        }
      />

      {/* Text and a link: the link goes last, on its own line */}
      <StandardTooltip
        handle="Price impact / fees"
        content={
          <TooltipContent>
            <TooltipText>No price impact on increases — orders execute at mark price.</TooltipText>
            <TooltipLink href="https://docs.gmx.io/docs/trading/fees/">Read more</TooltipLink>
          </TooltipContent>
        }
      />

      {/* Rows with a total */}
      <StandardTooltip
        handle="$492.03m"
        position="bottom-end"
        content={
          <TooltipRows>
            <TooltipRow label="Arbitrum" value="$390.49m" />
            <TooltipRow label="Avalanche" value="$80.71m" />
            <TooltipTotal label="Total" value="$492.03m" />
          </TooltipRows>
        }
      />

      {/* Rows and a footnote */}
      <StandardTooltip
        handle="Network fee"
        content={
          <TooltipContent>
            <TooltipRows>
              <TooltipRow label="Max network fee" value="$0.29" />
              <TooltipRow label="Estimated fee refund" value="$0.08" valueClassName="text-green-500" />
            </TooltipRows>
            <TooltipFootnote>Unused network fees are refunded after execution.</TooltipFootnote>
          </TooltipContent>
        }
      />

      {/* Table: the Wide size, only for tables */}
      <StandardTooltip
        handle="Net rate / 1h"
        size="wide"
        content={<TooltipTable columns={NET_RATE_COLUMNS} rows={NET_RATE_ROWS} />}
      />

      {/* Header or setting: outline info icon */}
      <StandardTooltip
        handle="FEE APY"
        variant="iconStroke"
        content="Projected yearly return from trading fees only."
      />

      {/* Icon button: no marker, the button is the trigger. type="label": the tooltip repeats the button's name */}
      <StandardTooltip variant="none" type="label" content="Disconnect">
        <button type="button" aria-label="Disconnect">
          <DisconnectIcon className="size-16" />
        </button>
      </StandardTooltip>

      {/* Disabled button: no marker; the tooltip says why it's disabled */}
      <StandardTooltip
        variant="none"
        isHandlerDisabled
        shouldPreventDefault={false}
        content="Nothing is claimable on Arbitrum right now."
      >
        <Button variant="primary" disabled>
          Claim rewards
        </Button>
      </StandardTooltip>
    </TooltipGroup>
  );
}

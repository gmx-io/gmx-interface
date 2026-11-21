// How to build a table. The Props tab shows this file as it is, so keep it short and real (it compiles).
import { TableTd, TableTh, TableTheadTr, TableTr } from "components/Table/Table";
import { TableScrollFadeContainer } from "components/TableScrollFade/TableScrollFade";
import StandardTooltip from "components/Tooltip/StandardTooltip";

const ROWS = [
  { market: "BTC/USD", date: "21 Nov 2025, 09:49", size: "$12,500.00" },
  { market: "ETH/USD", date: "20 Nov 2025, 18:02", size: "$4,200.00" },
];

export function TableUsage() {
  return (
    // The container lets the table scroll sideways on small screens
    <TableScrollFadeContainer>
      {/* A minimum width keeps the columns readable on phones */}
      <table className="w-full min-w-[640px]">
        <thead>
          <TableTheadTr>
            {/* Width shares keep the columns in place on every page */}
            <TableTh className="w-[50%]">MARKET</TableTh>
            <TableTh className="w-[50%]">SIZE</TableTh>
          </TableTheadTr>
        </thead>
        <tbody>
          {ROWS.map((row) => (
            // hoverable: highlights the row on hover and while one of its tooltips is open
            <TableTr key={row.market} hoverable>
              <TableTd>
                {row.market}
                {/* A second line: small text in its own block, so the row stays 52px */}
                <span className="text-body-small block text-typography-secondary">{row.date}</span>
              </TableTd>
              <TableTd>
                <StandardTooltip handle={row.size} content="Position size in USD" />
              </TableTd>
            </TableTr>
          ))}
        </tbody>
      </table>
    </TableScrollFadeContainer>
  );
}

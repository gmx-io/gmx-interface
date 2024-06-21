import cx from "classnames";
import React from "react";

import TokenWithIcon from "components/TokenIcon/TokenWithIcon";

export default function SwapTokenPathLabel({
  pathTokenSymbols,
  bordered,
}: {
  pathTokenSymbols: string[] | undefined;
  bordered?: boolean;
}) {
  if (!pathTokenSymbols) {
    return (
      <div className="leading">
        ...<span className="mx-5">→</span>...
      </div>
    );
  }

  return (
    <div
      className={cx("inline-flex flex-wrap gap-y-8 whitespace-pre-wrap", {
        "*:border-b *:border-dashed *:border-b-gray-400": bordered,
      })}
    >
      {pathTokenSymbols.map((symbol, index, arr) => (
        <React.Fragment key={symbol}>
          {/* Always keep arrow on the same line as source token */}
          <span className="whitespace-nowrap">
            <TokenWithIcon symbol={symbol} displaySize={20} />
            {index < arr.length - 1 && <span className="mx-5">→</span>}
          </span>
        </React.Fragment>
      ))}
    </div>
  );
}

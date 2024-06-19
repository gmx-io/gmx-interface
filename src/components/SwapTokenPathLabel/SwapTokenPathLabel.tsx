import cx from "classnames";

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
    <div className="leading-2">
      {pathTokenSymbols.map((symbol, index, arr) => (
        <div
          key={symbol}
          className={cx("inline-block  leading-base", {
            "border-b border-dashed border-b-gray-400": bordered,
          })}
        >
          <TokenWithIcon symbol={symbol} displaySize={20} />
          {index < arr.length - 1 && <span className="mx-5">→</span>}
        </div>
      ))}
    </div>
  );
}

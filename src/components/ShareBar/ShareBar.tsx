import { BigNumberish } from "ethers";
import cx from "classnames";
import { bigNumberify } from "lib/numbers";
import "./ShareBar.scss";

export type Props = {
  share?: BigNumberish;
  total?: BigNumberish;
  className?: string;
};

export function ShareBar(p: Props) {
  const { share, total, className } = p;

  if (!share || !total || bigNumberify(total)!.eq(0)) {
    return null;
  }

  let progress = bigNumberify(share)!.mul(100).div(total).toNumber();
  progress = Math.min(progress, 100);

  return (
    <div className={cx("ShareBar", className)}>
      <div className="ShareBar-fill" style={{ width: `${progress}%` }} />
    </div>
  );
}

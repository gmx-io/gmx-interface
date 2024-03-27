import { BigNumber, BigNumberish } from "ethers";
import cx from "classnames";
import "./ShareBar.scss";
import { useMemo } from "react";

const PERCENTAGE_HIDE_THRESHOLD = 25;

export type Props = {
  share?: BigNumberish;
  total?: BigNumberish;
  warningThreshold?: number; // 0-100
  className?: string;
  showPercentage?: boolean;
};

export function ShareBar(p: Props) {
  const { share, total, className, warningThreshold, showPercentage } = p;

  const progress = useMemo(() => {
    if (!share || !total || BigNumber.from(total)?.eq(0)) {
      return null;
    }
    const calculatedProgress = BigNumber.from(share)!.mul(100).div(total).toNumber();
    return Math.min(calculatedProgress, 100);
  }, [share, total]);

  const percentageStyle = useMemo(() => {
    if (!progress) {
      return {};
    }
    return {
      leftStyle: { width: `${progress}%` },
      rightStyle: { width: `${100 - progress}%` },
    };
  }, [progress]);

  if (!progress) {
    return null;
  }

  const classNames = cx("ShareBar", className, {
    warning: progress && warningThreshold && warningThreshold < progress,
    ShareBar__percentage: !!showPercentage,
  });

  return (
    <div className={classNames}>
      {!showPercentage && <div className="ShareBar-fill" style={percentageStyle.leftStyle} />}
      {showPercentage && (
        <div className="ShareBar-fill__percentage">
          <div className="ShareBar-fill__left" style={percentageStyle.leftStyle}>
            {formatPercentageDisplay(progress)}
          </div>
          <div className="ShareBar-fill__right" style={percentageStyle.rightStyle}>
            {formatPercentageDisplay(100 - progress)}
          </div>
        </div>
      )}
    </div>
  );
}

function formatPercentageDisplay(percentage: number) {
  if (percentage < PERCENTAGE_HIDE_THRESHOLD) {
    return "";
  }
  return `${percentage}%`;
}

import cx from "classnames";
import { useMemo } from "react";

import { formatPercentageDisplay } from "lib/numbers";
import { bigMath } from "sdk/utils/bigmath";

import "./ShareBar.scss";

const PERCENTAGE_HIDE_THRESHOLD = 25;

export type Props = {
  share?: string | number | bigint;
  total?: string | number | bigint;
  warningThreshold?: number; // 0-100
  className?: string;
  showPercentage?: boolean;
};

export function ShareBar(p: Props) {
  const { share, total, className, warningThreshold, showPercentage } = p;

  const progress = useMemo(() => {
    if (share == undefined || total == undefined || BigInt(total) == 0n) {
      return null;
    }
    const calculatedProgress = Number(bigMath.mulDiv(BigInt(share), 100n, BigInt(total)));

    return Math.max(Math.min(calculatedProgress, 100), 0.01); // 0.01 ~= 0 but css works properly
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

  if (progress === null) {
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
            {formatPercentageDisplay(progress, PERCENTAGE_HIDE_THRESHOLD)}
          </div>
          <div className="ShareBar-fill__right" style={percentageStyle.rightStyle}>
            {formatPercentageDisplay(100 - progress, PERCENTAGE_HIDE_THRESHOLD)}
          </div>
        </div>
      )}
    </div>
  );
}

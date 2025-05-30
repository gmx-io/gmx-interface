import cx from "classnames";

import { getIsV1Supported } from "config/features";
import { useChainId } from "lib/chains";
import { useTradePageVersion } from "lib/useTradePageVersion";
import "./VersionSwitch.scss";

export function VersionSwitch() {
  const { chainId } = useChainId();
  const [currentVersion, setCurrentVersion] = useTradePageVersion();

  const isV1Supported = getIsV1Supported(chainId);

  return (
    <div className={cx("VersionSwitch text-body-medium")}>
      {isV1Supported && (
        <div
          className={cx("VersionSwitch-option v1", { active: currentVersion === 1 })}
          onClick={() => setCurrentVersion(1)}
        >
          V1
        </div>
      )}
      <div
        className={cx("VersionSwitch-option v2", {
          active: currentVersion === 2,
          "col-span-2 rounded-3": !isV1Supported,
        })}
        onClick={() => setCurrentVersion(2)}
      >
        V2
      </div>
    </div>
  );
}

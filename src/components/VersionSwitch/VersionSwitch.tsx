import cx from "classnames";
import "./VersionSwitch.scss";
import { useChainId } from "lib/chains";
import { getIsSyntheticsSupported, getIsV1Supported } from "config/features";
import { useTradePageVersion } from "lib/useTradePageVersion";

type Props = {
  className?: string;
};

export function VersionSwitch({ className }: Props) {
  const { chainId } = useChainId();
  const [currentVersion, setCurrentVersion] = useTradePageVersion();

  return (
    <div className={cx("VersionSwitch", className)}>
      {getIsV1Supported(chainId) && (
        <div
          className={cx("VersionSwitch-option v1", { active: currentVersion === 1 })}
          onClick={() => setCurrentVersion(1)}
        >
          V1
        </div>
      )}
      {getIsSyntheticsSupported(chainId) && (
        <div
          className={cx("VersionSwitch-option v2", { active: currentVersion === 2 })}
          onClick={() => setCurrentVersion(2)}
        >
          V2
        </div>
      )}
    </div>
  );
}

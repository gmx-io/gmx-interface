import Skeleton, { SkeletonTheme } from "react-loading-skeleton";

import "react-loading-skeleton/dist/skeleton.css";
import "components/Skeleton/Skeleton.scss";

export default function ConnectWalletPlaceholder() {
  return (
    <SkeletonTheme baseColor="#B4BBFF0D" highlightColor="#B4BBFF0D">
      <span
        data-qa="wallet-initializing"
        className="flex h-40 items-center gap-8 rounded-8 bg-button-secondary px-12 max-md:h-32 max-md:px-10"
      >
        <Skeleton circle inline width="100%" height="100%" containerClassName="flex size-24 max-md:size-16" />
        <Skeleton
          inline
          width="100%"
          height="100%"
          borderRadius={4}
          containerClassName="flex h-14 w-[88px] max-md:w-[56px] max-smallMobile:hidden"
        />
      </span>
    </SkeletonTheme>
  );
}

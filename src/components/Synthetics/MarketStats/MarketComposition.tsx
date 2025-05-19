import cx from "classnames";
import { ReactNode } from "react";
import { useMedia } from "react-use";

import { CompositionBar } from "./components/CompositionBar";
import { CompositionTable } from "./components/CompositionTable";
import { CompositionItem, CompositionType } from "./hooks/useCompositionData";

type Props = {
  title: ReactNode;
  label: ReactNode;
  composition: CompositionItem[];
  type: CompositionType;
};

export function MarketComposition({ title, label, composition, type }: Props) {
  const isMobile = useMedia("(max-width: 768px)");

  return (
    <div className="flex size-full grow flex-col items-center border-stroke-primary pt-24">
      <h5 className="text-body-medium text-slate-100">{title}</h5>
      <div className="px-16 py-20">
        <CompositionBar data={composition} label={label} />
      </div>
      <div className={cx("relative w-full overflow-x-hidden flex-grow overflow-y-auto", { "max-h-[160px]": !isMobile })}>
        <CompositionTable composition={composition} compositionType={type} />
      </div>
    </div>
  );
}

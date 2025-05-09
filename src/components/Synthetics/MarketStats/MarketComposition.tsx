import { ReactNode } from "react";

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
  return (
    <div className="flex size-full grow flex-col items-center border-stroke-primary pt-24 first:border-r">
      <h5 className="text-body-large text-slate-100">{title}</h5>
      <div className="px-16 py-20">
        <CompositionBar data={composition} label={label} />
      </div>
      <div className="relative max-h-[160px] w-full flex-grow overflow-y-auto">
        <CompositionTable composition={composition} compositionType={type} />
      </div>
    </div>
  );
}

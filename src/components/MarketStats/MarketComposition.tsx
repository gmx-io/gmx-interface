import { ReactNode } from "react";

import { CompositionDiagram } from "./components/CompositionDiagram";
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
    <div className="flex size-full grow flex-col items-center rounded-8 bg-slate-900">
      <div className="flex w-full flex-col gap-20 border-b-1/2 border-slate-600 p-20">
        <h5 className="text-[20px] font-medium max-md:text-14">{title}</h5>
        <div className="w-full">
          <CompositionDiagram data={composition} label={label} />
        </div>
      </div>
      <div className="relative w-full flex-grow overflow-y-auto overflow-x-hidden md:max-h-[246px] md:min-h-[160px]">
        <CompositionTable composition={composition} compositionType={type} />
      </div>
    </div>
  );
}

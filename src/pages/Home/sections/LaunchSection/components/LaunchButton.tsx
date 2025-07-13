import React from "react";

import IcArrowRight from "img/ic_arrowright16.svg?react";

type Props = {
  icon: React.FunctionComponent<
    React.SVGProps<SVGSVGElement> & {
      title?: string;
    }
  >;
  name: string;
  onClick: () => void;
};

export default function LaunchButton({ icon: Icon, name, onClick }: Props) {
  return (
    <button
      onClick={onClick}
      className="group inline-flex w-full items-center gap-12 rounded-16 bg-[#F4F5F9] px-20 py-12 hover:bg-[#EFF0F4] sm:w-[288px]"
    >
      <div className="flex h-60 w-60 flex-shrink-0 items-center justify-center rounded-12 border-[0.5px] border-[#E8EAF2] bg-white">
        <Icon className="size-24" />
      </div>
      <span className="text-16 font-medium -tracking-[0.768px] sm:text-24">{name}</span>
      <IcArrowRight className="ml-auto size-18 translate-x-0 transition-transform duration-300 ease-in-out group-hover:translate-x-4" />
    </button>
  );
}

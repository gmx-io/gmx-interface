import clsx from "clsx";

type Props = {
  children: React.ReactNode;
  lastCompleted?: boolean;
};

export function Quarter({ children, lastCompleted }: Props) {
  return (
    <div
      className={clsx("group relative flex w-auto flex-shrink-0 flex-col gap-16 py-28 pr-28 sm:w-[282px] sm:pr-48", {
        "is-last-completed": lastCompleted,
      })}
    >
      {lastCompleted && (
        <div className="absolute -right-9 -top-[7.5px] z-20 size-16 rounded-full border-[0.5px] border-blue-600" />
      )}
      <div className="bg-fiord-500 group-[.is-last-completed]:from-fiord-500 absolute left-0 top-0 h-1 w-full group-[.is-last-completed]:bg-gradient-to-r group-[.is-last-completed]:to-blue-600" />
      <div className="bg-fiord-500 absolute -top-[3.5px] left-0 hidden size-8 rounded-full group-first:block" />
      <div className="bg-fiord-500 absolute -right-5 -top-[3.5px] z-20 size-8 rounded-full group-[.is-last-completed]:bg-blue-600" />
      <div className="leading-heading-md group-[.is-last-completed]:text-fiord-500 group-has-[~.is-last-completed]:text-fiord-500 flex flex-col gap-8 text-16 font-medium -tracking-[0.768px] md:text-24">
        {children}
      </div>
    </div>
  );
}

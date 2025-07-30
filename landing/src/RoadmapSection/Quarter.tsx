type Props = {
  title: string;
  children: React.ReactNode;
};

export function Quarter({ title, children }: Props) {
  return (
    <div className="border-fiord-500 flex w-auto flex-shrink-0 cursor-pointer flex-col gap-16 border-y-[0.5px] py-28 pr-36 hover:border-blue-600 sm:w-[282px] sm:pr-0">
      <h3 className="leading-body-sm text-secondary text-16 font-normal -tracking-[0.512px]">{title}</h3>
      <div className="leading-heading-md text-24 font-medium -tracking-[0.768px]">{children}</div>
    </div>
  );
}

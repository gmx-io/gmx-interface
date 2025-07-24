type Props = {
  title: string;
  children: React.ReactNode;
};

export function Quarter({ title, children }: Props) {
  return (
    <div className="flex w-[282px] cursor-pointer flex-col gap-16 border-y-[0.5px] border-fiord-500 py-28 hover:border-blue-600">
      <h3 className="leading-body-sm text-16 font-normal -tracking-[0.512px] text-secondary">{title}</h3>
      <div className="text-24 font-medium leading-heading-md -tracking-[0.768px]">{children}</div>
    </div>
  );
}

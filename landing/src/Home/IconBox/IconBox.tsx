type Props = {
  iconComponent: React.FunctionComponent<React.SVGProps<SVGSVGElement>>;
};

export function IconBox({ iconComponent: IconComponent }: Props) {
  return (
    <div className="inline-flex size-60 flex-shrink-0 items-center justify-center rounded-12 bg-blue-400">
      <IconComponent className="size-36" />
    </div>
  );
}

type Props = {
  iconComponent: React.FunctionComponent<
    React.SVGProps<SVGSVGElement> & {
      title?: string;
    }
  >;
};

export function IconBox({ iconComponent: IconComponent }: Props) {
  return (
    <div className="inline-flex size-60 flex-shrink-0 items-center justify-center rounded-12 bg-blue-600">
      <IconComponent className="size-36" />
    </div>
  );
}

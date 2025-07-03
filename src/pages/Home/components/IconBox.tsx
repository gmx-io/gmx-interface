type Props = {
  iconComponent: React.FunctionComponent<
    React.SVGProps<SVGSVGElement> & {
      title?: string;
    }
  >;
};

export function IconBox({ iconComponent: IconComponent }: Props) {
  return (
    <div className="inline-flex h-60 w-60 items-center justify-center rounded-12 bg-blue-600">
      <IconComponent className="h-36 w-36" />
    </div>
  );
}

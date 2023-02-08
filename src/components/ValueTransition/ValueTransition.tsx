import { BsArrowRight } from "react-icons/bs";

type Props = {
  from?: string;
  to?: string;
};

export function ValueTransition(p: Props) {
  if (!p.to || p.to === p.from) return <>{p.from}</>;
  if (!p.from) return <>{p.to}</>;

  return (
    <>
      <div className="inline-block muted">
        {p.from}
        <BsArrowRight className="transition-arrow" />
      </div>
      {p.to}
    </>
  );
}

import { MarketFilterBase, MarketFilterBaseProps } from "./MarketFilterBase";

type MarketFilterProps = Omit<MarketFilterBaseProps, "beforeContent" | "extraIsActive">;

export const MarketFilter = (props: MarketFilterProps) => <MarketFilterBase {...props} beforeContent={undefined} />;

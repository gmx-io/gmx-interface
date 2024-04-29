import { MarketFilterBase, MarketFilterBaseProps } from "./MarketFilterBase";

type MarketFilterProps = Omit<MarketFilterBaseProps, "beforeContent" | "forceIsActive">;

export const MarketFilter = (props: MarketFilterProps) => <MarketFilterBase {...props} beforeContent={undefined} />;

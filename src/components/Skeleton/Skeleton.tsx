import "react-loading-skeleton/dist/skeleton.css";
import "./Skeleton.scss";
import { SkeletonTheme } from "react-loading-skeleton";
import { ComponentType } from "react";
import MarketListSkeletonStructure from "./MarketListSkeletonStructure";
import GMListSkeletonStructure from "./GMListSkeletonStructure";

type Props = {
  count: number;
  Structure: ComponentType;
};

function TableListSkeleton({ count = 10, Structure }: Props) {
  return (
    <SkeletonTheme baseColor="#B4BBFF1A" highlightColor="#B4BBFF1A">
      {Array.from({ length: count }).map((_, index) => (
        <Structure key={index} />
      ))}
    </SkeletonTheme>
  );
}

export function MarketListSkeleton(props) {
  return <TableListSkeleton {...props} Structure={MarketListSkeletonStructure} />;
}

export function GMListSkeleton(props) {
  return <TableListSkeleton {...props} Structure={GMListSkeletonStructure} />;
}

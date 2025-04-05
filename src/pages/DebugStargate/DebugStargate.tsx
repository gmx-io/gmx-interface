import { StargateV1 } from "./StargateV1";
import { StargateV2 } from "./StargateV2";

export default function DebugStargate() {
  return (
    <div className="text-body-medium flex items-start justify-center gap-16 p-16">
      <StargateV1 />
      <StargateV2 />
    </div>
  );
}

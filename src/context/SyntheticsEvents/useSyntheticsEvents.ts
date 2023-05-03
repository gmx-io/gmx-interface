import { useContext } from "react";
import { SyntheticsEventsContext } from "./SyntheticsEventsProvider";
import { SyntheticsEventsContextType } from "./types";

export function useSyntheticsEvents(): SyntheticsEventsContextType {
  return useContext(SyntheticsEventsContext) as SyntheticsEventsContextType;
}

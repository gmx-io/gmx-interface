import { useContext } from "react";
import { SyntheticsEventsContext } from "./SyntheticsEventsProvider";
import { ContractEventsContextType } from "./types";

export function useSyntheticsEvents(): ContractEventsContextType {
  return useContext(SyntheticsEventsContext) as ContractEventsContextType;
}

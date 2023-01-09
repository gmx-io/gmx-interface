import { useContext } from "react";
import { ContractEventsContext } from "./context";
import { ContractEventsContextType } from "./types";

export function useContractEvents(): ContractEventsContextType {
  return useContext(ContractEventsContext) as ContractEventsContextType;
}

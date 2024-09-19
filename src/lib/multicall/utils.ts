import { MulticallErrors } from "./types";

export function serializeMulticallErrors(errors: MulticallErrors<any>) {
  let errorString = "";

  for (const [contractKey, contractErrors] of Object.entries(errors)) {
    errorString += `${contractKey}: `;
    for (const [callName, callError] of Object.entries(contractErrors)) {
      errorString += `${callName}: ${callError.shortMessage || callError.message.slice(0, 50)}; `;
    }
  }

  return errorString;
}

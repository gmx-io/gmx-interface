import { MulticallErrors } from "./types";

export function serializeMulticallErrors(errors: MulticallErrors<any>) {
  let errorString = "";

  for (const [contractKey, contractErrors] of Object.entries(errors)) {
    errorString += `${contractKey}: `;
    for (const callError of Object.values(contractErrors)) {
      errorString += `${callError.shortMessage}; `;
    }
  }

  return errorString;
}

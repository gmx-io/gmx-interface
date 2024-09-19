import { MulticallErrors } from "./types";

export function serializeMulticallErrors(errors: MulticallErrors<any>) {
  let errorString = "";
  let lastError = "";

  for (const [contractKey, contractErrors] of Object.entries(errors)) {
    errorString += `${contractKey}: `;

    for (const [callName, callError] of Object.entries(contractErrors)) {
      const errorMessage = callError.shortMessage || callError.message.slice(0, 50);

      // Log unique errors
      if (!lastError || lastError !== errorMessage) {
        errorString += `${callName}: ${errorMessage}; `;
      }

      lastError = errorMessage;
    }
  }

  return errorString;
}

import { decodeErrorFromViemError } from "lib/errors";
import { CustomError, extendError, OrderErrorContext, type ErrorLike } from "lib/errors";

export async function fallbackCustomError<T = void>(f: () => Promise<T>, errorContext: OrderErrorContext) {
  try {
    return await f();
  } catch (error) {
    const parsedError = decodeErrorFromViemError(error);
    if (parsedError) {
      const prettyError = new CustomError({
        name: parsedError.name,
        message: JSON.stringify(parsedError, null, 2),
        args: parsedError.args,
      });

      throw extendError(prettyError, {
        errorContext,
      });
    }

    throw extendError(error as ErrorLike, {
      errorContext,
    });
  }
}

export class SubaccountRemovalResultUnknownError extends Error {
  name = "SubaccountRemovalResultUnknownError";

  constructor(
    public taskId: string,
    public reason: unknown
  ) {
    super(`Could not confirm the remove subaccount relay task ${taskId}`);
  }
}

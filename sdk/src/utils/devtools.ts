import { IStorage } from "./storage";

export type IDevtools = {
  isDebugMode: boolean;
};

export class Devtools implements IDevtools {
  constructor(private storage: IStorage) {
    this.storage = storage;
  }

  get isDebugMode() {
    return true;
  }
}

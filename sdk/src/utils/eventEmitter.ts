export type IEventEmitter = {
  dispatchEvent: (event: string, data: any) => void;
  addEventListener: (event: string, callback: (data: any) => void) => void;
  removeEventListener: (event: string, callback: (data: any) => void) => void;
};

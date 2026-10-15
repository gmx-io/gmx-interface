import * as sdk from "@gmsol-labs/gmsol-sdk/index_bg.js";
import initWasm from "@gmsol-labs/gmsol-sdk/index_bg.wasm?init";

let initialization;

export function initialize() {
  if (!initialization) {
    initialization = initWasm({ "./index_bg.js": sdk }).then((instance) => {
      sdk.__wbg_set_wasm(instance.exports);
      instance.exports.__wbindgen_start();
      return sdk;
    });
  }

  return initialization;
}

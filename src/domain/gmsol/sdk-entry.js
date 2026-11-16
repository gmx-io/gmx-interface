import * as sdk from "@gmsol-labs/gmsol-sdk/index_bg.js";
import initWasm from "@gmsol-labs/gmsol-sdk/index_bg.wasm?init";

let initialization;

export function initialize() {
  if (!initialization) {
    initialization = initWasm({ "./index_bg.js": sdk })
      .catch((error) => {
        initialization = undefined;
        throw error;
      })
      .then((instance) => {
        // Binding/start failures may leave partial SDK state and must not be retried.
        sdk.__wbg_set_wasm(instance.exports);
        instance.exports.__wbindgen_start();
        return sdk;
      });
  }

  return initialization;
}

import { bigNumberify } from "../numbers";

export function deserialize(data) {
  for (const [key, value] of Object.entries(data)) {
    if (value._type === "BigNumber") {
      data[key] = bigNumberify(value.value);
    }
  }
  return data;
}

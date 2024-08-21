import { hashDataMap } from "./hashDataMap";

self.addEventListener("message", run);

async function run(event) {
  const { map, id } = event.data;

  const result = hashDataMap(map);

  postMessage({
    id,
    result,
  });
  return;
}

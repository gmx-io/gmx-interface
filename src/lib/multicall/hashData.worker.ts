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

// Typescript hack to make it seem this file exports a class
declare class HashDataWorker extends Worker {
  constructor();
}

export default HashDataWorker;

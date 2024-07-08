import { hashData } from "lib/hash";

self.addEventListener("message", run);

async function run(event) {
  const { map, id } = event.data;

  const result = {};
  for (const key of Object.keys(map)) {
    if (!map[key]) {
      continue;
    }

    const [dataTypes, dataValues] = map[key];

    try {
      result[key] = hashData(dataTypes, dataValues);
    } catch (error) {
      postMessage({ id, error });
      return;
    }
  }

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

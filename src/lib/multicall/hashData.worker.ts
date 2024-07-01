import { hashData } from "lib/hash";

self.addEventListener("message", run);

async function run(event) {
  const { type } = event.data;

  if (type === "single") {
    const { dataTypes, dataValues, id } = event.data;

    try {
      const result = hashData(dataTypes, dataValues);

      postMessage({
        id,
        result,
      });
      return;
    } catch (error) {
      postMessage({ id, error });
      return;
    }
  } else if (type === "map") {
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
}

declare class HashDataWorker extends Worker {
  constructor();
}

export default HashDataWorker;

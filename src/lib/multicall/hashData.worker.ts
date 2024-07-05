import { hashData } from "lib/hash";

self.addEventListener("message", run);

const keytime = {};

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
    performance.mark("hashData-worker-map-start");
    const start = Date.now();
    const { map, id, key } = event.data;

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
    const end = Date.now();
    keytime[key] ||= 0;
    keytime[key] += end - start;
    console.log(`hashData-worker-map-${key}-`, keytime[key], "ms");
    performance.mark("hashData-worker-map-end");
    performance.measure("hashData-worker-map", "hashData-worker-map-start", "hashData-worker-map-end");

    return;
  }
}

declare class HashDataWorker extends Worker {
  constructor();
}

export default HashDataWorker;

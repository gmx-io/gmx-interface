import core from '@actions/core';
import pinataSDK from "@pinata/sdk";

const API_KEY = core.getInput('API_KEY');
const API_SECRET = core.getInput('API_SECRET');
const PIN_NAME = core.getInput('PIN_NAME');
const PATH = core.getInput('PATH');

if (!API_KEY) throw new Error('API_KEY is required');
if (!API_SECRET) throw new Error('API_SECRET is required');
if (!PIN_NAME) throw new Error('PIN_NAME is required');
if (!PATH) throw new Error('PATH is required');

main();

async function main() {
  const cid = await uploadToPinata(PATH);

  core.setOutput('hash', cid);
}

async function uploadToPinata(path) {
  const pinata = pinataSDK(API_KEY, API_SECRET);

  console.log("Upload to Pinata");

  await pinata.testAuthentication();

  console.log("Auth successful");

  const previousPins = await pinata.pinList({
    metadata: { name: PIN_NAME },
    status: "pinned",
  });

  if (previousPins.rows.length) {
    console.log(`Found previous pins: ${previousPins.rows.map((r) => r.ipfs_pin_hash).join(", ")}`);
  }

  console.log("Uploading assets");

  const pinResult = await pinata.pinFromFS(path, {
    pinataMetadata: {
      name: PIN_NAME,
    },
    pinataOptions: {
      customPinPolicy: {
        regions: [
          {
            id: "FRA1",
            desiredReplicationCount: 2,
          },
          {
            id: "NYC1",
            desiredReplicationCount: 2,
          },
        ],
      },
      cidVersion: 1,
    },
  });

  console.log(`Uploaded: ${pinResult.IpfsHash}`);

  const pinsToClean = previousPins.rows.filter((row) => row.ipfs_pin_hash !== pinResult.IpfsHash);

  if (pinsToClean.length) {
    console.log(`Cleaning up the previous pins`);

    for (let pin of previousPins.rows) {
      try {
        await pinata.unpin(pin.ipfs_pin_hash);
        console.log(`${pin.ipfs_pin_hash} - deleted`);
      } catch (e) {
        console.log(`Failed to unpin ${pin.ipfs_pin_hash}`);
        console.error(e);
      }
    }
  }

  return pinResult.IpfsHash;
}

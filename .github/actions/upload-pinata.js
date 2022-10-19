const pinataSDK = require("@pinata/sdk");
const core = require('@actions/core');

try {
    const PINATA_API_KEY = core.getInput('PINATA_API_KEY');
    const PINATA_API_SECRET = core.getInput('PINATA_API_SECRET');
    const PINATA_PIN_ALIAS = core.getInput('PINATA_PIN_ALIAS');
    const BUILD_PATH = core.getInput('BUILD_PATH');

    if (!PINATA_API_KEY) core.setFailed('PINATA_API_KEY is missing')
    if (!PINATA_API_SECRET) core.setFailed('PINATA_API_SECRET is missing')
    if (!PINATA_PIN_ALIAS) core.setFailed('PINATA_PIN_ALIAS is missing')
    if (!BUILD_PATH) core.setFailed('BUILD_PATH is missing')

    const ipfsHash = await uploadToPinata(PINATA_API_KEY, PINATA_API_SECRET, BUILD_PATH, PINATA_PIN_ALIAS)

    core.setOutput('IPFS_HASH', ipfsHash);
} catch (error) {
    core.setFailed(error.message);
}

async function uploadToPinata(apiKey, secretKey, path, name) {
    const pinata = pinataSDK(apiKey, secretKey);
  
    console.log("Upload to Pinata");
  
    await pinata.testAuthentication();
  
    console.log("Auth successful");
  
    const previousPins = await pinata.pinList({
      metadata: { name },
      status: "pinned",
    });
  
    if (previousPins.rows.length) {
      console.log(`Found previous pins: ${previousPins.rows.map((r) => r.ipfs_pin_hash).join(", ")}`);
    }
  
    console.log("Uploading assets");
  
    const pinResult = await pinata.pinFromFS(path, {
      pinataMetadata: { name },
      pinataOptions: {
        customPinPolicy: {
          regions: [
            {
              id: "FRA1",
              desiredReplicationCount: 1,
            },
            {
              id: "NYC1",
              desiredReplicationCount: 1,
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
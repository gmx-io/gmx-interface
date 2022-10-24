import dotenv from "dotenv";
import pinataSDK from "@pinata/sdk";
import fetch from "node-fetch";
import envalid, { str } from "envalid";

const NETIFLY_API_URL = "https://api.netlify.com/api/v1";

// For local testing
dotenv.config({ path: ".env.deploy" });

const env = envalid.cleanEnv(process.env, {
  PINATA_API_KEY: str(),
  PINATA_API_SECRET: str(),
  PINATA_PIN_ALIAS: str(),

  NETIFLY_API_KEY: str(),
  NETIFLY_DNS_ZONE_ID: str(),
  NETIFLY_DNS_LINK: str(),
});

main();

async function main() {
  const cid = await uploadToPinata("./build");

  await waitForCloudflareIpfs(cid);

  await updateDnslinkNetifly(cid);

  process.exit(0);
}

async function uploadToPinata(path) {
  const pinata = pinataSDK(env.PINATA_API_KEY, env.PINATA_API_SECRET);

  console.log("Upload to Pinata");

  await pinata.testAuthentication();

  console.log("Auth successful");

  const previousPins = await pinata.pinList({
    metadata: { name: env.PINATA_PIN_ALIAS },
    status: "pinned",
  });

  if (previousPins.rows.length) {
    console.log(`Found previous pins: ${previousPins.rows.map((r) => r.ipfs_pin_hash).join(", ")}`);
  }

  console.log("Uploading assets");

  const pinResult = await pinata.pinFromFS(path, {
    pinataMetadata: {
      name: env.PINATA_PIN_ALIAS,
    },
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

async function updateDnslinkNetifly(cid) {
  if (!cid) {
    throw new Error("No CID provided");
  }

  const dnslink = `dnslink=/ipfs/${cid}`;

  console.log(`Updating dnslink to ${dnslink}`);

  console.log("Retrieving an old dnslink record");
  const records = await requestNetifly(`/dns_zones/${env.NETIFLY_DNS_ZONE_ID}/dns_records`);

  const oldDnsLinkRecord = (records || []).find(
    (record) => record.type === "TXT" && record.hostname === env.NETIFLY_DNS_LINK
  );

  if (oldDnsLinkRecord) {
    console.log(`Found previous dnslink ${oldDnsLinkRecord.value}`);
  }

  if (oldDnsLinkRecord?.value === dnslink) {
    console.log(`Target dnslink is already set`);
    return;
  }

  console.log("Create a new DNS record");
  const newRecord = await requestNetifly(`/dns_zones/${env.NETIFLY_DNS_ZONE_ID}/dns_records`, {
    method: "POST",
    body: JSON.stringify({
      type: "TXT",
      hostname: env.NETIFLY_DNS_LINK,
      value: dnslink,
      ttl: 300,
    }),
  });

  console.log("dnslink result", newRecord);

  if (oldDnsLinkRecord) {
    console.log("Delete the old dnslink record");
    await requestNetifly(`/dns_zones/${env.NETIFLY_DNS_ZONE_ID}/dns_records/${oldDnsLinkRecord.id}`, {
      method: "DELETE",
    });

    console.log("Deleted");
  }
}

async function waitForCloudflareIpfs(cid) {
  if (!cid) {
    throw new Error("No CID provided");
  }

  const url = `https://${cid}.ipfs.cf-ipfs.com/`;

  console.log(`Waiting the CID to be resolved on Cloudflare: ${url}`);

  let retries = 10;
  let resolved = false;

  while (retries > 0) {
    console.log(`Attempt to resolve the CID, remaining retries: ${retries}`);

    await sleep(5000);

    const res = await fetch(url);

    if (res?.ok) {
      resolved = true;
      break;
    } else {
      retries--;
    }
  }

  if (!resolved) {
    throw new Error("Failed to resolve CID on IPFS gateway");
  }
}

async function requestNetifly(path, opts) {
  const res = await fetch(`${NETIFLY_API_URL}${path}`, {
    headers: {
      Authorization: `Bearer ${env.NETIFLY_API_KEY}`,
      "Content-Type": "application/json",
    },
    ...opts,
  });

  if (res.ok) {
    return res.json().catch(() => null);
  } else {
    throw new Error(`Netifly error: ${await res.text()}`);
  }
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

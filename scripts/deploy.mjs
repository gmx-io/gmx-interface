import dotenv from "dotenv";
import pinataSDK from "@pinata/sdk";
import fetch from "node-fetch";
import envalid, { str } from "envalid";

const NETLIFY_API_URL = "https://api.netlify.com/api/v1";

// For local testing
dotenv.config({ path: ".env.deploy" });

const env = envalid.cleanEnv(process.env, {
  FLEEK_API_KEY: str(),
  FLEEK_SITE_ID: str(),

  NETLIFY_API_KEY: str(),
  NETLIFY_DNS_ZONE_ID: str(),
  NETLIFY_DNS_LINK: str(),
});

main();

async function main() {
  const cid = await getFleekIpfsHash();

  await waitForCloudflareIpfs(cid);

  await updateDnslinkNetlify(cid);

  process.exit(0);
}

async function getFleekIpfsHash() {
  let ipfsHash;

  console.log("Waiting for fleek build");

  await sleep(10000);

  while (!ipfsHash) {
    const result = await fetch("https://api.fleek.co/graphql", {
      method: "POST",
      headers: {
        Authorization: env.FLEEK_API_KEY,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        query: `{ getSiteById(siteId: "${env.FLEEK_SITE_ID}") { latestDeploy { status ipfsHash } } }`,
      }),
    });

    const {
      data: {
        getSiteById: { latestDeploy },
      },
    } = await result.json();

    console.log("Fleek deploy info", latestDeploy);

    if (latestDeploy.status === "DEPLOYED") {
      ipfsHash = latestDeploy.ipfsHash;
    } else {
      await sleep(5000);
    }
  }

  return ipfsHash;
}

async function updateDnslinkNetlify(cid) {
  if (!cid) {
    throw new Error("No CID provided");
  }

  const dnslink = `dnslink=/ipfs/${cid}`;

  console.log(`Updating dnslink to ${dnslink}`);

  console.log("Retrieving an old dnslink record");
  const records = await requestNetlify(`/dns_zones/${env.NETLIFY_DNS_ZONE_ID}/dns_records`);

  const oldDnsLinkRecord = (records || []).find(
    (record) => record.type === "TXT" && record.hostname === env.NETLIFY_DNS_LINK
  );

  if (oldDnsLinkRecord) {
    console.log(`Found previous dnslink ${oldDnsLinkRecord.value}`);
  }

  if (oldDnsLinkRecord?.value === dnslink) {
    console.log(`Target dnslink is already set`);
    return;
  }

  console.log("Create a new DNS record");
  const newRecord = await requestNetlify(`/dns_zones/${env.NETLIFY_DNS_ZONE_ID}/dns_records`, {
    method: "POST",
    body: JSON.stringify({
      type: "TXT",
      hostname: env.NETLIFY_DNS_LINK,
      value: dnslink,
      ttl: 300,
    }),
  });

  console.log("dnslink result", newRecord);

  if (oldDnsLinkRecord) {
    console.log("Delete the old dnslink record");
    await requestNetlify(`/dns_zones/${env.NETLIFY_DNS_ZONE_ID}/dns_records/${oldDnsLinkRecord.id}`, {
      method: "DELETE",
    });

    console.log("Deleted");
  }
}

async function waitForCloudflareIpfs(cid) {
  if (!cid) {
    throw new Error("No CID provided");
  }

  const url = `https://cloudflare-ipfs.com/ipfs/${cid}`;

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

async function requestNetlify(path, opts) {
  const res = await fetch(`${NETLIFY_API_URL}${path}`, {
    headers: {
      Authorization: `Bearer ${env.NETLIFY_API_KEY}`,
      "Content-Type": "application/json",
    },
    ...opts,
  });

  if (res.ok) {
    return res.json().catch(() => null);
  } else {
    throw new Error(`Netlify error: ${await res.text()}`);
  }
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

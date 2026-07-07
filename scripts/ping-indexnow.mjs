#!/usr/bin/env node
/**
 * Ping Bing/Yandex IndexNow after deploy so new URLs get crawled fast.
 * Usage: node scripts/ping-indexnow.mjs
 */
const HOST = "opensourcebarware.com";
const KEY = "osb-indexnow-2026-opensourcebarware";
const KEY_LOCATION = `https://${HOST}/indexnow-key.txt`;

const URLS = [
  `https://${HOST}/`,
  `https://${HOST}/download`,
  `https://${HOST}/free-bar-inventory-software`,
  `https://${HOST}/liquor-inventory`,
  `https://${HOST}/wine-inventory`,
  `https://${HOST}/the-process`,
  `https://${HOST}/about`,
  `https://${HOST}/manifesto`,
  `https://${HOST}/resources`,
  `https://${HOST}/downloads`,
  `https://${HOST}/open-source-compliance`,
  `https://${HOST}/llms.txt`,
];

const payload = {
  host: HOST,
  key: KEY,
  keyLocation: KEY_LOCATION,
  urlList: URLS,
};

const endpoints = [
  "https://api.indexnow.org/indexnow",
  "https://www.bing.com/indexnow",
];

for (const endpoint of endpoints) {
  const res = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json; charset=utf-8" },
    body: JSON.stringify(payload),
  });
  console.log(`${endpoint} → ${res.status} ${res.statusText}`);
}
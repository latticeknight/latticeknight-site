import assert from "node:assert/strict";
import { setTimeout as delay } from "node:timers/promises";

const origin = "https://www.eduardoneto.com";
const locales = { en: "en-GB", pt: "pt-PT" };

async function checkPage(path, lang) {
  const response = await fetch(origin + path, {
    redirect: "error",
    signal: AbortSignal.timeout(10_000),
  });
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/);
  assert.ok(response.headers.get("content-security-policy"), "Missing CSP");
  assert.ok(response.headers.get("strict-transport-security"), "Missing HSTS");

  const body = await response.text();
  assert.ok(body.includes(`lang="${lang}"`), `Missing language ${lang}`);
  assert.ok(body.includes(`rel="canonical" href="${origin + path}"`), "Missing canonical link");
}

async function checkText(path, expected, contentType) {
  const response = await fetch(origin + path, {
    redirect: "error",
    signal: AbortSignal.timeout(10_000),
  });
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", contentType);
  const body = await response.text();
  for (const marker of expected) {
    assert.ok(body.includes(marker), `Missing ${marker}`);
  }
}

const checks = [
  ...Object.entries(locales).flatMap(([locale, lang]) =>
    [`/${locale}`, `/${locale}/about`].map((path) => [path, () => checkPage(path, lang)]),
  ),
  ["/robots.txt", () => checkText("/robots.txt", [`Sitemap: ${origin}/sitemap.xml`], /^text\/plain\b/)],
  ["/sitemap.xml", () => checkText(
    "/sitemap.xml",
    Object.keys(locales).map((locale) => `<loc>${origin}/${locale}</loc>`),
    /^(?:application|text)\/xml\b/,
  )],
];

const results = await Promise.allSettled(checks.map(async ([path, check]) => {
  try {
    await check();
  } catch {
    await delay(2_000);
    await check();
  }
  console.log(`OK ${path}`);
}));

for (const [index, result] of results.entries()) {
  if (result.status === "rejected") {
    console.error(`Failed ${checks[index][0]}: ${result.reason.message}`);
    process.exitCode = 1;
  }
}

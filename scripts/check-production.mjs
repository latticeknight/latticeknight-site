import assert from "node:assert/strict";
import { setTimeout as delay } from "node:timers/promises";

import { hrefFor, locales, pageSlugs } from "../src/lib/site.ts";

const origin = "https://www.eduardoneto.com";
const localeChecks = {
  en: {
    lang: "en-GB",
    h1: {
      home: "Software engineering is changing. The difficult part is no longer generating code. It is designing the system around the agents.",
      about: "Eduardo Neto - From Hospitality to Software Systems",
    },
  },
  pt: {
    lang: "pt-PT",
    h1: {
      home: "A engenharia de software está a mudar. A parte difícil já não é gerar código. É desenhar o sistema à volta dos agentes.",
      about: "Eduardo Neto - Da Hotelaria aos Sistemas de Software",
    },
  },
};

const requiredSecurityHeaders = [
  ["content-security-policy"],
  ["strict-transport-security"],
  ["cross-origin-opener-policy", "same-origin"],
  ["permissions-policy", "camera=(), microphone=(), geolocation=(), payment=(), usb=()"],
  ["referrer-policy", "strict-origin-when-cross-origin"],
  ["x-content-type-options", "nosniff"],
  ["x-frame-options", "deny"],
];

function normaliseHeading(html) {
  return html
    .replace(/<[^>]+>/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

function renderedH1(body, path) {
  const match = body.match(/<h1\b[^>]*>([\s\S]*?)<\/h1>/i);
  assert.ok(match, `Missing H1 on ${path}`);
  return normaliseHeading(match[1]);
}

function checkSecurityHeaders(headers) {
  for (const [name, expected] of requiredSecurityHeaders) {
    const value = headers.get(name);
    assert.ok(value, `Missing ${name}`);
    if (expected) {
      assert.equal(value.trim().toLowerCase(), expected, `Unexpected ${name}`);
    }
  }
}

async function checkPage(path, locale, slug) {
  const response = await fetch(origin + path, {
    redirect: "error",
    signal: AbortSignal.timeout(10_000),
  });
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/);
  checkSecurityHeaders(response.headers);

  const body = await response.text();
  assert.ok(body.includes(`lang="${localeChecks[locale].lang}"`), `Missing language ${localeChecks[locale].lang}`);
  assert.ok(body.includes(`rel="canonical" href="${origin + path}"`), "Missing canonical link");
  assert.equal(renderedH1(body, path), localeChecks[locale].h1[slug], `Unexpected H1 on ${path}`);
}

async function fetchText(path, contentType) {
  const response = await fetch(origin + path, {
    redirect: "error",
    signal: AbortSignal.timeout(10_000),
  });
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", contentType);
  return response.text();
}

async function checkRobots() {
  const body = await fetchText("/robots.txt", /^text\/plain\b/);
  const lines = body.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  assert.ok(lines.some((line) => /^user-agent:\s*\*$/i.test(line)), "Missing allow-all user-agent rule");
  assert.ok(lines.some((line) => /^allow:\s*\/$/i.test(line)), "Missing allow-all crawler rule");
  assert.ok(!lines.some((line) => /^disallow:\s*\/(?:\s+#.*)?$/i.test(line)), "Found blanket disallow rule");
  assert.ok(lines.includes(`Sitemap: ${origin}/sitemap.xml`), "Missing sitemap URL");
}

async function checkSitemap() {
  const body = await fetchText("/sitemap.xml", /^(?:application|text)\/xml\b/);
  const actual = [...body.matchAll(/<loc>\s*([^<]+?)\s*<\/loc>/gi)].map(([, url]) => url);
  const expected = locales.flatMap((locale) => pageSlugs.map((slug) => `${origin}${hrefFor(locale, slug)}`));
  assert.equal(actual.length, expected.length, "Unexpected sitemap route count");
  assert.deepEqual([...new Set(actual)].sort(), [...new Set(expected)].sort(), "Sitemap route set mismatch");
}

const checks = [
  ...locales.flatMap((locale) =>
    ["home", "about"].map((slug) => {
      const path = hrefFor(locale, slug);
      return [path, () => checkPage(path, locale, slug)];
    }),
  ),
  ["/robots.txt", checkRobots],
  ["/sitemap.xml", checkSitemap],
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

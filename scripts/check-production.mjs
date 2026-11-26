import assert from "node:assert/strict";
import { spawn } from "node:child_process";
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
  ["strict-transport-security"],
  ["cross-origin-opener-policy", "same-origin"],
  ["permissions-policy", "camera=(), microphone=(), geolocation=(), payment=(), usb=()"],
  ["referrer-policy", "strict-origin-when-cross-origin"],
  ["x-content-type-options", "nosniff"],
  ["x-frame-options", "deny"],
];
const requiredCspDirectives = [
  ["default-src", "'self'"],
  ["object-src", "'none'"],
  ["frame-ancestors", "'none'"],
];
const sitemapParser = `
import json
import sys
import xml.etree.ElementTree as ET

def local_name(tag):
    return tag.rsplit("}", 1)[-1]

try:
    root = ET.fromstring(sys.stdin.buffer.read())
except ET.ParseError as error:
    print(f"Invalid sitemap XML: {error}", file=sys.stderr)
    raise SystemExit(1)

if local_name(root.tag) != "urlset":
    print("Sitemap root must be urlset", file=sys.stderr)
    raise SystemExit(1)

locations = []
for url_element in root:
    if local_name(url_element.tag) != "url":
        print("Sitemap urlset contains a non-url element", file=sys.stderr)
        raise SystemExit(1)
    loc_elements = [child for child in url_element if local_name(child.tag) == "loc"]
    if len(loc_elements) != 1 or not (loc_elements[0].text or "").strip():
        print("Sitemap url entry must contain one non-empty loc element", file=sys.stderr)
        raise SystemExit(1)
    locations.append(loc_elements[0].text.strip())

print(json.dumps(locations))
`;

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

function checkContentSecurityPolicy(value) {
  const directives = new Map();
  for (const directive of value.split(";")) {
    const tokens = directive.trim().split(/\s+/);
    if (!tokens[0]) continue;
    const name = tokens[0].toLowerCase();
    const sources = tokens.slice(1).map((token) => token.toLowerCase());
    directives.set(name, [...(directives.get(name) ?? []), sources]);
  }

  for (const [name, source] of requiredCspDirectives) {
    const matches = directives.get(name) ?? [];
    assert.ok(matches.some((sources) => sources.includes(source)), `Missing CSP ${name} ${source}`);
  }
}

function checkSecurityHeaders(headers) {
  for (const [name, expected] of requiredSecurityHeaders) {
    const value = headers.get(name);
    assert.ok(value, `Missing ${name}`);
    if (expected) {
      assert.equal(value.trim().toLowerCase(), expected, `Unexpected ${name}`);
    }
  }
  const contentSecurityPolicy = headers.get("content-security-policy");
  assert.ok(contentSecurityPolicy, "Missing content-security-policy");
  checkContentSecurityPolicy(contentSecurityPolicy);
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

function parseRobotsGroups(body) {
  const groups = [];
  let current;

  for (const rawLine of body.split(/\r?\n/)) {
    const withoutComment = rawLine.split("#", 1)[0].trim();
    if (!withoutComment) continue;

    const separator = withoutComment.indexOf(":");
    if (separator < 1) continue;

    const name = withoutComment.slice(0, separator).trim().toLowerCase();
    const value = withoutComment.slice(separator + 1).trim().toLowerCase();
    if (name === "user-agent") {
      if (!current || current.directives.length > 0) {
        current = { userAgents: [], directives: [] };
        groups.push(current);
      }
      current.userAgents.push(value);
    } else if (current) {
      current.directives.push([name, value]);
    }
  }

  return groups;
}

async function checkRobots() {
  const body = await fetchText("/robots.txt", /^text\/plain\b/);
  const wildcardGroup = parseRobotsGroups(body).find((group) => group.userAgents.includes("*"));
  assert.ok(wildcardGroup, "Missing allow-all user-agent rule");
  assert.ok(
    wildcardGroup.directives.some(([name, value]) => name === "allow" && value === "/"),
    "Missing allow-all crawler rule",
  );
  assert.ok(
    !wildcardGroup.directives.some(([name, value]) => name === "disallow" && value === "/"),
    "Found blanket disallow rule",
  );
  assert.ok(body.includes(`Sitemap: ${origin}/sitemap.xml`), "Missing sitemap URL");
}

async function parseSitemap(body) {
  return new Promise((resolve, reject) => {
    const parser = spawn("python3", ["-c", sitemapParser], {
      signal: AbortSignal.timeout(5_000),
    });
    let output = "";
    let errorOutput = "";
    let settled = false;

    parser.stdout.setEncoding("utf8");
    parser.stderr.setEncoding("utf8");
    parser.stdout.on("data", (chunk) => {
      output += chunk;
    });
    parser.stderr.on("data", (chunk) => {
      errorOutput += chunk;
    });
    parser.on("error", (error) => {
      if (!settled) {
        settled = true;
        reject(error);
      }
    });
    parser.on("close", (code) => {
      if (settled) return;
      settled = true;
      if (code !== 0) {
        reject(new Error(errorOutput.trim() || `Sitemap parser exited with code ${code}`));
        return;
      }
      try {
        resolve(JSON.parse(output));
      } catch (error) {
        reject(new Error(`Sitemap parser returned invalid JSON: ${error.message}`));
      }
    });
    parser.stdin.end(body);
  });
}

async function checkSitemap() {
  const body = await fetchText("/sitemap.xml", /^(?:application|text)\/xml\b/);
  const actual = await parseSitemap(body);
  const expected = locales.flatMap((locale) => pageSlugs.map((slug) => `${origin}${hrefFor(locale, slug)}`));
  const actualSet = new Set(actual);
  assert.equal(actualSet.size, actual.length, "Sitemap contains duplicate URLs");
  for (const url of actual) {
    let parsed;
    try {
      parsed = new URL(url);
    } catch {
      assert.fail(`Invalid sitemap URL: ${url}`);
    }
    assert.equal(parsed.origin, origin, `Sitemap URL is off-domain: ${url}`);
  }
  for (const url of expected) {
    assert.ok(actualSet.has(url), `Missing sitemap URL: ${url}`);
  }
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

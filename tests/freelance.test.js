import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { JSDOM } from "jsdom";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const html = readFileSync(join(ROOT, "freelance.html"), "utf-8");
const document = new JSDOM(html).window.document;
const css =
  readFileSync(join(ROOT, "styles.css"), "utf-8") +
  readFileSync(join(ROOT, "freelance.css"), "utf-8");

test("every class used in freelance.html has a CSS rule", () => {
  const classes = new Set();
  document.querySelectorAll("[class]").forEach((el) => el.classList.forEach((c) => classes.add(c)));
  const missing = [...classes].filter((c) => !css.includes(`.${c}`));
  assert.deepEqual(missing, [], `classes missing CSS rules: ${missing.join(", ")}`);
});

test("freelance page has the five sections in order", () => {
  const ids = [...document.querySelectorAll("header.fl-header, section[id]")].map((el) => el.id || "header");
  assert.deepEqual(ids, ["header", "build", "process", "work", "contact"]);
});

test("nav anchors point at existing sections", () => {
  document.querySelectorAll('.site-nav a[href^="#"]').forEach((a) => {
    assert.ok(document.querySelector(a.getAttribute("href")), `missing target ${a.getAttribute("href")}`);
  });
});

test("how I work has four numbered steps", () => {
  assert.equal(document.querySelectorAll(".fl-steps .fl-step").length, 4);
});

test("each case study links to its live demo in a new tab and has a local screenshot", () => {
  const cases = document.querySelectorAll(".fl-case");
  assert.equal(cases.length, 2);
  cases.forEach((c) => {
    const img = c.querySelector(".fl-case-shot img");
    assert.ok(img.getAttribute("alt"), "screenshot needs alt text");
    readFileSync(join(ROOT, img.getAttribute("src")));
    c.querySelectorAll('a[href^="https://"]').forEach((a) => {
      assert.equal(a.getAttribute("target"), "_blank");
      assert.match(a.getAttribute("rel"), /noopener/);
    });
  });
});

test("contact band shows the rate and a mailto link", () => {
  const cta = document.querySelector("#contact");
  assert.match(cta.textContent, /₪250\/hour/);
  assert.ok(cta.querySelector('a[href^="mailto:pcimring@gmail.com"]'));
});

test("page does not link to the home page", () => {
  assert.equal(document.querySelector('a[href="index.html"], a[href="/"]'), null);
});

test("header background image exists", () => {
  const m = css.match(/\.fl-header \{[^}]*url\("([^"]+)"\)/);
  assert.ok(m, "fl-header needs a background image");
  readFileSync(join(ROOT, m[1]));
});

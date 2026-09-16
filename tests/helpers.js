import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { JSDOM } from "jsdom";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");

export function loadDocument() {
  const html = readFileSync(join(ROOT, "index.html"), "utf-8");
  return new JSDOM(html).window.document;
}

export function loadCss() {
  return readFileSync(join(ROOT, "styles.css"), "utf-8");
}

export function loadHtml() {
  return readFileSync(join(ROOT, "index.html"), "utf-8");
}

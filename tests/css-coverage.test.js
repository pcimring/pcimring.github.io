import test from "node:test";
import assert from "node:assert/strict";
import { loadDocument, loadCss } from "./helpers.js";

test("every class used in index.html has a matching rule in styles.css", () => {
  const document = loadDocument();
  const css = loadCss();

  const classNames = new Set();
  document.querySelectorAll("[class]").forEach((el) => {
    el.classList.forEach((cls) => classNames.add(cls));
  });

  assert.ok(classNames.size > 0, "expected at least one class in index.html");

  const missing = [...classNames].filter((cls) => !css.includes(`.${cls}`));
  assert.deepEqual(missing, [], `classes missing CSS rules: ${missing.join(", ")}`);
});

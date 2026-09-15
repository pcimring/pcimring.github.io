import test from "node:test";
import assert from "node:assert/strict";
import { loadDocument } from "./helpers.js";

test("page title identifies Peter Cimring", () => {
  const document = loadDocument();
  assert.match(document.title, /Peter Cimring/);
});

test("nav has 4 links with the expected labels and anchor targets", () => {
  const document = loadDocument();
  const links = [...document.querySelectorAll(".site-nav a")];
  assert.equal(links.length, 4, "expected 4 nav links");

  const expected = [
    ["Home", "#bio"],
    ["AI Orchestration & BPMN", "#orchestration"],
    ["Agentic Frameworks", "#agentic-frameworks"],
    ["AI Engineering", "#ai-engineering"],
  ];

  expected.forEach(([text, href], i) => {
    assert.equal(links[i].textContent.trim(), text);
    assert.equal(links[i].getAttribute("href"), href);
  });
});

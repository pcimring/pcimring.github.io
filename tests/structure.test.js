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

test("bio section has the approved headline and bio text", () => {
  const document = loadDocument();
  const section = document.getElementById("bio");
  assert.ok(section, "expected section#bio to exist");

  assert.equal(section.querySelector("h1").textContent.trim(), "Peter Cimring");
  assert.equal(
    section.querySelector(".hero-title").textContent.trim(),
    "Technical Writer · Content Engineer"
  );
  assert.match(section.querySelector(".hero-bio").textContent, /developers\.taboola\.com/);
  assert.equal(
    section.querySelector(".hero-photo").getAttribute("src"),
    "assets/photo-placeholder.svg"
  );
});

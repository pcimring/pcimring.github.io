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

test("AI Orchestration & BPMN has 3 live cards with working links", () => {
  const document = loadDocument();
  const section = document.getElementById("orchestration");
  assert.ok(section, "expected section#orchestration to exist");
  assert.equal(
    section.querySelector("h2").textContent.trim(),
    "AI Orchestration & BPMN"
  );

  const cards = [...section.querySelectorAll(".card")];
  assert.equal(cards.length, 3);

  cards.forEach((card) => {
    assert.equal(card.querySelector(".card-status").textContent.trim(), "Live");
    const link = card.querySelector(".card-link");
    assert.ok(link, "every card in this category should have a link");
    assert.match(link.getAttribute("href"), /^https:\/\//);
  });

  const titles = cards.map((c) => c.querySelector(".card-title").textContent.trim());
  assert.deepEqual(titles, [
    "Doc-Feedback Triage — Live Demo",
    "Doc-Feedback Triage — Source",
    "Camunda Docs — Merged Contribution",
  ]);
});

test("Agentic Frameworks has 2 cards: one live, one in progress with no link", () => {
  const document = loadDocument();
  const section = document.getElementById("agentic-frameworks");
  assert.ok(section, "expected section#agentic-frameworks to exist");
  assert.equal(section.querySelector("h2").textContent.trim(), "Agentic Frameworks");

  const cards = [...section.querySelectorAll(".card")];
  assert.equal(cards.length, 2);

  const statuses = cards
    .map((c) => c.querySelector(".card-status").textContent.trim())
    .sort();
  assert.deepEqual(statuses, ["In Progress", "Live"]);

  const inProgress = cards.find(
    (c) => c.querySelector(".card-status").textContent.trim() === "In Progress"
  );
  assert.equal(inProgress.querySelector(".card-link"), null,
    "in-progress card should not link anywhere yet");

  const live = cards.find(
    (c) => c.querySelector(".card-status").textContent.trim() === "Live"
  );
  assert.match(live.querySelector(".card-link").getAttribute("href"), /^https:\/\/github\.com/);
});

test("AI Engineering section exists with no cards yet, just a placeholder note", () => {
  const document = loadDocument();
  const section = document.getElementById("ai-engineering");
  assert.ok(section, "expected section#ai-engineering to exist");
  assert.equal(section.querySelector("h2").textContent.trim(), "AI Engineering");
  assert.equal(section.querySelectorAll(".card").length, 0);
  assert.match(
    section.querySelector(".category-placeholder").textContent,
    /coming soon/i
  );
});

test("every nav link resolves to an existing section id", () => {
  const document = loadDocument();
  const links = [...document.querySelectorAll(".site-nav a")];
  for (const link of links) {
    const targetId = link.getAttribute("href").slice(1);
    assert.ok(
      document.getElementById(targetId),
      `no element with id="${targetId}" for nav link "${link.textContent.trim()}"`
    );
  }
});

test("page declares a favicon", () => {
  const document = loadDocument();
  const icon = document.querySelector('link[rel="icon"]');
  assert.ok(icon, "expected a <link rel=\"icon\"> in <head>");
  assert.equal(icon.getAttribute("href"), "assets/photo-placeholder.svg");
});

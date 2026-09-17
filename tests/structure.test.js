import test from "node:test";
import assert from "node:assert/strict";
import { loadDocument, loadHtml } from "./helpers.js";

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

test("bio section has a full-width header (name, tags) and a photo+LinkedIn / intro+projects row", () => {
  const document = loadDocument();
  const section = document.getElementById("bio");
  assert.ok(section, "expected section#bio to exist");

  const header = section.querySelector(".hero-header");
  assert.ok(header, "expected .hero-header to exist");
  assert.equal(header.querySelector("h1").textContent.trim(), "Peter Cimring");

  const specialties = [...header.querySelectorAll(".pill-row .pill")].map((p) =>
    p.textContent.trim()
  );
  assert.deepEqual(specialties, [
    "Documentation Engineering",
    "Developer Experience (DX)",
    "Workflow & System Optimization",
    "Customer Support Management",
    "Pre/Post-Sales",
  ]);

  const body = section.querySelector(".hero-body");
  assert.ok(body, "expected .hero-body to exist");
  assert.equal(
    body.querySelector(".hero-photo").getAttribute("src"),
    "assets/photo-peter.jpg"
  );

  const linkedin = body.querySelector(".hero-photo-wrap .hero-linkedin");
  assert.ok(linkedin, "expected a LinkedIn link beneath the photo");
  assert.equal(linkedin.getAttribute("target"), "_blank");
  assert.match(linkedin.getAttribute("rel"), /noopener/);

  const content = body.querySelector(".hero-content");
  assert.ok(content, "expected .hero-content to exist");
  assert.match(content.textContent, /documentation engineer/i);
  assert.doesNotMatch(content.textContent, /taboola/i);

  const projects = [...content.querySelectorAll(".project-list li")].map((li) =>
    li.textContent.trim()
  );
  assert.deepEqual(projects, [
    "Workflow orchestration",
    "Agentic framework development",
    "Natural-language interfaces",
    "Open-source docs contributions (LangChain, Camunda)",
  ]);
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
    "Doc Feedback Triage - Live Demo",
    "Doc Feedback Triage - Source",
    "Camunda Docs - Merged Contribution",
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

test("AI Engineering has 2 live cards with working links", () => {
  const document = loadDocument();
  const section = document.getElementById("ai-engineering");
  assert.ok(section, "expected section#ai-engineering to exist");
  assert.equal(section.querySelector("h2").textContent.trim(), "AI Engineering");

  const cards = [...section.querySelectorAll(".card")];
  assert.equal(cards.length, 2);

  cards.forEach((card) => {
    assert.equal(card.querySelector(".card-status").textContent.trim(), "Live");
    const link = card.querySelector(".card-link");
    assert.ok(link, "every card in this category should have a link");
    assert.match(link.getAttribute("href"), /^https:\/\//);
  });

  const titles = cards.map((c) => c.querySelector(".card-title").textContent.trim());
  assert.deepEqual(titles, [
    "AI Payment Scheduling - Live Demo",
    "AI Payment Scheduling - Source",
  ]);
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

test("page source contains no em dashes", () => {
  const html = loadHtml();
  assert.doesNotMatch(
    html,
    /—/,
    "found an em dash (—) in index.html, use a hyphen, comma, or restructure the sentence instead"
  );
});

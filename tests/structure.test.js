import test from "node:test";
import assert from "node:assert/strict";
import { loadDocument, loadHtml } from "./helpers.js";

const linkLabels = (card) => [...card.querySelectorAll("a.card-link")].map((a) => a.textContent.trim());

test("page title identifies Peter Cimring", () => {
  const document = loadDocument();
  assert.match(document.title, /Peter Cimring/);
});

test("nav has 5 links with the expected labels and anchor targets", () => {
  const document = loadDocument();
  const links = [...document.querySelectorAll(".site-nav a")];
  assert.equal(links.length, 5, "expected 5 nav links");

  const expected = [
    ["Home", "#bio"],
    ["AI Engineering", "#ai-engineering"],
    ["AI Orchestration & BPMN", "#orchestration"],
    ["Agentic Frameworks", "#agentic-frameworks"],
    ["Get in touch", "#contact"],
  ];

  expected.forEach(([text, href], i) => {
    assert.equal(links[i].textContent.trim(), text);
    assert.equal(links[i].getAttribute("href"), href);
  });
});

test("bio section has a name strip with the YAML block and a photo / intro row", () => {
  const document = loadDocument();
  const section = document.getElementById("bio");
  assert.ok(section, "expected section#bio to exist");

  const strip = section.querySelector(".name-strip");
  assert.ok(strip, "expected .name-strip to exist");
  assert.equal(strip.querySelector("h1").textContent.trim(), "Peter Cimring");
  assert.equal(
    strip.querySelector(".hero-title").textContent.trim(),
    "AI Solutions Builder"
  );

  // Assert the shape of the YAML block, not the individual values. The values
  // get tuned whenever the CV changes, and pinning them here is what left this
  // test stale the last time the hero was reworked.
  const yaml = strip.querySelector(".hero-yaml-card .hero-yaml");
  assert.ok(yaml, "expected a .hero-yaml block inside .hero-yaml-card");

  const lines = [...yaml.querySelectorAll(".yaml-line")];
  assert.equal(lines.length, 5, "expected 3 key lines fenced by 2 --- rules");
  assert.equal(lines.at(0).textContent.trim(), "---");
  assert.equal(lines.at(-1).textContent.trim(), "---");

  const keys = [...yaml.querySelectorAll(".yaml-key")].map((k) => k.textContent.trim());
  assert.deepEqual(keys, ["focus", "core_skills", "ai_skills"]);

  for (const line of lines.slice(1, -1)) {
    assert.ok(
      line.querySelectorAll(".yaml-str").length > 0,
      `expected key line "${line.textContent.trim()}" to list at least one value`
    );
  }

  const body = section.querySelector(".hero-body");
  assert.ok(body, "expected .hero-body to exist");
  assert.equal(
    body.querySelector(".hero-photo").getAttribute("src"),
    "assets/photo-peter-portrait.jpg"
  );

  const github = body.querySelector(".hero-photo-wrap .hero-github");
  assert.ok(github, "expected a GitHub link beneath the photo");
  assert.equal(github.getAttribute("target"), "_blank");
  assert.match(github.getAttribute("rel"), /noopener/);

  const content = body.querySelector(".hero-content");
  assert.ok(content, "expected .hero-content to exist");
  assert.match(content.textContent, /building and supporting products/i);
  assert.match(content.textContent, /available for freelance projects/i);
  assert.ok(content.querySelector('a[href="freelance.html"]'), "expected a link to the freelance page");
  assert.doesNotMatch(content.textContent, /taboola/i);
});

test("AI Orchestration & BPMN has 2 live cards, one per project", () => {
  const document = loadDocument();
  const section = document.getElementById("orchestration");
  assert.ok(section, "expected section#orchestration to exist");
  assert.equal(
    section.querySelector("h2").textContent.trim(),
    "AI Orchestration & BPMN"
  );

  const cards = [...section.querySelectorAll(".card")];
  const titles = cards.map((c) => c.querySelector(".card-title").textContent.trim());
  assert.deepEqual(titles, ["Doc Feedback Triage", "Camunda Docs - Merged Contribution"]);
  cards.forEach((card) => {
    assert.equal(card.querySelector(".card-status").textContent.trim(), "Live");
    assert.match(card.querySelector(".card-link").getAttribute("href"), /^https:\/\//);
  });
  assert.deepEqual(linkLabels(cards[0]), ["View demo", "View source"]);
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
  assert.equal(inProgress.querySelector("a.card-link"), null,
    "in-progress card should not link anywhere yet");

  const live = cards.find(
    (c) => c.querySelector(".card-status").textContent.trim() === "Live"
  );
  assert.match(live.querySelector("a.card-link").getAttribute("href"), /^https:\/\/github\.com/);
});

test("AI Engineering comes first, with one live card per project", () => {
  const document = loadDocument();
  const section = document.getElementById("ai-engineering");
  assert.ok(section, "expected section#ai-engineering to exist");
  assert.equal(section.querySelector("h2").textContent.trim(), "AI Engineering");

  const order = [...document.querySelectorAll("section.category")].map((s) => s.id);
  assert.deepEqual(order, ["ai-engineering", "orchestration", "agentic-frameworks"]);

  const cards = [...section.querySelectorAll(".card")];
  const titles = cards.map((c) => c.querySelector(".card-title").textContent.trim());
  assert.deepEqual(titles, ["Feature-Request Scoring", "AI Payment Scheduling", "Hebrew Invoice Intake"]);
  cards.forEach((card) => {
    assert.equal(card.querySelector(".card-status").textContent.trim(), "Live");
    card.querySelectorAll("a.card-link").forEach((a) => {
      assert.match(a.getAttribute("href"), /^https:\/\//);
      assert.equal(a.getAttribute("target"), "_blank");
    });
  });

  assert.deepEqual(linkLabels(cards[0]), ["View demo", "View source"]);
  assert.deepEqual(
    [...cards[0].querySelectorAll("a.card-link")].map((a) => a.getAttribute("href")),
    ["https://feature-request-scoring.vercel.app", "https://github.com/pcimring/feature-request-scoring"]
  );
  assert.deepEqual(linkLabels(cards[1]), ["View demo", "View source"]);
  assert.deepEqual(linkLabels(cards[2]), ["View demo"]);
});

test("the nav offers a route to the contact section from any scroll position", () => {
  const document = loadDocument();
  const contact = document.querySelector('.site-nav a[href="#contact"]');

  assert.ok(contact, "expected a nav link pointing at the contact section");
  assert.equal(document.getElementById("contact").tagName, "FOOTER");
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
  assert.equal(icon.getAttribute("href"), "assets/favicon-32.png");
  const ico = document.querySelector('link[rel="icon"][href="favicon.ico"]');
  assert.ok(ico, "expected a favicon.ico fallback link");
  const touch = document.querySelector('link[rel="apple-touch-icon"]');
  assert.ok(touch, "expected an apple-touch-icon link");
  assert.equal(touch.getAttribute("href"), "assets/apple-touch-icon.png");
});

test("footer has an email link and a LinkedIn link", () => {
  const document = loadDocument();
  const footer = document.querySelector(".site-footer");
  assert.ok(footer, "expected a .site-footer to exist");

  const email = footer.querySelector('a[href^="mailto:"]');
  assert.ok(email, "expected a mailto link in the footer");
  assert.equal(email.getAttribute("href"), "mailto:pcimring@gmail.com");

  const linkedin = footer.querySelector('a[href*="linkedin.com"]');
  assert.ok(linkedin, "expected a LinkedIn link in the footer");
  assert.equal(linkedin.getAttribute("target"), "_blank");
  assert.match(linkedin.getAttribute("rel"), /noopener/);
});

test("page source contains no em dashes", () => {
  const html = loadHtml();
  assert.doesNotMatch(
    html,
    /—/,
    "found an em dash (—) in index.html, use a hyphen, comma, or restructure the sentence instead"
  );
});

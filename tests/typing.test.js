import test from "node:test";
import assert from "node:assert/strict";
import { JSDOM } from "jsdom";
import { loadDocument, loadCss, loadHtml } from "./helpers.js";
import { createReveal, startTyping } from "../script.js";

const YAML_FIXTURE = `
<div class="hero-yaml">
  <div class="yaml-line"><span class="yaml-rule">---</span></div>
  <div class="yaml-line"><span class="yaml-key">focus</span>: [<span class="yaml-str">AI</span>]</div>
  <div class="yaml-line"><span class="yaml-rule">---</span></div>
</div>`;

function fixture() {
  const dom = new JSDOM(`<body>${YAML_FIXTURE}</body>`);
  const frames = [];
  dom.window.requestAnimationFrame = (cb) => frames.push(cb);
  return {
    window: dom.window,
    container: dom.window.document.querySelector(".hero-yaml"),
    drain: (now) => {
      while (frames.length) frames.shift()(now);
    },
  };
}

// The concatenated visible text of the fixture: "---" + "focus" + ": [" + "AI" + "]" + "---"
const FIXTURE_TEXT = "---focus: [AI]---";

test("createReveal reports the total character count of the visible text", () => {
  const { container } = fixture();
  const reveal = createReveal(container);
  assert.equal(reveal.totalChars, FIXTURE_TEXT.length);
});

test("createReveal does not modify the DOM until revealTo is called", () => {
  const { container } = fixture();
  const before = container.innerHTML;
  createReveal(container);
  assert.equal(container.innerHTML, before);
});

test("revealTo(0) blanks all text but keeps the span structure intact", () => {
  const { container } = fixture();
  const reveal = createReveal(container);

  reveal.revealTo(0);

  assert.equal(container.textContent.trim(), "");
  assert.equal(container.querySelectorAll(".yaml-line").length, 3);
  assert.equal(container.querySelectorAll(".yaml-rule").length, 2);
  assert.equal(container.querySelector(".yaml-key").className, "yaml-key");
});

test("revealTo(n) shows exactly the first n characters of the visible text", () => {
  const { container } = fixture();
  const reveal = createReveal(container);

  // Join the lines directly: container.textContent would also pick up the
  // source indentation between the <div>s, which never renders.
  const visibleText = () =>
    [...container.querySelectorAll(".yaml-line")].map((l) => l.textContent).join("");

  for (let n = 0; n <= FIXTURE_TEXT.length; n++) {
    reveal.revealTo(n);
    assert.equal(visibleText(), FIXTURE_TEXT.slice(0, n), `mismatch after revealing ${n} characters`);
  }
});

test("a character revealed inside a span stays inside that span", () => {
  const { container } = fixture();
  const reveal = createReveal(container);

  // "---" (3) + "foc" (3) = the 6th character sits inside .yaml-key
  reveal.revealTo(6);

  assert.equal(container.querySelector(".yaml-key").textContent, "foc");
  assert.equal(container.querySelector(".yaml-str").textContent, "");
});

test("revealTo(totalChars) restores the original markup exactly", () => {
  const { container } = fixture();
  const original = container.innerHTML;
  const reveal = createReveal(container);

  reveal.revealTo(0);
  reveal.revealTo(reveal.totalChars);

  assert.equal(container.innerHTML, original);
});

test("revealTo returns the text node holding the write head", () => {
  const { container } = fixture();
  const reveal = createReveal(container);

  const head = reveal.revealTo(6);

  assert.equal(head.parentNode.className, "yaml-key");
});

test("startTyping leaves the text untouched when reduced motion is preferred", () => {
  const { container, window } = fixture();
  const original = container.innerHTML;

  startTyping(container, { window, reducedMotion: true });

  assert.equal(container.innerHTML, original);
  assert.equal(container.querySelector(".yaml-cursor"), null);
});

test("startTyping blanks the text and adds a cursor when motion is allowed", () => {
  const { container, window } = fixture();

  startTyping(container, { window, reducedMotion: false });

  assert.equal(container.textContent.replace(/\s+/g, ""), "");
  assert.ok(container.querySelector(".yaml-cursor"), "expected a cursor element");
});

test("startTyping reserves the block height so the hero does not jump", () => {
  const { container, window } = fixture();

  startTyping(container, { window, reducedMotion: false, measuredHeight: 84 });

  assert.equal(container.style.minHeight, "84px");
});

test("startTyping makes the block visible whether or not it animates", () => {
  const moving = fixture();
  startTyping(moving.container, { window: moving.window, reducedMotion: false });
  assert.equal(moving.container.style.visibility, "visible");

  const still = fixture();
  startTyping(still.container, { window: still.window, reducedMotion: true });
  assert.equal(still.container.style.visibility, "visible");
});

test("typing runs to completion and cleans up after itself", async () => {
  const { container, window, drain } = fixture();
  const original = container.innerHTML;
  let now = 0;

  const done = startTyping(container, {
    window,
    reducedMotion: false,
    measuredHeight: 84,
    charsPerSecond: 250,
    now: () => now,
  });

  // Advance well past the time needed for 17 characters at 250 chars/sec.
  now = 5000;
  drain(now);
  await done;

  assert.equal(container.innerHTML, original, "markup should be restored exactly");
  assert.equal(container.querySelector(".yaml-cursor"), null, "cursor should be removed");
  assert.equal(container.style.minHeight, "", "reserved height should be released");
});

test("index.html keeps the full YAML text in the source for no-JS visitors", () => {
  const document = loadDocument();
  const yaml = document.querySelector(".hero-yaml");
  assert.ok(yaml, "expected .hero-yaml to exist");

  const text = yaml.textContent;
  assert.match(text, /focus/);
  assert.match(text, /core_skills/);
  assert.match(text, /ai_skills/);
  assert.match(text, /Documentation Strategy/);
});

test("index.html loads the typing script as a deferred module", () => {
  const document = loadDocument();
  const script = document.querySelector('script[src="script.js"]');
  assert.ok(script, "expected index.html to load script.js");
  assert.equal(script.getAttribute("type"), "module");
});

test("the cursor has real CSS, including a blink animation", () => {
  const css = loadCss();
  assert.match(css, /\.yaml-cursor/, "expected a .yaml-cursor rule");
  assert.match(css, /@keyframes\s+yaml-cursor-blink/, "expected a blink keyframes rule");
});

test("the YAML block is only pre-hidden when JavaScript is running", () => {
  const css = loadCss();
  assert.match(
    css,
    /\.js\s+\.hero-yaml/,
    "the pre-typing hide rule must be scoped to .js so a JS-off visitor still sees the block"
  );
  assert.doesNotMatch(
    loadHtml(),
    /<html[^>]*class="[^"]*\bjs\b/,
    "the js class must be added at runtime, not hard-coded in the HTML"
  );
});

test("an inline head script sets the js class before the page paints", () => {
  const document = loadDocument();
  const inline = [...document.querySelectorAll("head script:not([src])")];
  assert.equal(inline.length, 1, "expected exactly one inline bootstrap script in <head>");
  assert.match(inline[0].textContent, /documentElement\.classList\.add\("js"\)/);
});

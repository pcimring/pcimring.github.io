import test from "node:test";
import assert from "node:assert/strict";
import { JSDOM } from "jsdom";
import { loadDocument, loadCss } from "./helpers.js";
import { setupLightbox } from "../script.js";

// Mirrors the real markup in index.html, kept minimal so the behaviour tests
// don't depend on the rest of the page.
const FIXTURE = `
<button type="button" class="hero-photo-button">
  <img src="assets/photo-peter-portrait.jpg" alt="Photo of Peter Cimring" class="hero-photo">
</button>
<div class="lightbox" role="dialog" aria-modal="true" hidden>
  <button type="button" class="lightbox-close">&times;</button>
  <img src="assets/photo-peter-portrait.jpg" alt="Photo of Peter Cimring" class="lightbox-image">
</div>`;

function fixture() {
  const dom = new JSDOM(`<body>${FIXTURE}</body>`);
  const doc = dom.window.document;
  const teardown = setupLightbox(doc);
  return {
    doc,
    teardown,
    trigger: doc.querySelector(".hero-photo-button"),
    lightbox: doc.querySelector(".lightbox"),
    close: doc.querySelector(".lightbox-close"),
    image: doc.querySelector(".lightbox-image"),
    press: (key) =>
      doc.dispatchEvent(new dom.window.KeyboardEvent("keydown", { key, bubbles: true })),
  };
}

test("the hero photo sits inside a real button, so it is keyboard reachable", () => {
  const document = loadDocument();
  const button = document.querySelector(".hero-photo-wrap .hero-photo-button");

  assert.ok(button, "expected the hero photo to be wrapped in a button");
  assert.equal(button.getAttribute("type"), "button");
  assert.ok(button.getAttribute("aria-label"), "expected the button to be labelled");
  assert.ok(button.querySelector(".hero-photo"), "expected the photo inside the button");
});

test("index.html ships a labelled, initially hidden lightbox for the same photo", () => {
  const document = loadDocument();
  const lightbox = document.querySelector(".lightbox");

  assert.ok(lightbox, "expected a .lightbox element");
  assert.ok(lightbox.hasAttribute("hidden"), "expected the lightbox to start hidden");
  assert.equal(lightbox.getAttribute("role"), "dialog");
  assert.equal(lightbox.getAttribute("aria-modal"), "true");
  assert.equal(
    lightbox.querySelector(".lightbox-image").getAttribute("src"),
    document.querySelector(".hero-photo").getAttribute("src")
  );
});

test("the lightbox has real CSS, including a hidden state that wins over display:flex", () => {
  const css = loadCss();

  assert.match(css, /\.lightbox\s*\{/);
  assert.match(css, /\.lightbox\[hidden\]\s*\{\s*display:\s*none/);
  assert.match(css, /\.lightbox-image\s*\{/);
  assert.match(css, /\.lightbox-close\s*\{/);
});

test("the enlarged photo is a circle, like the thumbnail it grows out of", () => {
  const css = loadCss();
  const rule = css.slice(css.indexOf(".lightbox-image {"));

  assert.match(rule.slice(0, rule.indexOf("}")), /border-radius:\s*50%/);
  assert.match(rule.slice(0, rule.indexOf("}")), /aspect-ratio:\s*1/);
});

test("clicking the photo opens the lightbox and moves focus to the close button", () => {
  const { trigger, lightbox, close, doc, teardown } = fixture();

  trigger.click();

  assert.equal(lightbox.hidden, false);
  assert.equal(doc.activeElement, close);
  teardown();
});

test("escape closes the lightbox and returns focus to the photo", () => {
  const { trigger, lightbox, doc, press, teardown } = fixture();

  trigger.click();
  press("Escape");

  assert.equal(lightbox.hidden, true);
  assert.equal(doc.activeElement, trigger);
  teardown();
});

test("clicking the backdrop closes the lightbox, clicking the photo does not", () => {
  const { trigger, lightbox, image, teardown } = fixture();

  trigger.click();
  image.click();
  assert.equal(lightbox.hidden, false, "clicking the photo itself should keep it open");

  lightbox.click();
  assert.equal(lightbox.hidden, true, "clicking the backdrop should close it");
  teardown();
});

test("the close button closes the lightbox", () => {
  const { trigger, lightbox, close, teardown } = fixture();

  trigger.click();
  close.click();

  assert.equal(lightbox.hidden, true);
  teardown();
});

test("setupLightbox is a no-op when the markup is absent", () => {
  const doc = new JSDOM("<body></body>").window.document;

  assert.doesNotThrow(() => setupLightbox(doc)());
});

// jsdom implements neither the Web Animations API nor real layout, so the
// animated path is unreachable without stubbing both. The stub records every
// animation the lightbox starts, and whether it was later cancelled.
function animatedFixture() {
  const dom = new JSDOM(`<body>${FIXTURE}</body>`);
  const doc = dom.window.document;
  const created = [];

  dom.window.Element.prototype.getBoundingClientRect = function () {
    const big = this.classList.contains("lightbox-image");
    const size = big ? 600 : 260;
    return { width: size, height: size, top: 0, left: 0, right: size, bottom: size };
  };

  dom.window.Element.prototype.animate = function () {
    const anim = {
      cancelled: false,
      handlers: [],
      cancel() {
        this.cancelled = true;
      },
      addEventListener(type, fn) {
        if (type === "finish") this.handlers.push(fn);
      },
      fire() {
        this.handlers.forEach((fn) => fn());
      },
    };
    created.push(anim);
    return anim;
  };

  const teardown = setupLightbox(doc);
  return {
    doc,
    created,
    teardown,
    trigger: doc.querySelector(".hero-photo-button"),
    lightbox: doc.querySelector(".lightbox"),
    press: (key) =>
      doc.dispatchEvent(new dom.window.KeyboardEvent("keydown", { key, bubbles: true })),
  };
}

test("reopening after a close cancels the closing animations", () => {
  const { trigger, lightbox, created, press, teardown } = animatedFixture();

  trigger.click();
  const afterOpen = created.length;
  assert.ok(afterOpen > 0, "expected the open to start animations");

  press("Escape");
  const closing = created.slice(afterOpen);
  assert.ok(closing.length > 0, "expected the close to start animations");
  closing.forEach((anim) => anim.fire());
  assert.equal(lightbox.hidden, true, "the close should finish with the lightbox hidden");

  trigger.click();

  // The closing backdrop animation fills forwards at opacity 0. Left running,
  // it reasserts itself the moment the reopening animation is removed, so the
  // photo grows and then vanishes.
  assert.ok(
    closing.every((anim) => anim.cancelled),
    "every closing animation must be cancelled before the lightbox reopens"
  );
  assert.equal(lightbox.hidden, false);
  teardown();
});

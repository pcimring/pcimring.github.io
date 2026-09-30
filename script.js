const SHOW_TEXT = 4;
const WHITESPACE_ONLY = /^\s*$/;
const DEFAULT_CHARS_PER_SECOND = 80;

// Captures the text of every meaningful text node under `container` so it can
// be blanked and fed back in a character at a time. The element structure is
// never touched, so the syntax highlighting spans just fill in as text arrives.
export function createReveal(container) {
  const walker = container.ownerDocument.createTreeWalker(container, SHOW_TEXT);
  const parts = [];
  let totalChars = 0;

  for (let node = walker.nextNode(); node; node = walker.nextNode()) {
    const text = node.nodeValue;
    // Whitespace between elements is invisible once rendered. Counting it
    // would stall the animation on characters nobody can see.
    if (WHITESPACE_ONLY.test(text)) continue;
    parts.push({ node, text, start: totalChars });
    totalChars += text.length;
  }

  function revealTo(shown) {
    let head = parts.length ? parts[0].node : null;

    for (const { node, text, start } of parts) {
      if (shown <= start) {
        node.nodeValue = "";
      } else if (shown >= start + text.length) {
        node.nodeValue = text;
        head = node;
      } else {
        node.nodeValue = text.slice(0, shown - start);
        head = node;
      }
    }

    return head;
  }

  return { totalChars, revealTo };
}

function prefersReducedMotion(win) {
  if (!win || typeof win.matchMedia !== "function") return false;
  return win.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function placeCursor(head, cursor) {
  if (!head || !head.parentNode) return;
  if (cursor.previousSibling === head) return;
  head.parentNode.insertBefore(cursor, head.nextSibling);
}

// Types out `container`'s text and resolves once the original markup is back.
export function startTyping(container, options = {}) {
  const {
    window: win = globalThis.window,
    reducedMotion = prefersReducedMotion(win),
    measuredHeight,
    charsPerSecond = DEFAULT_CHARS_PER_SECOND,
    now = () => win.performance.now(),
  } = options;

  // Undo the .js pre-hide in every path, so a visitor who never sees the
  // animation still sees the block.
  container.style.visibility = "visible";

  if (reducedMotion) return Promise.resolve();

  const reveal = createReveal(container);
  if (!reveal.totalChars) return Promise.resolve();

  // Pin the rendered height before blanking the text, or the hero collapses
  // and everything below it jumps up for the length of the animation.
  const height = measuredHeight ?? container.getBoundingClientRect().height;
  if (height) container.style.minHeight = `${height}px`;

  const cursor = container.ownerDocument.createElement("span");
  cursor.className = "yaml-cursor";
  cursor.setAttribute("aria-hidden", "true");

  container.setAttribute("aria-busy", "true");
  placeCursor(reveal.revealTo(0), cursor);

  return new Promise((resolve) => {
    const startedAt = now();

    function finish() {
      cursor.remove();
      reveal.revealTo(reveal.totalChars);
      container.style.minHeight = "";
      container.removeAttribute("aria-busy");
      resolve();
    }

    function step() {
      const elapsed = (now() - startedAt) / 1000;
      const shown = Math.min(reveal.totalChars, Math.floor(elapsed * charsPerSecond));

      if (shown >= reveal.totalChars) {
        finish();
        return;
      }

      placeCursor(reveal.revealTo(shown), cursor);
      win.requestAnimationFrame(step);
    }

    win.requestAnimationFrame(step);
  });
}

const LIGHTBOX_MS = 280;
const LIGHTBOX_EASING = "cubic-bezier(0.2, 0, 0.2, 1)";

// Both the thumbnail and the lightbox image are circles, so a plain
// translate+scale between their bounding boxes reads as one circle growing.
function growFrom(thumb, image) {
  const from = thumb.getBoundingClientRect();
  const to = image.getBoundingClientRect();
  if (!from.width || !to.width) return null;

  const scale = from.width / to.width;
  const dx = from.left + from.width / 2 - (to.left + to.width / 2);
  const dy = from.top + from.height / 2 - (to.top + to.height / 2);

  return `translate(${dx}px, ${dy}px) scale(${scale})`;
}

// Opens the hero photo in a full-screen overlay. Returns a cleanup function so
// tests can tear the listeners down; the page itself never needs to call it.
export function setupLightbox(doc) {
  const trigger = doc.querySelector(".hero-photo-button");
  const lightbox = doc.querySelector(".lightbox");
  const close = lightbox && lightbox.querySelector(".lightbox-close");
  const image = lightbox && lightbox.querySelector(".lightbox-image");
  const thumb = trigger && trigger.querySelector(".hero-photo");
  if (!trigger || !lightbox || !close || !image || !thumb) return () => {};

  const win = doc.defaultView;
  // Every animation currently in flight. The closing backdrop fills forwards so
  // it can hold opacity 0 until `hidden` lands, which means it has to be
  // cancelled explicitly. Left running, it reasserts opacity 0 as soon as the
  // next opening animation is removed, and the photo grows then vanishes.
  let running = [];

  function stopAnimations() {
    running.forEach((animation) => animation.cancel());
    running = [];
  }

  // jsdom has no Web Animations API, and a visitor may have asked for less
  // motion. Either way the lightbox still opens, it just snaps.
  function canAnimate() {
    return typeof image.animate === "function" && !prefersReducedMotion(win);
  }

  function open() {
    stopAnimations();
    lightbox.hidden = false;
    close.focus();
    if (!canAnimate()) return;

    const collapsed = growFrom(thumb, image);
    if (!collapsed) return;

    running = [
      lightbox.animate([{ opacity: 0 }, { opacity: 1 }], {
        duration: LIGHTBOX_MS,
        easing: LIGHTBOX_EASING,
      }),
      image.animate(
        [
          { transform: collapsed, opacity: 0.6 },
          { transform: "none", opacity: 1 },
        ],
        { duration: LIGHTBOX_MS, easing: LIGHTBOX_EASING }
      ),
    ];
  }

  function hide() {
    if (lightbox.hidden) return;
    stopAnimations();

    // Hide first, then drop the animations, so clearing their forwards fill
    // can't flash the backdrop back in on the last frame.
    const finish = () => {
      lightbox.hidden = true;
      trigger.focus();
      stopAnimations();
    };

    if (!canAnimate()) {
      finish();
      return;
    }

    const collapsed = growFrom(thumb, image);
    if (!collapsed) {
      finish();
      return;
    }

    const shrink = image.animate(
      [
        { transform: "none", opacity: 1 },
        { transform: collapsed, opacity: 0.6 },
      ],
      { duration: LIGHTBOX_MS, easing: LIGHTBOX_EASING, fill: "forwards" }
    );
    running = [
      lightbox.animate([{ opacity: 1 }, { opacity: 0 }], {
        duration: LIGHTBOX_MS,
        easing: LIGHTBOX_EASING,
        fill: "forwards",
      }),
      shrink,
    ];
    shrink.addEventListener("finish", finish);
  }

  function onLightboxClick(event) {
    // Clicking the photo itself should not dismiss it, only the backdrop.
    if (event.target === image) return;
    hide();
  }

  function onKeydown(event) {
    if (event.key === "Escape") hide();
  }

  trigger.addEventListener("click", open);
  lightbox.addEventListener("click", onLightboxClick);
  doc.addEventListener("keydown", onKeydown);

  return () => {
    trigger.removeEventListener("click", open);
    lightbox.removeEventListener("click", onLightboxClick);
    doc.removeEventListener("keydown", onKeydown);
  };
}

function init() {
  const doc = globalThis.document;

  const container = doc.querySelector(".hero-yaml");
  if (container) {
    try {
      startTyping(container);
    } catch {
      container.style.visibility = "visible";
    }
  }

  setupLightbox(doc);
}

if (typeof document !== "undefined") init();

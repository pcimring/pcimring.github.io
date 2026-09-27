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

function init() {
  const doc = globalThis.document;
  const container = doc.querySelector(".hero-yaml");
  if (!container) return;

  try {
    startTyping(container);
  } catch {
    container.style.visibility = "visible";
  }
}

if (typeof document !== "undefined") init();

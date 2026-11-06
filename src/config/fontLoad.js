// Make sure Orbit is ready before Phaser draws any canvas text (canvas text never re-renders by itself
// once the font arrives, so a late font would leave fallback-font text on screen).
// Never throws and never waits longer than the timeout: on failure the CSS fallback fonts are used.
export const FONT_LOAD_SPEC = '32px Orbit';
export const FONT_TIMEOUT_MS = 3000;

/** @returns {Promise<boolean>} true when Orbit loaded, false on timeout/error/unsupported. */
export async function loadGameFont(doc = typeof document !== 'undefined' ? document : undefined, { timeoutMs = FONT_TIMEOUT_MS } = {}) {
  if (typeof doc?.fonts?.load !== 'function') return false;
  let timer;
  try {
    const timeout = new Promise(resolve => { timer = setTimeout(() => resolve(false), timeoutMs); });
    const load = Promise.resolve(doc.fonts.load(FONT_LOAD_SPEC)).then(faces => faces.length > 0, () => false);
    return await Promise.race([load, timeout]);
  } catch {
    return false;
  } finally {
    clearTimeout(timer);
  }
}

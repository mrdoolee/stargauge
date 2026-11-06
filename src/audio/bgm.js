// Background music: three looping mp3s streamed through HTMLAudioElement -> WebAudio.
//   A (calm)  title, briefing, card, report, result, and m4's questions
//   B (play)  m1, m2, m3
//   C (boss)  m4 fight
//
//   bgm.request('a'|'b'|'c'|null)   // what the current screen wants; null = no change
//   bgm.requestForScene(sceneKey)   // same, through trackForScene()
//   bgm.setSuspended(reason, bool)  // pause/resume for 'pause' | 'hidden' | 'rotate' (any reason set = paused)
//
// Same track requested again keeps playing (no restart); a different track crossfades over
// FADE_MS. Level/fade/mute go through WebAudio (iOS ignores HTMLAudioElement.volume): each
// element -> MediaElementSource -> its own gain -> sfx music bus -> master (0 when muted).
// Without an AudioContext it falls back to plain play/pause (element.muted for mute, no fade).
// Nothing here throws: autoplay blocks (play() rejects) are retried on the next gesture.
// The music level is GAINS.music in src/audio/sfx.js.
import { sfx as defaultSfx } from './sfx.js';

/** Crossfade length (ms). */
export const FADE_MS = 1000;

export const TRACK_URLS = {
  a: 'music/bgm-a.mp3',
  b: 'music/bgm-b.mp3',
  c: 'music/bgm-c.mp3',
};

const SCENE_TRACK = {
  title: 'a', briefing: 'a', card: 'a', report: 'a', result: 'a',
  m1: 'b', m2: 'b', m3: 'b',
  m4: 'c',
};

/** Track for a scene key, or null when the scene does not change the music (hud, boot, debug). */
export function trackForScene(sceneKey) {
  return SCENE_TRACK[sceneKey] ?? null;
}

/** 'start' (nothing playing), 'switch' (different track), 'keep' (same track or no preference). */
export function bgmAction(current, wanted) {
  if (!wanted) return 'keep';
  if (!current) return 'start';
  return current === wanted ? 'keep' : 'switch';
}

export class Bgm {
  constructor({
    sfx = defaultSfx,
    createAudio = url => (typeof Audio !== 'undefined' ? new Audio(url) : null),
    setTimer = (fn, ms) => setTimeout(fn, ms),
    clearTimer = id => clearTimeout(id),
  } = {}) {
    this.sfx = sfx;
    this.createAudio = createAudio;
    this.setTimer = setTimer;
    this.clearTimer = clearTimer;
    this.current = null; // track we are (or would be) playing
    this.wanted = null;
    this.tracks = {}; // key -> { el, gain, sourced, stopTimer }
    this.reasons = new Set();
    this.started = false; // first gesture seen: tracks may only start after it
    // Only a gesture unlock opens the gate (the HUD's setMuted at create must not).
    sfx.listen?.(kind => { if (kind === 'unlock') this.started = true; this.sync(); });
  }

  request(track) {
    if (track) this.wanted = track;
    this.sync();
  }

  requestForScene(sceneKey) {
    this.request(trackForScene(sceneKey));
  }

  setSuspended(reason, on) {
    if (on) this.reasons.add(reason); else this.reasons.delete(reason);
    this.sync();
  }

  /** Idempotent: bring the elements in line with wanted / suspended / muted. Cheap, no per-frame use. */
  sync() {
    try {
      this._sync();
    } catch {
      /* audio must never break gameplay */
    }
  }

  _track(key) {
    let t = this.tracks[key];
    if (t) return t;
    const el = this.createAudio(TRACK_URLS[key]);
    if (!el) return null;
    el.loop = true;
    el.preload = 'auto';
    t = { el, gain: null, sourced: false, stopTimer: null };
    this.tracks[key] = t;
    return t;
  }

  /** Route the element through WebAudio once the context exists. Returns the gain node or null (fallback). */
  _wire(t) {
    const { ctx, buses } = this.sfx;
    if (!ctx || !buses?.music) return null;
    if (!t.sourced) {
      t.sourced = true; // never retry a failed wiring: createMediaElementSource can run only once per element
      try {
        const g = ctx.createGain();
        g.gain.value = 0;
        ctx.createMediaElementSource(t.el).connect(g);
        g.connect(buses.music);
        t.gain = g;
      } catch {
        t.gain = null;
      }
    }
    return t.gain;
  }

  /** Linear ramp of the track gain to `to` over ms; `from` (optional) first jumps the gain there. */
  _fade(t, to, ms, from) {
    const g = t.gain?.gain;
    if (!g) return;
    const now = this.sfx.ctx.currentTime;
    g.cancelScheduledValues?.(now);
    g.setValueAtTime?.(from ?? g.value, now);
    g.linearRampToValueAtTime?.(to, now + ms / 1000);
  }

  _play(t) {
    const p = t.el.play?.();
    p?.catch?.(() => { /* autoplay blocked: retried on the next gesture */ });
  }

  _stop(key, fade) {
    const t = this.tracks[key];
    if (!t) return;
    if (t.stopTimer != null) { this.clearTimer(t.stopTimer); t.stopTimer = null; }
    if (fade && t.gain && !t.el.paused) {
      this._fade(t, 0, FADE_MS);
      t.stopTimer = this.setTimer(() => { t.stopTimer = null; t.el.pause(); }, FADE_MS + 50);
    } else {
      t.el.pause();
    }
  }

  _sync() {
    const suspended = this.reasons.size > 0 || !!this.sfx.muted; // muted: stop streaming too (tablet battery); unmute resumes
    if (suspended) {
      for (const k of Object.keys(this.tracks)) this._stop(k, false);
      return;
    }
    if (!this.started) return; // browsers block sound until a gesture; the first one calls sync()
    const action = bgmAction(this.current, this.wanted);
    if (action === 'switch' && this.current) this._stop(this.current, true);
    if (action !== 'keep') this.current = this.wanted;
    if (!this.current) return;
    const t = this._track(this.current);
    if (!t) return;
    if (t.stopTimer != null) { this.clearTimer(t.stopTimer); t.stopTimer = null; }
    const wasSourced = t.sourced;
    const gain = this._wire(t);
    const newlyWired = !!gain && !wasSourced; // a freshly wired gain starts at 0: it must be faded in even if the element already plays
    if (t.el.paused || newlyWired) {
      if (gain) this._fade(t, 1, FADE_MS, 0); // fade in on start / resume / late wiring
      if (t.el.paused) this._play(t);
    } else if (gain && action === 'switch') {
      this._fade(t, 1, FADE_MS); // switching back to a track that was still fading out
    }
  }
}

export const bgm = new Bgm();

import { describe, it, expect, vi } from 'vitest';
import { trackForScene, bgmAction, Bgm, FADE_MS } from '../../src/audio/bgm.js';

describe('trackForScene', () => {
  it('maps reading screens to A, play missions to B, the boss to C', () => {
    for (const k of ['title', 'briefing', 'card', 'report', 'result']) expect(trackForScene(k)).toBe('a');
    for (const k of ['m1', 'm2', 'm3']) expect(trackForScene(k)).toBe('b');
    expect(trackForScene('m4')).toBe('c');
  });
  it('returns null (no change) for hud, boot and debug scenes', () => {
    for (const k of ['hud', 'boot', 'debugfps', 'debugcolors', 'nope', undefined]) expect(trackForScene(k)).toBeNull();
  });
});

describe('bgmAction', () => {
  it('starts, keeps or switches', () => {
    expect(bgmAction(null, 'a')).toBe('start');
    expect(bgmAction('a', 'a')).toBe('keep');
    expect(bgmAction('a', 'b')).toBe('switch');
    expect(bgmAction('b', null)).toBe('keep');
    expect(bgmAction(null, null)).toBe('keep');
  });
});

// ---- Bgm with fakes ----
function fakeAudio(url) {
  return {
    url, paused: true, loop: false, muted: false, currentTime: 0, preload: '',
    play: vi.fn(function () { this.paused = false; return Promise.resolve(); }),
    pause: vi.fn(function () { this.paused = true; }),
  };
}
function fakeGain() {
  return { gain: { value: 0, cancelScheduledValues: vi.fn(), setValueAtTime: vi.fn(), linearRampToValueAtTime: vi.fn() }, connect: vi.fn() };
}
function setup({ withCtx = true, rejectPlay = false } = {}) {
  const audios = {};
  const timers = [];
  const musicBus = fakeGain();
  const sfx = {
    muted: false, ctx: null, buses: null, listeners: [],
    listen(fn) { this.listeners.push(fn); },
    unlock: vi.fn(function () {
      if (withCtx) {
        this.ctx = { currentTime: 1, state: 'running', createMediaElementSource: vi.fn(() => ({ connect: vi.fn() })), createGain: fakeGain };
        this.buses = { music: musicBus };
      }
    }),
  };
  const bgm = new Bgm({
    sfx,
    createAudio: url => {
      const a = fakeAudio(url);
      if (rejectPlay) a.play = vi.fn(() => Promise.reject(new Error('blocked')));
      audios[url] = a;
      return a;
    },
    setTimer: (fn, ms) => { timers.push({ fn, ms, live: true }); return timers.length - 1; },
    clearTimer: id => { if (timers[id]) timers[id].live = false; },
  });
  const gesture = () => { sfx.unlock(); sfx.listeners.forEach(f => f('unlock')); };
  const setMuted = m => { sfx.muted = m; sfx.listeners.forEach(f => f('mute')); };
  return { bgm, sfx, audios, timers, gesture, setMuted };
}
const a = s => s.audios['music/bgm-a.mp3'];
const b = s => s.audios['music/bgm-b.mp3'];

describe('Bgm', () => {
  it('does nothing audible until the first gesture, then starts the wanted track looping', () => {
    const s = setup();
    s.bgm.request('a');
    expect(a(s)?.play).toBeUndefined();
    s.gesture();
    expect(a(s).play).toHaveBeenCalledTimes(1);
    expect(a(s).loop).toBe(true);
  });
  it('same track on another screen does not restart', () => {
    const s = setup();
    s.gesture();
    s.bgm.request('a');
    s.bgm.request('a');
    s.bgm.request('a');
    expect(a(s).play).toHaveBeenCalledTimes(1);
    expect(a(s).currentTime).toBe(0);
  });
  it('a different track crossfades: new starts, old fades then pauses after FADE_MS', () => {
    const s = setup();
    s.gesture();
    s.bgm.request('a');
    s.bgm.request('b');
    expect(b(s).play).toHaveBeenCalled();
    expect(a(s).pause).not.toHaveBeenCalled();
    const t = s.timers.find(x => x.ms === FADE_MS + 50) ?? s.timers.at(-1);
    expect(t.ms).toBeGreaterThanOrEqual(FADE_MS);
    t.fn();
    expect(a(s).paused).toBe(true);
    expect(b(s).paused).toBe(false);
  });
  it('a null request keeps the current track', () => {
    const s = setup();
    s.gesture();
    s.bgm.request('b');
    s.bgm.request(null);
    expect(b(s).paused).toBe(false);
  });
  it('suspend reasons pause and resume; resumes only when all are cleared', () => {
    const s = setup();
    s.gesture();
    s.bgm.request('b');
    s.bgm.setSuspended('pause', true);
    s.bgm.setSuspended('hidden', true);
    expect(b(s).paused).toBe(true);
    s.bgm.setSuspended('pause', false);
    expect(b(s).paused).toBe(true);
    s.bgm.setSuspended('hidden', false);
    expect(b(s).paused).toBe(false);
  });
  it('a request while suspended does not play until resumed', () => {
    const s = setup();
    s.gesture();
    s.bgm.setSuspended('rotate', true);
    s.bgm.request('c');
    expect(s.audios['music/bgm-c.mp3']?.paused ?? true).toBe(true);
    s.bgm.setSuspended('rotate', false);
    expect(s.audios['music/bgm-c.mp3'].paused).toBe(false);
  });
  it('without an AudioContext falls back to plain play/pause; mute pauses, unmute resumes', () => {
    const s = setup({ withCtx: false });
    s.gesture();
    s.bgm.request('a');
    expect(a(s).play).toHaveBeenCalled();
    s.setMuted(true);
    expect(a(s).paused).toBe(true);
    s.setMuted(false);
    expect(a(s).paused).toBe(false);
    s.bgm.request('b');
    expect(a(s).paused).toBe(true);
    expect(b(s).paused).toBe(false);
  });
  it('mute with a context pauses the element, unmute fades back in', () => {
    const s = setup();
    s.gesture();
    s.bgm.request('b');
    s.setMuted(true);
    expect(b(s).paused).toBe(true);
    s.setMuted(false);
    expect(b(s).paused).toBe(false);
  });
  it('a mute notification (HUD create) before any gesture does not start music', () => {
    const s = setup();
    s.bgm.request('a');
    s.setMuted(false);
    expect(a(s)).toBeUndefined();
    s.gesture();
    expect(a(s).play).toHaveBeenCalledTimes(1);
  });
  it('an element that already plays when the context appears is wired and faded in (not left silent)', () => {
    const s = setup();
    // unmuted notification only: no gesture, so nothing may play yet
    s.bgm.request('a');
    s.setMuted(false);
    // element playing without a context (e.g. created earlier through a later-successful path)
    s.sfx.listeners.forEach(f => f('unlock')); // gesture whose unlock produced no context yet
    expect(a(s).paused).toBe(false);
    const g = () => s.bgm.tracks.a.gain;
    expect(g()).toBeNull();
    s.gesture(); // context now exists
    expect(g()).not.toBeNull();
    expect(g().gain.linearRampToValueAtTime).toHaveBeenCalledWith(expect.any(Number), expect.any(Number));
    expect(g().gain.setValueAtTime).toHaveBeenCalledWith(0, expect.any(Number));
    expect(a(s).play).toHaveBeenCalledTimes(1);
  });
  it('A to B to A inside the fade: A is not paused by the old timer and fades back up', () => {
    const s = setup();
    s.gesture();
    s.bgm.request('a');
    s.bgm.request('b');
    s.bgm.request('a');
    for (const t of s.timers) if (t.live) t.fn(); // a cancelled timer never fires
    expect(a(s).paused).toBe(false);
    expect(a(s).play).toHaveBeenCalledTimes(1);
    expect(s.bgm.current).toBe('a');
  });
  it('never throws when play() rejects, and retries on the next gesture', async () => {
    const s = setup({ rejectPlay: true });
    expect(() => { s.gesture(); s.bgm.request('a'); }).not.toThrow();
    await Promise.resolve(); await Promise.resolve();
    s.gesture();
    expect(a(s).play.mock.calls.length).toBeGreaterThanOrEqual(2);
  });
  it('never throws when Audio construction fails', () => {
    const bgm = new Bgm({ sfx: { listen() {}, unlock() {}, ctx: null, buses: null, muted: false }, createAudio: () => { throw new Error('no audio'); } });
    expect(() => { bgm.request('a'); bgm.setSuspended('pause', true); bgm.setSuspended('pause', false); }).not.toThrow();
  });
});

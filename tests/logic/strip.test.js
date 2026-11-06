import { describe, it, expect } from 'vitest';
import { stripReducer, stripText, initialStrip } from '../../src/logic/strip.js';
import { TOAST_MS, STRIP_HOLD_MS } from '../../src/config/balance.js';

const base = () => stripReducer(initialStrip(), { type: 'instruction', text: '지시문 A' });
const msg = (s, text, nowMs, extra = {}) => stripReducer(s, { type: 'message', text, tone: 'info', nowMs, ...extra });

describe('stripReducer', () => {
  it('shows the instruction when there is no message', () => {
    expect(stripText(base())).toEqual({ text: '지시문 A', tone: 'normal' });
  });
  it('a message shows, then returns to the instruction after TOAST_MS', () => {
    let s = msg(base(), '오답', 1000, { tone: 'wrong' });
    expect(stripText(s)).toEqual({ text: '오답', tone: 'wrong' });
    s = stripReducer(s, { type: 'tick', nowMs: 1000 + TOAST_MS - 1 });
    expect(stripText(s).text).toBe('오답');
    s = stripReducer(s, { type: 'tick', nowMs: 1000 + TOAST_MS });
    expect(stripText(s)).toEqual({ text: '지시문 A', tone: 'normal' });
  });
  it('an instruction change during a message shows the NEW instruction afterwards', () => {
    let s = msg(base(), '오답', 0);
    s = stripReducer(s, { type: 'instruction', text: '지시문 B' });
    expect(stripText(s).text).toBe('오답');
    s = stripReducer(s, { type: 'tick', nowMs: TOAST_MS });
    expect(stripText(s).text).toBe('지시문 B');
  });
  it('a plain message replaces a plain message immediately (latest wins)', () => {
    const s = msg(msg(base(), '첫째', 0), '둘째', 10);
    expect(stripText(s).text).toBe('둘째');
  });
  it('a plain message cannot replace a priority message within STRIP_HOLD_MS, but can after', () => {
    const p = msg(base(), '중요', 0, { priority: true });
    const early = msg(p, '일반', STRIP_HOLD_MS - 1);
    expect(stripText(early).text).toBe('중요');
    expect(early).toBe(p);
    const late = msg(p, '일반', STRIP_HOLD_MS);
    expect(stripText(late).text).toBe('일반');
  });
  it('a priority message replaces anything immediately', () => {
    const p1 = msg(base(), '중요1', 0, { priority: true });
    expect(stripText(msg(p1, '중요2', 5, { priority: true })).text).toBe('중요2');
    expect(stripText(msg(msg(base(), '일반', 0), '중요', 5, { priority: true })).text).toBe('중요');
  });
  it('tick without an expiring message returns the same state', () => {
    const s = base();
    expect(stripReducer(s, { type: 'tick', nowMs: 99999 })).toBe(s);
  });
  it('clear drops the message', () => {
    const s = stripReducer(msg(base(), '오답', 0), { type: 'clear' });
    expect(stripText(s).text).toBe('지시문 A');
  });
});

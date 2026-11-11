import { describe, it, expect } from 'vitest';
import { showBootError, BOOT_ERROR_TEXT } from '../../src/config/bootError.js';

function fakeDoc() {
  const byId = {};
  const body = { children: [], appendChild(el) { this.children.push(el); byId[el.id] = el; } };
  return {
    body,
    getElementById: id => byId[id] ?? null,
    createElement: () => ({ id: '', style: {}, attrs: {}, textContent: '', setAttribute(k, v) { this.attrs[k] = v; } }),
  };
}

describe('showBootError', () => {
  it('shows the plain Korean message in the page', () => {
    const doc = fakeDoc();
    const el = showBootError(doc);
    expect(BOOT_ERROR_TEXT).toBe('불러오지 못했어요.\n새로고침해 주세요.');
    expect(el.textContent).toBe(BOOT_ERROR_TEXT);
    expect(doc.body.children).toHaveLength(1);
  });
  it('does not stack a second message', () => {
    const doc = fakeDoc();
    showBootError(doc);
    showBootError(doc);
    expect(doc.body.children).toHaveLength(1);
  });
  it('never throws without a document', () => {
    expect(showBootError(undefined)).toBeNull();
  });
});

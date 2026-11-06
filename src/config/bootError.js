// Shown when boot() fails (e.g. the Phaser chunk does not load on school Wi-Fi). Plain DOM, no Phaser.
export const BOOT_ERROR_TEXT = '불러오지 못했어요.\n새로고침해 주세요.';

export function showBootError(doc = typeof document !== 'undefined' ? document : undefined) {
  if (!doc?.body) return null;
  let el = doc.getElementById('boot-error');
  if (!el) {
    el = doc.createElement('div');
    el.id = 'boot-error';
    el.setAttribute('role', 'alert');
    Object.assign(el.style, {
      position: 'fixed', inset: '0', zIndex: '20', display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '24px', textAlign: 'center', whiteSpace: 'pre-line', background: '#05070f', color: '#ffffff',
      font: '28px Orbit,"Malgun Gothic","Apple SD Gothic Neo","Noto Sans KR",sans-serif',
    });
    doc.body.appendChild(el);
  }
  el.textContent = BOOT_ERROR_TEXT;
  return el;
}

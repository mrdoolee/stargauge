import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

// The engine's hit blink must not kill the scene's own enemy tweens (the m4 stage pulse got stuck at 1.12x once).
const src = readFileSync(resolve(process.cwd(), 'src/scenes/BaseMissionScene.js'), 'utf8');
describe('engine enemy tweens', () => {
  it('never kills every tween of an enemy; it restarts only enemy.blinkTween', () => {
    expect(src).not.toMatch(/killTweensOf\(\s*enemy\s*\)/);
    expect(src).toMatch(/enemy\.blinkTween\?\.stop\(\)/);
    expect(src).toMatch(/enemy\.blinkTween = this\.tweens\.add\(/);
  });
});

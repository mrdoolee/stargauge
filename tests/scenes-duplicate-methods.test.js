import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

// A later class method with the same name silently overrides the earlier one (this froze m3 once).
const dir = resolve(process.cwd(), 'src/scenes');
describe('scene classes', () => {
  for (const f of readdirSync(dir).filter(n => n.endsWith('.js'))) {
    it(`${f} has no duplicate method names`, () => {
      const names = readFileSync(resolve(dir, f), 'utf8').split('\n')
        .map(l => /^\s{2}(?:async\s+|static\s+|get\s+|set\s+)?(\w+)\s*\([^)]*\)\s*\{/.exec(l)?.[1])
        .filter(Boolean);
      const dups = names.filter((n, i) => names.indexOf(n) !== i);
      expect(dups).toEqual([]);
    });
  }
});

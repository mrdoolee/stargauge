# Fonts

- `Orbit-Regular.woff2` - Orbit (Regular, the only weight), https://github.com/google/fonts/tree/main/ofl/orbit, downloaded 2026-11-07.
  Original `Orbit-Regular.ttf` (784 KB, TTF) converted to woff2 (218 KB) with fontTools + brotli; glyphs unchanged.
- `OFL.txt` - the SIL Open Font License 1.1 text with the copyright notice ("Copyright 2022 The Orbit Project Authors"). It must ship with the font.
- Loaded by `@font-face` in `index.html`; `src/main.js` waits for it (max 3 s) before the game starts. CSS fallbacks: Malgun Gothic, Apple SD Gothic Neo, Noto Sans KR.

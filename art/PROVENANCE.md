# Asset provenance

Status: **아직 생성 안 함** (nothing generated yet; spec section 7 requires the teacher's field test first).

Stars (7 colors), furnace blobs, beams, the ship, and the Q2 glass-craft illustration are currently drawn in code (no external assets).

| asset | model | date | prompt summary | source/license |
|---|---|---|---|---|
| ship | - | - | 아직 생성 안 함 | OpenAI Images API (dev time), terms to be recorded |
| asteroid-1..3 | - | - | 아직 생성 안 함 | OpenAI Images API |
| bg-space | - | - | 아직 생성 안 함 | OpenAI Images API |
| bg-furnace | - | - | 아직 생성 안 함 | OpenAI Images API |
| title-art | - | - | 아직 생성 안 함 | OpenAI Images API |
| glass-craft | - | - | 아직 생성 안 함 | OpenAI Images API |
| fire-button | - | - | 아직 생성 안 함 | OpenAI Images API |

When an asset is generated, fill in the exact model name (`OPENAI_IMAGE_MODEL`), date, prompt summary (the full prompt lives in `art/asset-manifest.json`), and license/terms note; also update the asset's `source` and `verification` fields in the manifest.

## NOIRLab / reference imagery

If any NOIRLab/NSF images are ever used as reference or in-game, credit them per their usage policy (CC BY 4.0 for most; credit line "NOIRLab/NSF/AURA" plus any specific credit on the image page) and record the image URL here. None are used so far.

## Checking images later

After generating and normalizing a PNG into `public/img/`, run per asset (example for the ship):

    python .claude/skills/create-game-assets/scripts/asset_report.py public/img/ship.png --expect-size 256x256 --require-alpha --json

Then add `{ key: 'ship', path: 'img/ship.png' }` to `src/config/assets.js` (only for files that exist, so nothing 404s).

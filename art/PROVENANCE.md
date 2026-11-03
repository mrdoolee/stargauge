# Asset provenance

Status: 그림체 A안 기준 그림만 생성됨(`art/raw/ship-style-a.png`, git 제외, 2026-11-03, 교사 승인). 나머지 에셋은 아직 생성 안 함.

Stars (7 colors), furnace blobs, beams, the ship, and the Q2 glass-craft illustration are currently drawn in code (no external assets).

| asset | model | date | prompt summary | source/license |
|---|---|---|---|---|
| style seed ship-style-a | OPENAI_IMAGE_MODEL (teacher set) | 2026-11-03 | style A look pick, script `art/raw/ship-style-a.prompt.mjs` | OpenAI Images API; not shipped |
| ship | - | - | 아직 생성 안 함 | OpenAI Images API (dev time), terms to be recorded |
| captain-base | - | - | 아직 생성 안 함 | OpenAI Images API, then sprite-gen |
| asteroid-1..3 | - | - | 아직 생성 안 함 | OpenAI Images API |
| star-shape, furnace-shape | - | - | 아직 생성 안 함 (grayscale only) | OpenAI Images API |
| bg-space-far, bg-space-near | - | - | 아직 생성 안 함 | OpenAI Images API |
| bg-furnace, bg-cluster | - | - | 아직 생성 안 함 | OpenAI Images API |
| title-art | - | - | 아직 생성 안 함 | OpenAI Images API |
| glass-craft | - | - | 아직 생성 안 함 | OpenAI Images API |
| fire-button | - | - | 아직 생성 안 함 | OpenAI Images API |
| briefing-m1..m4 | - | - | 아직 생성 안 함 | OpenAI Images API |

## sprite-gen (tool install, not an asset)

- Source: https://github.com/aldegad/sprite-gen
- Install path (outside the repo): `C:\Users\mrdoo\tools\sprite-gen`, venv `.venv`, installed with `pip install -e .`
- Cloned commit: `4f5ccd55c7cf06685a41f954acc1e476b7772ece` (package version 3.15.0), installed 2026-11-04 with Python 3.12.10
- Run: `C:\Users\mrdoo\tools\sprite-gen\.venv\Scripts\sprite-gen`
- Verified: `--help` and `capabilities` list prepare, gen-set, extract, compose-atlas, export-aseprite. No generation has been run.
- Account: Codex login only. If sprite-gen exits with code 75 (asks for another provider), stop and ask the teacher.

When an asset is generated, fill in the exact model name (`OPENAI_IMAGE_MODEL`), date, prompt summary (the full prompt lives in `art/asset-manifest.json`), and license/terms note; also update the asset's `source` and `verification` fields in the manifest.

## NOIRLab / reference imagery

If any NOIRLab/NSF images are ever used as reference or in-game, credit them per their usage policy (CC BY 4.0 for most; credit line "NOIRLab/NSF/AURA" plus any specific credit on the image page) and record the image URL here. None are used so far.

## Checking images later

After generating and normalizing a PNG into `public/img/`, run per asset (example for the ship):

    python .claude/skills/create-game-assets/scripts/asset_report.py public/img/ship.png --expect-size 256x256 --require-alpha --json

Then add `{ key: 'ship', path: 'img/ship.png' }` to `src/config/assets.js` (only for files that exist, so nothing 404s).

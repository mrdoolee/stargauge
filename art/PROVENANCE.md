# Asset provenance

Status: 2026-11-04 정지 그림 16개 생성·정리 완료(`public/img/`). 선장(captain-base)과 fire-button은 아직 생성 안 함. 원본은 `art/raw/`(git 제외).

Stars (7 colors) stay code-drawn; star-shape/furnace-shape are grayscale textures that code tints.

All generated with OpenAI Images API, model `gpt-image-2.5-sunburst` (from OPENAI_IMAGE_MODEL), date 2026-11-04. Full prompts are in `art/asset-manifest.json`. Normalized with `tools/normalize_image.py`.

| asset | model | date | prompt summary / notes | ref (art/raw/ship-style-a.png) |
|---|---|---|---|---|
| style seed ship-style-a | OPENAI_IMAGE_MODEL (teacher set) | 2026-11-03 | style A look pick, script `art/raw/ship-style-a.prompt.mjs` | - |
| ship | - | 2026-11-04 | normalized from the approved seed art/raw/ship-style-a.png: trimmed to alpha bbox, padded evenly to 64:76, 256x304 (fix round 1; was 256x256 contain); not regenerated | no (is the ref) |
| asteroid-1..3 | gpt-image-2.5-sunburst | 2026-11-04 | gray-brown chunky asteroid, 3 shapes (round / elongated / triangular with big crater), rim light | yes |
| star-shape | gpt-image-2.5-sunburst | 2026-11-04 | grayscale-white glow with thin cross spikes, tinted by code. Regenerated once (core was too gray: avg 233; prompt now asks for a large solid white core) -> check-white-core PASS 253/253/253 | no |
| furnace-shape | gpt-image-2.5-sunburst | 2026-11-04 | grayscale molten metal drop, tinted by code | no |
| bg-space-far | gpt-image-2.5-sunburst | 2026-11-04 | faint dark navy-indigo nebula, no stars | no |
| bg-space-near | gpt-image-2.5-sunburst | 2026-11-04 | faint transparent dust/nebula wisps overlay, no stars | no |
| bg-furnace | gpt-image-2.5-sunburst | 2026-11-04 | dark charcoal furnace-chamber plating. First try with ref drew a ship inside, rejected (raw kept as bg-furnace.try1-ship.png); regenerated without ref | no (retry); yes (rejected try) |
| bg-cluster | gpt-image-2.5-sunburst | 2026-11-04 | abstract navy/violet painterly nebula, no stars | no |
| title-art | gpt-image-2.5-sunburst | 2026-11-04 | mint-and-silver ship flying up through navy/teal nebula, top and bottom thirds open | yes |
| glass-craft | gpt-image-2.5-sunburst | 2026-11-04 | fix round 1: first image (bulb, yellow core/red rim, pipe) did not match quiz Q2; regenerated once without ref with a horizontal glass rod, left half yellow-white, right half orange-red, empty top half; 1536x1024 raw cropped to 1536x549 (rod at ~72% height) then 560x200; labels (가)/(나) are drawn at the centers of the halves, y = image center | no (retry); first try yes |
| briefing-m1 | gpt-image-2.5-sunburst | 2026-11-04 | furnace pouring molten metal white-yellow-orange-red | yes |
| briefing-m2 | gpt-image-2.5-sunburst | 2026-11-04 | observatory scanner dish and survey ship, mint/silver/navy | yes |
| briefing-m3 | gpt-image-2.5-sunburst | 2026-11-04 | fictional large red star and small blue star on navy | yes |
| briefing-m4 | gpt-image-2.5-sunburst | 2026-11-04 | abstract navy/violet nebula with the ship approaching from lower left | yes |
| captain-base | gpt-image-2.5-sunburst | 2026-11-04 | friendly veteran captain bust, cartoon-leaning style A, navy/silver jacket, tiny mint accent, gray-white hair and mustache, on flat #00ff00; no --ref (a ship ref would pull a ship into the portrait). Attempt 1 was too photoreal (resembled a real actor) and was rejected; attempt 2 kept. Raw: art/raw/captain-base.png (git-ignored). Teacher approval of the look deferred. | yes |
| fire-button | - | - | not generated yet | - |

Prompt changes this task: star-shape, furnace-shape, bg-space-far, bg-space-near, bg-cluster no longer carry the "chunky detailed panels and rivets" phrase (replaced with "crisp hand-painted HD, soft glow, no pixel art, no low-res blur"); star-shape asks for a large solid white core.

Terms: images generated with the OpenAI Images API under the account's terms; teacher approved use and billing.

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

## sprite-gen runs (Task 11)

- Tool: sprite-gen 3.15.0 at commit `4f5ccd55c7cf06685a41f954acc1e476b7772ece`, provider codex (ChatGPT login), date 2026-11-04.
- captain (states normal, smile, serious, surprised; 2 frames each; cell 256x320; magenta key): `prepare` OK in `C:\Users\mrdoo\tools\sprite-runs\captain`; `gen-set --provider codex` FAILED for all 4 states: "You've hit your usage limit ... try again at Nov 20th, 2026 9:08 AM". No frames generated yet.
- ship-engine (state burn, 3 frames, cell 128x152): request written at art/sprites/ship/sprite-request.json; not run (same Codex limit).
- No atlas files in public/img/ yet; `ATLAS_ASSETS` in src/config/assets.js is empty until they exist.

# 플레이 패턴·난이도, 그림, 선장 브리핑 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 별이 편대로 다양하게 나오고 중간·어려움이 분석한 아케이드 게임 수준으로 어려워지며, 생성 그림(A안)으로 바뀌고, 미션마다 선장 브리핑 화면이 나오게 한다.

**Architecture:** 편대·긴장도(rank)·속도 띠·안전 거리·보스 단계는 Phaser 없는 순수 모듈(`src/logic/`)로 만들고 단위 테스트한다. `BaseMissionScene`에 편대 감독(`WaveDirector`)을 붙여 미션 씬들이 "슬롯 하나 = 개체 하나"로 생성하게 한다. 그림은 개발 시점에만 OpenAI API(정지)와 sprite-gen(Codex, 움직임)으로 만들어 `public/img/`에 정적 파일로 넣고, 별 색은 계속 코드가 입힌다. 브리핑은 새 씬 `briefing`이다.

**Tech Stack:** Phaser 4.2.1, Vite, Vitest, Node 24 (게임), Python 3.12 + Pillow (그림 정리), OpenAI Images API, sprite-gen (aldegad/sprite-gen, Codex 로그인).

**Spec:** `docs/superpowers/specs/2026-11-03-patterns-art-briefing-design.md` (이 계획의 근거). 상위 스펙 `docs/superpowers/specs/2026-10-30-star-color-shooter-design.md`. 구현자는 둘 다 읽는다. 엔진 계약은 `src/scenes/BaseMissionScene.js` 맨 위 JSDoc.

**Branch:** `dev`.

## Global Constraints

- 엔진 `phaser@4.2.1`, 게임 해상도 720×1280 세로, `scale: FIT`. 화면 높이 H = 1280px. 속도는 H/s 단위로 정의하고 px/s로 바꿔 쓴다.
- **별의 크기·밝기는 어떤 판정·선체 온도 계산에도 쓰지 않는다.** 선체 온도 상승은 청색 최대 → 적색 최소로 엄격히 감소(모든 난이도).
- 배우는 내용(7색, 판정, `src/data/stars.js`, `src/data/copy.js`의 미션 지시, 퀴즈)과 `M4_TIME_LIMIT_SEC`는 바꾸지 않는다.
- 쉬움: 한 줄 비·V자·대각선 편대만, 조준 없음, 긴장도 고정. 쉬움 전체 예상 시간 ≤ 15분.
- 반응 시간 하한(초) — 목표 별 / 위험물: 쉬움 2.0 / 1.2, 중간 1.0 / 0.7, 어려움 0.8 / 0.5.
- 속도 띠(H/s) — 목표 별: 쉬움 0.10~0.15, 중간 0.25~0.35, 어려움 0.35~0.45. 위험물: 쉬움 0.09~0.18, 중간 0.375~0.55, 어려움 0.5~0.75.
- 함정 별은 별자리 묶음 영역 안으로 절대 들어가지 않는다. 실제 별자리 안에 가짜 별을 넣지 않는다.
- 배경 그림에 점 별·반짝임 금지. 이미지 안 글자·숫자·로고 금지. 별 7색을 다른 에셋의 주색으로 쓰지 않음.
- 생성 그림의 별·쇳물 모양 텍스처는 흰색·회색만. 색은 `src/logic/temperature.js`의 `STAR_COLORS`/`FURNACE_STAGES` 값을 코드가 입힌다.
- `.env`(키) 커밋 금지. 원본 그림은 `art/raw/`(git 제외), 정리된 그림만 `public/img/`. 생성마다 `art/PROVENANCE.md` 기록. sprite-gen은 Codex 로그인만 쓴다. 종료 코드 75(다른 경로 선택 요구)가 나오면 멈추고 교사에게 묻는다.
- 아틀라스 한 장 ≤ 2048×2048, PNG 한 장 ≤ 1MB 목표.
- 튜닝 수치는 모두 `src/config/balance.js`의 이름 있는 export. 순수 로직은 TDD. 매 Task 끝에 `npm test`, `npm run build` 통과.
- 새 버튼은 `src/ui/button.js`의 `armButton` 사용.
- 커밋 끝: 빈 줄 + `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.

## 계획에서 정한 해석 (스펙과 다르게 읽은 곳)

- **안전 거리**: 스펙 표의 45/30/20%는 미션 4 성단 위치(우주선 위 15~36%)에서는 쉬움에 흩어지는 별이 한 개도 안 나오게 만든다. 그래서 안전 거리를 **반응 시간 하한 × 그 위험물 속도**로 계산한다(`safeDistancePx`). 스펙의 진짜 목표인 반응 시간 하한은 그대로 지킨다. 화면 위 끝(보이지 않는 곳)에서 들어오는 개체는 출발 제한이 없고, 반응 시간을 "HUD 아래(`HUD_BAND_BOTTOM`=344)에서 우주선 기본 줄(`SHIP_START_Y`=900)까지"로 잰다.
- **속도 띠와 긴장도**: 띠의 아래 끝 = 긴장도 0단계 최소, 위 끝 = 3단계 최대. 중간·어려움은 띠를 4칸으로 나눠 단계마다 한 칸씩 올라간다. 쉬움은 단계가 없어 띠 전체에서 고른다.
- **미션 1 쇳물 덩어리**는 튜토리얼이라 지금 속도(`M1_BLOB_SPEED` × 난이도 배율)를 유지한다(흰색 구간 판정 `M1_HARD_GRACE_CHECK` 보존). 미션 1 소행성만 위험물 띠를 쓴다.
- **조준 한 발**은 "내려오다 방향을 튼다" 대신 화면 위(보이지 않는 곳)에서 출발할 때 우주선 쪽으로 방향을 정한다. 위에서 들어오는 개체라 안전 거리 문제가 없고, 반응 시간 하한 테스트(Task 2)가 그대로 적용된다.
- **소행성 회전**은 지금처럼 코드(각속도)로 한다. sprite-gen 움직임은 선장 표정·탐사선 엔진 불꽃만.

## Review Focus

1. 우주선을 화면 위쪽(`SHIP_BOUNDS.minY`=320)까지 올린 학생: 위에서 들어오는 별은 막을 수 없지만, 성단 근처에서 갑자기 튀어나오는 별(미션 4)은 안전 거리 규칙이 막아야 한다. 테스트는 Task 2·7에 있다.
2. 선체 온도가 가득 차서 같은 미션을 3번 이상 다시 할 때: 자비 단계는 최대 2단계에서 멈추고, 브리핑은 다시 안 나와야 한다. 자비 상한 테스트는 Task 1, 브리핑 건너뛰기 확인은 Task 13 Step 4(c).
3. 미션 2에서 필요한 색이 편대 안에 계속 안 나올 때: 3번 연속 빠지면 편대 한 자리가 필요한 색으로 바뀌어야 한다. 테스트는 Task 5에 있다.
4. 생성 별 텍스처의 중심이 완전한 흰색이 아닐 때: 입힌 색이 교과서 색에서 벗어난다. 검사는 Task 10(`--check-white-core`)과 Task 12(`tintPixels` 테스트)에 있다.
5. 선장·브리핑 그림 파일이 없을 때(생성 전, 404): 브리핑은 코드 실루엣·빈 패널로 정상 표시돼야 한다. 테스트는 Task 13(`briefingParts`)에 있다.

---

## 1부 — 플레이 패턴과 난이도

### Task 1: 긴장도(rank) 모듈

**Files:**
- Create: `src/logic/rank.js`
- Modify: `src/config/balance.js` (아래 상수)
- Test: `tests/logic/rank.test.js`

**Interfaces:**
- Produces: `createRank({ diffKey: 'easy'|'normal'|'hard', restarts: number }) → Rank`
  - `Rank.value: number`, `Rank.tier: 0|1|2|3`, `Rank.update(dtMs: number): void`, `Rank.onCorrect(): void`, `Rank.aimAllowed: boolean`.
- balance.js: `RANK_START = { easy: 0, normal: 2, hard: 5 }`, `RANK_SURVIVAL = { firstStepMs: 30000, stepMs: 20000, maxSteps: 8 }`, `RANK_PER_CORRECT = 0.5`, `RANK_MERCY_PER_RESTART = 2`, `RANK_MERCY_MAX_RESTARTS = 2`, `RANK_TIER_AT = [0, 4, 7, 10]` (tier = 이 값 이상인 마지막 칸), `RANK_AIM_MIN = 4`. 수치는 시작값, 구현자가 조정 가능하지만 테스트의 관계는 지킨다.

- [ ] **Step 1: 실패 테스트**
  - `easy: tier stays 0 and aim stays off forever` — `createRank({diffKey:'easy',restarts:0})`, `update(600000)`, `onCorrect()` ×50 → `tier===0`, `aimAllowed===false`.
  - `normal: survival steps after 30 s then every 20 s` — `update(29999)` 뒤 value = RANK_START.normal, `update(1)` 뒤 +1, `update(20000)` 뒤 +2. 최대 `maxSteps`에서 멈춤.
  - `hard starts higher than normal` — 같은 입력에서 hard.value > normal.value, hard.tier ≥ normal.tier.
  - `mercy: each restart lowers the start, capped at 2 restarts` — normal restarts 0/1/2/5 → value 2, 0, -2, -2 (음수 허용, tier는 0으로 고정).
  - `tier is monotonic in value and bounded 0..3`.
  - `aimAllowed only when value >= RANK_AIM_MIN and not easy`.
- [ ] **Step 2: 실행해서 실패 확인** — `npx vitest run tests/logic/rank.test.js` → FAIL (module not found)
- [ ] **Step 3: `createRank` 구현** (`src/logic/rank.js`). 생존 시간은 누적 ms로 보관하고 value = start − mercy + survivalSteps + correct×RANK_PER_CORRECT.
- [ ] **Step 4: 통과 확인** — 같은 명령 → PASS
- [ ] **Step 5: 커밋** — `feat(logic): rank (tension) model with survival steps and restart mercy`

### Task 2: 속도 띠, 반응 시간, 안전 거리, 조준

**Files:**
- Create: `src/logic/speed.js`
- Modify: `src/config/balance.js`
- Test: `tests/logic/speed.test.js`

**Interfaces:**
- Consumes: `getDifficulty` (`src/logic/difficulty.js`), `HUD_BAND_BOTTOM`, `SHIP_START_Y`, `GAME_HEIGHT`.
- balance.js: `SPEED_BANDS_H = { target: { easy:[0.10,0.15], normal:[0.25,0.35], hard:[0.35,0.45] }, hazard: { easy:[0.09,0.18], normal:[0.375,0.55], hard:[0.5,0.75] } }`, `REACTION_FLOOR_SEC = { target: { easy:2.0, normal:1.0, hard:0.8 }, hazard: { easy:1.2, normal:0.7, hard:0.5 } }`, `AIM_MAX_ANGLE_DEG = 35`.
- Produces:
  - `speedBand(category: 'target'|'hazard', diffKey, tier: 0..3) → { min: px/s, max: px/s }` (쉬움은 tier 무시, 띠 전체)
  - `speedFor(category, diffKey, tier, rng = Math.random) → px/s`
  - `topEntryReactionSec(speedPxS) → number` = (SHIP_START_Y − HUD_BAND_BOTTOM) / speed
  - `safeDistancePx(category, diffKey, speedPxS) → number` = REACTION_FLOOR_SEC × speed
  - `canLaunch({ fromY, shipY, speedPxS, category, diffKey }) → boolean` (shipY − fromY ≥ safeDistancePx)
  - `aimVelocity(from: {x,y}, to: {x,y}, speedPxS, maxAngleDeg = AIM_MAX_ANGLE_DEG) → { vx, vy }` (vy > 0 항상, 수직에서 최대 각도로 잘림, |v| = speed)

- [ ] **Step 1: 실패 테스트**
  - `bands match the spec` — 각 카테고리·난이도에서 `speedBand(c,d,0).min ≈ SPEED_BANDS_H[c][d][0]*1280`, `speedBand(c,d,3).max ≈ [1]*1280`; 중간·어려움은 tier마다 min이 증가.
  - `top-entry reaction floors hold at the fastest speed` — 모든 c,d에서 `topEntryReactionSec(speedBand(c,d,3).max) >= REACTION_FLOOR_SEC[c][d]`.
  - `canLaunch refuses launches closer than the floor` — hazard/normal, speed 500: shipY−fromY = 349 → false, 351 → true.
  - `aimVelocity never points up and keeps the speed` — to가 from보다 위에 있어도 vy > 0; `Math.hypot(vx,vy) ≈ speed`; 정옆 목표 → 각도 = 35°.
  - `speedFor stays inside the band` — rng 0과 0.999999.
- [ ] **Step 2: 실패 확인** — `npx vitest run tests/logic/speed.test.js` → FAIL
- [ ] **Step 3: 구현** (`src/logic/speed.js`)
- [ ] **Step 4: 통과 확인** → PASS
- [ ] **Step 5: 커밋** — `feat(logic): speed bands, reaction floors, safe distance and aim`

### Task 3: 편대 모듈

**Files:**
- Create: `src/logic/formations.js`
- Test: `tests/logic/formations.test.js`

**Interfaces:**
- Produces:
  - `FORMATION_IDS = ['line', 'vee', 'diagonal', 'pincer', 'zigzag', 'aimed']`, `EASY_FORMATION_IDS = ['line', 'vee', 'diagonal']`
  - `pickFormation({ prevId, prevSide, diffKey, aimAllowed, rng }) → { id, side: 'left'|'center'|'right' }` — 직전 id·side와 다름. 쉬움은 EASY 목록만, `aimed`는 aimAllowed일 때만.
  - `buildFormation({ id, side, count, minX, maxX, rng }) → Slot[]`, `Slot = { delayMs, x, vx, aim: boolean, zigzag: { amp, periodMs } | null }`. `count`는 3~5(aimed는 1). x는 [minX, maxX] 안.
  - `escapeGapOk(slots, { shipWidth, minX, maxX, windowMs = 400 }) → boolean` — delay가 windowMs 안에 겹치는 슬롯끼리 x 사이 최대 빈틈이 `1.5 × shipWidth` 이상.
- 각 모양: line = 같은 줄 시간차 + 빈틈 하나, vee/역V는 side로 방향, diagonal = 한쪽 위에서 비스듬히(vx 부호 = side 반대쪽), pincer = 좌우 끝에서 가운데로(vx 안쪽), zigzag = `zigzag` 값, aimed = 1개 `aim: true`.

- [ ] **Step 1: 실패 테스트**
  - `never repeats the previous formation or side` — 1000번 연속 pick(시드 rng)에서 id·side 연속 중복 없음.
  - `easy only gets line/vee/diagonal and never aimed`.
  - `aimed only when aimAllowed`.
  - `every built formation leaves an escape gap` — 모든 id × side × count 3..5 × 시드 200개, minX 70, maxX 650, shipWidth 64 → `escapeGapOk` true.
  - `slots stay inside [minX, maxX]`.
- [ ] **Step 2: 실패 확인** — `npx vitest run tests/logic/formations.test.js` → FAIL
- [ ] **Step 3: 구현.** 테스트용 시드 rng(mulberry32)를 `src/logic/rng.js`에 `seededRng(seed) → () => number`로 두고 테스트에서 쓴다.
- [ ] **Step 4: 통과 확인** → PASS
- [ ] **Step 5: 커밋** — `feat(logic): formation library with no-repeat picking and escape gaps`

### Task 4: 편대 감독(WaveDirector) + 베이스 씬 연결

**Files:**
- Create: `src/logic/waves.js`
- Modify: `src/scenes/BaseMissionScene.js` (JSDoc 계약 갱신 포함), `src/config/balance.js`
- Test: `tests/logic/waves.test.js`

**Interfaces:**
- Consumes: `createRank` (Task 1), `pickFormation`, `buildFormation` (Task 3).
- balance.js: `WARMUP_MS = 12000`, `WARMUP_DENSITY = 0.7`, `FORMATION_GAP_MS = { m1: 2600, m2: 3200, m3: 2400, m4: 0 }` (편대 사이 쉼, 난이도 `spawnInterval` 배율 적용), `RANK_GAP_SHRINK = 0.08` (tier당 쉼 감소 비율).
- Produces: `class WaveDirector`
  - `constructor({ diffKey, restarts, gapMs, minX, maxX, rng = Math.random })`
  - `update(dtMs) → SpawnSlot[]` — 지금 내보낼 슬롯. `SpawnSlot = Slot & { formationId, tier, aimAllowed }`.
  - `onCorrect()` (rank에 전달), `get rank()`.
  - 몸풀기: 처음 WARMUP_MS 동안 편대 count를 `ceil(count × WARMUP_DENSITY)`로 줄이고 aimAllowed=false.
- BaseMissionScene: phase에 `waves: true`가 있으면 Spawner 대신 `WaveDirector`를 만들고(`restarts` = registry `results.<missionId>.restarts`), 매 프레임 `update` 결과의 각 슬롯마다 `this.spawnObject(phase, slot)`을 호출한다. 정답 처리 시 `director.onCorrect()`. `waves`가 없으면 지금 동작 그대로.

- [ ] **Step 1: 실패 테스트**
  - `first formation waits for the gap, then slots come out in delay order`.
  - `warm-up: fewer slots and no aim in the first 12 s` — hard, rng 고정: 0~12초 슬롯 중 aim 없음, 편대당 평균 개수 < 이후.
  - `gap shrinks as the tier rises` — rank를 올린 director의 편대 간격 < 처음.
  - `restart mercy reaches the rank` — restarts 2 → `director.rank.value` < restarts 0.
- [ ] **Step 2: 실패 확인** — `npx vitest run tests/logic/waves.test.js` → FAIL
- [ ] **Step 3: `WaveDirector` 구현 + BaseMissionScene 연결** (JSDoc에 `waves`, `spawnObject(phase, slot)` 설명 추가)
- [ ] **Step 4: 통과 확인** — `npm test` 전체 PASS, `npm run build` 성공
- [ ] **Step 5: 커밋** — `feat: wave director drives formation spawns in missions`

### Task 5: 미션 1·2를 편대로

**Files:**
- Modify: `src/scenes/M1FurnaceScene.js`, `src/scenes/M2GaugeScene.js`, `src/logic/spawner.js`, `src/config/balance.js`
- Test: `tests/logic/spawner.test.js`

**Interfaces:**
- Consumes: `SpawnSlot` (Task 4), `speedFor`, `aimVelocity`, `canLaunch` (Task 2).
- Produces: `fillFormationColors({ slotCount, needed, all, sinceNeeded, rng }) → { colors: string[], sinceNeeded: number }` (`src/logic/spawner.js`) — 슬롯마다 색. 편대 전체에 필요한 색이 없고 sinceNeeded+1 ≥ `SPAWN_NEEDED_GUARANTEE`면 무작위 한 자리를 필요한 색으로 바꾼다. 필요한 색이 한 자리라도 있으면 sinceNeeded = 0, 없으면 +1.

- [ ] **Step 1: 실패 테스트** — `fillFormationColors`: (a) 3번 연속 필요한 색이 없을 때 다음 편대에 반드시 하나 포함, (b) 필요한 색이 비면 강제 없음, (c) 색은 `all` 안에서만.
- [ ] **Step 2: 실패 확인** → FAIL
- [ ] **Step 3: 구현**
  - `fillFormationColors` 구현.
  - 미션 2: 두 단계 모두 `waves: true`. 슬롯마다 별 1개, 속도 `speedFor('target', diff, slot.tier)`, x·vx는 슬롯 값. 크기·빛 번짐은 지금처럼 색과 무관한 무작위. `spawnXAwayFrom` 사용은 제거.
  - 미션 1: 연습 단계는 그대로(편대 없음 가능). 시험 단계는 `waves: true`로 쇳물 덩어리를 편대로(속도는 지금 `M1_BLOB_SPEED` × 배율 유지). 소행성은 `aimed` 슬롯을 소행성으로 만들고 속도 `speedFor('hazard', …)`. 따로 돌던 소행성 타이머는 없앤다. 조준 소행성은 화면 위에서 출발할 때 `aimVelocity`로 방향을 정한다.
  - 지그재그 슬롯은 씬의 `onMissionUpdate`에서 `vx = amp × cos(…)`로 흔든다(공통 헬퍼를 BaseMissionScene에 `applyZigzag(obj, dt)`로 두고 m1~m3가 같이 쓴다).
- [ ] **Step 4: 통과 확인** — `npm test`, `npm run build`. `npm run dev`로 미션 1·2를 쉬움/중간/어려움 각각 1분씩 해 보고, 편대가 섞여 나오고 같은 편대가 연달아 안 나오는지 눈으로 확인한다.
- [ ] **Step 5: 커밋** — `feat(m1,m2): formation waves with needed-color guarantee`

### Task 6: 미션 3 — 별자리가 좌우로 오가고 함정이 양쪽에서

**Files:**
- Modify: `src/logic/constellation.js`, `src/scenes/M3TrapScene.js`, `src/config/balance.js`
- Test: `tests/logic/constellation.test.js`

**Interfaces:**
- balance.js: `M3_SWAY = { periodMs: 9000 }` (진폭은 화면 안에 묶음이 다 보이는 최대값으로 계산).
- Produces (`src/logic/constellation.js`):
  - `groupExtent(sprites) → { left, right }` (originX 기준 상대값)
  - `groupSwayX(tMs, { extent, screenW, edge = SCREEN_EDGE, periodMs }) → originX` — 묶음 전체가 화면 안, 좌우 끝까지 오감.
  - `groupBox(originX, groupY, sprites, height) → { left, right, top, bottom }`
  - `isTrapPathClear({ x, vx, vy, y0, t0Ms }, boxAt: (tMs) => box, { trapHalf, gap = TRAP_GAP, screenH, stepMs = 50 }) → boolean` — 함정이 화면을 지나는 동안 50ms마다 함정 사각형(±trapHalf+gap)이 그 시각의 묶음 상자와 겹치지 않으면 true.
- 기존 `trapLane`은 더 안 쓰면 삭제하고 테스트도 정리한다.

- [ ] **Step 1: 실패 테스트**
  - `sway keeps the whole group on screen and reaches both sides` — 한 주기 샘플링: left ≥ edge, right ≤ 720−edge, 최소 originX와 최대 originX 차이 ≥ 200.
  - `trap path check rejects a trap that would cross the group`, `accepts one that passes beside it`.
  - `simulation: no accepted trap ever overlaps the group` — 시드 rng로 2000개 함정 후보(편대 슬롯 x, 위험물 속도)를 만들고 통과한 것만 시뮬레이션: 어떤 시각에도 겹침 0.
  - `traps come from both sides` — 통과한 함정 중 x < 360인 것과 x > 360인 것이 모두 20% 이상.
- [ ] **Step 2: 실패 확인** → FAIL
- [ ] **Step 3: 구현.** M3 두 단계에 `waves: true`. 슬롯마다 함정 1개, 속도 `speedFor('hazard', …)`, `isTrapPathClear`가 false면 그 슬롯은 건너뛴다. 묶음 위치는 `onMissionUpdate`에서 `groupSwayX`(가로) + 기존 `advanceGroup`(세로).
- [ ] **Step 4: 통과 확인** — `npm test`, `npm run build`, `npm run dev`로 미션 3에서 함정이 양쪽에서 오는지 확인.
- [ ] **Step 5: 커밋** — `feat(m3): swaying constellation group, traps from both sides`

### Task 7: 미션 4 — 보스 3단계와 빈틈 구간

**Files:**
- Create: `src/logic/boss.js`
- Modify: `src/scenes/M4JewelboxScene.js`, `src/config/balance.js`
- Test: `tests/logic/boss.test.js`

**Interfaces:**
- Consumes: `speedFor`, `canLaunch`, `aimVelocity` (Task 2), `createRank` (Task 1).
- balance.js: `BOSS_STAGE_AT = [0, 1/3, 2/3]`, `BOSS_ATTACK_MS = { 1: 4000, 2: 4500, 3: 5000 }`, `BOSS_GAP_MS = 2500`, `BOSS_VOLLEY_MS = { 1: 1100, 2: 1300, 3: 1200 }` (공격 구간 안 발사 간격, 난이도 `spawnInterval` 배율), `BOSS_FAN = { 2: { count: [2,3], spreadDeg: 30 }, 3: { count: [2,3], spreadDeg: 36 } }`, `BOSS_GAP_DIM_ALPHA = 0.55`.
- Produces (`src/logic/boss.js`):
  - `bossStage(taggedFraction) → 1|2|3`
  - `bossCycle(stage, tInStageMs) → { attacking: boolean, gapJustStarted: boolean }` — 공격 BOSS_ATTACK_MS → 빈틈 BOSS_GAP_MS 반복.
  - `fanVelocities(baseAngleDeg, count, spreadDeg, speed) → {vx,vy}[]` — 모두 vy > 0.
  - `pickLaunchSource(members, ship, { speedPxS, diffKey }) → member | null` — 보스 아닌 청색 성단 별 중 `canLaunch('hazard')`를 만족하는 것만, 없으면 null.

- [ ] **Step 1: 실패 테스트**
  - `stage follows the tagged fraction` — 0→1, 0.33→1, 0.34→2, 0.67→3, 1→3.
  - `cycle alternates attack and gap` — gapJustStarted가 공격 뒤 정확히 한 번 true.
  - `fan never shoots upward and keeps the count`.
  - `no launch source closer than the safe distance` — 우주선 y 900, 성단 별 y 700 하나뿐, hazard/hard 속도 600 → 안전 거리 300 → null. y 560 → 그 별.
  - `easy still gets launches from the cluster` — 실제 `JEWELBOX` 배치 + `M4_CLUSTER_AREA`, 우주선 y 900, 쉬움 최대 속도에서 `pickLaunchSource`가 null이 아님.
- [ ] **Step 2: 실패 확인** → FAIL
- [ ] **Step 3: 구현.** M4는 `waves` 대신 자체 공격 루프: 단계·주기에 따라 단계 1은 한 발, 2는 부채꼴, 3은 부채꼴 + `aimVelocity` 한 발(긴장도 `aimAllowed`일 때). 빈틈 시작 시 성단 별 alpha를 BOSS_GAP_DIM_ALPHA로 낮췄다가 공격 재개 때 1로. 속도 `speedFor('hazard', …)`. 기존 `M4_SCATTER_*` 중 안 쓰는 상수 정리.
- [ ] **Step 4: 통과 확인** — `npm test`, `npm run build`, `npm run dev`로 미션 4 세 단계와 빈틈 확인.
- [ ] **Step 5: 커밋** — `feat(m4): three boss stages with attack/gap cycle and safe launches`

### Task 8: 균형 점검과 예상 시간

**Files:**
- Modify: `src/logic/difficulty.js` (`heatInflowPerSec`를 편대 기준으로), `src/logic/flow.js`, `src/config/balance.js` (`DIFFICULTY_MULTIPLIERS` 정리), `tests/logic/difficulty.test.js`, `tests/logic/flow.test.js`, `docs/superpowers/specs/2026-10-30-star-color-shooter-design.md` (4-1, 5.1, 6, 7에 "2026-11-03 개정: 새 설계 문서 참고" 한 줄씩)

**Interfaces:**
- Produces: `estimateFlow({ difficulty })`의 rows에 `briefing` 행(미션마다 25초, Task 13에서 씬이 생김)을 넣는다: 순서 `['title','briefing-m1','m1','briefing-m2','m2','briefing-m3','m3','briefing-m4','m4','report','result']`.

- [ ] **Step 1: 테스트 갱신(실패 확인)**
  - flow: `easy lands at or under 15 minutes` (`estimateFlow({difficulty:'easy'}).totalSec <= 900`), `normal and hard take longer than easy`, rows 순서 위와 같음. 기존 "14~16분" 테스트는 삭제(스펙 개정: 쉬움만 15분).
  - difficulty: `requiredDodgeFraction`이 편대 평균 개수·간격 기준으로 계산되도록 테스트 유지 — 쉬움 ≤ 0.4, 어려움 < 0.9, 난이도 순 증가.
- [ ] **Step 2: 구현 + 수치 조정** — 테스트를 맞추도록 `FORMATION_GAP_MS`, 선체 온도 배율 등을 조정. 색 순서 테스트는 그대로 통과해야 한다.
- [ ] **Step 3: 통과 확인** — `npm test`, `npm run build`
- [ ] **Step 4: 상위 스펙에 개정 표시, 커밋** — `chore: rebalance for formations; easy stays within 15 minutes`
- [ ] **Step 5: 교사 플레이 점검 (멈춤)** — `npm run dev` 주소를 교사에게 주고 쉬움·중간·어려움을 해 보게 한다. "계속/수정" 답을 받은 뒤 2부로 간다.

---

## 2부 — 그림

### Task 9: sprite-gen 설치와 그림 방향 문서 갱신

**Files:**
- Modify: `art/art-direction-brief.md` (A안 기준, 기준 그림 `art/raw/ship-style-a.png`), `art/asset-manifest.json` (새 에셋), `art/PROVENANCE.md`
- Test: `tests/tools/gen-images.test.js`

**Interfaces:**
- 새 manifest id: `ship`(기존), `captain-base`, `asteroid-1..3`(기존), `star-shape`, `furnace-shape`, `bg-space-far`, `bg-space-near`, `bg-furnace`(기존), `bg-cluster`, `title-art`(기존), `glass-craft`(기존), `briefing-m1`..`briefing-m4`. `bg-space`는 `bg-space-far`로 바꾼다. 각 항목에 `technical.request_size`, `technical.alpha`, `technical.target_size`.

- [ ] **Step 1: 실패 테스트 추가** (`tests/tools/gen-images.test.js`)
  - `star-shape and furnace-shape prompts demand grayscale/white only` — 프롬프트에 "grayscale" 또는 "white only"가 있고 색 이름(blue, red, orange, yellow)을 주색으로 요구하지 않음.
  - `background prompts forbid point stars` — `bg-*` 프롬프트에 "no stars" 또는 "no star points" 포함.
  - `every asset has request_size, alpha and target_size`.
- [ ] **Step 2: 실패 확인** — `npx vitest run tests/tools/gen-images.test.js` → FAIL
- [ ] **Step 3: manifest·brief 갱신**. 프롬프트는 A안 스타일 문장(손으로 그린 고해상도 아케이드풍, 패널·리벳 디테일, 셀 셰이딩, 은은한 빛, 도트·2차 대전 분위기 금지)을 공통으로 쓴다. 브리핑 그림 내용은 스펙 5.2를 따른다(글자 없음, m3는 이름 없는 크고 붉은 별과 작고 푸른 별, m4는 추상 성단).
- [ ] **Step 4: sprite-gen 설치(저장소 밖)** — `git clone https://github.com/aldegad/sprite-gen C:\Users\mrdoo\tools\sprite-gen`, 그 안에서 `python -m venv .venv`, `.venv\Scripts\pip install -e .`, `.venv\Scripts\sprite-gen --help`와 `sprite-gen capabilities` 출력에서 `prepare`, `gen-set`, `extract`, `compose-atlas`, `export-aseprite`가 있는지 확인. 설치 위치·버전(커밋 해시)을 `art/PROVENANCE.md`에 적는다. Windows에서 실패하면 멈추고 보고한다.
- [ ] **Step 5: 통과 확인 + 커밋** — `npm test`; 커밋 `docs(art): style A brief, manifest for new assets, sprite-gen setup`

### Task 10: 정지 그림 생성과 정리

**Files:**
- Modify: `tools/gen-images.mjs` (`--out <path>` 옵션: 기본 `art/raw/<id>.png`), `art/PROVENANCE.md`, `src/config/assets.js`
- Create: `tools/normalize_image.py`, `public/img/*.png`
- Test: `tests/tools/gen-images.test.js` (`parseArgs` `--out`)

**Interfaces:**
- `python tools/normalize_image.py <in.png> <out.png> --size WxH [--alpha] [--fit contain|cover] [--max-kb 1024]` — Pillow로 자르기·줄이기, 투명 유지, 용량 넘으면 PNG 양자화.
- `python tools/normalize_image.py --check-white-core <star-shape.png>` — 중심 반지름 20% 안 픽셀의 평균이 R,G,B 모두 ≥ 250이고 채도 ≤ 0.04면 0으로 끝남, 아니면 1.

- [ ] **Step 1: `--out` 테스트 추가 → 실패 확인 → 구현 → 통과**
- [ ] **Step 2: 생성** — `node --env-file=.env tools/gen-images.mjs <id>`로 다음 순서. 탐사선은 기준 그림(`art/raw/ship-style-a.png`)을 그대로 정리해 쓰고, 나머지는 `--ref art/raw/ship-style-a.png`로 같은 그림체를 맞춘다: `star-shape`, `furnace-shape`, `asteroid-1..3`, `bg-space-far`, `bg-space-near`, `bg-furnace`, `bg-cluster`, `title-art`, `glass-craft`, `briefing-m1..m4`. (선장은 Task 11.)
- [ ] **Step 3: 정리** — 각 그림을 `normalize_image.py`로 `public/img/<id>.png`에 manifest `target_size`대로. `star-shape`은 `--check-white-core` 통과해야 함(실패하면 다시 생성).
- [ ] **Step 4: 검수** — `python .claude/skills/create-game-assets/scripts/asset_report.py public/img/<id>.png --expect-size <WxH> [--require-alpha] --json`, `build_preview_sheet.py`로 한 장 미리보기 시트를 만들어 교사에게 보여 준다. **교사 승인 전에는 다음 Task로 가지 않는다.** 고쳐 달라는 그림만 다시 생성.
- [ ] **Step 5: 기록·커밋** — `art/PROVENANCE.md`(모델, 날짜, 프롬프트 요약), `src/config/assets.js`의 `IMAGE_ASSETS`에 실제 있는 파일만 추가. 커밋 `art: generated stills in style A`

### Task 11: 선장 표정·엔진 불꽃 스프라이트(sprite-gen)

**Files:**
- Create: `art/sprites/captain/sprite-request.json`, `art/sprites/ship/sprite-request.json`, `public/img/captain.png` + `public/img/captain.json`, `public/img/ship-engine.png` + `public/img/ship-engine.json`
- Modify: `art/PROVENANCE.md`, `src/config/assets.js` (아틀라스 로드 목록 `ATLAS_ASSETS = [{ key, png, json }]`, `loadImages`에서 `scene.load.aseprite(key, png, json)`)

**Interfaces:**
- Produces: Phaser 아틀라스 키 `captain`(프레임 태그 `normal`, `smile`, `serious`, `surprised`), `ship-engine`(태그 `burn`, 2~4프레임 반복).
- `BRIEFING_EXPRESSIONS = ['normal','smile','serious','surprised']`(`src/config/assets.js`) — Task 12가 쓴다.

- [ ] **Step 1: 선장 기준 그림** — manifest `captain-base`(상반신, 친근한 베테랑 우주 선장, A안 그림체, 글자 없음, 초록·흰 단색 배경)를 `--ref art/raw/ship-style-a.png`로 생성. 교사에게 보여 주고 **승인받을 때까지 다시 생성**(외모 승인은 교사).
- [ ] **Step 2: sprite-gen 실행 (Codex)** — `prepare --out-dir <run> --character-id captain --base-image art/raw/captain-base.png --request art/sprites/captain/sprite-request.json` → `gen-set --run-dir <run> --provider codex` → `extract` → `compose-atlas` → `inspect` → `export-aseprite`. request의 상태(state) 4개 = 표정 4개, 각 1~2프레임. sprite-gen의 실제 request 형식은 설치본 `docs/run-contract.md`를 읽고 맞춘다. 종료 코드 75면 멈추고 교사에게 묻는다. 탐사선 엔진 불꽃도 같은 방법(`art/raw/ship-style-a.png` 기준, 상태 `burn`).
- [ ] **Step 3: 정리·검수** — 아틀라스 ≤ 2048², PNG ≤ 1MB(`normalize_image.py`로 줄이기), `inspect` 결과에 빈 프레임·크로마 잔여물 없음. 교사에게 표정 GIF(`compose-gif`) 확인.
- [ ] **Step 4: 로드 연결** — `ATLAS_ASSETS`에 추가, 없는 파일은 목록에 넣지 않음. `npm test`, `npm run build`.
- [ ] **Step 5: 기록·커밋** — `art: captain expressions and ship engine sprites (sprite-gen)`

### Task 12: 게임에 그림 적용 (별 색 입히기, 시차 배경)

**Files:**
- Create: `src/objects/tint.js`, `src/objects/parallax.js`
- Modify: `src/objects/starTextures.js`, `src/scenes/BaseMissionScene.js` (배경·탐사선 엔진), `src/scenes/M1FurnaceScene.js` (`backdropKey = 'bg-furnace'`), `src/scenes/M4JewelboxScene.js` (`bg-cluster`), `src/scenes/TitleScene.js`, `src/scenes/ReportScene.js`(유리 공예), `docs/device-check.md` (그림 교체 뒤 FPS 재측정 항목)
- Test: `tests/objects/tint.test.js`

**Interfaces:**
- `tintPixels(rgba: Uint8ClampedArray, hex: number) → Uint8ClampedArray` (새 배열) — 픽셀마다 R,G,B에 색 성분/255를 곱함, 알파 유지.
- `starTextures.js`: `star-shape` 이미지가 로드돼 있으면 `star-<colorKey>`를 그 모양 × `tintPixels`로 캔버스 텍스처로 굽고, 없으면 지금 코드 그림. `furnace-shape`도 같은 방식으로 `furnace-<key>`. 키 이름·크기(`STAR_TEX`=128)·Arcade 바디 반지름(`STAR_CORE_R`)은 그대로.
- `createParallax(scene, [{ key, speedPxS }]) → { update(dtMs) }` — TileSprite 세로 스크롤, 없는 키는 건너뜀.

- [ ] **Step 1: 실패 테스트** — `tintPixels`: 흰 픽셀(255,255,255,a) × 각 `STAR_COLORS` hex = 정확히 그 색, 알파 유지, 검정은 검정, 입력 배열 안 바뀜.
- [ ] **Step 2: 실패 확인** — `npx vitest run tests/objects/tint.test.js` → FAIL
- [ ] **Step 3: 구현** — `tint.js`, `starTextures.js` 분기, `parallax.js`(`bg-space-far` 15 px/s, `bg-space-near` 40 px/s), 탐사선 엔진 아틀라스는 탐사선 아래에 붙여 `burn` 반복(없으면 생략).
- [ ] **Step 4: 통과 확인** — `npm test`, `npm run build`, `npm run dev`. 7색 별을 한 화면에 띄우는 디버그 확인(기존 `src/config/debug.js` 방식)을 하고 스크린샷을 교사에게 보여 준다. `npm run preview` 빌드로 탭 S6 Lite FPS 측정 요청(`docs/device-check.md`).
- [ ] **Step 5: 커밋** — `feat(art): tinted generated star shapes, parallax backgrounds, new art in scenes`

---

## 3부 — 선장 브리핑

### Task 13: 브리핑 문구 데이터와 브리핑 씬

**Files:**
- Create: `src/data/briefing.js`, `src/scenes/BriefingScene.js`
- Modify: `src/main.js` (씬 등록), `src/scenes/TitleScene.js` (`scene.start('briefing', { mission: 'm1' })`), `src/scenes/M1FurnaceScene.js`·`M2GaugeScene.js` (카드의 `next`를 `'briefing'`, `nextData: { mission: 'm2' | 'm3' }`), `src/scenes/M3TrapScene.js` (`scene.start('briefing', { mission: 'm4' })`), `src/scenes/CardScene.js` (`nextData` 그대로 넘기는지 확인)
- Test: `tests/data/briefing.test.js`, `tests/logic/flow.test.js`(Task 8 행 이미 있음)

**Interfaces:**
- Consumes: `ATLAS_ASSETS`/`BRIEFING_EXPRESSIONS` (Task 11), `hasImage` (`src/config/assets.js`), `createGaugeView` (`src/objects/gaugeView.js`), `armButton`.
- Produces: `BRIEFING = { m1: Briefing, m2, m3, m4 }`, `Briefing = { title: string, expression: 'normal'|'smile'|'serious'|'surprised', line: string, image: 'briefing-m1'|…|'gauge', bullets: [string, string, string], goal: string }`. 문구는 스펙 5.2를 **글자 그대로** 옮긴다(미션 1~4의 말풍선·설명 3줄·임무, 표정).
- 씬 키 `'briefing'`, `init({ mission })`. 레이아웃 '가': 위 라벨 "MISSION N 브리핑" + 제목 → 선장 상반신(왼쪽, `captain` 아틀라스의 expression 프레임; 없으면 코드로 그린 실루엣) + 말풍선(오른쪽, `line`) → 그림(`image`가 `'gauge'`면 7칸 게이지를 코드로, 아니면 그 이미지, 없으면 빈 패널) → 글머리표 3줄 → 임무 상자(노란 테두리) → "출발!" 버튼(`armButton`) → `scene.start(mission)`. 미션 4 화면에는 "실제 성단을 바탕으로 단순화했어요"를 보이게 둔다(설명 3줄째).
- 열 재시작(`scene.restart`)은 브리핑을 거치지 않는다(지금 구조 그대로).
- `briefingParts({ mission, hasCaptain: boolean, hasImage: (key) => boolean }) → { portrait: 'atlas'|'silhouette', picture: 'gauge'|'image'|'panel' }` (`src/data/briefing.js`) — 씬은 이 결과대로 그린다.

- [ ] **Step 1: 실패 테스트** (`tests/data/briefing.test.js`)
  - `has m1..m4 with every field and exactly 3 bullets`.
  - `copy matches the spec` — 예: `BRIEFING.m2.line === '별은 온도에 따라 색이 달라.'`, `BRIEFING.m3.line === '크고 밝다고 뜨거운 게 아니야. 색을 봐!'`, `BRIEFING.m2.goal === '태양보다 뜨거운 별만 쏘고, 나머지는 피하세요.'`.
  - `briefings never give away a mission answer` — m3 문구 전체에 '리겔', '시리우스', '베텔게우스'가 없음. m4 문구에 '청색 별이 많' 없음.
  - `expressions are known` — 모두 `BRIEFING_EXPRESSIONS` 안.
  - `missing art falls back` — `briefingParts({mission:'m1', hasCaptain:false, hasImage:()=>false})` → `{portrait:'silhouette', picture:'panel'}`; m2 + 이미지 없음 → picture `'gauge'`; 선장 있음 → `'atlas'`.
- [ ] **Step 2: 실패 확인** — `npx vitest run tests/data/briefing.test.js` → FAIL
- [ ] **Step 3: 구현** — `briefing.js`, `BriefingScene.js`, 흐름 연결. 글자는 이미지에 굽지 않고 `FONT`로. 안전 영역 `HUD_SAFE_MARGIN` 안, 휴대폰 크기에서 읽히는 글자(본문 ≥ 30px @720).
- [ ] **Step 4: 통과 확인** — `npm test`, `npm run build`. `npm run dev`로 확인: (a) 타이틀 → 브리핑 1 → 미션 1, (b) 카드 → 브리핑 2/3, 미션 3 끝 → 브리핑 4, (c) 미션에서 선체 온도 가득 → 재시작 시 브리핑 안 나옴, (d) `public/img/captain.*`를 잠시 옮겨 놓고 실루엣으로 정상 표시. 9:19.5 폰 비율과 3:5 탭 비율 둘 다 잘림 없음.
- [ ] **Step 5: 커밋** — `feat: captain briefing before each mission`
- [ ] **Step 6: 교사 최종 점검 (멈춤)** — 문구·그림·난이도 전체 플레이. 고칠 점을 받아 정리.

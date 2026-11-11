# 미션 3·4 슈팅 재설계 + 미션 1 조정 Implementation Plan

> **상태 (2026-11-12):** 완료. 아래 체크박스는 갱신하지 않았다. 진행 기록은 git 커밋이다.

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 3·4라운드를 "별빛 충전 빔으로 방해 드론·보스 함선을 격추하는" 슈팅으로 바꾸고, 1라운드에 여러 시작 색 쇳물과 짧은 연습을 넣는다.

**Architecture:** 충전·방어막 판정은 순수 모듈 `src/logic/charge.js`. 적(드론·보스)과 적 탄은 `BaseMissionScene`의 새 풀·오버랩·훅으로 공통 지원하고, `chargeMode` 단계에서는 별 명중이 '측정 + 충전'이 된다. m3·m4는 새 씬 파일로 다시 쓰고, 기존 별자리·성단 코드는 마지막에 정리한다. 편대·긴장도·속도 띠·안전 거리·보스 주기(`src/logic/boss.js`)는 그대로 재사용한다.

**Tech Stack:** Phaser 4.2.1, Vite, Vitest, Node 24, OpenAI Images API(그림 2장).

**Spec:** `docs/superpowers/specs/2026-11-04-m3-m4-shooter-redesign-design.md` (상위: `2026-11-03-patterns-art-briefing-design.md`, `2026-10-30-star-color-shooter-design.md`). 엔진 계약은 `src/scenes/BaseMissionScene.js` 맨 위 JSDoc.

**Branch:** `dev`.

## Global Constraints

- 별은 절대 파괴하지 않는다: 별 명중 = 표시 고리 + 사라짐(`markObject`), 그리고 충전. 드론·보스 함선(별 아님)은 격추·폭발 연출 가능.
- 충전 세기는 **색 7단계로만**: 청색 7, 청백색 6, 백색 5, 황백색 4, 황색 3, 주황색 2, 적색 1 (`STAR_COLORS` 순서에서 유도). 크기·밝기 무관.
- 빔 충전 단계 ≥ 방어막(장갑) 색 단계면 뚫림, 아니면 튕김.
- 방어막·장갑·빔·HUD 충전 칸의 색은 `STAR_COLORS` 팔레트 hex 그대로(코드로 입힘).
- 선체 온도: 별·쇳물 충돌은 색으로(청색 최대 → 적색 최소, 기존 `scaledHeat`), 드론·보스 탄·드론 몸체는 `scaledHeat('asteroid', null, diff)` 일정량.
- 적 탄은 기존 규칙을 지킨다: 속도 `speedFor('hazard', …)`, 화면 중간 출발은 `canLaunch` 안전 거리, 몸풀기 `WARMUP_MS` 동안 조준 없음, 쉬움은 조준 없음.
- `M4_TIME_LIMIT_SEC`(210), 귀환 보고서 퀴즈(`src/data/quiz.js`), 난이도 체계(긴장도·속도 띠·반응 시간 하한), 브리핑 화면 구조는 바꾸지 않는다.
- 쉬움 전체 예상 시간 ≤ 15분(900초), 쉬움 dodge ≤ 0.4, 어려움 < 0.9 (기존 테스트 유지).
- 튜닝 수치는 `src/config/balance.js` 이름 있는 export. 순수 로직은 TDD. 매 Task 끝 `npm test`, `npm run build` 통과. balance.js는 정확한 줄만 편집(통째 sed 금지).
- 새 버튼은 `armButton`. UI 글자는 이미지에 굽지 않는다.
- 커밋 끝: 빈 줄 + `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.

## Review Focus

1. 충전에 필요한 뜨거운 별이 오래 안 나와 학생이 막힘 → m3·m4의 별 색은 `fillFormationColors`로 "뚫을 수 있는 색" 보장. 테스트: Task 4·5.
2. 재시작(열 가득) 후 이전 충전이 남음 → `init()`에서 충전 초기화. 테스트: Task 2(`initialCharge()` 순수 기본값) + 수동 확인.
3. 드론 탄이 우주선 코앞에서 출발 → `canLaunch` 통과 못 하면 발사 안 함. 테스트: Task 4.
4. 쉬움에서 못 깸 → 쉬움 방어막 최고 백색, 목표 수·시간 모델. 테스트: Task 6.
5. 방어막 색이 팔레트와 다름 → 방어막 고리 텍스처를 `tintPixels`로 팔레트 색에서 구움. 테스트: Task 2.

---

### Task 1: 충전·방어막 규칙 모듈

**Files:**
- Create: `src/logic/charge.js`
- Modify: `src/config/balance.js`
- Test: `tests/logic/charge.test.js`

**Interfaces:**
- balance.js: `DRONE_SHIELDS = { easy: { yellowWhite: 0.4, white: 0.6 }, normal: { white: 0.6, blueWhite: 0.4 }, hard: { white: 0.4, blueWhite: 0.4, blue: 0.2 } }`, `M3_DRONE_GOAL = { easy: 5, normal: 6, hard: 8 }`, `BOSS_ARMOR = { easy: ['yellow', 'yellowWhite', 'white'], normal: ['yellowWhite', 'white', 'blueWhite'], hard: ['yellowWhite', 'white', 'blueWhite'] }`, `BOSS_HP = [6, 8, 10]`, `M3_STAR_POOL = ['red','red','red','orange','orange','orange','yellow','yellowWhite','white','blueWhite','blue']` (가중치 = 중복), `M3_DECOY_SCALE = { min: 1.4, max: 1.8 }` (적색·주황색), `M3_STAR_SCALE = { min: 0.55, max: 0.85 }` (나머지).
- Produces (`src/logic/charge.js`):
  - `chargeLevel(colorKey) → 0..7` (청색 7 … 적색 1, null/모르는 키 0)
  - `canPierce(chargeKey, shieldKey) → boolean`
  - `piercingColors(shieldKey) → string[]` (그 방어막을 뚫는 색들, 뜨거운 순)
  - `pickShieldColor(diffKey, rng = Math.random) → colorKey` (DRONE_SHIELDS 가중 추첨)
  - `bossArmorColor(stage: 1|2|3, diffKey) → colorKey`
  - `resolveBeamOnEnemy({ charge, shieldKey, hp }) → { pierced: boolean, hp: number, down: boolean }`
  - `initialCharge() → null`

- [ ] **Step 1: 실패 테스트** — `chargeLevel`: blue 7, blueWhite 6, white 5, yellowWhite 4, yellow 3, orange 2, red 1, null 0, 'bogus' 0; `canPierce('white','white') === true`, `canPierce('yellow','white') === false`, `canPierce(null,'red') === false`; `piercingColors('white')` = `['blue','blueWhite','white']`; `pickShieldColor('easy', () => 0)` ∈ DRONE_SHIELDS.easy 키, 쉬움 10000회 추첨에 blueWhite·blue 없음; `bossArmorColor(3,'normal') === 'blueWhite'`, `bossArmorColor(1,'easy') === 'yellow'`; `resolveBeamOnEnemy({charge:'blue', shieldKey:'white', hp:1})` → `{pierced:true, hp:0, down:true}`, `{charge:'red', shieldKey:'white', hp:3}` → `{pierced:false, hp:3, down:false}`; `initialCharge() === null`.
- [ ] **Step 2: 실패 확인** — `npx vitest run tests/logic/charge.test.js` → FAIL (module not found)
- [ ] **Step 3: 구현** — `chargeLevel`은 `STAR_COLORS`(뜨거운 순) 인덱스로: `7 - index`.
- [ ] **Step 4: 통과 확인** → PASS, `npm test`, `npm run build`
- [ ] **Step 5: 커밋** — `feat(logic): star-charged beam and shield rules`

### Task 2: 엔진 — 적·적 탄·충전 모드·HUD 충전 칸

**Files:**
- Modify: `src/scenes/BaseMissionScene.js` (JSDoc 포함), `src/objects/Pools.js`, `src/objects/starTextures.js`, `src/scenes/HudScene.js`, `src/config/balance.js`
- Test: `tests/objects/tint.test.js` (방어막 텍스처 색), `tests/logic/charge.test.js` (필요 시)

**Interfaces:**
- Consumes: Task 1 전부, `tintPixels` (`src/objects/tint.js`), `scaledHeat`.
- balance.js: `POOL_ENEMIES = 8`, `POOL_BULLETS = 48`, `ENEMY_BODY_R = 34`, `BULLET_BODY_R = 8`, `BLOCKED_TOAST_MAX = 3`.
- 텍스처(코드, 한 번만 굽기): `drone`(그림 없을 때 대체 도형, 별과 확실히 다른 각진 모양), `bullet`(작은 마름모, 별 7색이 아닌 색 — 예: 분홍 #ff5fd2), `shield-<colorKey>` 7개(고리, 흰 고리 모양에 `tintPixels`로 팔레트 색), `boss`(대체 도형).
- Pools: `createPools`가 `enemies`, `bullets`도 만든다(각 멤버 `body.setCircle`). 적 멤버는 `obj.shield` 이미지(방어막 고리)를 가진다(halo처럼 위치 동기화).
- BaseMissionScene 새 API:
  - `this.charge` (colorKey|null), `setCharge(colorKey)` → `game.events.emit('charge-changed', { colorKey })`, 빔 텍스처/틴트를 충전 색으로(충전 없음 = 기존 빔).
  - phase 옵션 `chargeMode: true`: 별 빔 명중 → `markObject(obj)` + `setCharge(obj.colorKey)` + 훅 `onStarMeasured(obj)`; 점수·오답·게이지 채움 없음(judge 무시).
  - `spawnEnemy({ x, y, vx = 0, vy = 0, shieldKey, hp = 1, kind = 'drone', texture = 'drone', scale = 1 }) → obj|null`, `releaseEnemy(obj)`, `setEnemyShield(obj, shieldKey)`.
  - `spawnBullet({ x, y, vx, vy }) → obj|null`.
  - 오버랩(create에서 한 번): 빔↔적 → `resolveBeamOnEnemy` → 뚫림: hp 감소, `down`이면 폭발 연출(코드, 작은 파편 + 섬광 ≤ 300ms) + `releaseEnemy` + 훅 `onEnemyDown(obj)`; 아니면: 튕김 연출 + `this.wrongShots += 1` + 훅 `onEnemyBlocked(obj)`. 우주선↔적 탄/적 몸체 → `addHeat(scaledHeat('asteroid', null, diff))`, 탄은 반환. 적 탄·적은 화면 밖이면 반환(cull).
  - `init()`에서 `this.charge = initialCharge()`.
- HudScene: `'charge-changed'` 수신 시 스타게이지에서 그 색 칸을 강조(테두리 굵게 + 위 "빔 충전" 라벨), null이면 강조 없음. m3·m4 진입 시(`mission-start`) 충전 표시 초기화.

- [ ] **Step 1: 실패 테스트** — `tests/objects/tint.test.js`에 `shield ring tint keeps the palette`: 흰(255) 픽셀 고리 배열을 `tintPixels`로 각 `STAR_COLORS` hex에 입히면 그 hex와 정확히 같음(기존 tint 테스트 패턴 재사용). 순수 헬퍼 `shieldTextureKey(colorKey) → 'shield-<colorKey>'`를 `src/objects/starTextures.js`에서 export하고 테스트.
- [ ] **Step 2: 실패 확인** → FAIL
- [ ] **Step 3: 구현** (위 Interfaces 그대로). `chargeMode`가 없는 단계는 동작 변화 없음.
- [ ] **Step 4: 통과 확인** — `npm test`, `npm run build`, `npm run dev`로 m1·m2가 예전처럼 동작하는지 확인(회귀 없음).
- [ ] **Step 5: 커밋** — `feat(engine): enemies, enemy bullets, charge mode and HUD charge cell`

### Task 3: 미션 1 — 여러 시작 색 쇳물, 연습 15초

**Files:**
- Modify: `src/logic/furnace.js`, `src/scenes/M1FurnaceScene.js`, `src/config/balance.js`
- Test: `tests/logic/furnace.test.js`

**Interfaces:**
- balance.js: `M1_PRACTICE_SEC = 15` (기존 30에서 변경), `M1_BLOB_START_WEIGHTS = { white: 0.4, yellow: 0.25, orange: 0.2, red: 0.15 }`, `M1_WHITE_GUARANTEE = 3`.
- Produces (`src/logic/furnace.js`):
  - `pickBlobStart({ sinceWhite, rng = Math.random }) → { stage, sinceWhite }` — 가중 추첨, 직전 흰색 아닌 시작이 `M1_WHITE_GUARANTEE`번 이어졌으면 반드시 'white'.
  - `stageStartFraction(stageKey) → number` — white 0, yellow `FURNACE_STAGE_CUTS[0]`, orange `[1]`, red `[2]`.
- M1FurnaceScene: 덩어리마다 `obj.coolOffset = stageStartFraction(stage)`; 색 단계 = `furnaceStageAt(min(1, furnaceFallFraction(y) + coolOffset))`. 처음부터 흰색이 아닌 덩어리는 `whiteEndedAt = -Infinity`(흰색 판정 불가). 시험 단계에서 흰색 아닌 덩어리를 쏘면 기존 오답 처리(안내 + `WRONG_SHOT_HEAT`)가 그대로 일어나는지 확인. 연습 단계 동작(벌칙 없음, 안내)은 그대로.

- [ ] **Step 1: 실패 테스트** — `pickBlobStart`: `M1_WHITE_GUARANTEE`번 연속 비흰색 뒤 반드시 white; 10000회 추첨 비율이 가중치 ±0.03; `stageStartFraction('white') === 0`, `('red') === FURNACE_STAGE_CUTS[2]`. `countsAsWhite('yellow', null) === false` 확인(기존).
- [ ] **Step 2: 실패 확인** → FAIL
- [ ] **Step 3: 구현**
- [ ] **Step 4: 통과 확인** — `npm test`, `npm run build`; `M1_HARD_GRACE_CHECK` 테스트 통과 유지.
- [ ] **Step 5: 커밋** — `feat(m1): mixed starting colors, white-only score, 15 s practice`

### Task 4: 미션 3 — 방해 드론 격추 (새 씬)

**Files:**
- Create: `src/scenes/M3DroneScene.js`, `src/logic/drones.js`
- Modify: `src/main.js` (씬 키 'm3'를 새 씬으로), `src/data/copy.js` (MISSION_TEXT.m3), `src/config/balance.js`
- Test: `tests/logic/drones.test.js`

**Interfaces:**
- Consumes: Task 1(`canPierce`, `piercingColors`, `pickShieldColor`), Task 2 엔진 API, `fillFormationColors`, `speedFor`, `canLaunch`, `aimVelocity`, `createRank`, `WARMUP_MS`.
- balance.js: `DRONE_WAVE_MS = { easy: 6000, normal: 5000, hard: 4000 }` (드론 편대 간격, 난이도 `spawnInterval` 배율 적용 안 함 — 이 값 자체가 난이도별), `DRONE_MAX_ON_SCREEN = 3`, `DRONE_FIRE_MS = { easy: 2600, normal: 2000, hard: 1500 }`, `DRONE_BAND_Y = { min: 380, max: 560 }`, `DRONE_SPEED_X = 90`.
- Produces (`src/logic/drones.js`):
  - `droneFormation({ count, minX, maxX, rng }) → [{ x, enterDelayMs }]` (1~3기, 서로 120px 이상 간격)
  - `droneShot({ drone: {x,y}, ship: {x,y}, diffKey, tier, aimAllowed, warmup: boolean, rng }) → { vx, vy } | null` — 속도 `speedFor('hazard')`, `canLaunch`(category 'hazard') 실패면 null, 쉬움·몸풀기·aimAllowed false면 바로 아래(vx 0), 아니면 `aimVelocity`.
  - `neededChargeColors(shieldKeys: string[]) → string[]` — 화면 드론 방어막을 모두 뚫는 데 필요한 색(가장 높은 방어막 기준 `piercingColors`), 드론 없으면 `piercingColors('white')`.
- M3DroneScene(키 'm3'): 단계 하나 `{ id: 'm3', chargeMode: true, waves: true, remaining: s => M3_DRONE_GOAL[diff] - s.downs }`. 웨이브 슬롯 = 별(색: `fillFormationColors`, `all = M3_STAR_POOL`, `needed = neededChargeColors(현재 방어막들)`; 적색·주황색은 `M3_DECOY_SCALE`, 나머지 `M3_STAR_SCALE`, 빛 번짐도 적색·주황색을 크게), 속도 `speedFor('target', …)` 편대당 하나(`createFormationMemo`). 드론: `DRONE_WAVE_MS`마다 1~3기 위에서 들어와 `DRONE_BAND_Y`에서 좌우로 오가며 `DRONE_FIRE_MS`마다 `droneShot`. `onEnemyDown` → `downs += 1`, `refreshGoal()`. 첫 적색·주황색 측정 때 안내 1회: "크고 밝아도 적색·주황색이면 온도가 낮아요 → 약한 충전". `onEnemyBlocked`는 처음 `BLOCKED_TOAST_MAX`번만 안내: "빔이 약해요. 더 뜨거운 색의 별로 충전하세요." 클리어 → 정리 카드(MISSION_TEXT.m3.card) → 브리핑 m4 (기존 연결 방식).
- MISSION_TEXT.m3: `instruction: '뜨거운 별로 빔을 충전해서 방해 드론을 격추하세요.'`, `card: '크고 밝아도 적색 별은 온도가 낮아요. 온도는 색으로 비교해요.'`.

- [ ] **Step 1: 실패 테스트** — `droneShot`: 우주선이 안전 거리 안이면 null; 쉬움·몸풀기면 vx 0; 어려움 aimAllowed면 우주선 쪽(vx 부호 = 우주선 방향), vy > 0; `neededChargeColors(['white','blueWhite'])` = `['blue','blueWhite']`; `droneFormation` 간격 ≥ 120, x ∈ [minX,maxX]; 시드 시뮬레이션: m3 별 편대 200개(`fillFormationColors` + `M3_STAR_POOL` + needed white 이상)에서 필요한 색이 3편대 넘게 빠지지 않음.
- [ ] **Step 2: 실패 확인** → FAIL
- [ ] **Step 3: 구현** (`M3TrapScene.js`는 이 Task에서 등록만 해제하고 파일 삭제는 Task 6)
- [ ] **Step 4: 통과 확인** — `npm test`, `npm run build`, `npm run dev` + `?debug=1&mission=m3&difficulty=easy|normal|hard`: 드론 등장·탄·튕김·격추·충전 칸 강조·클리어까지.
- [ ] **Step 5: 커밋** — `feat(m3): star-charged beam vs shielded drones`

### Task 5: 미션 4 — 보스 함선 (새 씬)

**Files:**
- Create: `src/scenes/M4BossScene.js`
- Modify: `src/main.js` (키 'm4'), `src/data/copy.js` (MISSION_TEXT.m4), `src/config/balance.js`, `src/logic/boss.js` (필요한 순수 헬퍼만 추가)
- Test: `tests/logic/boss.test.js`

**Interfaces:**
- Consumes: Task 1(`bossArmorColor`, `piercingColors`, `resolveBeamOnEnemy`), Task 2 엔진, `bossCycle`, `bossWarmup`, `fanVelocities`, `angleToward`, `aimVelocity`, `speedFor`, `canLaunch`, `createRank`, `fillFormationColors`, `BOSS_*`, `M4_TIME_LIMIT_SEC`.
- balance.js: `BOSS_POS = { x: 360, y: 230 }`, `BOSS_SWAY = { amp: 160, periodMs: 6000 }`, `BOSS_HIT_FLASH_MS = 120`.
- Produces (`src/logic/boss.js`): `bossStageFromHp({ stage, hp }) → { stage, hp, cleared: boolean }` — hp 0이면 다음 단계(hp = `BOSS_HP[stage]`), 3단계 hp 0이면 cleared.
- M4BossScene(키 'm4'): 단계 하나 `{ id: 'm4', chargeMode: true, waves: true, remaining: … (남은 단계 수 또는 보스 체력, 빌더 선택) }`. 보스 = `spawnEnemy({ kind: 'boss', texture: 'boss', shieldKey: bossArmorColor(1, diff), hp: BOSS_HP[0] })`, 좌우로 `BOSS_SWAY`; 맞을 때 `bossStageFromHp`로 단계·장갑 색 갱신(`setEnemyShield`). 공격 주기: 기존 `bossCycle`/`bossWarmup`, 공격 때 보스 위치에서 부채꼴(`fanVelocities`, `BOSS_FAN`)·3단계 조준(`aimVelocity`, aimAllowed일 때) — 보스 y ≈ 230이라 `canLaunch`는 늘 통과하지만 그래도 검사. 빈틈 시작 때 "지금이 기회!" 1회. 충전용 별: 슬롯마다 별, `needed = piercingColors(현재 장갑 색)`, `all = STAR_COLORS 키 전부`, 속도 `speedFor('target')` 편대당 하나. 측정한 별 색을 `this.measured[colorKey]++`로 셈. 보스 격파 → 폭발 연출 → 질문 → 막대그래프. 시간 끝 → "보스가 도망갔어요." 안내 → 질문 → 막대그래프. 막대그래프 = 4라운드에서 측정한 별의 색별 개수(교과서 순서), registry `measuredCounts`에 저장. 그다음 'report'.
- 질문(교체, 글자 그대로):
  1. `'가장 강한 충전을 주는 별의 색은?'` 선택지 `['청색', '백색', '적색']`, 정답 `'청색'`, 맞음 `'맞아요! 청색 별이 표면 온도가 가장 높아서 가장 강하게 충전돼요.'`, 틀림 `'아니에요. 청색 별이 표면 온도가 가장 높아서 가장 강하게 충전돼요.'`
  2. `'크고 밝은 적색 별로 충전하면 빔이 약했던 이유는?'` 선택지 `['적색 별은 표면 온도가 낮아서', '별이 너무 커서', '별이 너무 밝아서']`, 정답 첫 번째, 맞음 `'맞아요! 크기나 밝기가 아니라 색이 표면 온도를 알려 줘요.'`, 틀림 `'아니에요. 크기나 밝기가 아니라 색이 표면 온도를 알려 줘요. 적색은 온도가 낮아요.'`
- MISSION_TEXT.m4: `instruction: '뜨거운 별로 충전해서 보스 함선의 장갑을 뚫으세요! 탄은 피해요'` (시간 표시는 기존처럼 덧붙임).

- [ ] **Step 1: 실패 테스트** — `bossStageFromHp`: 1단계 hp 0 → stage 2, hp `BOSS_HP[1]`; 3단계 hp 0 → cleared; 장갑 색 순서가 단계마다 같거나 더 뜨거움(모든 난이도); 보스 위치(y 230)에서 우주선 y 900, 모든 난이도·tier 최대 속도로 `canLaunch` true.
- [ ] **Step 2: 실패 확인** → FAIL
- [ ] **Step 3: 구현** (`M4JewelboxScene.js`는 등록만 해제, 삭제는 Task 6)
- [ ] **Step 4: 통과 확인** — `npm test`, `npm run build`, `npm run dev` + `?debug=1&mission=m4&difficulty=…`: 보스 3단계, 튕김/명중, 빈틈 안내, 격파와 시간 끝 두 경로 모두 질문 → 그래프 → 귀환 보고서.
- [ ] **Step 5: 커밋** — `feat(m4): boss ship with color armor stages`

### Task 6: 정리 — 문구·결과 화면·옛 코드 제거·균형 모델

**Files:**
- Modify: `src/data/briefing.js`, `tests/data/briefing.test.js`, `src/scenes/ResultScene.js`, `src/logic/flow.js`, `tests/logic/flow.test.js`, `src/logic/difficulty.js`, `tests/logic/difficulty.test.js`, `src/data/stars.js`, `tests/data/stars.test.js`, `src/logic/boss.js`(안 쓰는 성단 함수 제거), `tests/logic/boss.test.js`, `docs/device-check.md`, `src/config/balance.js`
- Delete: `src/scenes/M3TrapScene.js`, `src/scenes/M4JewelboxScene.js`, `src/logic/constellation.js`, `tests/logic/constellation.test.js`, `src/objects/orionFigure.js`, `src/logic/jewelbox.js`, `tests/logic/jewelbox.test.js` (각각 아무도 import하지 않을 때만)

**Interfaces:**
- briefing.js m3 (표정 surprised 유지): `line: '크고 밝다고 뜨거운 게 아니야. 색을 봐!'`, `bullets: ['별을 측정하면 그 별의 표면 온도만큼 빔이 충전돼요.', '별의 크기와 밝기는 표면 온도와 관계없어요.', '드론의 방어막보다 뜨거운 색으로 충전해야 뚫려요.']`, `goal: '뜨거운 별로 빔을 충전해서 방해 드론을 격추하세요.'`, title 그대로 '밝기의 함정', image 'briefing-m3'.
- briefing.js m4 (표정 serious): `title: '보스 함선'`, `line: '마지막 임무야. 보스 함선의 장갑을 뚫어!'`, `bullets: ['장갑 색보다 뜨거운 색의 별로 충전해야 뚫려요.', '보스가 쉬는 틈에는 탄이 오지 않아요.', '단계가 오를수록 장갑이 더 뜨거운 색으로 바뀌어요.']`, `goal: '제한 시간 안에 보스 함선을 물리치세요. 날아오는 탄은 피하세요.'`, image 'briefing-m4'.
- 브리핑 테스트: m3·m4 문구 고정, "정답을 주지 않음" 규칙을 새 내용에 맞게: m4 문구에 '청색' 없음(질문 1 정답), m3·m4에 실제 별 이름 없음.
- ResultScene: 오리온자리 그림 대신 완성 스타게이지(`gaugeFinal`)와 `measuredCounts` 막대그래프(없으면 생략). `buildResultSummary`에서 `orionTagged` 제거, `measuredCounts` 추가. `clearRunKeys`도 갱신.
- flow.js: m3 = 읽기 + 목표 드론 수 × 드론 1기당 예상 시간(PACE에 이름 있는 값) + 카드, m4 = 읽기 + min(제한 시간, 예상 보스 시간) + 질문·그래프; `picture` 행 제거. 쉬움 ≤ 900초 테스트 유지.
- difficulty.js: m3 inflow = 별 편대(색 가중치 `M3_STAR_POOL`의 평균 별 열량) + 드론 탄(화면 드론 수 × 1/`DRONE_FIRE_MS`) × 탄 열량; m4 = 기존 보스 모델 + 충전용 별 편대. 쉬움 ≤ 0.4, 어려움 < 0.9, 순서 테스트 유지(통과 안 되면 `DRONE_FIRE_MS`, `DRONE_MAX_ON_SCREEN`, `FORMATION_GAP_MS` 등 조정).
- device-check.md 조정표에 `DRONE_*`, `M3_DRONE_GOAL`, `DRONE_SHIELDS`, `BOSS_ARMOR`, `BOSS_HP`, `M1_BLOB_START_WEIGHTS` 행 추가, 오리온·성단 행 제거.

- [ ] **Step 1: 테스트 갱신(실패 확인)** — 위 브리핑·흐름·난이도·결과 요약 테스트.
- [ ] **Step 2: 구현 + 옛 코드 제거** — 삭제 전 `grep -r` 로 import 없는지 확인.
- [ ] **Step 3: 통과 확인** — `npm test`, `npm run build`
- [ ] **Step 4: 커밋** — `chore: briefing/result copy for the new m3/m4; remove constellation and cluster code; rebalance`

### Task 7: 드론·보스 그림

**Files:**
- Modify: `art/asset-manifest.json`, `art/PROVENANCE.md`, `src/config/assets.js`
- Create: `public/img/drone.png`, `public/img/boss.png`
- Test: `tests/tools/gen-images.test.js`, `tests/config/assets.test.js`

**Interfaces:**
- manifest 새 항목: `drone` (target 128×128, alpha, 위에서 본 작은 방해 드론, 각진 실루엣, 회색·자홍/진보라 계열 — 별 7색 주색 금지, 아래쪽(우주선 쪽)을 향함), `boss` (target 512×320, alpha, 위에서 본 거대한 보스 함선, 아래를 향함, 장갑판이 보이는 구조 — 장갑 색은 코드로 덧씌우므로 장갑판은 회색 금속). 스타일 A 문장 + 제외 목록(글자·로고·도트·2차 대전) 그대로. `--ref art/raw/ship-style-a.png`.
- 키 `drone`, `boss` — Task 2의 대체 도형과 같은 키(그림이 있으면 그림 사용). 게임 속 크기는 대체 도형과 같은 발자국(드론 ≈ 72px, 보스 ≈ 300px 폭)으로 맞추고 몸체 반지름은 그대로.

- [ ] **Step 1: 실패 테스트** — manifest에 drone·boss 있고 프롬프트에 금지 문구·"no text" 포함; IMAGE_ASSETS 파일 존재 테스트(기존)가 새 파일도 검사.
- [ ] **Step 2: 생성·정리** — `node --env-file=.env tools/gen-images.mjs drone --ref art/raw/ship-style-a.png`, 같은 방식으로 boss(최대 재시도 2회), `python -I tools/normalize_image.py … --alpha`, 그림을 직접 열어 확인(글자 없음, 별처럼 둥글지 않음).
- [ ] **Step 3: 통과 확인** — `npm test`, `npm run build`, `npm run dev`에서 m3·m4 그림 확인.
- [ ] **Step 4: 커밋** — `art: drone and boss ship (style A)`

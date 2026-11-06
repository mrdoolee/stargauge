# 플레이 중 안내·단계 전환·피해 누적·보스 게이지·줄바꿈 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 플레이 중 안내가 화면을 가리지 않게 상단 안내 줄로 옮기고, 멈춘 순간에만 가운데 큰 안내를 쓰며(2라운드·1라운드 단계 전환 연출 포함), 드론·보스가 충전 온도만큼 피해를 누적해 받고, 보스 체력 게이지를 보이며, 모든 문구의 어색한 줄바꿈을 고친다.

**Architecture:** 피해 규칙은 순수 모듈 `src/logic/charge.js`에 넣고 엔진(`BaseMissionScene`)의 적 판정이 그대로 쓴다. HUD(`HudScene`)는 이벤트만 받는다: 기존 `'toast'`를 안내 줄 문구로 바꾸고, 새 `'banner'`(가운데 큰 안내), `'gauge-target'`(정답 범위 표시), `'boss-changed'`(보스 게이지) 이벤트를 더한다. 단계 전환은 엔진의 새 `startTransition()`이 물체 정리 → 배너 → 다음 단계를 맡는다. 안내 줄 문구 겹침과 전환 결정은 순수 함수로 만들어 테스트한다.

**Tech Stack:** Phaser 4.2.1, Vite, Vitest, Node 24.

**Spec:** `docs/superpowers/specs/2026-11-06-messages-transitions-damage-design.md` (상위: `2026-11-04-m3-m4-shooter-redesign-design.md`). 엔진 계약은 `src/scenes/BaseMissionScene.js` 맨 위 JSDoc, HUD 이벤트 계약은 `src/scenes/HudScene.js` 맨 위 주석 — 바꾸면 같이 고친다.

**Branch:** `dev`.

## Global Constraints

- 별은 절대 파괴하지 않는다(측정 = 표시 고리 + 사라짐). 드론·보스는 격추 가능. 전환·미션 끝 정리로 사라지는 별은 판정·측정·충전 없이 페이드.
- 충전·피해·선체 온도는 **색 7단계로만**(청색 7 … 적색 1, `chargeLevel`). 크기·밝기 무관.
- 방어막·장갑보다 차가운 충전 = 튕김, 피해 0. 같거나 뜨거우면 피해 = `1 + (chargeLevel(빔) − chargeLevel(방어막))`. 방어막 없는 적은 피해 1.
- 방어막·장갑·빔·HUD 충전 칸·장갑 색 표시는 정확한 `STAR_COLORS` hex. **체력 막대·보스 게이지 채움은 중립색(흰색 계열)** — 팔레트 색 금지.
- 플레이 중(물체가 움직이는 동안) 화면의 플레이 영역(HUD 띠 아래 `HUD_BAND_BOTTOM` 344 ~ 조작 영역 위)에 안내 창을 띄우지 않는다. 가운데 큰 안내는 위험물이 하나도 움직이지 않을 때만.
- 적 탄 규칙(속도 띠, `canLaunch`/`cappedShotSpeed` 안전 거리, 몸풀기 조준 없음, 쉬움 조준 없음), `M4_TIME_LIMIT_SEC` 210, 퀴즈, 브리핑 구조, 난이도 체계, 별점 기준(1/4, 충전 모드 3/8)은 바꾸지 않는다.
- 쉬움 전체 예상 시간 ≤ 900초, 쉬움 dodge ≤ 0.4, 어려움 < 0.9 (기존 테스트 유지). 시간 모델 추정값은 규칙에서 유도, 근거 없는 끼워 맞추기 금지.
- 튜닝 수치는 `src/config/balance.js` 이름 있는 export. 순수 로직은 TDD. 매 Task 끝 `npm test`, `npm run build` 통과. balance.js는 정확한 줄만 편집(통째 sed 금지).
- 문구 뜻은 바꾸지 않는다(줄바꿈 자리만). UI 글자는 이미지에 굽지 않는다. 새 버튼은 `armButton`.
- 바꾼 동작은 `docs/device-check.md`에 확인 항목/조정표 줄을 추가한다.
- `.git/index.lock`이 남아 있고 git 프로세스가 없으면 지워도 된다.
- 커밋 끝: 빈 줄 + `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.

## Review Focus

1. 단계 전환 중 일시정지·앱 전환·가로 회전 → 전환이 멈췄다가 이어지고 별이 쏟아지지 않음. 전환 타이머는 씬 `update`의 dt(이미 `MAX_DT_MS`로 잘림)로만 흐르게. 테스트: Task 5 `transitionStep`.
2. 단계 목표 달성과 과열이 같은 프레임 → 재시작이 이긴다. 테스트: Task 5 `nextAfterPhaseDone`.
3. 안내 줄 문구가 끝난 뒤 옛 지시문으로 돌아감(단계가 바뀐 뒤) → 항상 최신 지시문으로 복귀. 테스트: Task 4 `stripReducer`.
4. 보스 단계 마지막 한 발이 남은 체력보다 큰 피해 → 다음 단계로 넘쳐 들어가지 않음(새 단계는 가득 찬 체력). 테스트: Task 3.
5. 풀에서 재사용된 드론의 체력 막대가 이전 값이나 보이는 상태로 남음 → `spawnEnemy`/`releaseEnemy`가 막대를 초기화/숨김. 테스트: Task 2 `hpBarFraction` + 수동 확인.

---

### Task 1: 피해 규칙 (순수)

**Files:**
- Modify: `src/logic/charge.js` (`resolveBeamOnEnemy` 및 새 함수)
- Test: `tests/logic/charge.test.js`

**Interfaces:**
- Produces: `beamDamage(chargeKey, shieldKey) -> number` (0 = 튕김). `resolveBeamOnEnemy({ charge, shieldKey, hp }) -> { pierced, hp, down, damage }` (hp는 0 아래로 내려가지 않음). `hitsToDown(chargeKey, shieldKey, hp) -> number` (Infinity = 못 뚫음; 균형 모델용).

- [ ] **Step 1: 실패 테스트** — `beamDamage('white','white') === 1`, `('blueWhite','white') === 2`, `('blue','white') === 3`, `('yellow','white') === 0`, `(null,'red') === 0`, `('red', null) === 1`, `(null, null) === 1` (기존 T2 판정: 방어막 없는 적은 아무 빔에나 뚫림). `resolveBeamOnEnemy({charge:'blue', shieldKey:'white', hp:3})` → `{pierced:true, hp:0, down:true, damage:3}`; `{charge:'white', shieldKey:'white', hp:3}` → `{pierced:true, hp:2, down:false, damage:1}`; `{charge:'red', shieldKey:'white', hp:3}` → `{pierced:false, hp:3, down:false, damage:0}`; `{charge:'blue', shieldKey:'yellowWhite', hp:2}` → hp 0(음수 아님). `hitsToDown('white','white',3) === 3`, `('blueWhite','white',3) === 2`, `('yellow','white',3) === Infinity`. 기존 `resolveBeamOnEnemy` 테스트 중 "pierce costs 1"은 새 규칙으로 고친다.
- [ ] **Step 2: 실패 확인** — `npx vitest run tests/logic/charge.test.js` → FAIL
- [ ] **Step 3: 구현** — `canPierce`는 그대로 두고 `beamDamage`가 그것을 쓴다(방어막 없음 → 1).
- [ ] **Step 4: 통과 확인** — `npm test`(다른 테스트가 `hp - 1`에 기대면 그 테스트도 새 규칙으로), `npm run build`
- [ ] **Step 5: 커밋** — `feat(logic): beam damage grows with charge temperature above the shield`

### Task 2: 미션 3 — 드론 체력 막대·피해 숫자·균형

**Files:**
- Modify: `src/scenes/BaseMissionScene.js` (적 피격 처리 `handleBeamEnemy` 부근, `spawnEnemy`, `releaseEnemy`, JSDoc), `src/scenes/M3DroneScene.js` (`hp: 1` → `DRONE_HP`), `src/config/balance.js` (`DRONE_HP`, 필요하면 `M3_DRONE_GOAL`), `src/logic/flow.js` (`PACE.m3SecPerDrone` 유도), `src/logic/difficulty.js` (m3 모델에 필요한 경우만), `docs/device-check.md`
- Create: `src/logic/enemyHp.js`
- Test: `tests/logic/enemyHp.test.js`, `tests/logic/flow.test.js`, `tests/logic/difficulty.test.js`

**Interfaces:**
- Consumes: Task 1 `resolveBeamOnEnemy` (`damage` 필드), `hitsToDown`.
- Produces: `hpBarFraction(hp, maxHp) -> number` (0..1, maxHp ≤ 0이면 0). 엔진: 적 객체에 `enemy.hpBar`(Graphics 또는 두 Rectangle) — `spawnEnemy`의 새 옵션 `hpBar: boolean`(기본 false, 드론 true, 보스 false). 피격 시 `'-N'` 피해 숫자(기존 "+1" 효과 글자 풀/방식 재사용). `M3_SEC_PER_SHOT`(balance 또는 PACE) 같은 한 발 시간에서 `m3SecPerDrone`을 유도.

- [ ] **Step 1: 실패 테스트** — `hpBarFraction(3,3) === 1`, `(2,3)` ≈ 0.667, `(0,3) === 0`, `(-1,3) === 0`, `(1,0) === 0`. flow 테스트: `PACE.m3SecPerDrone`이 `DRONE_HP`와 기대 피해(쉬움 방어막 분포 `DRONE_SHIELDS`와 학생이 주로 쓰는 충전 = 방어막 색 그대로라는 보수적 가정 → `hitsToDown(shield, shield, DRONE_HP)` = `DRONE_HP`)로 계산됨을 확인하는 테스트(예: `m3SecPerDrone === M3_DRONE_FIND_SEC + DRONE_HP * M3_SEC_PER_SHOT`). 기존 쉬움 ≤ 900, dodge 테스트 유지.
- [ ] **Step 2: 실패 확인** → FAIL
- [ ] **Step 3: 구현**
  - `DRONE_HP = 3` (`balance.js`, 주석: 교실 플레이 뒤 조정). 시간 모델 값(`M3_DRONE_FIND_SEC`, `M3_SEC_PER_SHOT`)은 지금 `m3SecPerDrone` 18초를 "찾기·충전 + 1발"로 나눈 값에서 출발해 근거를 주석에 쓴다. 쉬움 900초를 넘으면 `M3_DRONE_GOAL`을 줄인다(최소 3).
  - 체력 막대: 드론 위쪽(방어막 고리 바깥), 폭 ~ 드론 폭, 높이 ~8 px, 어두운 바탕 + 흰색 채움. 피격 시 120 ms 정도로 줄어드는 트윈. `spawnEnemy`에서 가득 찬 상태로 보이기, `releaseEnemy`에서 숨김, 매 프레임 적 위치를 따라감(새 할당 없이).
  - 피격(뚫림, 안 쓰러짐): 기존 피격 반짝임 + `-N` 글자. 쓰러짐: 기존 폭발.
  - `director.onCorrect()`·`rank.onCorrect()`는 **쓰러뜨릴 때만**(제 판단 기록: 발 수가 늘어도 긴장도 오름 속도가 이전과 같게).
- [ ] **Step 4: 통과 확인** — `npm test`, `npm run build`, `npm run dev` + `?debug=1&mission=m3&difficulty=easy|normal`: 막대가 줄고, 청색 빔은 백색 방어막 드론을 1발에, 백색 빔은 3발에 쓰러뜨리고, 적색 빔은 튕김.
- [ ] **Step 5: 커밋** — `feat(m3): drones take damage by charge temperature with an hp bar`

### Task 3: 미션 4 — 보스 피해 누적·체력 게이지·균형

**Files:**
- Modify: `src/scenes/M4BossScene.js`, `src/logic/boss.js` (`bossStageFromHp`), `src/config/balance.js` (`BOSS_HP`), `src/logic/flow.js` (`PACE.m4BossSec` 유도), `src/scenes/HudScene.js` (게이지 + 이벤트 계약 주석), `docs/device-check.md`
- Test: `tests/logic/boss.test.js`, `tests/logic/flow.test.js`, `tests/logic/difficulty.test.js`

**Interfaces:**
- Consumes: Task 1 `resolveBeamOnEnemy`/`hitsToDown`, Task 2 `hpBarFraction`.
- Produces: HUD 이벤트 `'boss-changed'` `{ visible: boolean, stage: 1..3, stages: 3, hp: number, maxHp: number, armorKey: string|null }`. `bossFightSec(diffKey) -> number` (`boss.js`, 균형 모델: 단계별 `hitsToDown(armor, armor, BOSS_HP[s])` × 한 발 시간 + 단계 찾기 시간의 합). `PACE.m4BossSec`는 이것으로 대체하거나 이것을 쓴다.

- [ ] **Step 1: 실패 테스트** — `bossStageFromHp({ stage: 1, hp: -2 })` → `{ stage: 2, hp: BOSS_HP[1], cleared: false }`(넘친 피해는 이월 없음); `({ stage: 3, hp: -1 })` → cleared. `bossFightSec('easy') < M4_TIME_LIMIT_SEC` 이고 `bossFightSec('normal') < M4_TIME_LIMIT_SEC`. 장갑 색 그대로 빔만 쓸 때 발 수 > 한 단계 더 뜨거운 빔을 쓸 때 발 수(모든 단계·난이도, `hitsToDown`으로). 기존 쉬움 ≤ 900·dodge·어려움 < 0.9 유지.
- [ ] **Step 2: 실패 확인** → FAIL
- [ ] **Step 3: 구현**
  - 엔진이 Task 1 규칙으로 보스 hp를 깎는다(씬의 `onEnemyPierced`는 `res.hp`/`res.damage`를 그대로 씀). `BOSS_HP`는 새 규칙에 맞게 다시 정한다(시작점: 장갑 색 그대로면 단계마다 4~6발, 두 단계 뜨거운 별이면 그 절반 정도). 근거를 주석에.
  - 게이지 위치: HUD 띠 안(y < `HUD_BAND_BOTTOM` 344) — m4에서는 안내 줄 오른쪽 "남은 목표" 자리 대신 또는 띠 아래 가장자리를 따라 가로 막대. 보스 그림·탄 길·플레이 영역을 가리지 않을 것. 구성: 어두운 바탕 + 흰색 채움(남은 hp/maxHp), 옆에 현재 장갑 색 작은 칸(팔레트 hex), "1/3단계" 글자 또는 점 3개. 명중 때 줄어드는 트윈, 단계가 바뀌면 다시 가득 차는 트윈.
  - 보스 등장 때 `visible:true`, 격파·도망·미션 끝·재시작 때 `visible:false`. `'hud-ready'` 재전송 목록에 포함.
- [ ] **Step 4: 통과 확인** — `npm test`, `npm run build`, `npm run dev` + `?debug=1&mission=m4&difficulty=easy|normal|hard`: 게이지가 줄고 단계마다 다시 차고 장갑 색 칸이 바뀜, 청색 빔이 빨리 깎음, 격파·시간 끝 두 경로 모두 게이지 사라짐.
- [ ] **Step 5: 커밋** — `feat(m4): boss takes damage by charge temperature; boss hp gauge in the HUD`

### Task 4: 플레이 중 안내 → 상단 안내 줄

**Files:**
- Create: `src/logic/strip.js`
- Modify: `src/scenes/HudScene.js` (`createToast`/`showToast` 대체, 이벤트 계약 주석), `src/scenes/BaseMissionScene.js` (`toast()`, `toastAt` 제거, 오답 ladder 인자), `src/scenes/M1FurnaceScene.js`, `src/scenes/M3DroneScene.js`, `src/scenes/M4BossScene.js` (`toastAt` 줄 제거), `src/config/balance.js` (`HUD_TOAST_LOW_Y`, `HUD_TOAST_BOTTOM_Y` 제거, `STRIP_HOLD_MS` 1200 추가), `docs/device-check.md`
- Test: `tests/logic/strip.test.js`

**Interfaces:**
- Produces: `stripReducer(state, event) -> state` — state `{ instruction: string, message: null | { text, tone, until, holdUntil, priority } }`; events `{ type: 'instruction', text }`, `{ type: 'message', text, tone, priority?: boolean, nowMs }`, `{ type: 'tick', nowMs }`. `stripText(state) -> { text, tone }` (메시지가 있으면 그것, 없으면 지시문, tone `'normal'`). 메시지 지속 `TOAST_MS`(2400), 우선 메시지(`priority:true`)는 `STRIP_HOLD_MS` 동안 일반 메시지에 덮이지 않음.
- `'toast'` 이벤트 payload는 `{ text, colorKey?, ladder?: 'star'|'furnace', tone?, priority? }`로(`at` 삭제). HUD는 안내 줄 텍스트를 바꾸고 톤 테두리색(info `0x8fd3ff`, alert `0xffd23f`, wrong `0xff8a7a`)으로 안내 줄 배경을 짧게 반짝인다. `ladder:'star'` → 상단 스타게이지에서 `colorKey` 칸을 메시지 동안 강조(테두리 깜빡임). `ladder:'furnace'` → 안내 줄 오른쪽 안에 작은 4색 쇳물 사다리(`FURNACE_STAGES`)를 그리고 `colorKey` 칸 표시(플레이 영역 밖).
- `'instruction'` 이벤트는 상태의 지시문만 바꾼다(메시지가 떠 있으면 메시지가 끝난 뒤 새 지시문이 보임).

- [ ] **Step 1: 실패 테스트** — 메시지 후 `tick(now+2400)` → 지시문 복귀; 메시지 중 `instruction` 이벤트 → 메시지 끝나면 **새** 지시문; 일반 메시지가 우선 메시지를 `STRIP_HOLD_MS` 안에 덮지 못함(그 뒤엔 덮음); 일반 메시지는 일반 메시지를 바로 덮음(최신 우선); 우선 메시지는 무엇이든 바로 덮음.
- [ ] **Step 2: 실패 확인** → FAIL
- [ ] **Step 3: 구현** — 안내 줄 2줄(96 px 높이 `HUD_INSTRUCTION_H`) 안에 들어가야 한다: 메시지 글꼴은 지시문과 같은 30 px, 넘치면 26 px로 한 번 줄임. "남은 목표" 숫자는 계속 보인다. 우선 메시지: "장갑이 더 뜨거운 색으로 바뀌었어요!", 재시작 관련. 플레이 영역에 그리는 HUD 안내 창 코드(`TOAST_TOP_Y`, 'low', 'bottom')는 지운다. 일시정지 중 HUD 시간은 계속 흐르므로 `nowMs`는 HUD 씬 시간(`this.time.now`)을 쓰고, 일시정지 동안 메시지가 끝나도 괜찮다(제 판단).
- [ ] **Step 4: 통과 확인** — `npm test`, `npm run build`, `npm run dev`로 m1(오답 쇳물 사다리), m2(오답 시 게이지 칸 강조), m3·m4(빔이 약해요) — 플레이 영역에 안내 창 없음.
- [ ] **Step 5: 커밋** — `feat(hud): in-play messages live in the instruction strip, never over the play field`

### Task 5: 단계 전환·가운데 배너

**Files:**
- Create: `src/logic/transition.js`
- Modify: `src/scenes/BaseMissionScene.js` (`startTransition`, `completePhase`/`advancePhase` 흐름, 과열 안내, JSDoc), `src/scenes/HudScene.js` (`'banner'`, `'gauge-target'` + 계약 주석), `src/scenes/M2GaugeScene.js`, `src/scenes/M1FurnaceScene.js`, `src/scenes/M4BossScene.js` (미션 끝 정리 + 배너), `src/data/copy.js` (배너 문구), `src/config/balance.js` (`TRANSITION_CLEAR_MS` 400, `TRANSITION_BANNER_MS` 2600), `docs/device-check.md`
- Test: `tests/logic/transition.test.js`, `tests/data/copy.test.js`

**Interfaces:**
- Produces:
  - `nextAfterPhaseDone({ heatFull: boolean, hasNextPhase: boolean }) -> 'restart' | 'transition' | 'complete'` (과열이 이김).
  - `transitionStep(state, dtMs) -> state` — state `{ step: 'clear'|'banner'|'done', ms }`; `clear` `TRANSITION_CLEAR_MS` 뒤 `banner`, `banner` `TRANSITION_BANNER_MS` 뒤 `done`. 일시정지 중엔 호출되지 않으므로 시간이 흐르지 않는다.
  - 엔진 `startTransition({ title, body, gaugeTarget?: { from: string[], to: string[] } , onDone })`: 새 편대/스포너 정지, 활성 별·소행성·탄을 판정·충돌·측정 없이 `TRANSITION_CLEAR_MS` 동안 페이드 후 풀로 반환, 발사 무시, 충돌 끔, 선체 온도 그대로(식기는 계속), `'banner'` 발행, `transitionStep`이 `done`이 되면 `onDone()`. 우주선 이동은 허용(제 판단).
  - HUD `'banner'` `{ title, body?, emphasis?: string, visible: boolean }` — 화면 가운데 큰 글자(제목 ~56 px, 본문 ~40 px, `emphasis` 단어는 강조색), 배경 반투명 패널. `'gauge-target'` `{ keys: string[], animateFrom?: string[] }` — 스타게이지 위 정답 범위 괄호/테두리; `animateFrom`이 있으면 그 범위에서 `keys` 범위로 미끄러지는 트윈(~800 ms, 배너 동안).
  - 배너 문구(`copy.js`): m2 `{ title: '1단계 완료!', body: '이번엔 태양보다 차가운 별', emphasis: '차가운' }`; m1 `{ title: '연습 끝!', body: '이제 진짜예요! 흰색일 때만 쏘고,\n부딪히면 선체 온도가 올라가요.', emphasis: '흰색' }`; 과열 `{ title: '선체 온도가 가득 찼어요!', body: '이 미션을 처음부터 다시 해요.' }`; m4 끝 `'보스 함선을 격파했어요!'` / `'보스가 도망갔어요.'`.
- m2: `onPhaseComplete('m2a')` → `startTransition({..., gaugeTarget: { from: m2a 키, to: 태양보다 차가운 키 }, onDone: () => this.advancePhase() })`. 2단계 시작 때도 `'gauge-target'`로 정답 범위를 계속 보여 준다(1단계 시작 때는 뜨거운 쪽 범위).
- m1: 연습 → 실전 경계에서 같은 전환(기존 `onPhaseStart` 토스트 제거).
- 과열: 기존 재시작 흐름은 그대로, 안내만 `'banner'`(재시작 직전 짧게; 재시작 뒤 사라짐 — 씬이 다시 시작될 때 `visible:false`).
- m4 끝: 격파/도망 시 남은 탄·별을 판정 없이 정리한 뒤 배너, 그다음 기존 질문 흐름.

- [ ] **Step 1: 실패 테스트** — `nextAfterPhaseDone({heatFull:true, hasNextPhase:true}) === 'restart'`, `({false,true}) === 'transition'`, `({false,false}) === 'complete'`. `transitionStep({step:'clear',ms:0}, 399).step === 'clear'`, 400에서 `'banner'`, 그 뒤 2600에서 `'done'`; 큰 dt(100 ms씩 잘린 프레임) 누적도 같은 결과. copy 테스트: 배너 문구 존재, m2 배너에 '차가운' 포함.
- [ ] **Step 2: 실패 확인** → FAIL
- [ ] **Step 3: 구현** (위 Interfaces 그대로)
- [ ] **Step 4: 통과 확인** — `npm test`, `npm run build`, `npm run dev`: m2 1단계 끝 → 화면 비워짐 → 가운데 배너 + 게이지 범위가 차가운 쪽으로 이동 → 재개; 배너 중 일시정지/재개; m1 연습 → 실전; 과열 재시작; m4 격파·도망.
- [ ] **Step 5: 커밋** — `feat: stage transitions clear the field and show a centre banner; gauge target range moves`

### Task 6: 줄바꿈 정리 (모든 화면)

**Files:**
- Modify: `src/data/copy.js`, `src/data/briefing.js`, `src/data/quiz.js`(문구 줄바꿈만, 뜻·정답 불변), 각 씬의 하드코딩 문구, 필요하면 `wordWrap` 폭
- Create: `docs/line-breaks-2026-11-06.md` (전/후 목록)
- Test: `tests/data/*.test.js` (기존 문구 테스트가 `\n`에 맞게)

**Interfaces:**
- Consumes: Task 4·5의 최종 문구와 위치.

- [ ] **Step 1: 목록 만들기** — 모든 화면(타이틀, 브리핑 m1~m4, 상단 지시문 m1·m2a·m2b·m3·m4, 안내 줄 메시지 전부, 배너, 정리 카드, m4 질문·그래프, 귀환 보고서, 결과, 일시정지, 가로 회전 안내)을 실제 크기로 띄워 줄이 어떻게 나뉘는지 확인한다(headless 브라우저 스크린샷 또는 `npm run dev`). Phaser `useAdvancedWrap`이 한국어를 어디서 자르는지 먼저 확인한다.
- [ ] **Step 2: 고치기** — 규칙: 어절 중간에서 끊지 않음, 의미 단위("방해 드론", "선체 온도", "태양보다 뜨거운 별", "빔 충전") 가르지 않음, 한 어절만 남는 외톨이 줄 없음. 방법: 문구에 `\n`을 넣거나 `wordWrap` 폭 조정. 2줄에 안 들어가는 안내 줄 메시지만 예외적으로 줄여도 되고, 그 경우 목록에 "줄임"으로 표시.
- [ ] **Step 3: 통과 확인** — `npm test`, `npm run build`, 고친 화면 다시 스크린샷 확인.
- [ ] **Step 4: 보고서** — `docs/line-breaks-2026-11-06.md`: 화면 | 문구 | 전 | 후 표. 
- [ ] **Step 5: 커밋** — `fix(copy): natural Korean line breaks on every screen`

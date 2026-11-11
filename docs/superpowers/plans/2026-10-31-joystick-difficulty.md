# 조이스틱 조작 + 난이도 선택 Implementation Plan

> **상태 (2026-11-12):** 완료. 아래 체크박스는 갱신하지 않았다. 진행 기록은 git 커밋이다.

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development. Steps use checkbox (`- [ ]`) syntax.

**Goal:** 교사 실기기 피드백 반영 — 화면 드래그 이동을 왼쪽 아래 가상 조이스틱으로 바꾸고(C안: 반투명, 조작판 없음), 타이틀에서 쉬움/중간/어려움 난이도를 고르게 한다.

**Spec:** `docs/superpowers/specs/2026-10-30-star-color-shooter-design.md` §4 (개정), §4-1 (신규). 구현자는 이 두 절을 반드시 읽는다.

**Branch:** `dev`. 기존 엔진 계약: `src/scenes/BaseMissionScene.js` 맨 위 JSDoc.

## Global Constraints

- 엔진 `phaser@4.2.1`. 게임 해상도 720×1280 세로.
- **별의 크기·밝기는 어떤 판정·선체 온도 계산에도 쓰지 않는다.** 색(`colorKey`)만 쓴다. 난이도 배율을 곱해도 선체 온도 상승은 **청색 최대 → 적색 최소로 엄격히 감소**해야 한다.
- 난이도는 배우는 내용(7색, 판정, 별 데이터, 문구, 퀴즈)과 **미션 4 제한 시간(`M4_TIME_LIMIT_SEC`)**을 바꾸지 않는다.
- 발사: 버튼 누른 순간 1발, 연사 없음. 조이스틱과 동시 사용 가능.
- 기존 공용 버튼 헬퍼 `src/ui/button.js`(같은 포인터가 눌렀다 뗀 경우만 + 화면 등장 후 ~300 ms 무시)를 새 버튼에도 쓴다.
- 튜닝 수치는 모두 `src/config/balance.js`의 이름 있는 export.
- 순수 로직은 TDD(RED→GREEN). `npm test`, `npm run build` 통과.
- 커밋 끝: 빈 줄 + `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.

---

### Task 1: 가상 조이스틱 조작 (C안)

**Files:**
- Modify: `src/input/TouchControls.js` (포인터 라우터를 조이스틱+발사로), `src/scenes/BaseMissionScene.js` (우주선 이동을 속도 기반으로, 아래 경계), `src/config/balance.js`, `docs/device-check.md` (멀티터치 점검 항목)
- Create/Modify tests: `tests/input/touch.test.js` (+ 필요 시 `tests/input/joystick.test.js`)

**Interfaces:**
- `joystickVector(dx, dy, radius, deadZone) → { x, y }` 순수 함수: 길이 0..1로 정규화, 데드존 안은 0, 반지름 밖은 1로 잘림, 방향 유지.
- 포인터 라우터: 각 포인터는 **처음 누른 컨트롤**(조이스틱 원 / 발사 버튼 / 그 외)에 귀속. 조이스틱 포인터만 이동 벡터를 만든다. 발사 포인터는 누른 순간 1회 `'fire'`. 그 외 터치는 무시(이동 없음). 조이스틱 손가락을 떼거나 잃어버리면(up, upoutside, gameout, blur/hidden, 매 프레임 isDown 확인) 벡터 0.
- 우주선: `ship.x/y += vector * SHIP_MAX_SPEED * dt` (dt는 `MAX_DT_MS`로 상한). 경계: 좌우 화면 끝(여백), 위 `SHIP_BOUNDS.minY`, **아래 = 조작 영역 위 선**(조이스틱·발사 버튼 윗변 중 높은 쪽 − 여유).

- [ ] **Step 1:** 실패 테스트: `joystickVector` (데드존, 클램프, 방향), 라우터 경우 — (a) 조이스틱 누른 채 발사 탭 → 이동 유지 + 1발, (b) 발사 버튼에서 시작해 조이스틱 쪽으로 미끄러져도 이동 없음, (c) 조이스틱에서 시작해 원 밖으로 나가도 계속 조이스틱(벡터 길이 1), (d) 빈 화면 터치 → 이동·발사 없음, (e) 조이스틱 손가락 잃어버림 → 벡터 0. 아래 경계 계산 함수 테스트(조작 영역 위로만).
- [ ] **Step 2:** 구현. 시작값(`balance.js`): `JOYSTICK_DIAMETER 200`, `JOYSTICK_MARGIN 28`, `JOYSTICK_DEAD_ZONE 0.12`, `FIRE_BUTTON_DIAMETER 150`, `CONTROLS_ALPHA 0.45`, `SHIP_MAX_SPEED`(약 520 px/s, 구현자 결정), `SHIP_CONTROL_CLEARANCE`(약 24). 드래그 오프셋·추종 관련 상수(`SHIP_OFFSET_Y`, `SHIP_FOLLOW_REMAIN_PER_SEC`)와 그 코드는 제거(다른 곳에서 안 쓰면).
- [ ] **Step 3:** 조이스틱 그림: 반투명 바깥 원 + 손잡이(엄지 위치를 따라 움직이고 놓으면 가운데로). 발사 버튼도 반투명으로. 둘 다 HUD처럼 게임 오브젝트 위에 그리되 별 판정에 끼지 않는다. 별·쇳물·소행성은 그 뒤로 지나간다.
- [ ] **Step 4:** 미션 시작 위치: 우주선이 새 아래 경계 위에서 시작(`SHIP_START_Y` 조정). m1 흰색 구간 판정 근거(빔 비행 시간 vs `M1_WHITE_GRACE_MS`)가 새 우주선 최저 위치에서도 성립하는지 계산해 보고서에 기록, 필요하면 grace만 조정.
- [ ] **Step 5:** `docs/device-check.md` 멀티터치 항목을 조이스틱 기준으로 고친다. 조작감 조정 키 표에 새 키 반영.
- [ ] **Step 6:** `npm test`, `npm run build`. 커밋 `feat: virtual joystick controls (left) with fire button (right)`.

### Task 2: 난이도 선택 (쉬움/중간/어려움)

**Files:**
- Modify: `src/config/balance.js`, `src/scenes/TitleScene.js`, `src/scenes/BaseMissionScene.js` (+ 미션 씬 중 속도·간격을 직접 쓰는 곳), `src/scenes/ResultScene.js`, `src/logic/flow.js` (시간 추정), `docs/device-check.md`
- Create: `src/logic/difficulty.js` (순수), `tests/logic/difficulty.test.js`

**Interfaces:**
- `DIFFICULTY = { easy, normal, hard }` 각 `{ label: '쉬움'|'중간'|'어려움', speed, spawnInterval, heat }` 배율. `normal`은 모두 1.
- registry `difficulty`(기본 `'normal'`). "처음부터 다시"는 타이틀로 가서 다시 고름(`muted`처럼 유지할지: 타이틀에서 직전 선택을 기본 선택으로 보여 줌). 미션 재시작은 난이도 유지.
- 적용: 떨어지는 물체 속도(별, 쇳물, 소행성, m3 함정 별·별자리 흐름, m4 흩어진 별)에 `speed`; 등장 간격(`SPAWN_INTERVAL_MS`, `M1_ASTEROID_INTERVAL_MS`, `M4_SCATTER_INTERVAL_MS`)에 `spawnInterval`; 부딪힘 선체 온도(`heatOnCollision` 결과)에 `heat`. **바꾸지 않음**: 판정, 목표 개수, `M4_TIME_LIMIT_SEC`, 오답 사격 열(`WRONG_SHOT_HEAT`), 냉각.
- 시작 배율(튜닝 대상): 쉬움 `speed 0.75, spawnInterval 1.35, heat 0.6` / 어려움 `speed 1.3, spawnInterval 0.75, heat 1.35`.

- [ ] **Step 1:** 실패 테스트: 세 난이도 존재·라벨, `normal` 배율 1, 쉬움 < 중간 < 어려움 (speed·heat 증가, spawnInterval 감소), 어느 난이도든 `scaledHeat('star', key)`가 색 순서로 엄격히 감소, 알 수 없는 키 → `normal`.
- [ ] **Step 2:** 구현 + 타이틀 화면에 난이도 버튼 3개(공용 버튼 헬퍼, 선택 상태가 눈에 보이게, 기본 중간) → "시작". 결과 화면에 "난이도: 쉬움" 등 표시.
- [ ] **Step 3:** 끝까지 갈 수 있는지 근거: `flow.js` 추정을 난이도별로 내고(중간 ≈ 15분 유지), 쉬움·중간은 재시작 없이 마칠 수 있고 어려움은 마칠 수 있지만 더 어렵다는 근거(최악의 경우 초당 선체 온도 유입 vs 냉각 등)를 보고서에 표로. 테스트로 최소한 "쉬움/중간 추정 시간 ≤ 17분, 어려움 ≤ 16분" 같은 상한을 고정.
- [ ] **Step 4:** `docs/device-check.md`에 난이도별 확인 행 추가. `npm test`, `npm run build`. 커밋 `feat: easy/normal/hard difficulty selection`.

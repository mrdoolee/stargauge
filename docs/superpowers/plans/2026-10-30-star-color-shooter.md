# 별빛 탐사선 스타게이지호 Implementation Plan

> **상태 (2026-11-12):** 완료. 실기기 확인·main 병합·Vercel 배포(Task 13 뒷부분)는 2026-11-12에 진행했다. 아래 체크박스는 갱신하지 않았다. 진행 기록은 git 커밋이다.

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 중2 「색으로 비교하는 별의 표면 온도」 차시용, 터치 기반 세로 스크롤 슈팅 웹게임(약 15분, 미션 4개 + 귀환 보고서)을 만들어 GitHub → Vercel로 배포한다.

**Architecture:** Vite + Phaser 4.2 정적 웹앱. 게임 규칙(색 서열, 선체 온도, 게이지, 판정, 점수, 퀴즈, 실제 별 데이터)은 Phaser와 분리된 순수 JS 모듈(`src/logic`, `src/data`)로 만들고 Vitest로 TDD. 화면은 미션마다 Phaser Scene 1개 + 공통 `BaseMissionScene` + 상시 `HudScene`. 별은 코드로 그리고, 별 외 이미지는 개발 시점에 OpenAI 이미지 API 스크립트로 만들어 정적 파일로 커밋한다.

**Tech Stack:** Node 24, Vite 8.x, Phaser 4.2.x, Vitest 5.x, GitHub(`gh`), Vercel, OpenAI Images API(`gpt-image-2.5-sunburst`).

**Spec:** `docs/superpowers/specs/2026-10-30-star-color-shooter-design.md` — 구현자는 이 계획과 스펙을 함께 읽는다.

**기간: 3일.** Day 1 = 저장소·시험판·규칙 로직 / Day 2 = 엔진 공통부·미션 1~4 / Day 3 = 마무리 화면·아트·손맛·실기기 검증·정식 배포. 일정이 밀리면 맨 아래 **"일정 보호용 축소안"** 순서대로 줄인다.

## Global Constraints

- 엔진 `phaser@4.2.x` 고정 (현재 4.2.1). 새 Phaser 3 코드 패턴 금지 (`phaser-core` 스킬 Pitfalls 참고).
- 게임 해상도 720×1280 세로, `scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH }`, 여백 배경 `#05070f`.
- 색 분류는 7개뿐, 온도 높은 순: 청색(`blue`) › 청백색(`blueWhite`) › 백색(`white`) › 황백색(`yellowWhite`) › 황색(`yellow`) › 주황색(`orange`) › 적색(`red`). 화면 문구는 한글 라벨만 사용.
- **별의 크기·밝기는 어떤 판정·선체 온도 계산에도 쓰지 않는다.** 색(`colorKey`)만 쓴다.
- 온도 수치(K) 표기 금지. '높다/낮다'만.
- 별은 코드로 그린다(고정 팔레트). AI 이미지는 별 외 요소에만.
- `.env`(`OPENAI_API_KEY`, `OPENAI_IMAGE_MODEL`)는 커밋·배포 금지. 게임 런타임 코드에서 `.env`·API 호출 금지.
- 조작: 화면 드래그 = 이동, 오른쪽 아래 발사 버튼 누른 순간 = 1발. 연사 없음. 드래그와 발사 동시 가능.
- 학생 결과 저장·전송 없음. 로그인 없음.
- NOIRLab 자료를 화면에 쓰면 크레디트 "Credit: NSF NOIRLab" 표기.
- `reference/`(교과서 PDF)는 저작물이므로 커밋하지 않는다.
- 성능 기준 기기: 갤럭시탭 S6 Lite(크롬). 최소 30fps 유지, 목표 60fps.
- 관련 스킬(프로젝트 `.claude/skills/`): 작업 전 해당 `SKILL.md`를 읽는다 — `phaser-core`, `phaser-arcade-physics`, `input-systems`, `game-ui-ux`, `game-feel`, `level-design`, `create-game-assets`, `audio-design`, `performance-optimization`, `prototype-fast`.

## Review Focus

1. **멀티터치 경계** — 드래그 중 발사 버튼 누르기, 발사 버튼에서 시작한 터치, 드래그 손가락을 뗀 뒤 발사 손가락만 남은 경우: 우주선이 발사 버튼 쪽으로 튀지 않고, 발사는 누른 순간 1발만. (Task 6 `classifyPointer` 테스트 + 실기기 확인)
2. **앱 전환·화면 꺼짐 후 복귀** — 긴 프레임 간격(dt 수 초)이 들어와도 별이 한꺼번에 쏟아지거나 선체 온도가 튀지 않는다. (Task 4 `HeatMeter` dt 상한 테스트, Task 5 `Spawner` dt 상한 테스트)
3. **필요한 색이 안 나와서 미션이 안 끝나는 경우** — 미션 2에서 아직 안 채운 색이 일정 횟수 안에 반드시 등장. (Task 5 `pickSpawnColor` 테스트)
4. **기기 가로 회전** — 폰을 가로로 돌리면 "세로로 돌려 주세요" 안내가 덮이고 게임이 일시정지, 세로로 돌리면 이어서 진행. (Task 3 구현 + 실기기 확인)
5. **브라우저 기본 터치 동작** — 아이폰 사파리·안드로이드 크롬에서 더블탭 확대, 길게 눌러 메뉴, 당겨서 새로고침, 텍스트 선택이 일어나지 않는다. (Task 3 CSS/이벤트 + 실기기 확인)

---

## 파일 구조

```
package.json, vite.config.js, index.html, .gitignore
src/
  main.js                    Phaser.Game 설정, 씬 목록
  config/palette.js          7색·쇳물 4단계 정의 (키, 한글 라벨, 색상값, rank)
  config/balance.js          밸런스 수치 (선체 온도, 속도, 시간) — 튜닝 대상
  logic/temperature.js       색 비교·정렬·충돌 시 온도 상승량
  logic/heat.js              HeatMeter (선체 온도)
  logic/gauge.js             StarGauge (7칸 게이지)
  logic/judges.js            predicateJudge, orderedJudge
  logic/spawner.js           pickSpawnColor, Spawner(dt 상한)
  logic/scoring.js           missionStars
  data/stars.js              실제 별(리겔·시리우스·베텔게우스), 오리온 배경 별, 보석상자 성단(단순화)
  data/quiz.js               귀환 보고서 3문항 + gradeQuiz
  data/copy.js               한글 문구 (미션 지시, 피드백, 정리 카드)
  input/TouchControls.js     드래그 이동 + 발사 버튼, classifyPointer
  objects/starTextures.js    7색 별·쇳물 텍스처를 코드로 생성
  objects/Pools.js           별·빔·소행성 오브젝트 풀
  scenes/BootScene.js  TitleScene.js  HudScene.js  CardScene.js
  scenes/BaseMissionScene.js
  scenes/M1FurnaceScene.js  M2GaugeScene.js  M3TrapScene.js  M4JewelboxScene.js
  scenes/ReportScene.js  ResultScene.js
  audio/sfx.js               WebAudio로 만든 짧은 효과음 + 음소거
tests/logic/*.test.js, tests/data/*.test.js, tests/input/*.test.js
tools/gen-images.mjs         OpenAI 이미지 생성 (개발 시점 전용)
art/art-direction-brief.md, art/asset-manifest.json, art/PROVENANCE.md
public/img/*.png             생성·정규화된 이미지
prototype/                   Day 1 버리는 시험판 (별도 package.json)
```

---

# Day 1 — 저장소·시험판·규칙 로직

### Task 1: 저장소 만들기

**Files:**
- Modify: `.gitignore` (기존: `.env`, `.superpowers/`, `node_modules/`)
- Create: `README.md`

- [ ] **Step 1:** `.gitignore`에 `reference/`, `dist/`, `prototype/dist/`, `prototype/node_modules/`, `.vercel/` 추가.
- [ ] **Step 2:** `README.md` — 게임 한 줄 소개, 스펙·계획 경로, "API 키는 `.env`에만, 절대 커밋 금지", 실행 명령(`npm install`, `npm run dev`, `npm test`).
- [ ] **Step 3:** `git init -b main` 후 `git status`로 `.env`·`reference/`가 목록에 **없는지** 확인.
- [ ] **Step 4:** `gh auth status`. 로그인 안 돼 있으면 교사에게 `! gh auth login` 실행을 요청하고 대기.
- [ ] **Step 5:** 저장소 이름·공개 여부를 교사에게 확인(제안: `stargauge`, private). `gh repo create <이름> --<visibility> --source . --remote origin`.
- [ ] **Step 6:** 커밋·푸시. `git add .gitignore README.md docs .claude skills-lock.json && git commit -m "chore: init repo with spec, plan, gamedev skills" && git push -u origin main`. GitHub 웹에서 `.env`가 없는지 확인.

### Task 2: 회색 도형 시험판 (버리는 코드, 90분 제한)

`prototype-fast` 스킬을 읽고 따른다. **답할 질문 하나: "탭 S6 Lite·폰에서 드래그 이동 + 발사 버튼 + 선체 온도 피하기가 중학생 손에 맞는가?"**
**계속 기준:** 교사가 30초 안에 조작을 익히고, 쏘려던 별을 맞히고, 피하려던 별을 피할 수 있다. **수정 기준:** 손가락이 우주선·별을 가리거나 발사 버튼이 손에 안 맞는다 → 오프셋·버튼 위치 수치만 바꿔 본 개발에 반영.

**Files:** `prototype/` 아래 자유 (단일 씬, 하드코딩 허용, 테스트 없음)

- [ ] **Step 1:** `prototype/`에 Vite + `phaser@4.2.1` 최소 앱. 720×1280 FIT.
- [ ] **Step 2:** 미션 2-a 한 장면만: 7색 원이 위에서 내려옴, 드래그 이동(우주선은 손가락보다 위로 오프셋), 오른쪽 아래 발사 버튼(누른 순간 1발), 태양보다 뜨거운 별 맞히면 +1, 별과 부딪히면 선체 온도 바 상승(청색 많이 ~ 적색 조금), 가득 차면 리셋. 화면 구석에 FPS·오프셋 수치 디버그 텍스트.
- [ ] **Step 3:** Vercel 미리보기 배포: `cd prototype && npm run build && npx vercel deploy dist --yes` (로그인 필요 시 교사에게 `! npx vercel login` 요청). 주소를 교사에게 전달.
- [ ] **Step 4: 관문** — 교사가 탭 S6 Lite와 폰에서 해 보고 계속/수정 판정. 판정과 바꿀 수치(오프셋, 버튼 크기·위치)를 `prototype/VERDICT.md`에 기록하고 커밋. **판정을 기다리는 동안 Task 3~5를 계속 진행**(규칙 로직은 시험판 결과와 무관).

### Task 3: 본 프로젝트 뼈대

**Files:**
- Create: `package.json`, `vite.config.js`, `index.html`, `src/main.js`, `src/scenes/BootScene.js`, `src/scenes/TitleScene.js`, `tests/smoke.test.js`

**Interfaces:**
- Produces: `npm run dev | build | test`; 씬 키 `'boot'`, `'title'`; `src/main.js`의 `GAME_WIDTH = 720`, `GAME_HEIGHT = 1280` export.

- [ ] **Step 1:** 의존성: `phaser@4.2.1`, dev `vite@^8`, `vitest@^5`. 스크립트 `dev`, `build`, `preview`, `test`(= `vitest run`). `vite.config.js`에 `base: './'`.
- [ ] **Step 2:** `tests/smoke.test.js` — `GAME_WIDTH === 720 && GAME_HEIGHT === 1280` 확인. 실행해서 실패 확인 → `main.js` 작성 후 통과.
- [ ] **Step 3:** `index.html`: `<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover">`, `lang="ko"`. CSS: `html,body{margin:0;height:100%;background:#05070f;overflow:hidden;overscroll-behavior:none;touch-action:none;-webkit-user-select:none;user-select:none;-webkit-touch-callout:none}`. `contextmenu` 이벤트 `preventDefault`.
- [ ] **Step 4:** 가로 회전 안내: `index.html`에 `#rotate` 오버레이("세로로 돌려 주세요 📱"), `@media (orientation: landscape) and (max-height: 600px)`에서만 표시. `main.js`에서 `matchMedia` 변화 시 `game.loop.sleep()` / `game.loop.wake()`.
- [ ] **Step 5:** `main.js`: `type: Phaser.AUTO`, 720×1280, FIT + CENTER_BOTH, `input: { activePointers: 3 }`, `physics: { default: 'arcade', arcade: { debug: false } }`, `scene: [BootScene, TitleScene]`. 타이틀: 게임 제목 "별빛 탐사선 스타게이지호", "시작" 버튼(지금은 아무 동작 없음).
- [ ] **Step 6:** `npm test` 통과, `npm run build` 성공, `npm run dev`로 브라우저 확인(제목·버튼 보임, 창 크기를 바꿔도 비율 유지).
- [ ] **Step 7:** Vercel에 GitHub 저장소를 연결한 프로젝트 생성(루트 `/`, 프레임워크 Vite, 환경변수 없음). 푸시 후 배포 주소에서 타이틀 화면 확인.
- [ ] **Step 8:** 커밋 `feat: scaffold Vite + Phaser 4.2 project`.

### Task 4: 색·온도 규칙과 선체 온도

**Files:**
- Create: `src/config/palette.js`, `src/config/balance.js`, `src/logic/temperature.js`, `src/logic/heat.js`
- Test: `tests/logic/temperature.test.js`, `tests/logic/heat.test.js`

**Interfaces:**
- Produces:
  - `STAR_COLORS: Array<{key, label, hex:number, rank:number}>` (rank 0 = 가장 뜨거움, 위 Global Constraints 순서), `SUN_KEY = 'yellow'`, `colorByKey(key)`.
  - `FURNACE_STAGES: Array<{key, label, hex, rank}>` = `white(흰색) › yellow(노란색) › orange(주황색) › red(붉은색)`.
  - `isHotter(aKey, bKey): boolean`, `hotterThanSun(key)`, `coolerThanSun(key)`, `sortHottestFirst(items, getKey = i => i.colorKey)`, `heatOnCollision(kind: 'star'|'furnace'|'asteroid', key?): number`.
  - `class HeatMeter({ max, coolPerSec })` — `value`, `ratio`, `add(n)`, `update(dtMs)`, `isFull()`, `reset()`.
- 시작값 (`balance.js`, 튜닝 대상): `HEAT_MAX 100`, `COOL_PER_SEC 4`, `MAX_DT_MS 100`, 별 충돌 `{blue:30, blueWhite:25, white:20, yellowWhite:16, yellow:12, orange:8, red:5}`, 쇳물 `{white:25, yellow:15, orange:9, red:5}`, 소행성 `15`, 오답 사격 `5`.
- 색상값 (`palette.js`): 청 `0x3d7bff`, 청백 `0x9cc9ff`, 백 `0xf4f6ff`, 황백 `0xfff1b8`, 황 `0xffd23f`, 주황 `0xff9a2e`, 적 `0xff4b3a`.

- [ ] **Step 1: 실패 테스트 작성**
  - `STAR_COLORS.map(c => c.label)`이 `['청색','청백색','백색','황백색','황색','주황색','적색']`이고 rank가 0..6.
  - `isHotter('blue','red') === true`, `isHotter('red','yellow') === false`.
  - `hotterThanSun`이 참인 키 = `['blue','blueWhite','white','yellowWhite']`, `coolerThanSun` 참 = `['orange','red']`, `yellow`는 둘 다 거짓.
  - `heatOnCollision('star', k)`가 rank 순으로 **엄격히 감소**.
  - 크기 무관: `heatOnCollision`은 키 외 인자를 받지 않는다(`heatOnCollision.length <= 2`), 같은 키는 항상 같은 값.
  - `heatOnCollision('furnace','white') > heatOnCollision('furnace','red')`.
  - `HeatMeter`(매 검사마다 새 인스턴스): `add(120)` 후 `value === 100`, `isFull()`; 100에서 `update(1000)` 후 `value === 96`; 100에서 **`update(5000)`은 `MAX_DT_MS`만큼만 반영** → `value ≈ 99.6`(`toBeCloseTo`); 0에서 `update(1000)` 후 0 아래로 내려가지 않음; `reset()` 후 0.
- [ ] **Step 2:** `npx vitest run tests/logic` → FAIL 확인.
- [ ] **Step 3:** 구현.
- [ ] **Step 4:** `npx vitest run tests/logic` → PASS.
- [ ] **Step 5:** 커밋 `feat: color-temperature rules and hull heat meter`.

### Task 5: 게이지·판정·출현·점수 + 실제 별/퀴즈/문구 데이터

**Files:**
- Create: `src/logic/gauge.js`, `src/logic/judges.js`, `src/logic/spawner.js`, `src/logic/scoring.js`, `src/data/stars.js`, `src/data/quiz.js`, `src/data/copy.js`
- Test: `tests/logic/gauge.test.js`, `tests/logic/judges.test.js`, `tests/logic/spawner.test.js`, `tests/logic/scoring.test.js`, `tests/data/stars.test.js`, `tests/data/quiz.test.js`

**Interfaces:**
- Consumes: Task 4 전부.
- Produces:
  - `class StarGauge(prefilled: string[] = [])` — `fill(key): boolean`(새로 채웠으면 true), `has(key)`, `filledKeys(): string[]`(rank 순), `isComplete(keys = 7색 전체)`.
  - `predicateJudge(pred) → { judge(target) → { correct } }`
  - `orderedJudge(ids: string[]) → { judge(target) → { correct, done, expectedId }, progress: number }` — 오답이어도 진행도는 유지.
  - `pickSpawnColor({ needed: string[], all: string[], sinceNeeded: number, rng }) → string` — `sinceNeeded >= 3`이면 반드시 `needed` 중 하나 반환.
  - `class Spawner({ intervalMs })` — `update(dtMs) → number`(이번에 생성할 개수), dt는 `MAX_DT_MS`로 상한 → 한 번에 최대 1개.
  - `missionStars({ wrongShots, restarts }) → 1|2|3` — 3: 오답 ≤1이고 재시작 0 / 2: 오답 ≤4 / 1: 그 외.
  - `NAMED_STARS = { rigel, sirius, betelgeuse }` 각 `{ id, name, colorKey, size, glow, constellation }`:
    리겔 `blueWhite, size 1.0, glow 0.8, 'orion'` / 시리우스 `white, size 0.9, glow 1.0, 'canisMajor'` / 베텔게우스 `red, size 1.8, glow 0.8, 'orion'`.
  - `ORION_BACKGROUND`(쏠 수 없음, `targetable:false`, 실제 색, 정규화 좌표 — 북쪽 위·동쪽 왼쪽): 벨라트릭스 `blueWhite (0.70,0.20)`, 알니탁 `blue (0.42,0.50)`, 알닐람 `blue (0.50,0.48)`, 민타카 `blue (0.58,0.45)`, 사이프 `blue (0.35,0.85)`. 베텔게우스 `(0.25,0.15)`, 리겔 `(0.75,0.82)`, 시리우스는 오리온 왼쪽 아래 `(-0.35,1.45)`.
  - `JEWELBOX`: 12개 — 청 4, 청백 5, 백 2, 적 1(`isSupergiant:true`, 12개 중 size 최대). `JEWELBOX_NOTE = '실제 성단을 바탕으로 단순화했어요'`.
  - `QUIZ`: 3문항 `{ id, prompt, choices, answerIndex, explanation }`, `gradeQuiz(answers) → { correct, total, perItem }`.
  - `copy.js`: `MISSION_TEXT`(미션별 지시문·정리 카드), `wrongShotMessage(phaseId, target) → string`.

- [ ] **Step 1: 실패 테스트 작성**
  - 게이지: `new StarGauge(['yellow'])`에서 `fill('blue') === true`, 다시 `fill('blue') === false`; 7색 모두 채우면 `isComplete()`.
  - 판정: `orderedJudge(['rigel','sirius','betelgeuse'])`에서 sirius 먼저 → `correct:false, progress 0`, 이어서 rigel → 정답·progress 1, … 마지막 정답 → `done:true`.
  - 출현: 고정 rng(항상 0.99)로 `needed=['blue']`일 때 `sinceNeeded=3` → `'blue'`. `needed=[]`이면 `all` 중 하나.
  - `Spawner({intervalMs:800}).update(5000) <= 1`.
  - 점수: `{0,0}→3`, `{1,0}→3`, `{0,1}→2`, `{4,0}→2`, `{5,0}→1`.
  - **사실 검증** (안티목표 방지):
    - `sortHottestFirst(Object.values(NAMED_STARS)).map(s=>s.id)` = `['rigel','sirius','betelgeuse']`.
    - 베텔게우스는 세 별 중 size 최대, 시리우스는 glow 최대 (함정 구조).
    - `ORION_BACKGROUND`는 전부 `targetable === false`.
    - `JEWELBOX` 길이 12, 청+청백 = 9개로 최다 그룹, 초거성은 `red`이고 size 최대이면서 rank 최하위.
    - `QUIZ` 길이 3, 각 `answerIndex`가 `choices` 범위 안. 1번 정답 = "높을수록", 2번 정답 = (가) 노란빛, 3번 정답 = "베텔게우스는 적색이라 표면 온도가 낮기 때문".
    - `wrongShotMessage('m3a', NAMED_STARS.betelgeuse)`에 "적색"과 "색" 포함, `('m3a', sirius)`에 "백색" 포함.
- [ ] **Step 2:** `npx vitest run` → FAIL 확인.
- [ ] **Step 3:** 구현. 퀴즈 문구 확정본:
  1. "별은 표면 온도가 (   ) 청색을 띤다." — `높을수록` / `낮을수록`
  2. "유리 공예 그림에서 (가) 노란빛 부분과 (나) 붉은빛 부분 중 온도가 더 높은 곳은?" — `(가) 노란빛 부분` / `(나) 붉은빛 부분` / `둘이 같다`. 해설: "노란빛은 붉은빛보다 온도가 높을 때 나타나요."
  3. "베텔게우스는 아주 큰 별인데 왜 가장 뜨거운 별이 아닐까?" — `베텔게우스는 적색이라 표면 온도가 낮기 때문` / `지구에서 멀리 있기 때문` / `큰 별은 언제나 차갑기 때문` / `밝기가 온도를 정하기 때문`.
  피드백 문구 원칙: 교과서 용어 사용, 한 줄, "온도는 **색**으로 비교해요"로 마무리.
- [ ] **Step 4:** `npm test` → 전부 PASS.
- [ ] **Step 5:** 커밋 `feat: gauge, judges, spawner, scoring and star/quiz data`.

---

# Day 2 — 엔진 공통부와 미션 1~4

### Task 6: 터치 조작·우주선·빔·별 그리기·HUD·미션 공통부

`phaser-core`, `phaser-arcade-physics`, `input-systems`, `game-ui-ux`, `performance-optimization` 스킬을 읽는다. Task 2 `VERDICT.md`의 수치를 반영한다.

**Files:**
- Create: `src/input/TouchControls.js`, `src/objects/starTextures.js`, `src/objects/Pools.js`, `src/scenes/HudScene.js`, `src/scenes/BaseMissionScene.js`, `src/scenes/CardScene.js`
- Test: `tests/input/touch.test.js`
- Modify: `src/main.js` (씬 등록)

**Interfaces:**
- Consumes: Task 4·5 전부.
- Produces:
  - `classifyPointer(x, y, fireRect) → 'fire' | 'move'` (순수 함수, `fireRect = {x,y,w,h}`).
  - `class TouchControls(scene, { fireRect, offsetY })` — `targetX/targetY`(우주선 목표 위치), 이벤트 `'fire'`(누른 순간 1회). 발사 버튼에서 시작한 포인터는 끝날 때까지 이동에 쓰지 않는다.
  - `makeStarTextures(scene)` — 7색 × 별 텍스처(코어 + 빛 번짐), 쇳물 4단계 텍스처, 키 `star-<colorKey>`, `furnace-<key>`. 크기·밝기는 스프라이트 `scale`·`alpha`로 조절.
  - `createPools(scene)` → `{ stars, beams, asteroids }` (Arcade 그룹, `maxSize` 지정, 재사용).
  - `BaseMissionScene extends Phaser.Scene` — 하위 씬이 구현: `missionId`, `phases`, `spawnObject(phase)`, `onPhaseComplete(phase)`. 공통 제공: 우주선, `TouchControls`, `HeatMeter`, 빔↔대상 `overlap`, 우주선↔대상 `overlap`, 정답/오답 처리(`judge` 결과로 게이지·점수·피드백), 선체 온도 가득 → `this.scene.restart()`(재시작 횟수는 `registry`에 누적), 상태 초기화는 `init()`에서.
  - `HudScene`(키 `'hud'`, 한 번만 `launch` 후 `bringToTop`) — 위쪽 7칸 게이지(왼쪽 '높다' · 오른쪽 '낮다' · 아래 '표면 온도'), 태양 기준 아이콘(미션 2부터), 선체 온도 바, 미션 지시문, 남은 목표 수, 일시정지·음소거 버튼, 토스트 피드백. **이벤트로만 갱신**: `'gauge-changed'`, `'heat-changed'`, `'instruction'`, `'goal-changed'`, `'toast'`.
  - `CardScene`(키 `'card'`) — 정리 카드 표시 후 "다음" 버튼으로 `data.next` 씬 시작.
  - registry 키: `results.m1..m4 = { stars, wrongShots, restarts }`, `results.quiz`, `gaugeFinal`, `orionTagged`.

- [ ] **Step 1:** `tests/input/touch.test.js` — 버튼 안 좌표 → `'fire'`, 경계 바로 밖 → `'move'`. FAIL 확인 → 구현 → PASS.
- [ ] **Step 2:** 나머지 구현. 발사 버튼: 지름 ≥ 120px(720 기준), 오른쪽 아래, 안전 여백 ≥ 24px. HUD 글자 ≥ 28px. 빔은 별을 뚫고 지나가지 않게 속도 ≤ 1400px/s, 바디 높이 ≥ 24px.
- [ ] **Step 3:** 임시 디버그 씬으로 브라우저 확인(데스크톱 크롬 기기 에뮬레이션 + 터치):
  - 드래그 중 발사 버튼 탭 → 이동이 끊기지 않고 1발 발사.
  - 발사 버튼을 누른 채 문질러도 우주선이 움직이지 않음.
  - 선체 온도가 가득 차서 재시작한 뒤 게이지·점수·남은 목표가 미션 시작 상태로 돌아감.
  - 탭을 다른 앱으로 10초 전환 후 복귀 → 별이 한꺼번에 쏟아지지 않음.
- [ ] **Step 4:** `npm test`, `npm run build` 통과. 디버그 씬 제거. 커밋 `feat: touch controls, pools, HUD and base mission scene`.

### Task 7: 미션 1 용광로 탈출 + 미션 2 스타게이지 보정

`level-design` 스킬을 읽는다 (가르치기 → 연습 → 시험).

**Files:**
- Create: `src/scenes/M1FurnaceScene.js`, `src/scenes/M2GaugeScene.js`
- Modify: `src/main.js`, `src/scenes/TitleScene.js` ("시작" → `m1`)

**Interfaces:**
- Consumes: `BaseMissionScene`, `FURNACE_STAGES`, `predicateJudge`, `hotterThanSun`, `coolerThanSun`, `StarGauge`, `pickSpawnColor`, `MISSION_TEXT`.
- Produces: 씬 키 `'m1'`, `'m2'`. m1 완료 → `card`(정리 카드 "뜨거울수록 흰색, 식을수록 붉은색. 별도 그래요!") → `m2`. m2 완료 → `card`(완성 게이지 = 교과서 그림 8-5 순서) → `m3`.

- [ ] **Step 1 (m1):** 쇳물 덩어리는 화면 위→아래로 내려가며 이동 거리에 따라 `white → yellow → orange → red`로 텍스처 교체. 처음 30초는 소행성·충돌 없음(연습), 이후 충돌 켬. 정답 = 맞힌 순간 `stage === 'white'`. 목표 5개.
- [ ] **Step 2 (m2):** 게이지는 `['yellow']` 미리 채움. 2-a 지시 "태양보다 뜨거운 별만 쏘고 나머지는 피하라" — 정답 = `hotterThanSun`, 완료 = 청·청백·백·황백 채움. 2-b "태양보다 차가운 별만 쏘고 나머지는 피하라" — 정답 = `coolerThanSun`, 완료 = 7칸 전부. 출현 색은 `pickSpawnColor`(needed = 현재 단계에서 아직 안 채운 색). 별 크기·밝기는 색과 독립적인 무작위.
- [ ] **Step 3:** 브라우저에서 m1→m2 끝까지 플레이. 확인: 오답 시 토스트 한 줄이 뜨고 게임이 멈추지 않음, 2-b까지 6분 안에 끝남, 클리어 카드의 게이지 순서가 청색→적색.
- [ ] **Step 4:** `npm test`, `npm run build`. 커밋 `feat: mission 1 furnace and mission 2 star gauge`.

### Task 8: 미션 3 밝기의 함정 + 별자리 완성 그림

**Files:**
- Create: `src/scenes/M3TrapScene.js`

**Interfaces:**
- Consumes: `NAMED_STARS`, `ORION_BACKGROUND`, `orderedJudge`, `sortHottestFirst`, `wrongShotMessage`.
- Produces: 씬 키 `'m3'`. 완료 → 별자리 완성 그림 화면(같은 씬 안의 마지막 단계) → `m4`. registry `orionTagged`.

- [ ] **Step 1:** 오리온·큰개자리 별을 정규화 좌표로 배치한 '별자리 묶음'이 천천히 내려오고, 화면 밖으로 나가면 위에서 다시 등장. 리겔·시리우스·베텔게우스만 이름 라벨 + 쏠 수 있음. 배경 별은 흐리게, 빔이 통과. 별자리 밖으로 이름 없는 '크고 밝은 적색 함정 별'이 따로 흐름(오답 처리).
- [ ] **Step 2:** 3-a 지시 "세 별 중 가장 뜨거운 별 하나만 쏴라" → 정답 리겔(`sortHottestFirst(...)[0]`). 3-b "표면 온도가 높은 순서대로 쏴라" → `orderedJudge(sortHottestFirst(...).map(s=>s.id))`.
- [ ] **Step 3:** 완성 그림: 별자리 선 + 모든 별을 **실제 색**으로, 학생이 표시한 세 별 강조, 문구 "별마다 색이 다른 까닭은 표면 온도가 다르기 때문이에요."
- [ ] **Step 4:** 브라우저 확인: 베텔게우스를 3-a에서 쏘면 "적색" 피드백, 시리우스를 쏘면 "백색" 피드백. 커밋 `feat: mission 3 brightness trap with constellation picture`.

### Task 9: 미션 4 보스 보석상자 성단 + 결과 그래프

**Files:**
- Create: `src/scenes/M4JewelboxScene.js`

**Interfaces:**
- Consumes: `JEWELBOX`, `JEWELBOX_NOTE`, `StarGauge`, `predicateJudge`.
- Produces: 씬 키 `'m4'`. 완료 → `report`.

- [ ] **Step 1:** 성단 12개 별이 화면 위쪽에 모여 천천히 좌우로 흔들리며 머묾. 적색 초거성(보스)은 가장 크게, 좌우로 크게 움직임. 성단에서 작은 청색 '흩어진 별'이 주기적으로 아래로 날아옴: 판정 대상 아님, 빔 통과, 부딪히면 `heatOnCollision('star','blue')`. 초거성과 부딪히면 `heatOnCollision('star','red')`.
- [ ] **Step 2:** 지시 "성단의 별을 모두 표시하라" — 성단 12개 모두 정답 대상, 표시한 별은 흐려지고 게이지에 색별로 쌓임. 제한 시간 150초(`balance.js`). **시간 초과는 실패가 아님**: 남은 별을 보여 주고 다음 단계로(점수에만 반영).
- [ ] **Step 3:** 질문 2개(선택형, 즉시 정답 표시): "이 성단에 가장 많은 별의 색은?" → `청색·청백색` / `황색` / `적색`. "붉은 초거성은 크기가 가장 크다. 그럼 표면 온도도 가장 높을까?" → `아니다, 적색이라 낮다` / `그렇다, 크니까 높다`.
- [ ] **Step 4:** 결과: 색별 개수 막대그래프(코드로 그림, 막대 색 = 해당 별 색), 문구 "청색 별이 많은 성단은 비교적 젊은 성단이에요.", 작은 글씨 `JEWELBOX_NOTE`, 크레디트 "참고: NSF NOIRLab 「Jewels of the Night」".
- [ ] **Step 5:** 브라우저 확인 후 커밋 `feat: mission 4 jewelbox boss and color chart`.

---

# Day 3 — 마무리 화면·아트·손맛·실기기·배포

### Task 10: 귀환 보고서·결과 화면·전체 흐름 15분 확인

**Files:**
- Create: `src/scenes/ReportScene.js`, `src/scenes/ResultScene.js`
- Modify: `src/main.js`

**Interfaces:**
- Consumes: `QUIZ`, `gradeQuiz`, `missionStars`, registry `results.*`, `gaugeFinal`, `orionTagged`.
- Produces: 씬 키 `'report'`, `'result'`.

- [ ] **Step 1:** `report`: 3문항을 한 문항씩, 선택 후 정답/해설 표시. 2번 문항 그림 자리는 Task 11 전까지 회색 상자 + "유리 공예 그림".
- [ ] **Step 2:** `result`: 미션별 별점(1~3), 퀴즈 점수, 완성 게이지, 오리온 그림 축소판, "처음부터 다시"(registry 초기화 후 `title`). 저장·전송 없음.
- [ ] **Step 3:** 처음부터 끝까지 한 번 플레이하며 시간을 잰다. 목표 14~16분. 넘으면 `balance.js`의 목표 개수·제한 시간만 조정해서 맞춘다. 측정 결과를 커밋 메시지에 기록.
- [ ] **Step 4:** 커밋 `feat: return report quiz, result screen, full flow tuned to ~15min`.

### Task 11: 아트 생성·적용

`create-game-assets` 스킬과 `references/raster-pipeline.md`, `references/provenance.md`를 읽는다.

**Files:**
- Create: `art/art-direction-brief.md`, `art/asset-manifest.json`, `art/PROVENANCE.md`, `tools/gen-images.mjs`, `public/img/*.png`
- Modify: `src/scenes/BootScene.js`(로드), 각 씬(도형 → 이미지 교체)

**Interfaces:**
- `node --env-file=.env tools/gen-images.mjs <assetId> [--ref <png>]` — `art/asset-manifest.json`의 해당 항목 프롬프트로 `POST https://api.openai.com/v1/images/generations` 호출(`model = process.env.OPENAI_IMAGE_MODEL`, 투명 배경이 필요한 항목은 `background: 'transparent'`), 결과를 `art/raw/<assetId>.png`에 저장. 키는 출력하지 않는다.

- [ ] **Step 1:** 브리프: 밝은 2D 카툰/네온 우주풍, 굵고 둥근 실루엣, 어두운 남색 배경 위에서 잘 보이는 밝은 외곽, 별 7색과 겹치지 않는 우주선 색(민트·은색 계열), 이미지 안에 글자 넣지 않음.
- [ ] **Step 2:** 목록(manifest): `ship`(투명, 256²), `asteroid-1..3`(투명, 128²), `bg-space`(720×1280 세로, 별 없는 성운 배경 — 판정 대상으로 오해되지 않게 점 별 금지), `bg-furnace`(720×1280), `title-art`, `glass-craft`(퀴즈 2번용: 노란빛 (가)·붉은빛 (나)가 분명한 유리 공예 장면, 글자 없음 — (가)(나) 표시는 코드로 덧붙임), `fire-button`(투명, 160²).
- [ ] **Step 3:** `ship` 1개만 먼저 생성 → 게임 안에 넣은 스크린샷을 교사에게 보여 주고 승인. **승인 전 나머지 생성 금지.**
- [ ] **Step 4:** 승인된 `ship`을 `--ref`로 같은 계열 생성. 모델이 지정 크기를 지원하지 않으면 가장 가까운 크기로 받고 다음 단계에서 정규화.
- [ ] **Step 5:** 정규화: 지정 크기로 자르기·축소, 투명도 확인. `python .claude/skills/create-game-assets/scripts/asset_report.py public/img/ship.png --expect-size 256x256 --require-alpha --json` 통과. 미리보기 시트 생성해서 눈으로 확인.
- [ ] **Step 6:** 게임에 적용하고 탭 크기·폰 크기에서 확인: 우주선이 별과 헷갈리지 않음, 배경이 별 색 판단을 방해하지 않음.
- [ ] **Step 7:** `PROVENANCE.md`에 자산별 모델명·날짜·프롬프트 요약 기록. `art/raw/`는 `.gitignore`. 커밋 `feat: generated art set integrated`.

### Task 12: 손맛·효과음

`game-feel`, `audio-design` 스킬을 읽는다.

**Files:**
- Create: `src/audio/sfx.js`
- Modify: `src/scenes/BaseMissionScene.js`, `src/scenes/HudScene.js`

**Interfaces:**
- Produces: `sfx.play('correct'|'wrong'|'hit'|'fire'|'clear')`, `sfx.setMuted(bool)`, `sfx.muted`. WebAudio 오실레이터로 즉석 합성(파일 없음), 첫 터치 때 AudioContext 재개. 기본 음량 낮게, 재생마다 피치 ±5% 변화.

- [ ] **Step 1:** 연출 3단계: 작은(발사: 효과음만) / 중간(정답: 별 둘레 고리 퍼짐 + 점수 숫자 튀어오름, 오답: 빔 빨갛게 깜빡 + 토스트) / 큰(충돌: 카메라 짧은 흔들림 ≤150ms + 선체 온도 바 깜빡). 흔들림은 카메라에만, 입력은 막지 않음.
- [ ] **Step 2:** HUD 음소거 버튼과 연결. 브라우저에서 효과가 끝나면 원래 상태로 돌아오는지, 연출 중에도 조작이 되는지 확인.
- [ ] **Step 3:** 커밋 `feat: feedback tiers and synthesized sfx`.

### Task 13: 실기기 성능·화면 확인 → 정식 배포

`performance-optimization` 스킬을 읽는다.

**Files:**
- Modify: 측정 결과에 따라 `src/config/balance.js`, 텍스처 크기 등
- Create: `docs/device-check.md`

- [ ] **Step 1:** 화면 구석에 FPS 표시(`?debug=1`일 때만). 미리보기 배포.
- [ ] **Step 2:** 교사에게 갤럭시탭 S6 Lite와 폰(가능하면 아이폰 1대 포함)에서 `?debug=1`로 미션 4(가장 무거운 장면)를 해 보고 FPS 최저값을 알려 달라고 요청.
- [ ] **Step 3:** 30fps 미만이면 측정 → 가장 큰 원인 하나 수정(동시 오브젝트 수, 빛 번짐 텍스처 크기, 풀 크기) → 재측정. 전후 숫자를 `docs/device-check.md`에 기록.
- [ ] **Step 4:** 같은 문서에 Review Focus 5개 항목의 실기기 확인 결과 기록(멀티터치, 앱 전환 복귀, 미션 2 완료 가능, 가로 회전, 더블탭 확대·길게 누르기·당겨서 새로고침).
- [ ] **Step 5:** `main`에 머지·푸시 → Vercel 정식 배포 주소 확인. 주소와 QR(예: `npx qrcode <url> -o docs/qr.png`)을 교사에게 전달.
- [ ] **Step 6:** 커밋 `chore: device check results and production deploy`.

---

## 일정 보호용 축소안 (밀릴 때 이 순서로 줄인다)

1. Task 12 효과음 → `correct`, `wrong`, `hit` 3개만, 화면 흔들림 생략.
2. Task 11 아트 → `ship`, `bg-space`, `glass-craft`만 생성, 나머지는 코드 도형 유지.
3. Task 2 시험판 → 교사가 당일 확인할 수 없으면 판정을 Task 13 실기기 확인으로 미루고 바로 본 개발 진행.
4. Task 8 완성 그림 → 선 없이 별 색만 보여 주는 정적 화면.

교육 내용(Task 4·5의 규칙·데이터, 미션 1~4의 판정, 퀴즈)은 줄이지 않는다.

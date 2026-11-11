# 별빛 탐사선 스타게이지호

별빛의 색(스펙트럼)으로 별의 표면 온도를 비교하는 중학교 2학년 과학 슈팅 웹게임입니다 (Vite + Phaser 4).
터치(조이스틱 + 발사 버튼) 세로 화면용이고, 미션 4개와 귀환 보고서를 합쳐 약 15분 걸립니다.

- 플레이: https://stargauge.vercel.app
- 저장소: https://github.com/mrdoolee/stargauge

## 게임 구성

| 미션 | 내용 |
|---|---|
| m1 용광로 탈출 | 가장 뜨거운(흰색) 쇳물만 쏜다 |
| m2 스타게이지 보정 | 1단계는 태양보다 뜨거운 별만, 2단계는 태양보다 차가운 별만 쏘고 나머지는 피한다 |
| m3 밝기의 함정 | 뜨거운 별로 빔을 충전해 방해 드론을 격추한다. 충전 색이 방어막 색과 같거나 더 뜨거워야 뚫리고, 더 뜨거울수록 피해가 크다 |
| m4 보스 함선 | 제한 시간 안에 보스를 물리친다. 장갑 색이 단계마다 더 뜨거워지고, 호위 드론과 가짜 별이 나온다 |
| 귀환 보고서 | 퀴즈와 결과 정리 |

타이틀에서 쉬움 / 중간 / 어려움을 고릅니다.

## 실행

```
npm install
npm run dev        # http://localhost:5173/
npm test
npm run build      # dist/
```

교실 기기에서 확인할 때는 `npm run dev -- --host`로 띄우고 같은 Wi-Fi에서 `Network:` 주소를 엽니다.
`?debug=1`을 붙이면 FPS가 보이고, `?debug=1&mission=m3&difficulty=hard`처럼 미션과 난이도로 바로 갈 수 있습니다.
자세한 절차와 조정값 표: `docs/device-check.md`

## 배포

Vercel 프로젝트 `stargauge`가 이 GitHub 저장소에 연결되어 있습니다.

- `main`에 push하면 운영 주소(https://stargauge.vercel.app)로 자동 배포됩니다.
- 다른 브랜치(`dev` 등)에 push하면 미리보기 배포가 만들어집니다. 미리보기 주소는 Vercel 로그인이 있어야 열립니다.
- 빌드 설정은 Vercel의 Vite 기본값(`npm run build`, 출력 `dist`)을 씁니다.

작업은 `dev`에서 하고, 실기기 확인이 끝나면 `main`으로 합칩니다.

## 문서

- 설계(spec): `docs/superpowers/specs/`
  - `2026-10-30-star-color-shooter-design.md` 전체 설계
  - `2026-11-03-patterns-art-briefing-design.md` 편대·난이도, 그림, 선장 브리핑
  - `2026-11-04-m3-m4-shooter-redesign-design.md` m3·m4 충전 빔 슈팅
  - `2026-11-06-messages-transitions-damage-design.md` 안내 줄, 단계 전환, 피해 누적, 보스 게이지
- 구현 계획: `docs/superpowers/plans/` (같은 날짜 이름)
- 실기기 확인: `docs/device-check.md`
- 줄바꿈 점검 기록: `docs/line-breaks-2026-11-06.md`
- 그림·음악·글꼴 출처: `art/PROVENANCE.md`, `art/asset-manifest.json`

## 사용한 자료

- 그림: OpenAI Images API로 만든 그림, 교사 승인(2026-11-11). 별은 코드가 색을 입힙니다.
- 글꼴: Orbit (SIL Open Font License 1.1, `public/fonts/OFL.txt`)
- 음악: `public/music/` 3곡. 출처 기록은 `art/PROVENANCE.md`의 Music 항목에 있습니다.

## 주의

API 키는 `.env`에만 두고 **절대 커밋하지 않습니다.** (`.env`는 `.gitignore`에 들어 있습니다. `git add -A`/`git add .` 전에 한 번 더 확인하세요.)

`.env`는 그림 생성 도구(`tools/gen-images.mjs`)만 씁니다. 게임 실행과 배포에는 필요 없습니다.

```
OPENAI_API_KEY=...        # OpenAI API 키 (절대 공유·커밋 금지)
OPENAI_IMAGE_MODEL=...    # 그림 생성 모델 이름
```

사용: `node --env-file=.env tools/gen-images.mjs <assetId> [--ref <png>] [--dry-run]`

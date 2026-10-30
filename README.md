# 별빛 탐사선 스타게이지호

별빛의 색(스펙트럼)을 이용해 별을 분류하고 맞서 싸우는 중학교 과학 슈팅 웹게임 (Vite + Phaser).

- 스펙: `docs/superpowers/specs/2026-10-30-star-color-shooter-design.md`
- 계획: `docs/superpowers/plans/2026-10-30-star-color-shooter.md`

## 주의

API 키는 `.env`에만 두고 **절대 커밋하지 않습니다.** (`.env`는 `.gitignore`에 들어 있습니다. `git add -A`/`git add .` 전에 한 번 더 확인하세요.)

`.env`는 그림 생성 도구(`tools/gen-images.mjs`)만 씁니다. 게임 실행에는 필요 없습니다.

```
OPENAI_API_KEY=...        # OpenAI API 키 (절대 공유·커밋 금지)
OPENAI_IMAGE_MODEL=...    # 그림 생성 모델 이름
```

사용: `node --env-file=.env tools/gen-images.mjs <assetId> [--ref <png>] [--dry-run]`

## 실행

```
npm install
npm run dev
npm test
```

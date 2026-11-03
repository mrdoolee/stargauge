# Art direction brief - 별빛 탐사선 스타게이지호

> Status: style A (hand-painted arcade look) approved by the teacher 2026-11-03. Approved style seed: `art/raw/ship-style-a.png` (git-ignored; generating script `art/raw/ship-style-a.prompt.mjs`). Only the seed exists; every other asset is still planned. Star colors are applied by code (`STAR_COLORS`), never baked into generated art.

## Game frame

- Player fantasy: 별빛 탐사선의 조종사가 별의 색으로 온도를 읽어 내는 탐사 대원이 된다.
- Core verbs: 드래그로 이동, 버튼으로 발사, 별 색을 보고 판정.
- Engine and renderer: Phaser 4.2.1 + Vite, WebGL/Canvas.
- Target platforms: 학생 폰/태블릿 터치 (세로).
- Camera/view/facing: 위에서 내려다보는 세로 스크롤, 우주선은 위쪽을 향함.
- Native viewport and common display scale: 720x1280, 폰에서 약 0.5x ~ 0.6x 로 축소 표시.
- Typical asset size on screen: 우주선 ~64px, 운석 ~72px, 발사 버튼 ~160px.

## Visual system

- Style A (teacher approved): crisp hand-painted HD 2D game sprite, chunky detailed panels and rivets like classic 90s arcade shooters but clean and high resolution, soft cel shading, subtle glow. 손으로 그린 고해상도 아케이드풍. 이 문장을 모든 프롬프트에 공통으로 쓴다(`art/asset-manifest.json`).
- Shape language: 묵직하고 패널·리벳 디테일이 있는 실루엣, 깔끔한 고해상도 아케이드풍.
- Silhouette priorities: 우주선과 운석은 별(원형 광원)과 한눈에 구분되어야 한다. 운석은 울퉁불퉁한 비원형, 우주선은 위쪽이 뾰족한 둥근 형태.
- Value structure: 어두운 남색 배경 위에 밝은 외곽선으로 대상이 또렷이 보임. 배경은 어둡고 대비가 낮음.
- Palette roles and exact swatches: 우주선 민트 #7ef2d4, 은색 #d9e2ea, 빔 #9ffff0, 배경 남색 #05070f, 운석 회갈색 #6b6f7a.
- Reserved star colors (never a main color of ship/UI/backgrounds): 파랑 #3d7bff, 청백 #9cc9ff, 흰색 #f4f6ff, 황백 #fff1b8, 노랑 #ffd23f, 주황 #ff9a2e, 빨강 #ff4b3a.
- Materials and surface cues: 셀 셰이딩, 패널·리벳 디테일, 은은한 엔진 빛/글로우.
- Edge/line treatment: 깔끔한 윤곽과 밝은 림 라이트.
- Lighting direction and contrast: 위쪽 왼쪽 약한 조명, 낮은 대비 배경.
- Detail density and focal hierarchy: 우주선·소행성·용광로는 패널 디테일이 있되, 배경은 어둡고 단순. 판정 대상(별)이 항상 화면에서 가장 눈에 띄는 요소.
- Motion character: 부드럽고 가벼움.
- Explicit exclusions: 도트(픽셀) 그림, 흐릿한 저해상도, 2차 대전 비행기·군복 분위기, 이미지 안의 글자·숫자·로고·워터마크, 배경의 점 별/반짝임(판정 대상으로 오해됨), 별 7색과 같은 주색(예외: 브리핑 m1 쇳물, m3 붉은/푸른 별 그림), 교과서 그림 모사.
- 별 모양·쇳물 텍스처는 흰색·회색만 생성하고 색은 코드가 입힌다.

## Technical contract

- Asset dimensions/aspect: manifest의 `technical.target_size` 참고 (ship 256², captain-base 512x640, asteroid·star-shape·furnace-shape 128², fire-button 160², 배경·타이틀 720x1280, glass-craft 560x200, briefing-m1..m4 560x320). `request_size`는 모델 지원 크기, 이후 target_size로 정리.
- Alpha/background: 우주선·운석·별/쇳물 모양·발사 버튼·bg-space-near는 투명, 배경류·브리핑 그림은 불투명. 선장 기본 그림은 sprite-gen 키잉용 단색 초록(#00ff00) 불투명 배경.
- 배경 에셋(`bg-*`)은 프롬프트에 'no stars / no star points'를 반드시 넣는다(테스트로 확인).
- Grid/tile/frame size: 단일 프레임.
- Anchor/pivot/baseline: 중앙 (ship은 하단 중앙 엔진).
- Filtering/mipmaps/compression: linear, PNG.
- Color space: sRGB.
- Texture/poly/material budgets: 각 PNG 1MB 이하 목표.
- Naming and folders: `public/img/<id>.png`, 원본은 `art/raw/<id>.png`(git 제외).
- API 요청 크기는 모델 지원 크기(예: 1024x1024, 1024x1536, 1536x1024)로 받고 이후 지정 크기로 정규화.

## Visual target

- Approved seed/reference paths: `art/raw/ship-style-a.png` (A안, 교사 승인 2026-11-03). 나머지 에셋은 `--ref`로 이 그림을 참조해 같은 계열로 생성.
- 움직이는 그림(선장 표정, 엔진 불꽃)은 sprite-gen(`C:\Users\mrdoo\tools\sprite-gen`, Codex 로그인 경로)으로 만든다.
- Required do/don't examples: 해당 없음 (승인 후 추가).
- Native-scale gameplay capture: 승인 시 추가.
- Approval owner/date: 교사 / 2026-11-03 (그림체 A안). 선장 기준 그림은 생성 후 교사 승인 필요.

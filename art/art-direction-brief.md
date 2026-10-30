# Art direction brief - 별빛 탐사선 스타게이지호

> Status: planned. Nothing is generated yet (spec section 7: no image generation until the gray-box prototype passes the teacher's field test). Stars stay code-drawn forever so their colors stay exact.

## Game frame

- Player fantasy: 별빛 탐사선의 조종사가 별의 색으로 온도를 읽어 내는 탐사 대원이 된다.
- Core verbs: 드래그로 이동, 버튼으로 발사, 별 색을 보고 판정.
- Engine and renderer: Phaser 4.2.1 + Vite, WebGL/Canvas.
- Target platforms: 학생 폰/태블릿 터치 (세로).
- Camera/view/facing: 위에서 내려다보는 세로 스크롤, 우주선은 위쪽을 향함.
- Native viewport and common display scale: 720x1280, 폰에서 약 0.5x ~ 0.6x 로 축소 표시.
- Typical asset size on screen: 우주선 ~64px, 운석 ~72px, 발사 버튼 ~160px.

## Visual system

- Shape language: 굵고 둥근 실루엣, 밝은 2D 카툰/네온 우주풍.
- Silhouette priorities: 우주선과 운석은 별(원형 광원)과 한눈에 구분되어야 한다. 운석은 울퉁불퉁한 비원형, 우주선은 위쪽이 뾰족한 둥근 형태.
- Value structure: 어두운 남색 배경 위에 밝은 외곽선으로 대상이 또렷이 보임. 배경은 어둡고 대비가 낮음.
- Palette roles and exact swatches: 우주선 민트 #7ef2d4, 은색 #d9e2ea, 빔 #9ffff0, 배경 남색 #05070f, 운석 회갈색 #6b6f7a.
- Reserved star colors (never a main color of ship/UI/backgrounds): 파랑 #3d7bff, 청백 #9cc9ff, 흰색 #f4f6ff, 황백 #fff1b8, 노랑 #ffd23f, 주황 #ff9a2e, 빨강 #ff4b3a.
- Materials and surface cues: 매끈한 플랫 셰이딩, 약한 글로우.
- Edge/line treatment: 굵고 깨끗한 밝은 외곽선.
- Lighting direction and contrast: 위쪽 왼쪽 약한 조명, 낮은 대비 배경.
- Detail density and focal hierarchy: 디테일 최소. 판정 대상(별)이 항상 화면에서 가장 눈에 띄는 요소.
- Motion character: 부드럽고 가벼움.
- Explicit exclusions: 이미지 안의 글자·숫자·로고, 배경의 점 별/반짝임(판정 대상으로 오해됨), 별 7색과 같은 주색, 교과서 그림 모사.

## Technical contract

- Asset dimensions/aspect: manifest 참고 (ship 256², asteroid 128², fire-button 160², 배경 720x1280, glass-craft 560x200).
- Alpha/background: 우주선·운석·발사 버튼은 투명, 배경류는 불투명.
- Grid/tile/frame size: 단일 프레임.
- Anchor/pivot/baseline: 중앙 (ship은 하단 중앙 엔진).
- Filtering/mipmaps/compression: linear, PNG.
- Color space: sRGB.
- Texture/poly/material budgets: 각 PNG 1MB 이하 목표.
- Naming and folders: `public/img/<id>.png`, 원본은 `art/raw/<id>.png`(git 제외).
- API 요청 크기는 모델 지원 크기(예: 1024x1024, 1024x1536, 1536x1024)로 받고 이후 지정 크기로 정규화.

## Visual target

- Approved seed/reference paths: 없음 (ship 1개를 먼저 생성해 교사 승인 후 `--ref`로 나머지 생성).
- Required do/don't examples: 해당 없음 (승인 후 추가).
- Native-scale gameplay capture: 승인 시 추가.
- Approval owner/date: 교사 / 미정.

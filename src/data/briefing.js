// Captain briefing copy shown before each mission (scene key 'briefing'). Spec 5.2, character for character.
// Pure data + one pure helper: no Phaser import.
//   image: 'gauge' = the 7-cell gauge drawn in code, otherwise an image key (briefing-m1..m4).

export const BRIEFING = {
  m1: {
    title: '용광로 탈출',
    expression: 'normal',
    line: '대원, 쇳물은\n뜨거울수록 흰색,\n식을수록 붉은색이야.',
    image: 'briefing-m1',
    bullets: [
      '쇳물은 식으면서 이렇게 변해요.\n흰색 → 노란색 → 주황색 → 붉은색',
      '빛의 색을 보면 온도를 짐작할 수 있어요.',
      '별도 같은 원리로 색을 띠어요.',
    ],
    goal: '가장 뜨거운 쇳물을 쏘세요.',
  },
  m2: {
    title: '스타게이지 보정',
    expression: 'serious',
    line: '별은 온도에 따라\n색이 달라.',
    image: 'gauge',
    bullets: [
      '청색일수록 표면 온도가 높아요.',
      '적색일수록 표면 온도가 낮아요.',
      '태양은 황색 별이에요.\n태양을 기준으로 비교해요.',
    ],
    goal: '태양보다 뜨거운 별만 쏘고,\n나머지는 피하세요.',
  },
  m3: {
    title: '밝기의 함정',
    expression: 'surprised',
    line: '크고 밝다고\n뜨거운 게 아니야.\n색을 봐!',
    image: 'briefing-m3',
    bullets: [
      '별을 측정하면\n그 별의 표면 온도만큼 빔이 충전돼요.',
      '별의 크기와 밝기는\n표면 온도와 관계없어요.',
      '드론의 방어막과 같거나\n더 뜨거운 색으로 충전해야 뚫려요.',
    ],
    goal: '뜨거운 별로 빔을 충전해서\n방해 드론을 격추하세요.',
  },
  m4: {
    title: '보스 함선',
    expression: 'serious',
    line: '마지막 임무야.\n보스 함선의 장갑을 뚫어!',
    image: 'briefing-m4',
    bullets: [
      '장갑 색과 같거나\n더 뜨거운 색의 별로 충전해야 뚫려요.',
      '보스가 쉬는 틈에는 탄이 오지 않아요.',
      '단계가 오를수록\n장갑이 더 뜨거운 색으로 바뀌어요.',
    ],
    goal: '제한 시간 안에\n보스 함선을 물리치세요.\n날아오는 탄은 피하세요.',
  },
};

/** What the scene draws, given which art is loaded. hasImage = (key) => boolean. */
export function briefingParts({ mission, hasCaptain, hasImage }) {
  const b = BRIEFING[mission];
  let picture = 'panel';
  if (b?.image === 'gauge') picture = 'gauge';
  else if (b && hasImage(b.image)) picture = 'image';
  return { portrait: hasCaptain ? 'atlas' : 'silhouette', picture };
}

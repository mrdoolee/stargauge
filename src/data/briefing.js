// Captain briefing copy shown before each mission (scene key 'briefing'). Spec 5.2, character for character.
// Pure data + one pure helper: no Phaser import.
//   image: 'gauge' = the 7-cell gauge drawn in code, otherwise an image key (briefing-m1..m4).

export const BRIEFING = {
  m1: {
    title: '용광로 탈출',
    expression: 'normal',
    line: '대원, 쇳물은 뜨거울수록 흰색, 식을수록 붉은색이야.',
    image: 'briefing-m1',
    bullets: [
      '쇳물은 식으면서 흰색 → 노란색 → 주황색 → 붉은색으로 변해요.',
      '빛의 색을 보면 온도를 짐작할 수 있어요.',
      '별도 같은 원리로 색을 띠어요.',
    ],
    goal: '가장 뜨거운 쇳물을 쏘세요.',
  },
  m2: {
    title: '스타게이지 보정',
    expression: 'serious',
    line: '별은 온도에 따라 색이 달라.',
    image: 'gauge',
    bullets: [
      '청색일수록 표면 온도가 높아요.',
      '적색일수록 표면 온도가 낮아요.',
      '태양은 황색 별이에요. 태양을 기준으로 비교해요.',
    ],
    goal: '태양보다 뜨거운 별만 쏘고, 나머지는 피하세요.',
  },
  m3: {
    title: '밝기의 함정',
    expression: 'surprised',
    line: '크고 밝다고 뜨거운 게 아니야. 색을 봐!',
    image: 'briefing-m3',
    bullets: [
      '별의 크기와 밝기는 표면 온도와 관계없어요.',
      '표면 온도는 색으로 비교해요.',
      '오리온자리와 큰개자리의 별을 살펴봐요.',
    ],
    goal: '세 별 중 가장 뜨거운 별을 찾아 쏘세요.',
  },
  m4: {
    title: '보석상자 성단',
    expression: 'smile',
    line: '마지막 임무야. 성단의 별을 모두 측정해!',
    image: 'briefing-m4',
    bullets: [
      '성단은 별이 모여 있는 무리예요.',
      '별마다 색을 보고 표면 온도를 비교해요.',
      '실제 성단을 바탕으로 단순화했어요.',
    ],
    goal: '시간 안에 성단의 별을 모두 표시하세요. 흩어지는 청색 별은 피하세요.',
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

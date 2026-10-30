import { STAR_COLORS } from '../logic/temperature.js';

export const MISSION_TEXT = {
  m1: {
    instruction: '가장 뜨거운 쇳물을 쏴라! 흰색에 가까울수록 뜨거워요.',
    card: '뜨거울수록 흰색, 식을수록 붉은색. 별도 그래요!',
  },
  m2a: {
    instruction: '태양보다 뜨거운 별만 쏘고, 나머지는 피하세요.',
  },
  m2b: {
    instruction: '태양보다 차가운 별만 쏘고, 나머지는 피하세요.',
    card: '청색에 가까울수록 뜨겁고, 적색에 가까울수록 차가워요.',
  },
  m3a: {
    instruction: '세 별 중 가장 뜨거운 별 하나만 쏘세요.',
  },
  m3b: {
    instruction: '표면 온도가 높은 순서대로 쏘세요.',
    card: '별의 온도는 크기나 밝기가 아니라 색으로 비교해요.',
  },
  m4: {
    instruction: '성단의 별을 모두 쏴서 표시! 흩어지는 청색 별은 피해요',
  },
};

const TAIL = '온도는 색으로 비교해요.';
const labelOf = key => STAR_COLORS.find(c => c.key === key)?.label;

function byColor(phaseId, key) {
  const label = labelOf(key);
  if (!label) return `태양보다 뜨거운지 차가운지는 색으로 확인해요. ${TAIL}`;
  if (phaseId === 'm2a') {
    return key === 'yellow'
      ? `황색 별은 태양과 같은 황색이에요. 태양보다 뜨겁지도 차갑지도 않아요. ${TAIL}`
      : `${label} 별은 태양보다 표면 온도가 낮아요. ${TAIL}`;
  }
  if (phaseId === 'm2b') {
    return key === 'yellow'
      ? `황색 별은 태양과 같은 황색이에요. 태양보다 뜨겁지도 차갑지도 않아요. ${TAIL}`
      : `${label} 별은 태양보다 표면 온도가 높아요. ${TAIL}`;
  }
  if (phaseId === 'm1') return `더 뜨거운 쇳물은 흰색에 가까워요. ${TAIL}`;
  if (phaseId === 'm3b') return `리겔(청백색) → 시리우스(백색) → 베텔게우스(적색) 순이에요. ${TAIL}`;
  return `${label} 별이에요. 청색에 가까울수록 표면 온도가 높아요. ${TAIL}`;
}

export function wrongShotMessage(phaseId, target) {
  if (phaseId === 'm3a' && target?.id === 'betelgeuse') {
    return `베텔게우스는 아주 크지만 적색이라 표면 온도가 낮아요. ${TAIL}`;
  }
  if (phaseId === 'm3a' && target?.id === 'sirius') {
    return `시리우스는 가장 밝지만 백색이라 리겔보다 표면 온도가 낮아요. ${TAIL}`;
  }
  if (phaseId === 'm4') {
    // Unreachable in practice (every cluster star is a correct target; scattered stars can't be shot),
    // but kept sensible: scattered blue stars are the hot ones to avoid.
    return `흩어지는 청색 별은 표면 온도가 높아 선체를 가장 많이 달궈요. 피해서 날아요. ${TAIL}`;
  }
  return byColor(phaseId, target?.colorKey);
}

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
  m3: {
    instruction: '뜨거운 별로 빔을 충전해서 방해 드론을 격추하세요.',
    card: '크고 밝아도 적색 별은 온도가 낮아요. 온도는 색으로 비교해요.',
  },
  m4: {
    instruction: '뜨거운 별로 충전해서 보스 함선의 장갑을 뚫으세요! 탄은 피해요',
  },
};

// Centre banners (HUD 'banner'): shown only while nothing is moving. `emphasis` is a word of `body` drawn in the accent colour.
export const BANNER_TEXT = {
  m1: { title: '연습 끝!', body: '이제 진짜예요! 흰색일 때만 쏘고,\n부딪히면 선체 온도가 올라가요.', emphasis: '흰색' },
  m2: { title: '1단계 완료!', body: '이번엔 태양보다 차가운 별', emphasis: '차가운' },
  overheat: { title: '선체 온도가 가득 찼어요!', body: '이 미션을 처음부터 다시 해요.' },
  m4Win: { title: '보스 함선을 격파했어요!' },
  m4Flee: { title: '보스가 도망갔어요.' },
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
  return `${label} 별이에요. 청색에 가까울수록 표면 온도가 높아요. ${TAIL}`;
}

export function wrongShotMessage(phaseId, target) {
  return byColor(phaseId, target?.colorKey);
}

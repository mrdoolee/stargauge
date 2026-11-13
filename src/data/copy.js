import { STAR_COLORS } from '../logic/temperature.js';

export const MISSION_TEXT = {
  m1: {
    instruction: '가장 뜨거운 쇳물을 쏴라!\n흰색에 가까울수록 뜨거워요.',
    card: '뜨거울수록 흰색,\n식을수록 붉은색.\n별도 그래요!',
  },
  m2a: {
    instruction: '태양보다 뜨거운 별만 쏘고,\n나머지는 피하세요.',
  },
  m2b: {
    instruction: '태양보다 차가운 별만 쏘고,\n나머지는 피하세요.',
    card: '청색에 가까울수록 뜨겁고,\n적색에 가까울수록 차가워요.',
  },
  m3: {
    instruction: '뜨거운 별로 빔을 충전해서\n방해 드론을 격추하세요.',
    card: '크고 밝아도 적색 별은\n온도가 낮아요.\n온도는 색으로 비교해요.',
  },
  m4: {
    instruction: '뜨거운 별로 충전해서\n보스 장갑을 뚫고 탄은 피해요',
  },
};

// Centre banners (HUD 'banner'): shown only while nothing is moving. `emphasis` is a word of `body` drawn in the accent colour.
export const BANNER_TEXT = {
  m1: { title: '연습 끝!', body: '이제 진짜예요! 흰색일 때만 쏘고,\n부딪히면 선체 온도가 올라가요.', emphasis: '흰색' },
  m2: { title: '1단계 완료!', body: '이번엔 태양보다 차가운 별', emphasis: '차가운' },
  overheat: { title: '선체 온도가\n가득 찼어요!', body: '이 미션을 처음부터 다시 해요.' },
  m4Win: { title: '보스 함선을\n격파했어요!' },
  m4Flee: { title: '보스가 도망갔어요.' },
};

const TAIL = '온도는 색으로 비교해요.';
const labelOf = key => STAR_COLORS.find(c => c.key === key)?.label;

function byColor(phaseId, key) {
  const label = labelOf(key);
  if (!label) return `뜨거운지 차가운지는 색으로 확인해요.\n${TAIL}`;
  if (phaseId === 'm2a') {
    return key === 'yellow'
      ? `태양과 같아서 뜨겁지도 차갑지도 않아요.\n${TAIL}`
      : `${label} 별은 태양보다 표면 온도가 낮아요.\n${TAIL}`;
  }
  if (phaseId === 'm2b') {
    return key === 'yellow'
      ? `태양과 같아서 뜨겁지도 차갑지도 않아요.\n${TAIL}`
      : `${label} 별은 태양보다 표면 온도가 높아요.\n${TAIL}`;
  }
  if (phaseId === 'm1') return `더 뜨거운 쇳물은 흰색에 가까워요.\n${TAIL}`;
  return `${label} 별이에요. 청색일수록 뜨거워요.\n${TAIL}`;
}

export function wrongShotMessage(phaseId, target) {
  return byColor(phaseId, target?.colorKey);
}

// Ending screen (after the result screen): the captain thanks the crew and hands the class back to the teacher.
export const ENDING = {
  label: 'MISSION COMPLETE',
  title: '임무 완료!',
  line: '은하를 지켜 주어\n고맙네, 대원!\n이제 선생님과 함께\n교실을 지켜 주게!',
  button: '처음으로',
};

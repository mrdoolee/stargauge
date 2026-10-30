export const QUIZ = [
  {
    id: 'q1',
    prompt: '별은 표면 온도가 (   ) 청색을 띤다.',
    choices: ['높을수록', '낮을수록'],
    answerIndex: 0,
    explanation: '표면 온도가 높은 별일수록 청색, 낮은 별일수록 적색을 띠어요.',
  },
  {
    id: 'q2',
    prompt: '유리 공예 그림에서 (가) 노란빛 부분과 (나) 붉은빛 부분 중 온도가 더 높은 곳은?',
    choices: ['(가) 노란빛 부분', '(나) 붉은빛 부분', '둘이 같다'],
    answerIndex: 0,
    explanation: '노란빛은 붉은빛보다 온도가 높을 때 나타나요.',
  },
  {
    id: 'q3',
    prompt: '베텔게우스는 아주 큰 별인데 왜 가장 뜨거운 별이 아닐까?',
    choices: [
      '베텔게우스는 적색이라 표면 온도가 낮기 때문',
      '지구에서 멀리 있기 때문',
      '큰 별은 언제나 차갑기 때문',
      '밝기가 온도를 정하기 때문',
    ],
    answerIndex: 0,
    explanation: '별의 크기나 밝기가 아니라 색으로 표면 온도를 비교해요. 적색은 온도가 낮아요.',
  },
];

export function gradeQuiz(answers) {
  const perItem = QUIZ.map((q, i) => answers[i] === q.answerIndex);
  return { correct: perItem.filter(Boolean).length, total: QUIZ.length, perItem };
}

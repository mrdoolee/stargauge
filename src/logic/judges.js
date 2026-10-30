export function predicateJudge(pred) {
  return { judge: target => ({ correct: !!pred(target) }) };
}

export function orderedJudge(ids) {
  const state = { progress: 0 };
  return {
    get progress() {
      return state.progress;
    },
    judge(target) {
      const expectedId = ids[state.progress];
      if (target && target.id === expectedId && state.progress < ids.length) {
        state.progress += 1;
        return { correct: true, done: state.progress >= ids.length, expectedId };
      }
      return { correct: false, done: state.progress >= ids.length, expectedId };
    },
  };
}

// Pure vertical layout for a report question screen (720x1280). All rects are { top, h }; nothing overlaps.
// Reserved heights are upper bounds: prompt up to 4 lines of 38px, feedback up to 4 lines of 30px.
export const REPORT_L = {
  headerY: 70, promptTop: 120, promptH: 170, gap: 20,
  imageH: 200, choiceH: 96, choiceStep: 112, feedbackH: 170, nextH: 80, nextCenterY: 1215,
};

export function reportLayout(nChoices, hasImage) {
  const L = REPORT_L;
  const prompt = { top: L.promptTop, h: L.promptH };
  let cursor = prompt.top + prompt.h + L.gap;
  let image = null;
  if (hasImage) {
    image = { top: cursor, h: L.imageH };
    cursor += L.imageH + L.gap;
  }
  const choices = Array.from({ length: nChoices }, (_, k) => ({ top: cursor + k * L.choiceStep, h: L.choiceH }));
  const last = choices[choices.length - 1];
  const feedback = { top: last.top + last.h + L.gap, h: L.feedbackH };
  const next = { top: L.nextCenterY - L.nextH / 2, h: L.nextH };
  return { prompt, image, choices, feedback, next };
}

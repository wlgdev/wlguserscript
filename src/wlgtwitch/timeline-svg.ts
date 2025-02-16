import { AnalysisResult } from "./analyze-chat.ts";

export function createTimelineSVG(
  chat: AnalysisResult,
  svgWidth = 4000,
  svgHeight = 30,
) {
  const rectWidth = svgWidth / chat.total_frames;
  const rectHeight = svgHeight;

  let svgString =
    `<svg class="chat-svg" width="100%" height="${svgHeight}px" viewBox="0 0 ${svgWidth} ${svgHeight}" preserveAspectRatio="none" style="display: block;">`;

  let index = 0;
  for (const key in chat.items) {
    const deviation = chat.items[key].deviation;
    const normalizedDeviation = (deviation - chat.min_deviation) /
      (chat.max_deviation - chat.min_deviation);
    const color = getLimeGreenToRedOrange(normalizedDeviation);
    const x = index * rectWidth;
    svgString += `<rect x="${x}" y="0" width="${
      rectWidth + 2
    }" height="${rectHeight}" fill="${color}"/>`;
    index++;
  }

  svgString += `</svg>`;
  return svgString;
}

function getLimeGreenToRedOrange(
  normalizedDeviation: number,
) {
  const startHue = 120;
  const endHue = 15;
  const hueRange = startHue - endHue;
  const hue = startHue - (hueRange * normalizedDeviation);
  const saturation = 100 - (50 * (1 - normalizedDeviation));
  const lightness = 50 - (25 * (1 - normalizedDeviation));
  return `hsl(${hue}, ${saturation}%, ${lightness}%)`;
}

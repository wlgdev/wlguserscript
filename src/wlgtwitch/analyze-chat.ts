import { TwitchChatMessage } from "./chat-downloader.ts";

export interface AnalysisResult {
  items: {
    [key: number]: {
      value: number;
      deviation: number;
      deviation_abs: number;
      offset: number;
    };
  };
  avg: number;
  max: number;
  min: number;
  max_deviation: number;
  min_deviation: number;
  total_messages: number;
  total_frames: number;
}

export function analyzeChat(
  chatHistory: TwitchChatMessage[],
  timeframe_seconds = 60,
): AnalysisResult {
  const items: {
    [key: number]: {
      value: number;
      deviation: number;
      deviation_abs: number;
      offset: number;
    };
  } = {};

  let max = 0;
  let min = Infinity;
  let total_messages = 0;

  for (const message of chatHistory) {
    total_messages++;
    const timeframe = Math.floor(message.offset / timeframe_seconds);

    if (items[timeframe]) {
      items[timeframe].value++;
      if (items[timeframe].value > max) {
        max = items[timeframe].value;
      }
      if (items[timeframe].value < min) {
        min = items[timeframe].value;
      }
    } else {
      items[timeframe] = {
        value: 1,
        deviation: 0,
        deviation_abs: 0,
        offset: message.offset,
      };
    }
  }

  const messageCounts = Object.values(items).map((item) => item.value);
  const numtimeframes = messageCounts.length;

  let avg = 0;

  let max_deviation = -Infinity;
  let min_deviation = Infinity;

  if (numtimeframes > 0) {
    const sum = messageCounts.reduce((acc, val) => acc + val, 0);
    avg = sum / numtimeframes;
  }

  let total_frames = 0;
  for (const timeframe_key in items) {
    total_frames++;
    items[timeframe_key].deviation_abs = items[timeframe_key].value -
      avg;
    items[timeframe_key].deviation = items[timeframe_key].deviation_abs / avg;
    if (items[timeframe_key].deviation > max_deviation) {
      max_deviation = items[timeframe_key].deviation;
    }
    if (items[timeframe_key].deviation < min_deviation) {
      min_deviation = items[timeframe_key].deviation;
    }
  }

  return {
    items,
    avg,
    max,
    min,
    max_deviation,
    min_deviation,
    total_messages,
    total_frames,
  };
}

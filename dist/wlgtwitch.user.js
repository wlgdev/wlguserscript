// ==UserScript==
// @name         wlgtwitch
// @namespace    shevernitskiy
// @version      0.3
// @description  try to take over the world!
// @author       shevernitskiy
// @match        https://dashboard.twitch.tv/u/*/content/video-producer/highlighter/*
// @grant        none
// ==/UserScript==

//#region src/wlgtwitch/analyze-chat.ts
function analyzeChat(chatHistory, timeframe_seconds = 60) {
  const items = {};
  let max = 0;
  let min = Infinity;
  let total_messages = 0;
  for (const message of chatHistory) {
    total_messages++;
    const timeframe = Math.floor(message.offset / timeframe_seconds);
    if (items[timeframe]) {
      items[timeframe].value++;
      if (items[timeframe].value > max) max = items[timeframe].value;
      if (items[timeframe].value < min) min = items[timeframe].value;
    } else
      items[timeframe] = {
        value: 1,
        deviation: 0,
        deviation_abs: 0,
        offset: message.offset,
      };
  }
  return {
    items,
    max,
    min,
    total_messages,
    ...metaStats(items),
  };
}
function analyzeChatLUL(chatHistory, timeframe_seconds = 60) {
  const items = {};
  let max = 0;
  let min = Infinity;
  let total_messages = 0;
  for (const message of chatHistory) {
    total_messages++;
    const timeframe = Math.floor(message.offset / timeframe_seconds);
    if (items[timeframe]) {
      for (const emote of message.emotes) if (emote.text === "LUL") items[timeframe].value++;
      if (items[timeframe].value > max) max = items[timeframe].value;
      if (items[timeframe].value < min) min = items[timeframe].value;
    } else
      items[timeframe] = {
        value: 1,
        deviation: 0,
        deviation_abs: 0,
        offset: message.offset,
      };
  }
  return {
    items,
    max,
    min,
    total_messages,
    ...metaStats(items),
  };
}
function metaStats(items) {
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
    items[timeframe_key].deviation_abs = items[timeframe_key].value - avg;
    items[timeframe_key].deviation = items[timeframe_key].deviation_abs / avg;
    if (items[timeframe_key].deviation > max_deviation) max_deviation = items[timeframe_key].deviation;
    if (items[timeframe_key].deviation < min_deviation) min_deviation = items[timeframe_key].deviation;
  }
  return {
    avg,
    max_deviation,
    min_deviation,
    total_frames,
  };
}

//#endregion
//#region src/wlgtwitch/chat-downloader.ts
const GQL_URL = "https://gql.twitch.tv/gql";
const CLIENT_ID = "kd1unb4b3q4t58fwlpcbzcbnm76a8fp";
var Twitch = class Twitch {
  constructor(channel, channel_id) {
    this.channel = channel;
    this.channel_id = channel_id;
  }
  static async gql(execute, device_id) {
    const headers = new Headers();
    headers.set("Client-Id", CLIENT_ID);
    headers.set("Accept", "application/json");
    headers.set(
      "User-Agent",
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/132.0.0.0 Safari/537.36",
    );
    if (device_id) headers.set("X-Device-Id", device_id);
    const res = await fetch(GQL_URL, {
      headers,
      method: "POST",
      body: JSON.stringify(execute),
      signal: AbortSignal.timeout(1e4),
    });
    const data = await res.json();
    return data;
  }
  async *vodChat(vod_id, start = 0, end = Infinity) {
    let ncursor = "";
    let br = false;
    let prev = -Infinity;
    while (!br) {
      const [res] = await Twitch.gql([
        ncursor === ""
          ? Twitch.request.VideoCommentsByOffset(vod_id, start)
          : Twitch.request.VideoCommentsByCursor(vod_id, ncursor),
      ]);
      for (const { node, cursor } of res.data.video.comments.edges) {
        if (node.contentOffsetSeconds > end || node.contentOffsetSeconds < prev) {
          br = true;
          break;
        }
        ncursor = cursor;
        prev = node.contentOffsetSeconds;
        let message = "";
        const emotes = [];
        for (const fragment of node.message.fragments) {
          if (fragment.emote)
            emotes.push({
              id: fragment.emote.emoteID,
              text: fragment.text,
            });
          message += fragment.text;
        }
        yield {
          offset: node.contentOffsetSeconds,
          created_at: node.createdAt,
          user_login: node.commenter?.login,
          user_name: node.commenter?.displayName,
          user_id: node.id,
          user_color: node.message.userColor,
          badges: node.message.userBadges.map((badge) => `${badge.setID}${badge.version}`),
          message,
          emotes,
        };
      }
      if (res.data.video.comments.pageInfo.hasNextPage !== true) break;
    }
  }
  static ext(sha, version = 1) {
    return {
      extensions: {
        persistedQuery: {
          version,
          sha256Hash: sha,
        },
      },
    };
  }
  static request = {
    VideoCommentsByOffset: (vod_id, offset) => {
      return {
        operationName: "VideoCommentsByOffsetOrCursor",
        variables: {
          videoID: vod_id,
          contentOffsetSeconds: offset,
        },
        ...Twitch.ext("b70a3591ff0f4e0313d126c6a1502d79a1c02baebb288227c582044aa76adf6a"),
      };
    },
    VideoCommentsByCursor: (vod_id, cursor) => {
      return {
        operationName: "VideoCommentsByOffsetOrCursor",
        variables: {
          videoID: vod_id,
          cursor,
        },
        ...Twitch.ext("b70a3591ff0f4e0313d126c6a1502d79a1c02baebb288227c582044aa76adf6a"),
      };
    },
  };
};
async function downloadChat(channel, vod_id, total_length, on_progress) {
  const twitch = new Twitch(channel);
  const data = [];
  for await (const chunk of twitch.vodChat(vod_id)) {
    data.push(chunk);
    if (on_progress) on_progress(Math.floor((chunk.offset * 100) / total_length));
  }
  return data;
}

//#endregion
//#region src/wlgtwitch/timeline-svg.ts
function createTimelineSVG(chat, svgWidth = 4e3, svgHeight = 30) {
  const rectWidth = svgWidth / chat.total_frames;
  const rectHeight = svgHeight;
  let svgString = `<svg class="chat-svg" width="100%" height="${svgHeight}px" viewBox="0 0 ${svgWidth} ${svgHeight}" preserveAspectRatio="none" style="display: block;">`;
  let index = 0;
  for (const key in chat.items) {
    const deviation = chat.items[key].deviation;
    const normalizedDeviation = (deviation - chat.min_deviation) / (chat.max_deviation - chat.min_deviation);
    const color = getLimeGreenToRedOrange(normalizedDeviation);
    const x = index * rectWidth;
    svgString += `<rect x="${x}" y="0" width="${rectWidth + 2}" height="${rectHeight}" fill="${color}"/>`;
    index++;
  }
  svgString += `</svg>`;
  return svgString;
}
function getLimeGreenToRedOrange(normalizedDeviation) {
  const startHue = 120;
  const endHue = 15;
  const hueRange = startHue - endHue;
  const hue = startHue - hueRange * normalizedDeviation;
  const saturation = 100 - 50 * (1 - normalizedDeviation);
  const lightness = 50 - 25 * (1 - normalizedDeviation);
  return `hsl(${hue}, ${saturation}%, ${lightness}%)`;
}

//#endregion
//#region src/wlgtwitch/utils.ts
function duration(time_string) {
  let offset = 0;
  let pow = 0;
  for (const item of time_string.split(":").reverse()) {
    offset += parseInt(item, 10) * 60 ** pow;
    pow++;
  }
  return offset;
}

//#endregion
//#region src/wlgtwitch/cache.ts
var CacheDB = class {
  db = null;
  constructor(tag, table) {
    this.tag = tag;
    this.table = table;
    this.openDatabase();
  }
  openDatabase() {
    const request = indexedDB.open(this.tag, 1);
    request.onsuccess = (event) => {
      const db = event.target.result;
      this.db = db;
    };
    request.onerror = (event) => {
      console.error("Error opening database:", event.target.error);
    };
    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains(this.table)) db.createObjectStore(this.table, { keyPath: "key" });
    };
  }
  getItem(key) {
    console.log("getItem", key);
    return new Promise((resolve, reject) => {
      if (!this.db) return resolve(void 0);
      const transaction = this.db.transaction([this.table], "readonly");
      const objectStore = transaction.objectStore(this.table);
      const request = objectStore.get(key);
      request.onsuccess = (event) => {
        const request$1 = event.target;
        const retrievedValue = request$1.result?.value;
        resolve(retrievedValue);
      };
      request.onerror = (event) => {
        const request$1 = event.target;
        console.error("Error retrieving item:", request$1.error);
        reject(request$1.error);
      };
    });
  }
  setItem(key, value) {
    return new Promise((resolve, reject) => {
      if (!this.db) return resolve();
      const transaction = this.db.transaction([this.table], "readwrite");
      const objectStore = transaction.objectStore(this.table);
      const request = objectStore.put({
        key,
        value,
      });
      request.onsuccess = () => {
        resolve();
      };
      request.onerror = (event) => {
        const request$1 = event.target;
        console.error("Error storing item:", request$1.error);
        reject(request$1.error);
      };
    });
  }
};

//#endregion
//#region src/wlgtwitch/main.ts
console.log("wlgtwitch.ts");
const SELECTOR = {
  RULER: ".timeline-ruler__tick-container--pins",
  BIG_TICK: ".timeline-ruler__big-tick",
  LITTLE_TICK: ".timeline-ruler__little-tick",
  TIMELINE_CONTAINER: ".video-timeline__background",
  EMPTY_TIMELINE: '[data-test-selector="empty-timeline"]',
  TOTAL_DURATION: '[data-a-target="player-seekbar-duration"',
  BOTTOM_TOOLBAR: '[data-test-selector="video-timeline-bottom-toolbar"]',
  SCALE: '[data-test-selector="video-timeline-bottom-toolbar-zoom-dropdown-menu-button"]',
  OFFSET_CONTIANER: '[data-test-selector="offsetContainer"]',
};
const STYLE = {
  BUTTON: "iumXyx",
  TOOLBAR_ROW: "fxSMTS",
  TOOLBAR_STATUS: "kfTsqn",
};
const state = {
  total_duration: 1,
  channel: "",
  vod_id: "",
  chat: [],
  status: "chat-status",
  timeline: "chat-timeline",
  timeline_lul: "chat-timeline-lul",
  analyzed: {},
  analyzed_lul: {},
  svg: "",
  svg_lul: "",
  scale: "Полная длина",
  cache: void 0,
  mode: "default",
  offset_container_left: Infinity,
  offset_container_width: -Infinity,
  ruller_start: 0,
  ruller_end: 1,
};
setTimeout(() => init(), 5e3);
function init() {
  console.log("INIT");
  state.total_duration = duration(document.querySelector(SELECTOR.TOTAL_DURATION).textContent) ?? 1;
  state.ruller_end = state.total_duration;
  const path = window.location.pathname.split("/");
  state.channel = path[2];
  state.vod_id = path.at(-1);
  state.cache = new CacheDB("wlgtwitch", "chat");
  injectControls();
  scaleMutationObserver();
  rullerMutationObserver();
  setTimeout(async () => await tryLoadFromCache(), 500);
}
function injectControls() {
  const bottom_toolbar = document.querySelector(SELECTOR.BOTTOM_TOOLBAR);
  const controls = document.createElement("div");
  controls.classList.add(STYLE.TOOLBAR_ROW);
  controls.style.gap = "10px";
  const controls_download = document.createElement("button");
  controls_download.classList.add(STYLE.BUTTON);
  controls_download.textContent = "🡇";
  controls_download.style.padding = "0 10px";
  controls_download.style.width = "25px";
  const controls_status = document.createElement("div");
  controls_status.id = state.status;
  controls_status.classList.add(STYLE.TOOLBAR_STATUS);
  controls_status.style.width = "150px";
  controls_status.textContent = "чат не загружен";
  controls_download.addEventListener("click", () => {
    console.debug("download", state.channel, state.vod_id, state.total_duration);
    downloadChat(
      state.channel,
      state.vod_id,
      state.total_duration,
      (percent) => (controls_status.textContent = `загрузка ${percent}%`),
    )
      .then((data) => {
        console.debug("downloaded total chat messages", data.length);
        controls_status.textContent = `загружено ${data.length}`;
        state.chat = data;
        state.cache.setItem(state.vod_id, data);
      })
      .then(analyzeAndGenerateSVG)
      .then(attachSVGToTimeline);
  });
  controls.appendChild(controls_download);
  controls.appendChild(controls_status);
  bottom_toolbar.appendChild(controls);
}
async function tryLoadFromCache() {
  if (state.cache.db === null) throw new Error("CacheDB is not initialized");
  const chat = await state.cache.getItem(state.vod_id);
  if (!chat) return;
  state.chat = chat;
  const status = document.getElementById(state.status);
  status.textContent = `из кэша ${chat.length}`;
  analyzeAndGenerateSVG();
  attachSVGToTimeline();
}
function analyzeAndGenerateSVG() {
  console.debug("analyzeAndGenerateSVG");
  state.analyzed = analyzeChat(state.chat);
  state.svg = createTimelineSVG(state.analyzed);
  state.analyzed_lul = analyzeChatLUL(state.chat);
  state.svg_lul = createTimelineSVG(state.analyzed_lul);
}
function attachSVGToTimeline() {
  console.debug("attachSVGToTimeline");
  let timeline = document.getElementById(state.timeline);
  if (!timeline) {
    const empty_timeline = document.querySelector(SELECTOR.EMPTY_TIMELINE);
    timeline = empty_timeline.cloneNode(false);
    timeline.id = state.timeline;
  }
  timeline.innerHTML = `<div style="width: 100%;">${state.svg}</div>`;
  let timeline_lul = document.getElementById(state.timeline_lul);
  if (!timeline_lul) {
    const empty_timeline = document.querySelector(SELECTOR.EMPTY_TIMELINE);
    timeline_lul = empty_timeline.cloneNode(false);
    timeline_lul.id = state.timeline_lul;
  }
  timeline_lul.innerHTML = `<div style="width: 100%;">${state.svg_lul}</div>`;
  const timeline_container = document.querySelector(SELECTOR.TIMELINE_CONTAINER);
  timeline_container.appendChild(timeline);
  timeline_container.appendChild(timeline_lul);
}
function scaleMutationObserver() {
  const parentElement = document.querySelector(
    '[data-test-selector="video-timeline-bottom-toolbar-zoom-dropdown-menu-button"]',
  );
  if (parentElement) {
    const observer = new MutationObserver((mutationsList) => {
      for (const mutation of mutationsList) {
        if (mutation.type !== "characterData") continue;
        if (mutation.oldValue === mutation.target.textContent) continue;
        state.scale = mutation.target.textContent ?? "";
      }
    });
    observer.observe(parentElement, {
      childList: true,
      subtree: true,
      characterData: true,
      characterDataOldValue: true,
    });
  }
}
function rullerMutationObserver() {
  const parentElement = document.querySelector('[data-test-selector="timelineRuler"]');
  const offset_container = document.querySelector(SELECTOR.OFFSET_CONTIANER);
  if (parentElement) {
    const observer = new MutationObserver((mutationsList) => {
      mutationsList = mutationsList.filter((mutation) => mutation.type === "characterData");
      if (mutationsList.length === 0) return;
      const ruller_start = mutationsList[0].target.textContent;
      const ruller_start_duration = duration(ruller_start);
      const ruller_end = mutationsList.at(-1).target.textContent;
      const ruller_end_duration = duration(ruller_end);
      const offset_style = offset_container.getAttribute("style").split(";");
      const left = parseInt(offset_style[0].split("left: ")[1].split("%")[0], 10);
      const width = parseInt(offset_style[1].split("width: ")[1].split("%")[0], 10);
      console.debug("offsetContainer", left, width);
      state.ruller_start = ruller_start_duration;
      state.ruller_end = ruller_end_duration;
      state.offset_container_left = left;
      state.offset_container_width = width;
      changeSVGViewBox();
    });
    observer.observe(parentElement, {
      childList: true,
      subtree: true,
      characterData: true,
      characterDataOldValue: true,
    });
  }
  function changeSVGViewBox() {
    const WIDTH = 4e3;
    const els = document.querySelectorAll(".chat-svg");
    if (!els || els.length === 0) return;
    for (const el of els)
      if (state.offset_container_width >= 400) {
        const start_x = WIDTH * (state.ruller_start / state.total_duration);
        const width_x = WIDTH * ((state.ruller_end - state.ruller_start) / state.total_duration);
        el.setAttribute("viewBox", `${start_x} 0 ${width_x} 30`);
        console.debug("changeSVGViewBox", `${start_x} 0 ${width_x} 30`);
      } else {
        el.setAttribute("viewBox", `0 0 ${WIDTH} 30`);
        console.debug("changeSVGViewBox Default", `0 0 ${WIDTH} 30`);
      }
  }
}

//#endregion

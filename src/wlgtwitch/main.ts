// deno-lint-ignore-file no-window
import { AnalysisResult, analyzeChat, analyzeChatLUL } from "./analyze-chat.ts";
import { downloadChat, TwitchChatMessage } from "./chat-downloader.ts";
import { createTimelineSVG } from "./timeline-svg.ts";
import { duration } from "./utils.ts";
import { CacheDB } from "./cache.ts";

console.log("wlgtwitch.ts");

const SELECTOR = {
  RULER: ".timeline-ruler__tick-container--pins",
  BIG_TICK: ".timeline-ruler__big-tick",
  LITTLE_TICK: ".timeline-ruler__little-tick",
  TIMELINE_CONTAINER: ".video-timeline__background",
  EMPTY_TIMELINE: '[data-test-selector="empty-timeline"]',
  TOTAL_DURATION: '[data-a-target="player-seekbar-duration"',
  BOTTOM_TOOLBAR: '[data-test-selector="video-timeline-bottom-toolbar"]',
  SCALE:
    '[data-test-selector="video-timeline-bottom-toolbar-zoom-dropdown-menu-button"]',
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
  chat: [] as TwitchChatMessage[],
  status: "chat-status",
  timeline: "chat-timeline",
  timeline_lul: "chat-timeline-lul",
  analyzed: {} as AnalysisResult,
  analyzed_lul: {} as AnalysisResult,
  svg: "",
  svg_lul: "",
  scale: "Полная длина",
  cache: undefined as unknown as CacheDB<TwitchChatMessage[]>,
  mode: "default",
  offset_container_left: Infinity,
  offset_container_width: -Infinity,
  ruller_start: 0,
  ruller_end: 1,
};

setTimeout(() => init(), 5000);

function init() {
  console.log("INIT");

  state.total_duration = duration(
    document.querySelector(SELECTOR.TOTAL_DURATION)!.textContent!,
  ) ?? 1;
  state.ruller_end = state.total_duration;

  const path = window.location.pathname.split("/");
  state.channel = path[2];
  state.vod_id = path.at(-1)!;

  // FIXME: DEBUG
  // state.channel = "welovegames";
  // state.vod_id = "2355792756";
  // state.total_duration = 18939;
  // state.ruller_end = state.total_duration;

  state.cache = new CacheDB<TwitchChatMessage[]>("wlgtwitch", "chat");

  injectControls();
  scaleMutationObserver();
  rullerMutationObserver();
  setTimeout(async () => await tryLoadFromCache(), 500);
}

function injectControls() {
  const bottom_toolbar = document.querySelector(SELECTOR.BOTTOM_TOOLBAR)!;

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
    console.debug(
      "download",
      state.channel,
      state.vod_id,
      state.total_duration,
    );
    downloadChat(
      state.channel,
      state.vod_id,
      state.total_duration,
      (percent) => controls_status.textContent = `загрузка ${percent}%`,
    ).then((data) => {
      console.debug("downloaded total chat messages", data.length);
      controls_status.textContent = `загружено ${data.length}`;
      state.chat = data;
      state.cache.setItem(state.vod_id, data);
    }).then(analyzeAndGenerateSVG)
      .then(attachSVGToTimeline);
  });

  controls.appendChild(controls_download);
  controls.appendChild(controls_status);
  bottom_toolbar.appendChild(controls);
}

async function tryLoadFromCache() {
  if (state.cache.db === null) {
    throw new Error("CacheDB is not initialized");
  }
  const chat = await state.cache.getItem(state.vod_id);
  if (!chat) return;
  state.chat = chat;
  const status = document.getElementById(state.status)!;
  status.textContent = `из кэша ${chat.length}`;
  analyzeAndGenerateSVG();
  attachSVGToTimeline();

  // FIXME: DEBUG
  // state.total_duration = 1843;
  // state.ruller_end = state.total_duration;
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
    const empty_timeline = document.querySelector(SELECTOR.EMPTY_TIMELINE)!;
    timeline = empty_timeline.cloneNode(false) as HTMLElement;
    timeline.id = state.timeline;
  }

  timeline.innerHTML = `<div style="width: 100%;">${state.svg}</div>`;

  let timeline_lul = document.getElementById(state.timeline_lul);
  if (!timeline_lul) {
    const empty_timeline = document.querySelector(SELECTOR.EMPTY_TIMELINE)!;
    timeline_lul = empty_timeline.cloneNode(false) as HTMLElement;
    timeline_lul.id = state.timeline_lul;
  }

  timeline_lul.innerHTML = `<div style="width: 100%;">${state.svg_lul}</div>`;

  const timeline_container = document.querySelector(
    SELECTOR.TIMELINE_CONTAINER,
  )!;
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
  const parentElement = document.querySelector(
    '[data-test-selector="timelineRuler"]',
  );
  const offset_container = document.querySelector(
    SELECTOR.OFFSET_CONTIANER,
  )!;

  if (parentElement) {
    const observer = new MutationObserver((mutationsList) => {
      mutationsList = mutationsList.filter((mutation) =>
        mutation.type === "characterData"
      );
      if (mutationsList.length === 0) return;
      const ruller_start = mutationsList[0].target.textContent!;
      const ruller_start_duration = duration(ruller_start);
      const ruller_end = mutationsList.at(-1)!.target.textContent!;
      const ruller_end_duration = duration(ruller_end);
      const offset_style = offset_container.getAttribute("style")!.split(";");
      const left = parseInt(
        offset_style[0].split("left: ")[1].split("%")[0],
        10,
      );
      const width = parseInt(
        offset_style[1].split("width: ")[1].split("%")[0],
        10,
      );

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
    const WIDTH = 4000;

    const els = document.querySelectorAll(".chat-svg");
    if (!els || els.length === 0) return;
    for (const el of els) {
      if (state.offset_container_width >= 400) {
        const start_x = WIDTH * (state.ruller_start / state.total_duration);
        const width_x = WIDTH *
          ((state.ruller_end - state.ruller_start) / state.total_duration);
        el.setAttribute("viewBox", `${start_x} 0 ${width_x} 30`);

        console.debug("changeSVGViewBox", `${start_x} 0 ${width_x} 30`);
      } else {
        el.setAttribute("viewBox", `0 0 ${WIDTH} 30`);
        console.debug("changeSVGViewBox Default", `0 0 ${WIDTH} 30`);
      }
    }
  }
}

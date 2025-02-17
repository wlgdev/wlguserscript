// ==UserScript==
// @name         wlgboosty
// @namespace    shevernitskiy
// @version      0.3
// @description  try to take over the world!
// @author       shevernitskiy
// @match        https://boosty.to/*
// @grant        none
// ==/UserScript==

console.log("wlgboosty.js loaded");

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", setTimeout(injectMenu, 1500));
} else {
  setTimeout(injectMenu, 1500);
}

function injectMenu() {
  for (const post of document.querySelectorAll("[class^=Post_root]")) {
    const post_id = post.attributes.getNamedItem("data-post-id").nodeValue;
    const videos = Array.from(post.querySelectorAll("[class^=VideoBlock_root]"));
    if (!videos.length || videos.length === 0) continue;
    const header = post.querySelector("[class^=BasePostHeader_headerRightBlock]");
    const lock = header.querySelector("[class^=PostAccessLabel_root]");
    if (lock) {
      lock.style.margingRight = "0";
    }
    header.style.justifyContent = "space-between";
    const div = document.createElement("div");
    div.className = "wlgboosty-timecodes-button";
    div.innerHTML = "<b>T</b>";
    div.style.padding = "10px";
    div.style.cursor = "pointer";
    div.style.color = "#f15f2c";
    div.addEventListener("click", () => openDialog(post_id, post));
    header.prepend(div);
  }
}

function openDialog(post_id, post) {
  const videos = Array.from(post.querySelectorAll("[class^=VideoBlock_root]")).map((item) => {
    return {
      id: item.attributes.getNamedItem("id").nodeValue.replaceAll("video-", ""),
      length: item
        .querySelector(".shadow-root-container")
        ?.shadowRoot.querySelector('[data-testid="thumb-timer"]')
        ?.textContent.trim(),
    };
  });
  const app = document.querySelector("[class^=App_app]");

  const dialog = document.createElement("div");
  dialog.className = "wlgboosty-timecodes-dialog";
  dialog.style.position = "fixed";
  dialog.style.zIndex = 201;
  dialog.style.backgroundColor = "#000000b3";
  dialog.style.width = "100%";
  dialog.style.height = "100%";
  dialog.style.overflowX = "hidden";
  dialog.style.overflowY = "auto";

  const section = document.createElement("section");
  section.className = "wlgboosty-timecodes-dialog-section";
  section.style.position = "relative";
  section.style.top = "200px";
  section.style.margin = "0 auto 200px";
  section.style.width = "650px";
  section.style.padding = "20px";
  section.style.borderRadius = "var(--border-radius-default)";
  section.style.backgroundColor = "#fff";

  const close = document.createElement("span");
  close.className = "wlgboosty-timecodes-dialog-close";
  close.style.width = "25px";
  close.style.height = "25px";
  close.style.position = "absolute";
  close.style.right = "15px";
  close.style.top = "15px";
  close.style.cursor = "pointer";
  close.style.display = "flex";
  close.style.alignItems = "center";
  close.style.justifyContent = "center";
  close.style.zIndex = 2;
  close.innerHTML = svg_cross;
  close.addEventListener("click", () => {
    dialog.remove();
  });

  const title = document.createElement("h2");
  title.className = "wlgboosty-timecodes-dialog-title";
  title.style.margin = "0 0 20px";
  title.style.fontSize = "20px";
  title.style.fontWeight = "500";
  title.style.position = "relative";
  title.style.zIndex = 1;
  title.textContent = "Таймкоды для людей";

  const content = document.createElement("div");
  content.className = "wlgboosty-timecodes-dialog-content";
  content.style.lineHeight = "22px";
  content.textContent = "";
  content.innerHTML =
    `<div><b>post id</b>: ${post_id}</div>` +
    videos.map((item, index) => `<div><b>video ${index}</b> id: ${item.id}, length: ${item.length}</div>`).join("");

  const textarea = document.createElement("textarea");
  textarea.className = "wlgboosty-timecodes-dialog-textarea";
  textarea.style.width = "100%";
  textarea.style.height = "200px";
  textarea.style.marginBottom = "20px";
  textarea.style.marginTop = "20px";
  textarea.style.borderRadius = "var(--border-radius-default)";
  textarea.style.border = "1px solid #ccc";
  textarea.style.padding = "10px";
  textarea.placeholder = "Люди, вставляйте сюда в формате 00:00:00 – Таймкод";

  function textareaEdit() {
    const text = textarea.value;
    const timecodes = Array.from(text.matchAll(/(\d+:\d+:\d+)\s*[–|-]\s*(.+)/g));
    if (timecodes.length > 0) {
      div_wrapped.setAttribute("classname", "timecodes");
      div_wrapped.setAttribute("data-type", "timecode-list");
      div_wrapped.setAttribute("data-media-type", "video");
      div_wrapped.setAttribute("data-media-id", videos[0].id);
      div_wrapped.setAttribute("data-from-post", post_id);

      const wrapped = [];
      div_wrapped.innerHTML = "";
      const user = window.location.href.split("/").at(3);

      function createTimecodeLine(offset, video_id, desc) {
        const p = document.createElement("p");
        p.style.margin = "0";
        const a = document.createElement("a");
        a.href = `https://boosty.to/${user}/posts/${post_id}?t=${offset}&tmid=${video_id}`;
        a.target = "_blank";
        a.rel = "noopener noreferrer";
        a.text = duration(offset);
        p.innerHTML = `&nbsp;– ${desc}`;
        p.prepend(a);
        return p;
      }

      let prev_offset = 0;
      let cur_offset_limit = offset(videos[0].length);
      let cur_offset_index = 0;
      let prev_item = {};

      for (const item of parseTimecodes(timecodes)) {
        if (item.offset > cur_offset_limit) {
          cur_offset_index++;
          prev_offset = cur_offset_limit;
          cur_offset_limit += videos[cur_offset_index] ? offset(videos[cur_offset_index].length) : Infinity;
          if (cur_offset_index >= videos.length) {
            cur_offset_index = videos.length - 1;
          }
          div_wrapped.append(document.createElement("hr"));
          div_wrapped.append(createTimecodeLine(0, videos[cur_offset_index].id, prev_item.desc));
        }

        wrapped.push(`${item.time} – ${item.desc} [${cur_offset_index + 1}]`);
        div_wrapped.append(createTimecodeLine(item.offset - prev_offset, videos[cur_offset_index].id, item.desc));
        prev_item = item;
      }
    }
  }
  textarea.addEventListener("paste", textareaEdit);
  textarea.addEventListener("input", textareaEdit);
  textarea.addEventListener("change", textareaEdit);

  content.append(textarea);

  const div_wrapped = document.createElement("div");
  content.append(div_wrapped);

  app.appendChild(dialog);
  dialog.append(section);
  section.append(close);
  section.append(title);
  section.append(content);
}

const svg_cross = `<svg xmlns="http://www.w3.org/2000/svg" stroke-width="2" viewBox="0 0 25 25" id="svg-icon-cross"><path d="m12.5 12.5-8.839 8.839L12.5 12.5 3.661 3.661 12.5 12.5l8.839-8.839L12.5 12.5l8.839 8.839z" stroke="currentColor" fill="none"></path></svg>`;

function parseTimecodes(timecodes) {
  const out = timecodes.map((match) => {
    const [time, desc] = match[0].split(" – ");
    const [hours, minutes, seconds] = time.split(":");
    return {
      time,
      desc,
      hours,
      minutes,
      seconds,
      offset: offset(time),
    };
  });
  return out;
}

function offset(time) {
  let offset = 0;
  let pow = 0;
  for (const item of time.split(":").reverse()) {
    offset += parseInt(item, 10) * 60 ** pow;
    pow++;
  }
  return offset;
}

function duration(length) {
  const hours = ~~(length / 3600);
  const minutes = ~~((length - hours * 3600) / 60);
  const seconds = ~~(length - hours * 3600 - minutes * 60);
  return `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}:${seconds
    .toString()
    .padStart(2, "0")}`;
}

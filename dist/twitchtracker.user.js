// ==UserScript==
// @name         twitchtracker
// @namespace    shevernitskiy
// @version      0.5
// @description  try to take over the world!
// @author       shevernitskiy
// @match        https://twitchtracker.com/*
// @grant        none
// ==/UserScript==

// src/twitchtracker/main.ts
async function extractAllTwitchTrackerStreams() {
  console.debug("Start extracting streams...");
  const response = await fetch(window.location.href);
  const html = await response.text();
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, "text/html");
  const table = doc.getElementById("streams");
  if (!table) {
    console.error("Table not found!");
    return [];
  }
  const headers = [];
  const thElements = table.querySelectorAll("thead th");
  for (let i = 0; i < thElements.length; i++) {
    const th = thElements[i];
    let headerText = "";
    if (th.childNodes.length > 0) {
      headerText = th.childNodes[0].textContent?.trim() || "";
    }
    if (!headerText) {
      headerText = `col_${i}`;
    }
    const key = headerText.toLowerCase().replace(/[^a-z0-9]+(.)/g, (_, chr) => chr.toUpperCase());
    headers.push(key);
  }
  const data = [];
  const rows = table.querySelectorAll("tbody tr");
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const rowData = {};
    const cells = row.querySelectorAll("td");
    for (let j = 0; j < cells.length; j++) {
      const cell = cells[j];
      const key = headers[j] || `col_${j}`;
      let value = cell.getAttribute("data-order") ?? "";
      if (value === "") {
        value = (cell.textContent || "").trim().replace(/\s+/g, " ");
      }
      if (!isNaN(Number(value)) && value !== "") {
        value = Number(value);
      }
      rowData[key] = value;
    }
    data.push(rowData);
  }
  console.debug(`\u2705 Streams extracted: ${data.length}`);
  return data;
}
function convertToCSV(data) {
  if (data.length === 0) return "";
  const headers = Object.keys(data[0]);
  const csvRows = [];
  csvRows.push(headers.join(";"));
  for (let i = 0; i < data.length; i++) {
    const row = data[i];
    const values = [];
    for (let j = 0; j < headers.length; j++) {
      const key = headers[j];
      const value = row[key];
      let stringValue = value === null || value === void 0 ? "" : String(value);
      if (stringValue.includes(";") || stringValue.includes('"') || stringValue.includes("\n")) {
        stringValue = `"${stringValue.replace(/"/g, '""')}"`;
      }
      values.push(stringValue);
    }
    csvRows.push(values.join(";"));
  }
  return csvRows.join("\n");
}
function getStreamerNameFromUrl() {
  const pathParts = window.location.pathname.split("/");
  return pathParts[1] || "streamer";
}
function downloadFile(content, filename) {
  const blob = new Blob([
    "\uFEFF" + content
  ], {
    type: "text/csv;charset=utf-8;"
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
function onInit() {
  if (!/^\/[^\/]+\/streams\/?$/.test(window.location.pathname)) {
    return;
  }
  const downloadButton = document.createElement("li");
  const a = document.createElement("a");
  a.href = "javascript:void(0)";
  a.textContent = "Download CSV";
  a.addEventListener("click", async (e) => {
    e.preventDefault();
    console.log("Downloading...");
    const originalText = a.textContent;
    a.textContent = "Processing...";
    a.style.pointerEvents = "none";
    try {
      const streams = await extractAllTwitchTrackerStreams();
      if (streams.length > 0) {
        const csvData = convertToCSV(streams);
        const streamerName = getStreamerNameFromUrl();
        const fileName = `${streamerName}-${streams.length}.csv`;
        downloadFile(csvData, fileName);
        console.log(`\u2705 File ${fileName} downloaded!`);
      } else {
        console.warn("No streams found.");
      }
    } catch (error) {
      console.error("Error downloading file:", error);
    } finally {
      a.textContent = originalText;
      a.style.pointerEvents = "auto";
    }
  });
  downloadButton.appendChild(a);
  const nav = document.querySelector("#app-nav");
  if (nav) {
    nav.appendChild(downloadButton);
  }
}
console.log("twitchtracker.ts loaded");
setTimeout(() => onInit(), 1e3);

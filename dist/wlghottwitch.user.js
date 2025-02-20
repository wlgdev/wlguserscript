// ==UserScript==
// @name         wlghottwitch
// @namespace    shevernitskiy
// @version      0.1
// @description  try to take over the world!
// @author       shevernitskiy
// @match        https://twitch.tv/*
// @match        https://www.twitch.tv/*
// @grant        none
// ==/UserScript==

//#region src/wlghottwitch/main.ts
console.log("hottwitch.ts");
window.hottwitch = {
  id: "",
  name: "",
};
const HOTKEYS = {
  Numpad0: "Kappa",
  Numpad1: "LUL",
  Numpad2: "",
  Numpad3: "",
  Numpad4: "",
  Numpad5: "",
  Numpad6: "",
  Numpad7: "",
  Numpad8: "",
  Numpad9: "",
};
const GQL_URL = "https://gql.twitch.tv/gql";
const CLIENT_ID = "kimne78kx3ncx6brgo4mv6wki5h1ko";
function nonce() {
  const nonceArray = new Uint8Array(16);
  window.crypto.getRandomValues(nonceArray);
  let nonceString = "";
  for (let i = 0; i < nonceArray.length; i++) {
    const byte = nonceArray[i].toString(16);
    nonceString += byte.padStart(2, "0");
  }
  return nonceString;
}
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
    headers.set("Authorization", `OAuth ${window.cookies["auth-token"]}`);
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
  async sendMessage(message) {
    const res = await Twitch.gql([Twitch.request.sendChatMessage(message)]);
    console.log(res);
  }
  async getChannelId(channel) {
    const [res] = await Twitch.gql([Twitch.request.UseLive(channel)]);
    return res.data.user.id;
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
    UseLive: (channel) => {
      return {
        operationName: "UseLive",
        variables: { channelLogin: channel },
        ...Twitch.ext("639d5f11bfb8bf3053b424d9ef650d04c4ebb7d94711d644afb08fe9a0fad5d9"),
      };
    },
    sendChatMessage: (message) => {
      return {
        operationName: "sendChatMessage",
        variables: {
          input: {
            channelID: window.hottwitch.id,
            message,
            nonce: nonce(),
            replyParentMessageID: null,
          },
        },
        ...Twitch.ext("0435464292cf380ed4b3d905e4edcb73078362e82c06367a5b2181c76c822fa2"),
      };
    },
  };
};
document.addEventListener("keydown", (event) => {
  if (HOTKEYS[event.code] && HOTKEYS[event.code].length > 0) {
    event.preventDefault();
    event.stopPropagation();
    const slug = window.navigation.currentEntry.url.split("/").at(-1);
    const chat_input =
      document.querySelector('textarea[data-a-target="chat-input"]')?.value ??
      document.querySelector('[class="chat-wysiwyg-input__editor"] span[data-slate-string="true"]')?.textContent ??
      "";
    const twitch = new Twitch(slug);
    if (window.hottwitch.id === "" || window.hottwitch.name !== slug) {
      console.log(window.hottwitch);
      twitch.getChannelId(slug).then((id) => {
        window.hottwitch.id = id;
        window.hottwitch.name = slug;
        console.log(window.hottwitch);
        twitch.sendMessage(`${chat_input.trim()} ${HOTKEYS[event.code]}`);
      });
    } else twitch.sendMessage(`${chat_input.trim()} ${HOTKEYS[event.code]}`);
  }
});

//#endregion

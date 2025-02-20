console.log("hottwitch.ts");

declare const window: Window & {
  channelName: string;
  hottwitch: {
    id: string;
    name: string;
  };
};
window.hottwitch = {
  id: "",
  name: "",
};

const HOTKEYS: Record<string, string> = {
  "Numpad0": "Kappa",
  "Numpad1": "LUL",
  "Numpad2": "",
  "Numpad3": "",
  "Numpad4": "",
  "Numpad5": "",
  "Numpad6": "",
  "Numpad7": "",
  "Numpad8": "",
  "Numpad9": "",
};

const GQL_URL = "https://gql.twitch.tv/gql" as const;
const CLIENT_ID = "kimne78kx3ncx6brgo4mv6wki5h1ko" as const;
// const CLIENT_ID = "kd1unb4b3q4t58fwlpcbzcbnm76a8fp" as const;

function nonce(): string {
  const nonceArray = new Uint8Array(16);
  window.crypto.getRandomValues(nonceArray);
  let nonceString = "";
  for (let i = 0; i < nonceArray.length; i++) {
    const byte = nonceArray[i].toString(16);
    nonceString += byte.padStart(2, "0");
  }

  return nonceString;
}

class Twitch {
  constructor(private readonly channel: string, private channel_id?: string) {}

  // deno-lint-ignore no-explicit-any
  static async gql(execute: unknown[], device_id?: string): Promise<any> {
    const headers = new Headers();
    headers.set("Client-Id", CLIENT_ID);
    headers.set("Accept", "application/json");
    headers.set(
      "User-Agent",
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/132.0.0.0 Safari/537.36",
    );
    //@ts-ignore cookies exists
    headers.set("Authorization", `OAuth ${window.cookies["auth-token"]}`);
    if (device_id) {
      headers.set("X-Device-Id", device_id);
    }

    const res = await fetch(GQL_URL, {
      headers,
      method: "POST",
      body: JSON.stringify(execute),
      signal: AbortSignal.timeout(10000),
    });

    const data = await res.json();
    return data;
  }

  async sendMessage(message: string): Promise<void> {
    const res = await Twitch.gql([Twitch.request.sendChatMessage(message)]);
    console.log(res);
  }

  async getChannelId(channel: string): Promise<string> {
    const [res] = await Twitch.gql([Twitch.request.UseLive(channel)]);

    return res.data.user.id;
  }

  private static ext(sha: string, version = 1) {
    return {
      extensions: {
        persistedQuery: {
          version: version,
          sha256Hash: sha,
        },
      },
    };
  }

  private static request = {
    UseLive: (channel: string) => {
      return {
        operationName: "UseLive",
        variables: {
          channelLogin: channel,
        },

        ...Twitch.ext(
          "639d5f11bfb8bf3053b424d9ef650d04c4ebb7d94711d644afb08fe9a0fad5d9",
        ),
      };
    },
    sendChatMessage: (message: string) => {
      return {
        operationName: "sendChatMessage",
        variables: {
          input: {
            channelID: window.hottwitch.id,
            message: message,
            nonce: nonce(),
            replyParentMessageID: null,
          },
        },
        ...Twitch.ext(
          "0435464292cf380ed4b3d905e4edcb73078362e82c06367a5b2181c76c822fa2",
        ),
      };
    },
  };
}

document.addEventListener("keydown", (event) => {
  if (HOTKEYS[event.code] && HOTKEYS[event.code].length > 0) {
    event.preventDefault();
    event.stopPropagation();
    //@ts-ignore exsits
    const slug = window.navigation.currentEntry.url.split("/").at(-1);
    const twitch = new Twitch(slug);
    if (
      window.hottwitch.id === "" || window.hottwitch.name !== slug
    ) {
      console.log(window.hottwitch);
      twitch.getChannelId(slug).then((id) => {
        window.hottwitch.id = id;
        window.hottwitch.name = slug;
        console.log(window.hottwitch);
        twitch.sendMessage(HOTKEYS[event.code]);
      });
    } else {
      twitch.sendMessage(HOTKEYS[event.code]);
    }
  }
});

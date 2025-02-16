const GQL_URL = "https://gql.twitch.tv/gql" as const;
// const CLIENT_ID = "kimne78kx3ncx6brgo4mv6wki5h1ko" as const;
const CLIENT_ID = "kd1unb4b3q4t58fwlpcbzcbnm76a8fp" as const;

export type TwitchChatMessage = {
  offset: number;
  created_at: string;
  user_login: string | undefined;
  user_name: string | undefined;
  user_id: string;
  user_color: string;
  badges: string[];
  message: string;
  emotes: {
    id: string;
    text: string;
  }[];
};

export class Twitch {
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

  async *vodChat(
    vod_id: string,
    start = 0,
    end = Infinity,
  ): AsyncIterable<TwitchChatMessage> {
    // let cur_offset = start;
    let ncursor = "";
    let br = false;

    while (!br) {
      const [res] = await Twitch.gql([
        ncursor === ""
          ? Twitch.request.VideoCommentsByOffset(vod_id, start)
          : Twitch.request.VideoCommentsByCursor(vod_id, ncursor),
      ]);

      for (const { node, cursor } of res.data.video.comments.edges) {
        if (node.contentOffsetSeconds > end) {
          br = true;
          break;
        }
        ncursor = cursor;

        let message = "";
        const emotes = [];
        for (const fragment of node.message.fragments) {
          if (fragment.emote) {
            emotes.push({
              id: fragment.emote.emoteID,
              text: fragment.text,
            });
          }
          message += fragment.text;
        }

        yield {
          offset: node.contentOffsetSeconds,
          created_at: node.createdAt,
          user_login: node.commenter?.login,
          user_name: node.commenter?.displayName,
          user_id: node.id,
          user_color: node.message.userColor,
          // deno-lint-ignore no-explicit-any
          badges: node.message.userBadges.map((badge: any) =>
            `${badge.setID}${badge.version}`
          ),
          message,
          emotes,
        };
      }

      if (res.data.video.comments.pageInfo.hasNextPage !== true) break;
    }
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
    VideoCommentsByOffset: (vod_id: string, offset: number) => {
      return {
        operationName: "VideoCommentsByOffsetOrCursor",
        variables: {
          videoID: vod_id,
          contentOffsetSeconds: offset,
        },
        ...Twitch.ext(
          "b70a3591ff0f4e0313d126c6a1502d79a1c02baebb288227c582044aa76adf6a",
        ),
      };
    },
    VideoCommentsByCursor: (vod_id: string, cursor: string) => {
      return {
        operationName: "VideoCommentsByOffsetOrCursor",
        variables: {
          videoID: vod_id,
          cursor: cursor,
        },
        ...Twitch.ext(
          "b70a3591ff0f4e0313d126c6a1502d79a1c02baebb288227c582044aa76adf6a",
        ),
      };
    },
  };
}

export async function downloadChat(
  channel: string,
  vod_id: string,
  total_length: number,
  on_progress?: (progress: number) => void,
): Promise<TwitchChatMessage[]> {
  const twitch = new Twitch(channel);
  const data = [];
  for await (const chunk of twitch.vodChat(vod_id)) {
    data.push(chunk);
    if (on_progress) {
      on_progress(Math.floor(chunk.offset * 100 / total_length));
    }
  }
  return data;
}

import {
  handleChatMessageEvent,
  handleStreamEvent,
} from "./handlers/controller.ts";
import * as constants from "../shared/const.ts";
import type { TokenWrapper } from "../db/models/Tokens.ts";
import { createOrRecreateSocket } from "./bot.ts";
import { WebSocketWrapper } from "./models/WebSocketWrapper.ts";
import { ChatMessageEvent, ChatMessageToken } from "./models/Events.ts";

const MAX_RETRIES = 3;
const RETRY_INTERVAL = 2000; // 2 seconds
const KEEPALIVE_TIMEOUT = 15000; // 15 seconds

let websocketSessionID: string;
let lastKeepAlive = Date.now();

export function startWebSocketClient(
  token: TokenWrapper,
  botToken: string,
  url: string | null = null
): WebSocketWrapper | null {
  const websocketClient = createWebSocket(url);

  if (!websocketClient) {
    console.error("Could not create websocket client, cancelling connection");
    return null;
  }

  const uid = crypto.randomUUID();

  websocketClient.onerror = (event) => {
    console.error("Received an error from the websocket");
    console.error(event);
    createOrRecreateSocket(token, uid);
  };

  websocketClient.onopen = () => {
    console.log(
      "WebSocket connection opened to " + constants.EVENTSUB_WEBSOCKET_URL
    );
  };

  websocketClient.onmessage = async (messageEvent) => {
    await handleWebSocketMessage(
      JSON.parse(messageEvent.data),
      token,
      botToken,
      uid
    );
  };

  websocketClient.onclose = (event) => {
    console.error("Received a close frame from the websocket");
    console.error(event);
  };

  setInterval(() => {
    const timeout = Date.now() - lastKeepAlive;
    if (timeout > KEEPALIVE_TIMEOUT) {
      console.log(
        "No keepalive message was received in 15 seconds, assuming the connection is dead (thanks twitch)"
      );
      createOrRecreateSocket(token, uid);
    }
    console.log("Last keepalive was " + timeout / 1000 + " seconds ago");
  }, 10000);

  return { Socket: websocketClient, UID: uid } as WebSocketWrapper;
}

async function handleWebSocketMessage(
  // deno-lint-ignore no-explicit-any
  data: any,
  token: TokenWrapper,
  botToken: string,
  socketUID: string
) {
  switch (data.metadata.message_type) {
    case "session_welcome": // First message you get from the WebSocket server when connecting
      websocketSessionID = data.payload.session.id; // Register the Session ID it gives us

      // Listen to EventSub, which joins the chatroom from your bot's account
      registerEventSubListeners(token);
      break;
    case "session_keepalive": {
      //console.log("Received a websocket keepalive message");
      lastKeepAlive = Date.now();
      break;
    }
    case "session_reconnect": {
      console.log(
        "Received a websocket reconnect message. Trying to connect using the url"
      );
      createOrRecreateSocket(
        token,
        socketUID,
        data.payload.session.reconnect_url
      );
      break;
    }
    case "revocation": {
      console.log("Received a websocket revocation message.");
      break;
    }
    case "notification":
      switch (data.metadata.subscription_type) {
        case "channel.chat.message": {
          //console.log(data);
          // deno-lint-ignore no-explicit-any
          const _isMod = (data.payload.event.badges as any[]).some(
            (b) => b.set_id == "broadcaster" || b.set_id == "moderator"
          );
          //console.log("isMod: ", isMod);
          await handleChatMessageEvent(
            {
              ChatterName: data.payload.event.chatter_user_name,
              ChatterID: data.payload.event.chatter_user_id,
              ChatMessage: data.payload.event.message.text,
            } as ChatMessageEvent,
            { UserID: token.userID, AccessToken: botToken } as ChatMessageToken
          );

          //console.log(`MSG #${data.payload.event.broadcaster_user_login} <${data.payload.event.chatter_user_login}> ${data.payload.event.message.text}`);

          break;
        }
        case "stream.online": {
          await handleStreamEvent(true, {
            UserID: token.userID,
            AccessToken: botToken,
          } as ChatMessageToken);
          break;
        }
        case "stream.offline": {
          await handleStreamEvent(false, {
            UserID: token.userID,
            AccessToken: botToken,
          } as ChatMessageToken);
          break;
        }
      }
      break;
    default: {
      console.log("Received a websocket message with unhandled type");
      console.log(data);
      break;
    }
  }
}

async function registerEventSubListeners(token: TokenWrapper) {
  // Register channel.chat.message

  const register = async (type: string) => {
    const headers = {
      Authorization: "Bearer " + token.token.accessToken,
      "Client-Id": constants.CLIENT_ID,
      "Content-Type": "application/json",
    };
    const body = JSON.stringify({
      type: type,
      version: "1",
      condition: {
        broadcaster_user_id: token.userID,
        user_id: token.userID,
      },
      transport: {
        method: "websocket",
        session_id: websocketSessionID,
      },
    });

    console.log("Trying to subscribe to " + type);
    // console.log(headers);
    // console.log(body);

    const response = await fetch(
      "https://api.twitch.tv/helix/eventsub/subscriptions",
      {
        method: "POST",
        headers: headers,
        body: body,
      }
    );
    if (response.status != 202) {
      const data = await response.json();
      console.error(
        "Failed to subscribe to " +
          type +
          ". API call returned status code " +
          response.status
      );
      console.error(data);
      return;
    } else {
      const data = await response.json();
      console.log(`Subscribed to ${type} [${data.data[0].id}]`);
    }
  };

  await register("channel.chat.message");
  await register("stream.online");
  await register("stream.offline");
}

function createWebSocket(
  url: string | null = null,
  retries = 0
): WebSocket | null {
  try {
    const websocketClient = new WebSocket(
      url ? url : constants.EVENTSUB_WEBSOCKET_URL
    );

    // Handle WebSocket open event
    websocketClient.onopen = () => {
      console.log("WebSocket connection established");
    };

    // Handle WebSocket error event
    websocketClient.onerror = (error) => {
      console.error("WebSocket encountered an error:", error);

      // Retry if the max retries haven't been reached
      if (retries < MAX_RETRIES) {
        setTimeout(() => {
          console.log(`Retrying connection attempt ${retries + 1}`);
          createWebSocket(null, retries + 1);
        }, RETRY_INTERVAL);
      } else {
        console.error(
          "Max retry attempts reached. Could not establish WebSocket connection."
        );
      }
    };

    // Handle WebSocket close event
    websocketClient.onclose = () => {
      console.log("WebSocket connection closed");
    };

    return websocketClient;
  } catch (error) {
    console.error("Failed to create WebSocket:", error);
    return null;
  }
}

import {
  handleChatMessageEvent,
  handleStreamEvent,
} from "./handlers/controller.ts";
import * as constants from "../shared/const.ts";
import type { TokenWrapper } from "../db/models/Tokens.ts";
import { createOrRecreateSocket } from "./bot.ts";
import { WebSocketWrapper } from "./models/WebSocketWrapper.ts";
import { ChatMessageEvent, ChatMessageToken } from "./models/Events.ts";
import {
  SessionWelcomeData,
  SessionReconnectData,
  NotificationData,
  WebSocketData,
} from "./models/WebSocketData.ts";

const MAX_RETRIES = 3;
const RETRY_INTERVAL = 2000; // 2 seconds
const KEEPALIVE_TIMEOUT = 15000; // 15 seconds

const lastKeepAlives: Map<string, { timestamp: number; interval: number }> =
  new Map();

let websocketSessionID: string;

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

  const interval = setInterval(() => {
    const lastKeepAlive = lastKeepAlives.get(uid)?.timestamp;
    if (!lastKeepAlive) return;

    const timeout = Date.now() - lastKeepAlive;
    if (timeout > KEEPALIVE_TIMEOUT) {
      console.log(
        "No keepalive message received in the timeout period, reconnecting..."
      );
      clearKeepAliveAndRecreateSocket(token, uid);
    }
  }, 10000); // Check every 10 seconds

  // Store both timestamp and interval ID in the Map
  lastKeepAlives.set(uid, { timestamp: Date.now(), interval });

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
    const data = JSON.parse(messageEvent.data);
    //console.log(data);
    await handleWebSocketMessage(data, token, botToken, uid);

    if (data.metadata?.message_type === "session_keepalive") {
      lastKeepAlives.set(uid, { timestamp: Date.now(), interval });
    }
  };

  websocketClient.onclose = (event) => {
    console.error("Received a close frame from the websocket");
    console.error(event);
  };

  return { Socket: websocketClient, UID: uid } as WebSocketWrapper;
}

function clearKeepAliveAndRecreateSocket(
  token: TokenWrapper,
  uid: string,
  reconnectURL: string | null = null
) {
  // Clear the interval associated with this WebSocket
  const keepAliveData = lastKeepAlives.get(uid);
  if (keepAliveData) {
    clearInterval(keepAliveData.interval);
    lastKeepAlives.delete(uid);
  }

  createOrRecreateSocket(token, uid, reconnectURL);
}

async function handleWebSocketMessage(
  data: WebSocketData, // No need for 'any' anymore
  token: TokenWrapper,
  botToken: string,
  socketUID: string
) {
  // Check the 'message_type' to determine which type of message it is
  switch (data.metadata?.message_type) {
    case "session_welcome": {
      // Narrow the type for session_welcome message
      const welcomeData = data as SessionWelcomeData;
      websocketSessionID = welcomeData.payload.session.id;
      registerEventSubListeners(token);
      break;
    }
    case "session_keepalive": {
      // No additional actions for session_keepalive
      break;
    }
    case "session_reconnect": {
      // Narrow the type for session_reconnect message
      const reconnectData = data as SessionReconnectData;
      console.log(
        "Received a websocket reconnect message. Trying to connect using the URL"
      );
      clearKeepAliveAndRecreateSocket(
        token,
        socketUID,
        reconnectData.payload.session.reconnect_url
      );
      break;
    }
    case "revocation": {
      // Handle revocation if necessary
      console.log("Received a websocket revocation message.");
      break;
    }
    case "notification": {
      // Narrow the type for notification message
      const notificationData = data as NotificationData;

      switch (notificationData.metadata.subscription_type) {
        case "channel.chat.message": {
          const isMod = notificationData.payload.event.badges.some(
            (b) => b.set_id === "moderator"
          );
          const isBroadcaster = notificationData.payload.event.badges.some(
            (b) => b.set_id === "broadcaster"
          );
          await handleChatMessageEvent(
            {
              ChatterName: notificationData.payload.event.chatter_user_name,
              ChatterID: notificationData.payload.event.chatter_user_id,
              ChatMessage: notificationData.payload.event.message.text,
              IsChatterMod: isMod,
              IsChatterBroadcaster: isBroadcaster,
            } as ChatMessageEvent,
            { UserID: token.userID, AccessToken: botToken } as ChatMessageToken
          );
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
    }
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

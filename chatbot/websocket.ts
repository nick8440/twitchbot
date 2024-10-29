import { handleChatMessageEvent } from "./chat.ts";
import * as constants from "../shared/const.ts";
import type { TokenWrapper } from "../db/Tokens.ts";

const MAX_RETRIES = 3;
const RETRY_INTERVAL = 2000; // 2 seconds

let websocketSessionID: string;

export function startWebSocketClient(token: TokenWrapper, botToken: string) {
  const websocketClient = createWebSocket();

  if (!websocketClient) {
    console.error("Could not create websocket client, cancelling connection");
    return;
  }

  websocketClient.addEventListener("error", console.error);

  websocketClient.addEventListener("open", () => {
    console.log(
      "WebSocket connection opened to " + constants.EVENTSUB_WEBSOCKET_URL
    );
  });

  websocketClient.addEventListener("message", (messageEvent) => {
    handleWebSocketMessage(JSON.parse(messageEvent.data), token, botToken);
  });

  return websocketClient;
}

function handleWebSocketMessage(
  // deno-lint-ignore no-explicit-any
  data: any,
  token: TokenWrapper,
  botToken: string
) {
  switch (data.metadata.message_type) {
    case "session_welcome": // First message you get from the WebSocket server when connecting
      websocketSessionID = data.payload.session.id; // Register the Session ID it gives us

      // Listen to EventSub, which joins the chatroom from your bot's account
      registerEventSubListeners(token);
      break;
    case "notification":
      switch (data.metadata.subscription_type) {
        case "channel.chat.message":
          handleChatMessageEvent(
            data.payload.event.broadcaster_user_name,
            data.payload.event.message.text,
            token.userID,
            botToken
          );

          //console.log(`MSG #${data.payload.event.broadcaster_user_login} <${data.payload.event.chatter_user_login}> ${data.payload.event.message.text}`);

          break;
      }
      break;
  }
}

async function registerEventSubListeners(token: TokenWrapper) {
  // Register channel.chat.message

  const headers = {
    Authorization: "Bearer " + token.token.accessToken,
    "Client-Id": constants.CLIENT_ID,
    "Content-Type": "application/json",
  };
  const body = JSON.stringify({
    type: "channel.chat.message",
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

  console.log("Trying to subscribe");
  console.log(headers);
  console.log(body);

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
      "Failed to subscribe to channel.chat.message. API call returned status code " +
        response.status
    );
    console.error(data);
    return;
  } else {
    const data = await response.json();
    console.log(`Subscribed to channel.chat.message [${data.data[0].id}]`);
  }
}

function createWebSocket(retries = 0): WebSocket | null {
  try {
    const websocketClient = new WebSocket(constants.EVENTSUB_WEBSOCKET_URL);

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
          createWebSocket(retries + 1);
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

import * as constants from "../shared/const.ts";
import { ChatMessageToken } from "./models/Events.ts";

export async function sendChatMessage(
  chatMessage: string,
  token: ChatMessageToken
) {
  if (chatMessage.trim().length < 0) {
    console.error("Tried to send an empty message");
    console.trace();
    return;
  }
  const response = await fetch("https://api.twitch.tv/helix/chat/messages", {
    method: "POST",
    headers: {
      Authorization: "Bearer " + token.AccessToken,
      "Client-Id": constants.CLIENT_ID,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      broadcaster_id: token.UserID,
      sender_id: constants.BOT_USER_ID,
      message: chatMessage,
    }),
  });

  if (response.status != 200) {
    const data = await response.json();
    console.error("Failed to send chat message");
    console.error(data);
  } else {
    console.log("Sent chat message: " + chatMessage);
  }
}

export async function sendMessageInChunks(
  chatMessage: string,
  token: ChatMessageToken
) {
  for (const chunk of chatMessage.match(/.{1,499}/g) || []) {
    await sendChatMessage(chunk, token);
  }
}

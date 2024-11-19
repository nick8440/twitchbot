import * as constants from "../shared/const.ts";
import { ChatMessageToken } from "./models/Events.ts";

export async function sendChatMessage(
  chatMessage: string,
  token: ChatMessageToken
) {
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

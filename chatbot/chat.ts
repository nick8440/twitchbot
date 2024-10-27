import * as constants from "../shared/const.ts";

export async function handleChatMessageEvent(
  username: string,
  chatMessage: string,
  userID: string,
  botAccessToken: string
) {
  const sendChatMessage = async (chatMessage: string) => {
    const response = await fetch("https://api.twitch.tv/helix/chat/messages", {
      method: "POST",
      headers: {
        Authorization: "Bearer " + botAccessToken,
        "Client-Id": constants.CLIENT_ID,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        broadcaster_id: userID,
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
  };

  chatMessage = chatMessage.trim();
  if (chatMessage == "HeyGuys") {
    await sendChatMessage(`@${username} VoHiYo`);
  }
}

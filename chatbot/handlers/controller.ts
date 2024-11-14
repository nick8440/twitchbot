import { sendChatMessage } from "../chat.ts";

export async function handleChatMessageEvent(
  chatterName: string,
  chatterID: string,
  chatMessage: string,
  userID: string,
  botAccessToken: string
) {
  chatMessage = chatMessage.trim();
  if (chatMessage == "HeyGuys") {
    await sendChatMessage(`@${chatterName} VoHiYo`, userID, botAccessToken);
  }
}

export async function handleStreamEvents(streamOn: boolean) {}

import { sendChatMessage } from "../chat.ts";
import { ChatMessageEvent, ChatMessageToken } from "../models/Events.ts";

export async function handleChatMessageEvent(
  event: ChatMessageEvent,
  token: ChatMessageToken
) {
  event.ChatMessage = event.ChatMessage.trim();
  if (event.ChatMessage == "HeyGuys") {
    await sendChatMessage(`@${event.ChatterName} VoHiYo`, token);
  }
}

export async function handleStreamEvent(
  streamOn: boolean,
  token: ChatMessageToken
) {}

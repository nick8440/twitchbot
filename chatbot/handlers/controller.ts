import { ChatMessageEvent, ChatMessageToken } from "../models/Events.ts";
import { SimpleChatResponseHandler } from "./simpleChatResponse.ts";

export async function handleChatMessageEvent(
  event: ChatMessageEvent,
  token: ChatMessageToken
) {
  event.ChatMessage = event.ChatMessage.trim();
  await Promise.all([SimpleChatResponseHandler(event, token)]);
}

export async function handleStreamEvent(
  streamOn: boolean,
  token: ChatMessageToken
) {}

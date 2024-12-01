import { sendChatMessage } from "../chat.ts";
import {
  ChatResponse,
  ChatResponseCheckType,
  Responses,
} from "../data/chatResponses.ts";
import { ChatMessageEvent, ChatMessageToken } from "../models/Events.ts";

export async function SimpleChatResponseHandler(
  event: ChatMessageEvent,
  token: ChatMessageToken
) {
  for (let index = 0; index < Responses.length; index++) {
    const element = Responses[index];
    await handleResponse(element, event, token);
  }
}

async function handleResponse(
  response: ChatResponse,
  event: ChatMessageEvent,
  token: ChatMessageToken
) {
  let flag = false;
  switch (response.type) {
    case ChatResponseCheckType.StartsWith:
      if (event.ChatMessage.startsWith(response.text)) flag = true;
      break;
    case ChatResponseCheckType.Contains:
      if (event.ChatMessage.includes(response.text)) flag = true;
      break;
  }
  if (flag == true) {
    await sendChatMessage(response.response(event), token);
  }
}

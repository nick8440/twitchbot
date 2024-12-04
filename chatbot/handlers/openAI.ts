import OpenAI from "https://deno.land/x/openai@v4.69.0/mod.ts";
import { ChatMessageEvent, ChatMessageToken } from "../models/Events.ts";
import { sendChatMessage, sendMessageInChunks } from "../chat.ts";
import { Strings } from "../data/strings.ts";
import { isChannelOnline } from "../channel.ts";

const openai = new OpenAI({
  apiKey: Deno.env.get("OPENAI_API_KEY")!,
});

let lastCallTime: number | null = null;

export async function OpenAIResponseHandler(
  event: ChatMessageEvent,
  token: ChatMessageToken
) {
  if (!event.ChatMessage.startsWith("!chatgpt ")) return;
  const now = Date.now();

  if (lastCallTime && now - lastCallTime < 10000) {
    sendChatMessage(
      Strings.strings.chatgpt_timeout(
        Math.ceil((now - lastCallTime) / 1000).toString()
      ),
      token
    );
    return;
  }

  if (
    !event.IsChatterBroadcaster &&
    !(await isChannelOnline(token.UserID, token.AccessToken))
  ) {
    sendChatMessage(Strings.strings.chatgpt_offline(), token);
    return;
  }

  lastCallTime = now;

  //todo: check if the stream is on and/or if the user is a moderator

  const response = await ChatGPT(event.ChatMessage);
  if (response) await sendMessageInChunks(response, token);
}

async function ChatGPT(userPrompt: string): Promise<string | null> {
  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        //{ role: "system", content: "You are a helpful assistant." }, // System message setting the role
        { role: "user", content: userPrompt },
      ],
    });

    return completion.choices[0].message.content;
  } catch (e) {
    console.error("Error while calling OpenAI API:");
    console.error(e);
    return null;
  }
}

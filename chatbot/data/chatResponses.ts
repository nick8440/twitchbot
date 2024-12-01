import { ChatMessageEvent } from "../models/Events.ts";
import { Strings } from "./strings.ts";

export type ChatResponse = {
  text: string;
  type: ChatResponseCheckType;
  response: (event: ChatMessageEvent) => string;
};

export enum ChatResponseCheckType {
  StartsWith,
  Contains,
}

export const Responses: ChatResponse[] = [
  {
    text: "HeyGuys",
    type: ChatResponseCheckType.StartsWith,
    response: (event) => Strings.strings.greeting(event.ChatterName),
  },
];

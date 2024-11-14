/// <reference lib="deno.unstable" />

import { Token, TokenWrapper, type BotToken } from "./models/Tokens.ts";
import * as path from "https://deno.land/std@0.138.0/path/mod.ts";
import { closeSocket, createOrRecreateSocket } from "../chatbot/bot.ts";
import { StreamInfo } from "./models/StreamInfo.ts";
import { ChatterInfo } from "./models/ChatterInfo.ts";
import { monotonicUlid } from "jsr:@std/ulid";

const POINTS_PER_STREAM = 30;

const isDenoDeploy = Deno.env.get("DENO_DEPLOYMENT_ID") !== undefined;
const kv = isDenoDeploy
  ? await Deno.openKv()
  : await Deno.openKv(getModuleDir(import.meta) + "/denoKv/denoKv.db");

//#region Tokens
export async function getAllTokens(): Promise<TokenWrapper[]> {
  const tokens: TokenWrapper[] = [];
  const entries = kv.list({ prefix: ["token"] });
  for await (const entry of entries) {
    console.log(entry.value);
    tokens.push(
      new TokenWrapper(
        entry.key[1].toString(),
        Token.fromObject(entry.value as Partial<Token>)
      )
    );
  }
  return tokens;
}

async function getToken(userID: string): Promise<TokenWrapper | null> {
  const entry = await kv.get(["token", userID]);
  if (!entry.value) return null;
  return new TokenWrapper(
    userID,
    Token.fromObject(entry.value as Partial<Token>)
  );
}

export async function setToken(userID: string, token: Token) {
  const oldValue = await getToken(userID);

  await kv.set(["token", userID], { ...token });
  if (
    (oldValue && oldValue.token.accessToken != token.accessToken) ||
    !oldValue
  )
    await createOrRecreateSocket(
      new TokenWrapper(userID, Token.fromObject(token))
    );
}

export async function removeToken(userID: string) {
  await kv.delete(["token", userID]);
  closeSocket(userID);
}

export async function getBotToken(): Promise<BotToken | null> {
  const token = await kv.get(["botTokenData"]);
  if (token && token.value) {
    return token.value as BotToken;
  } else return null;
}

export async function setBotToken(token: BotToken) {
  await kv.set(["botTokenData"], token);
}

function getModuleDir(importMeta: ImportMeta): string {
  return path.resolve(path.dirname(path.fromFileUrl(importMeta.url)));
}

//#endregion

//#region Streams
export async function setStreamOnline(userID: string) {
  const streamInfo = await getStreamInfo(userID);
  let ID;
  if (streamInfo) ID = streamInfo.ID++;
  else ID = 1;
  kv.set(["streamInfo", userID], { ID, Online: true } as StreamInfo);
}

export async function setStreamOffline(userID: string) {
  const streamInfo = await getStreamInfo(userID);
  let ID;
  if (streamInfo) ID = streamInfo.ID;
  else ID = 1;
  kv.set(["streamInfo", userID], { ID, Online: false } as StreamInfo);
}

export async function getStreamInfo(
  userID: string
): Promise<StreamInfo | null> {
  const result = await kv.get(["streamInfo", userID]);
  if (!result.value) return null;
  return result.value as StreamInfo;
}
//#endregion

//#region Chatter info
export async function getChatterInfo(
  userID: string,
  chatterID: string
): Promise<ChatterInfo | null> {
  const result = await kv.get(["streamInfo", userID, chatterID]);
  if (!result.value) return null;
  return result.value as ChatterInfo;
}

export async function userSentMessage(userID: string, chatterID: string) {
  const currentStreamInfo = await getStreamInfo(userID);
  if (!currentStreamInfo || !currentStreamInfo.Online) return;
  const oldValue = await kv.get(["streamInfo", userID, chatterID]);
  let info;
  if (oldValue.value) {
    info = oldValue.value as ChatterInfo;
  } else {
    info = {
      Points: 0,
      LastStreamID: -1,
    } as ChatterInfo;
  }

  if (info.LastStreamID < currentStreamInfo.ID) {
    info.Points += POINTS_PER_STREAM;
    info.LastStreamID = currentStreamInfo.ID;
    await kv.set(["streamInfo", userID, chatterID], info);
  }
}

//#endregion

//#region Betting
export async function createBet(userID: string, options: string[]) {
  await kv.set(["bet", userID, monotonicUlid()], options);
}

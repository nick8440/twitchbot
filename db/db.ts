/// <reference lib="deno.unstable" />

import { Token, TokenWrapper, type BotToken } from "./Tokens.ts";
import * as path from "https://deno.land/std@0.138.0/path/mod.ts";
import { closeSocket, createOrRecreateSocket } from "../chatbot/bot.ts";

const isDenoDeploy = Deno.env.get("DENO_DEPLOYMENT_ID") !== undefined;
const kv = isDenoDeploy
  ? await Deno.openKv()
  : await Deno.openKv(getModuleDir(import.meta) + "/denoKv/denoKv.db");

// export async function isSocketInProgress(userID: string): Promise<boolean> {
//   const entry = await kv.get(["socketsInProress", userID]);
//   if (entry && entry.value) return true;
//   return false;
// }

// export async function addSocketInProgress(userID: string) {
//   await kv.set(["socketsInProress", userID], true);
// }

// export async function removeSocketInProgress(userID: string) {
//   await kv.delete(["socketsInProress", userID]);
// }

// export function getTokenLastSubscriptionUpdate(
//   userID: string | null
// ): ReadableStream<[Deno.KvEntryMaybe<unknown>]> {
//   if (userID) return kv.watch([["token", userID]]);
//   else return kv.watch([["token"]]);
// }

// export async function updateTokenLastSubscription(userID: string) {
//   const current = (await kv.get(["token", userID])).value as Partial<Token>;
//   console.log(
//     "Updating token's last subscription date from " +
//       current.lastSubscriptionDate +
//       " to " +
//       new Date()
//   );
//   await kv.set(["token", userID], {
//     ...current,
//     lastSubscriptionDate: new Date(),
//   } as Token);
// }

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

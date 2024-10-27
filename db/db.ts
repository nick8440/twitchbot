//export async function getToken(userID: string): Promise<Token> {}

import { Token, TokenWrapper, type BotToken } from "./Tokens.ts";
import * as path from "https://deno.land/std@0.138.0/path/mod.ts";

const kv = await Deno.openKv(getModuleDir(import.meta) + "/denoKv/denoKv.db");

export async function getAllTokens(): Promise<TokenWrapper[]> {
  const tokens: TokenWrapper[] = [];
  const entries = kv.list({ prefix: ["token"] });
  for await (const entry of entries) {
    tokens.push(
      new TokenWrapper(
        entry.key[1].toString(),
        Token.fromObject(entry.value as Partial<Token>)
      )
    );
  }
  return tokens;
}

export async function setToken(userID: string, token: Token) {
  await kv.set(["token", userID], { ...token });
}

export async function removeToken(userID: string) {
  await kv.delete(["token", userID]);
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

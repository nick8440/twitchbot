import { checkAuth, getBotAccessToken, refreshToken } from "./auth.ts";
import { startWebSocketClient } from "./websocket.ts";
import { getAllTokens } from "../db/db.ts";
import { TokenWrapper } from "../db/models/Tokens.ts";
import { WebSocketWrapper } from "./models/WebSocketWrapper.ts";

const sockets: Map<string, WebSocketWrapper> = new Map();

export async function start() {
  const userTokens = await getAllTokens();
  console.log(
    "Retrieved " + userTokens.length + " user tokens from the database"
  );
  const botToken = await getBotAccessToken();
  if (!botToken) {
    console.error("Could not retrieve bot token, shutting down");
    return;
  }
  userTokens.forEach(async (userToken) => {
    await createWebSocket(userToken, botToken);
  });
}

export function closeSocket(userID: string) {
  const data = sockets.get(userID);
  if (data && data.Socket) {
    console.log("Closing a socket for user " + userID);
    sockets.delete(userID);
    data.Socket.close();
  }
}

/**
 *
 * @param userToken Required: The user token to be used (will be refreshed if needed)
 * @param socketUID Optional: If specified, attempts to recreate an existing socket. If a socket doesn't exist, a new one will not be created.
 * @param reconnectURL Optional: If specified, will try to connect the socket with the URL provided (for reconnects).
 * If not specified, tries to create a new socket even if there isn't another one.
 */
export async function createOrRecreateSocket(
  userToken: TokenWrapper,
  socketUID: string | null = null,
  reconnectURL: string | null = null
) {
  const data = sockets.get(userToken.userID);
  console.log("Recreating a socket for user " + userToken.userID);
  if (socketUID) {
    console.log("Closing socket " + socketUID);
    if (data?.UID == socketUID) {
      console.log("Closing socket " + data.UID);
      sockets.delete(userToken.userID);
      data.Socket.close();
    } else {
      console.log(
        "Trying to close socket " +
          socketUID +
          ", but currently saved socket for this user is " +
          (data ? data.UID : "not defined")
      );
      console.log("Skipping recreating the socket...");
      return;
    }
  } else if (data) {
    console.log("Closing socket for user " + userToken.userID);
    sockets.delete(userToken.userID);
    data.Socket.close();
  }

  const botToken = await getBotAccessToken();
  if (!botToken) {
    console.error("Could not retrieve bot token, socket will not be recreated");
    return;
  }

  await createWebSocket(userToken, botToken, reconnectURL);
}

async function createWebSocket(
  userToken: TokenWrapper,
  botToken: string,
  url: string | null = null
) {
  if (new Date() > userToken.token.expirationDate) {
    console.log(
      "Token for " +
        userToken.token.username +
        " expired on " +
        userToken.token.expirationDate +
        ", refreshing the token..."
    );
    refreshToken(userToken);
    // refreshing the token will create a socket as the access token is changed
    return;
  }
  const isTokenValid = await checkAuth(userToken.token.accessToken);

  if (isTokenValid) {
    console.log(
      "Validated token for user " +
        userToken.token.username +
        ", trying to connect"
    );
    // Start WebSocket client and register handlers
    const socket = startWebSocketClient(userToken, botToken, url);
    if (socket) sockets.set(userToken.userID, socket);
  } else {
    console.log(
      "The token for user " +
        userToken.token.username +
        " was invalid. Please refresh it."
    );
  }
}

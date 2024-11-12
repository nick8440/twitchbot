import { checkAuth, getBotAccessToken, refreshToken } from "./auth.ts";
import { startWebSocketClient } from "./websocket.ts";
import { getAllTokens } from "../db/db.ts";
import { TokenWrapper } from "../db/Tokens.ts";

const sockets: Map<string, WebSocket> = new Map();

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
  const socket = sockets.get(userID);
  if (socket) {
    console.log("Closing a socket for user " + userID);
    socket.close();
  }
}

export async function createOrRecreateSocket(userToken: TokenWrapper) {
  const socket = sockets.get(userToken.userID);
  console.log("Recreating a socket for user " + userToken.userID);
  if (socket) {
    console.log("Closed existing socket");
    socket.close();
  }
  const botToken = await getBotAccessToken();
  if (!botToken) {
    console.error("Could not retrieve bot token, socket will not be recreated");
    return;
  }
  await createWebSocket(userToken, botToken);
}

async function createWebSocket(userToken: TokenWrapper, botToken: string) {
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
    const socket = startWebSocketClient(userToken, botToken);
    if (socket) sockets.set(userToken.userID, socket);
  } else {
    console.log(
      "The token for user " +
        userToken.token.username +
        " was invalid. Please refresh it."
    );
  }
}

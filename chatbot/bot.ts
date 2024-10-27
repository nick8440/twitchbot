import { checkAuth, getBotAccessToken } from "./auth.ts";
import { startWebSocketClient } from "./websocket.ts";
import { getAllTokens } from "../db/db.ts";

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
    // Verify that the authentication is valid
    const isTokenValid = await checkAuth(userToken.token.accessToken);

    if (isTokenValid) {
      console.log(
        "Validated token for user " +
          userToken.token.username +
          ", trying to connect"
      );
      // Start WebSocket client and register handlers
      startWebSocketClient(userToken, botToken);
    } else {
      console.log(
        "The token for user " +
          userToken.token.username +
          " was invalid. Please refresh it."
      );
    }
  });
}

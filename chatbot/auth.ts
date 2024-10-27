import { getBotToken, setBotToken } from "../db/db.ts";
import type { BotToken } from "../db/Tokens.ts";

export async function checkAuth(token: string) {
  // https://dev.twitch.tv/docs/authentication/validate-tokens/#how-to-validate-a-token
  const response: Response = await fetch(
    "https://id.twitch.tv/oauth2/validate",
    {
      method: "GET",
      headers: {
        Authorization: "OAuth " + token,
      },
    }
  );

  if (response.status != 200) {
    const data = await response.json();
    console.error(
      "Token is not valid. /oauth2/validate returned status code " +
        response.status
    );
    console.error(data);
    return false;
  }

  return true;
}

export async function getBotAccessToken(): Promise<string | null> {
  const token = await getBotToken();
  if (
    token &&
    isAfterTomorrow(token.expirationDate) &&
    (await checkAuth(token.accessToken))
  ) {
    return token.accessToken;
  } else {
    console.log("Bot access token will expire soon, refreshing");
    const data = await fetch("https://id.twitch.tv/oauth2/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: "client_id=m23w8hhc1si78h39q74mkp8m5n4i5s&client_secret=kp0gpenqdvz5gwhck5k6itnb60f6gm&grant_type=client_credentials",
    })
      .then((response) => response.json())
      .catch((error) => console.error("Error getting bot token:", error));
    if (!data.access_token) {
      return null;
    }
    const token: BotToken = {
      accessToken: data.access_token,
      expirationDate: getExpirationDate(data.expires_in),
    };
    setBotToken(token);
    return token.accessToken;
  }
}

function getExpirationDate(secondsUntilExpiration: number) {
  const currentDate = new Date();
  const expirationDate = new Date(
    currentDate.getTime() + secondsUntilExpiration * 1000
  );
  return expirationDate;
}

function isAfterTomorrow(date: Date) {
  const now = new Date();

  // Calculate the threshold for "after tomorrow" by adding 48 hours
  const afterTomorrow = new Date(now.getTime() + 48 * 60 * 60 * 1000);

  // Check if the provided date is after this threshold
  return date > afterTomorrow;
}

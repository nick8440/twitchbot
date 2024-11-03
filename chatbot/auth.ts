import { getBotToken, setBotToken, setToken } from "../db/db.ts";
import type { BotToken, TokenWrapper } from "../db/Tokens.ts";
import { isAfterTomorrow, getExpirationDate } from "../shared/expiration.ts";

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

export async function refreshToken(userToken: TokenWrapper) {
  const body = new URLSearchParams({
    client_id: "m23w8hhc1si78h39q74mkp8m5n4i5s",
    client_secret: "kp0gpenqdvz5gwhck5k6itnb60f6gm",
    grant_type: "refresh_token",
    refresh_token: userToken.token.refreshToken,
  });

  const data = await fetch("https://id.twitch.tv/oauth2/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: body.toString(),
  })
    .then((response) => {
      if (response.ok) {
        return response.json();
      }
      return Promise.reject(response.json());
    })
    .then((data) => {
      console.log(data);
      return {
        access_token: data.access_token as string,
        refresh_token: data.refresh_token as string,
        expires_in: data.expires_in as number,
      };
    })
    .catch((error) => {
      console.error(
        "There was a problem with refreshing authentication token:",
        error
      );
    });

  if (data) {
    userToken.token.expirationDate = getExpirationDate(data.expires_in);
    userToken.token.refreshToken = data.refresh_token;
    userToken.token.accessToken = data.access_token;
    await setToken(userToken.userID, userToken.token);
  }
}

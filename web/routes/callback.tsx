import { type FreshContext } from "$fresh/server.ts";
import * as constants from "../../shared/const.ts";
import { setToken } from "../../db/db.ts";
import { Token } from "../../db/Tokens.ts";

export default async function Callback(_req: Request, ctx: FreshContext) {
  const code = ctx.url.searchParams.get("code");
  const scope = ctx.url.searchParams.get("scope");
  let success = false;
  if (code && typeof code === "string" && scope && typeof scope === "string") {
    const body = new URLSearchParams({
      client_id: constants.CLIENT_ID,
      client_secret: constants.CLIENT_SECRET,
      code: code,
      grant_type: "authorization_code",
      redirect_uri: constants.SITE_URL + "/callback",
    });
    const tokens = await fetch("https://id.twitch.tv/oauth2/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: body,
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
        };
      })
      .catch((error) => {
        console.error(
          "There was a problem with exchanging the code for a token:",
          error
        );
      });

    if (tokens) {
      const url = "https://api.twitch.tv/helix/users";
      const headers = {
        Authorization: "Bearer " + tokens.access_token,
        "Client-Id": constants.CLIENT_ID,
      };
      const userData = await fetch(url, {
        method: "GET",
        headers: headers,
      })
        .then((response) => {
          if (response.ok) {
            return response.json();
          }
          return Promise.reject(response.json());
        })
        .then((data) => {
          return {
            userID: data.data[0].id,
            username: data.data[0].login,
          };
        })
        .catch((error) => {
          success = false;
          console.error("There was a problem with getting user data:", error);
        });

      if (userData) {
        const token = new Token(
          userData.username,
          tokens.access_token,
          tokens.refresh_token
        );
        console.log("userID: ", userData.userID);
        console.log("Token: ", token);
        setToken(userData.userID, token);
        success = true;
      }
    }
  }

  return (
    <main>
      <div class="flex items-center justify-center min-h-screen">
        {success ? (
          <div
            class="p-4 mb-4 text-sm text-green-800 rounded-lg bg-green-50 dark:bg-gray-800 dark:text-green-400"
            role="alert"
          >
            <span class="font-medium">Success!</span>
            <br />
            <span class="font-medium">
              <a
                href="/"
                class="font-medium text-blue-600 underline dark:text-blue-500 hover:no-underline"
              >
                Go back to the main page
              </a>
            </span>
          </div>
        ) : (
          <div
            class="p-4 mb-4 text-sm text-red-800 rounded-lg bg-red-50 dark:bg-gray-800 dark:text-red-400"
            role="alert"
          >
            <span class="font-medium">
              There was a problem connecting your Twitch account. Please{" "}
              <a
                href="/"
                class="font-medium text-blue-600 underline dark:text-blue-500 hover:no-underline"
              >
                try again
              </a>{" "}
              later.
            </span>
          </div>
        )}
      </div>
    </main>
  );
}

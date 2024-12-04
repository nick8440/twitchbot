import * as constants from "../shared/const.ts";
import { TwitchStreamResponse } from "./models/TwitchStreamResponse.ts";
export async function isChannelOnline(
  userID: string,
  token: string
): Promise<boolean> {
  const url = `https://api.twitch.tv/helix/streams?user_id=${userID}`;

  // Fetch API request
  try {
    const response = await fetch(url, {
      method: "GET",
      headers: {
        "Client-ID": constants.CLIENT_ID,
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }

    const data: TwitchStreamResponse = await response.json();

    // Check the data field in the response
    if (data.data.length > 0) {
      const stream = data.data[0];
      console.log(`User ID ${userID} is online!`);
      console.log(`Title: ${stream.title}`);
      console.log(`Viewers: ${stream.viewer_count}`);
      return true;
    } else {
      console.log(`User ID ${userID} is offline.`);
    }
  } catch (error) {
    console.error("Error fetching Twitch stream data:", error);
  }
  return false;
}

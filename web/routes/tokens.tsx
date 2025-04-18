import type { PageProps } from "$fresh/server.ts";
import { Token, TokenWrapper } from "../../db/models/Tokens.ts";
import { getAllTokens, removeToken, setToken } from "../../db/db.ts";
import { Handlers } from "$fresh/server.ts";

export const handler: Handlers = {
  async GET(_req, ctx) {
    const hostname = new URL(_req.url).hostname;
    if (hostname !== "localhost" && hostname !== "127.0.0.1") {
      return new Response("404 Not Found", { status: 404 });
    }
    const tokens = await getAllTokens();
    return await ctx.render(tokens);
  },
  async POST(req, _ctx) {
    const form = await req.formData();
    if (form.get("action")?.toString() === "delete") {
      await removeToken(form.get("user_id")!.toString());
    } else {
      const user_id = form.get("user_id")!.toString();
      const token = new Token(
        form.get("username")!.toString(),
        form.get("token")!.toString(),
        form.get("refresh_token")!.toString(),
        new Date()
      );
      await setToken(user_id, token);
    }
    const headers = new Headers();
    headers.set("location", "/tokens");
    return new Response(null, {
      status: 303, // See Other
      headers,
    });
  },
};

export default function MainPage(props: PageProps<TokenWrapper[]>) {
  return (
    <div class="flex flex-col items-center space-y-4">
      <h1 class="text-xl font-medium">Token Management</h1>

      <h2 class="text-xl font-medium">Tokens:</h2>
      <ul class="bg-gray-50 p-4 rounded-md shadow-md w-full max-w-md">
        {props.data.map((member) => (
          <li class="py-2">
            User ID: {member.userID} User: {member.token.username} Token:{" "}
            {member.token.accessToken}
            <br />
            Expires on: {member.token.expirationDate.toUTCString()}
            <form method="post">
              <input type="hidden" name="action" value="delete"></input>
              <input type="hidden" name="user_id" value={member.userID}></input>
              <button
                type="submit"
                class="focus:outline-none text-white bg-red-700 hover:bg-red-800 focus:ring-4 focus:ring-red-300 font-medium rounded-lg text-sm px-5 py-2.5 me-2 mb-2 dark:bg-red-600 dark:hover:bg-red-700 dark:focus:ring-red-900"
              >
                Delete
              </button>
            </form>
          </li>
        ))}
      </ul>
      <form class="w-full max-w-md" method="post">
        <input type="hidden" name="action" value="post"></input>
        <input
          type="number"
          name="user_id"
          placeholder="User ID"
          class="block w-full p-2 border border-gray-300 rounded-md mb-4"
        ></input>
        <input
          type="text"
          name="username"
          placeholder="Username"
          class="block w-full p-2 border border-gray-300 rounded-md mb-4"
        ></input>
        <input
          type="text"
          name="token"
          placeholder="Access token"
          class="block w-full p-2 border border-gray-300 rounded-md mb-4"
        ></input>
        <input
          type="text"
          name="refresh_token"
          placeholder="Refresh token"
          class="block w-full p-2 border border-gray-300 rounded-md mb-4"
        ></input>
        <button
          type="submit"
          class="w-full bg-blue-500 text-white py-2 rounded-md"
        >
          Add token
        </button>
      </form>
    </div>
  );
}

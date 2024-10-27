import * as constants from "../../shared/const.ts";
export default function Home() {
  const scopes = ["channel:bot", "user:read:chat"];
  const href = `https://id.twitch.tv/oauth2/authorize?response_type=code&client_id=${
    constants.CLIENT_ID
  }&redirect_uri=http://localhost:8000/callback&scope=${scopes.join("+")}`;
  return (
    <div class="px-4 py-8 mx-auto">
      <div class="max-w-screen-md mx-auto flex flex-col items-center justify-center">
        <h1 class="text-4xl font-bold">Welcome to Bot844</h1>
        <p class="my-4">
          <a
            href={href}
            class="text-white bg-blue-700 hover:bg-blue-800 focus:ring-4 focus:ring-blue-300 font-medium rounded-lg text-sm px-5 py-2.5 dark:bg-blue-600 dark:hover:bg-blue-700 focus:outline-none dark:focus:ring-blue-800"
          >
            Connect with Twitch
          </a>
        </p>
      </div>
    </div>
  );
}

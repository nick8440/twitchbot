# Bot844
A generic [Deno](https://deno.com/)-based Twitch Chatbot implementation that can be hosted on your own machine or on a server.
## Overview
The project contains two parts:
1. A small website that contains a "Login with Twitch" button, allowing your users to connect the bot to their channel.
![image](https://github.com/user-attachments/assets/f33151b9-34c2-4ae7-ad18-252ac20fc907)
2. A backend-only running service that contains the actual chatbot, using Twitch Websocket API to react to events and messages.

## Running the bot

1. [Install Deno on your machine.](https://docs.deno.com/runtime/getting_started/installation/)
2. Register your [Twitch application](https://dev.twitch.tv/docs/authentication/register-app/)

*Note: you might want to create a new account for this, as this account will be used as the bot.*

3. Now that you have your client ID and secret from step 2, get your bot acccount's user ID using the following CURL requests:
```
curl -X POST 'https://id.twitch.tv/oauth2/token' -H 'Content-Type: application/x-www-form-urlencoded' -d 'client_id=<YOUR_CLIENT_ID>&client_secret=<YOUR_CLIENT?SECRET>&grant_type=client_credentials'
```
Copy the ```access_token``` field from the result, and run
```
curl -X GET 'https://api.twitch.tv/helix/users?login=<YOUR_BOT_CHANNEL_NAME>' -H 'Authorization: Bearer <YOUR_ACCESS_TOKEN>' -H 'Client-Id: <YOUR_CLIENT_ID>'
```
The ```id``` field in the result is your bot's user ID.

4. Create an ```.env``` file in the project's root folder with the following contents:
```
BOT_USER_ID=<See step 3>
CLIENT_ID=<See step 2>
CLIENT_SECRET=<See step 2>
SITE_URL=http://localhost:8000/
OPENAI_API_KEY=<Not needed for now, put any value>
```
5. Run the project:
```
deno task build && deno task start
```

*Note: ```deno task build``` is only required for the first run. After that, use ```deno task start``` only.*

6. Add the local website's address to twitch application settings.

In the Twitch Application settings at https://dev.twitch.tv/console/apps/, add ```http://localhost:8000/callback``` to OAuth Redirect URLs.

That's it! At this point, you can open the local website, click on the button and add the bot to your channel. To test the bot, you can type ```HeyGuys``` in the chat channel and it should respond.

## Customizing the bot
### Chat commands/responses

The bot is made to be fairly generic, and it uses 2 specific files to customize chat responses.

### Chat responses

In ```chatbot\data\chatResponses.ts```, you can add more chat responses (chat commands are simply responses to messages that start with !<command-name>).

For example:
```
  {
    text: "HeyGuys", // THIS field can be any piece of a text that the bot will check all chat messages for. 
    type: ChatResponseCheckType.StartsWith, // StartsWith will only respond if the message STARTS with "text" - perfect for commands like !test. Contains will respond if any part of the message contains "text".
    response: (event) => Strings.strings.greeting(event.ChatterName), // Either a static string, or a localized string - see the next section to learn about those.
  },
```
### Localized custom strings

```chatbot\data\strings.ts``` contains customizable and localized text strings that can be reused in your responses (and other parts of the chatbot).

For example:
```
  greeting: {
    en: "{0} VoHiYo",
    fr: "{0} Le VoHiYo"
  },
```

There are three notable pieces of code here:

1. You can localize your response strings into different languages. Note that English will be used both as the default language, and as the fallback language in case requested localization doesn't exist.

To add more localizations, modify ```type SupportedLanguages = "en" | "ru"; // Add more languages as needed```

2. You can pass parameters to your response strings, and they will replace {0}, {1} and so on - not unlike String.format from C#. In the example given, you want to replace {0} with the chatter's name.

Simply call this string as follows: ```Strings.strings.greeting(event.ChatterName /* <---- use the parameters here */)```

3. You can add more strings as needed. Modify the ```LocalizationMap``` array and add the name to ```LocalizationKeys``` in the same file.

## ChatGPT support

ChatGPT is already fully implemented into the chatbot. Simply get your [API key](https://platform.openai.com/api-keys) and put it into the ```.env``` file as ```OPENAI_API_KEY=<your key here>```.

After that, users should be able to call !chatgpt in your chat with a prompt.

### Settings

By default, to prevent the abuse of your API key, !chatgpt command has a 10 second delay. Additionally, if the stream is offline, only the channel owner can use the command.
You may change those settings in ```chatbot\handlers\openAI.ts```.


## Hosting your chatbot with Amazon EC2 (or alternatives)
This repository already contains a CI/CD workflow that will automatically deploy the chatbot to your server, once you add a Github Runner. It also contains a Dockerfile with the information required to create a Docker image.

Amazon EC2 provides a free tier of a server that is more than enough to host this bot, as it is pretty lightweight. However, it requires quite a few steps to set up:

1. On your server, set up a [self-hosted github runner](https://docs.github.com/en/actions/hosting-your-own-runners/managing-self-hosted-runners/adding-self-hosted-runners)
2. Install Docker on your server
3. Try to run the CI/CD pipeline. If it runs without any issues, it will create a twitchbot folder in your target directory. On the same level as the twitchbot folder, create an ```.env``` file and copy the contents from your local machine.
4. At this point the website should be working properly locally. By default, the CI/CD will point it to the local port 8000, so you can try to ping it:
```
curl -GET localhost:8000
```
If you get an HTML page as a result, it is working.
```
<!DOCTYPE html><html><head><title>web</title><meta charset="utf-8"/><meta name="viewport"
```
5. Get a domain name at Namecheap or Vercel or something similar, and point it towards your machine`s IP. Also, enable the HTTP/HTTPS ports on your server. It should look like this:

__IP address__

<img width="466" alt="image" src="https://github.com/user-attachments/assets/00232693-adcf-4478-89ec-6e16c4929773" />

__Security settings__

<img width="550" alt="image" src="https://github.com/user-attachments/assets/91b56a43-bc2a-466b-8e16-ddb28dab1be2" />

__Domain settings__

<img width="393" alt="image" src="https://github.com/user-attachments/assets/15c18973-878f-42b1-b5b4-e929e8c2bff0" />

6. Set up HTTPS using [Certbot](https://certbot.eff.org/instructions?ws=nginx&os=snap)
7. [Set up NGINX](https://nginx.org/en/docs/beginners_guide.html) and point it towards your localhost port. It should look like this:

```
include /etc/nginx/conf.d/*.conf;

    server {
        listen 80;
        server_name <YOUR DOMAIN NAME>;
        return 301 https://$server_name$request_uri;
    }
    server {
        listen 443 ssl;
        server_name <YOUR DOMAIN NAME>;

        ssl_certificate /etc/letsencrypt/live/<YOUR DOMAIN NAME>/fullchain.pem;
        ssl_certificate_key /etc/letsencrypt/live/<YOUR DOMAIN NAME>/privkey.pem;
        location / {
            proxy_pass http://localhost:8000;
            proxy_http_version 1.1;
            proxy_set_header Upgrade $http_upgrade;
            proxy_set_header Connection 'upgrade';
            proxy_set_header Host $host;
            proxy_cache_bypass $http_upgrade;
        }
    }

    server {
        listen 80 default_server;
        return 444; # Close connection for other domains or unmatched requests
    }
```

8. At this point, the setup should be complete (unless I forgot something). Feel free to open your new website and click "connect with twitch"!
9. Before we end, however, you might want to make sure your [Docker log size is limited](https://docs.docker.com/engine/logging/drivers/local/), as the bot does a lot of logging.

## Troublehooting

The bot sends messages regarding most of its' flow to the console, which can be seen either in VSCode terminal locally or in Docker logs in deployment.

Generally speaking, because of the way Twitch API works, the WebSocket connection will be automatically closed by Twitch after a while, or simply closed on their side without a warning. Because of this, the chatbot will periodically check if the connection is still alive, and create a new WebSocket once it isn't. Additionally, access tokens also need to be renewed periodically. Lastly, as I found out after about 7 months of the bot running flawlessly, sometimes renewing an access token results in an Internal Server Error from Twitch API, which also needs to be accounted for.

After taking all of this into consideration, the chatbot is made with many various checks and reconnection methods, and should be stable once you complete the initial setup. However, there are a few points of note:

- The chatbot needs to be running in order to refresh access tokens. If you are running it locally, if the chatbot (or your computer) has been off for a long time, you may need to "Connect with Twitch" again.
- While I have been passively testing the bot for many months at this point, it is still possible that there might be some small bugs in the code or unexpected issues and/or changes on Twitch's side. The chat logs all actions, so check Docker logs or VSCode console to find out what the errors are.
- The chatbot uses a tiny local database called [Deno KV](https://docs.deno.com/deploy/kv/manual/) to store user tokens. You may see current tokens, and add them manually, using the /tokens route. Note that it should only be available locally on your machine, not in deployment.
- In fact, much of the process all the way until creating a WebSocket can be done manually by using curl/fetch requests to Twitch API, at which point you can add the token manually into the database using /tokens. Check the code for fetch requests used in the flow.

## Contributing

There are a couple of stubs with the code unfinished at ```chatbot\handlers```. It is meant to simulate chat points and voting/betting for users that are not Twitch partners yet, but the functionality is not developed yet.

Outside of the chatbot connecting to Twitch, the code is pretty generic and open to modification, so feel free to change it as you wish.

If you want to contribute with bug fixes, suggestions or new features, open a pull request or contact me at contact@nikolaik.dev.

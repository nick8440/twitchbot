import { type PageProps } from "$fresh/server.ts";
export default function App({ Component }: PageProps) {
  return (
    <html>
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>web</title>
        <link rel="stylesheet" href="/styles.css" />
      </head>
      <body class="bg-slate-900">
        <div class="fixed inset-0 z-0 pointer-events-none">
          <div class="absolute top-0 left-0 h-16 w-16">
            <img src="https://cdn.7tv.app/emote/01FXHYGAMG000B09ZDT0P8QP3C/4x.webp" />
          </div>
          <div class="absolute top-0 right-0 h-16 w-16">
            <img src="https://cdn.7tv.app/emote/01F6NET6G00009JYTB75QDKV1S/4x.webp" />
          </div>
          <div class="absolute bottom-0 left-0 h-16 w-64">
            <img
              class="emoticon"
              src="https://cdn.frankerfacez.com/emoticon/270930/4"
            />
          </div>
          <div class="absolute bottom-0 right-0 h-16 w-16">
            <img
              class="Emote_emote__Lckjz"
              src="https://cdn.betterttv.net/emote/58ae8407ff7b7276f8e594f2/3x.webp"
              alt="POGGERS, 3x"
            />
          </div>
        </div>
        <div class="relative z-10">
          <Component />
        </div>
      </body>
    </html>
  );
}

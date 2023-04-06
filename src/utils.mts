import { IncomingMessage } from "node:http"

import { AnySchema } from "yup"

export const parseSearchParams = <T extends AnySchema>(
  schema: T,
  req: IncomingMessage,
) =>
  schema.validate(
    Object.fromEntries(
      new URL(req.url as string, process.env.PUBLIC_URL).searchParams,
    ),
  )

export const subscribeToChannel = (channelId: string) =>
  fetch("https://pubsubhubbub.appspot.com", {
    method: "POST",
    body: new URLSearchParams([
      ["hub.callback", `${process.env.PUBLIC_URL}/pubsubhubbub`],
      ["hub.mode", "subscribe"],
      [
        "hub.topic",
        `https://www.youtube.com/xml/feeds/videos.xml?channel_id=${channelId}`,
      ],
      ["hub.verify", "async"],
    ]),
  })

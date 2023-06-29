import { IncomingMessage } from "node:http"

import { auth, youtube } from "@googleapis/youtube"
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

export const getOAuth2Client = () =>
  new auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    `${process.env.PUBLIC_URL}/oauth2callback`,
  )

export const getYoutubeClient = (refreshToken: string) => {
  const auth = getOAuth2Client()

  auth.setCredentials({ refresh_token: refreshToken })

  return youtube({ version: "v3", auth })
}

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

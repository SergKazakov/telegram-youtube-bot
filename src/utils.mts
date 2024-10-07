import { type IncomingMessage } from "node:http"

import { auth, youtube } from "@googleapis/youtube"
import * as yup from "yup"

export const parseSearchParams = <T extends yup.AnySchema>(
  schema: (y: typeof yup) => T,
  req: IncomingMessage,
) =>
  schema(yup).validate(
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

export const subscribeToChannel = (id: string) =>
  fetch("https://websubhub.com/hub", {
    method: "POST",
    body: new URLSearchParams([
      ["hub.mode", "subscribe"],
      [
        "hub.topic",
        `https://www.youtube.com/xml/feeds/videos.xml?channel_id=${id}`,
      ],
      ["hub.callback", `${process.env.PUBLIC_URL}/pubsubhubbub`],
    ]),
  })

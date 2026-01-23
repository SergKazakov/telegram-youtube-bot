import { type IncomingMessage } from "node:http"

import { auth, youtube } from "@googleapis/youtube"
import parse from "parse-duration"
import * as yup from "yup"

import { env } from "./env.mts"

export const parseSearchParams = <T extends yup.AnySchema>(
  schema: (y: typeof yup) => T,
  req: IncomingMessage,
) =>
  schema(yup).validate(
    Object.fromEntries(new URL(req.url as string, env.PUBLIC_URL).searchParams),
  )

export const getOAuth2Client = () =>
  new auth.OAuth2(
    env.GOOGLE_CLIENT_ID,
    env.GOOGLE_CLIENT_SECRET,
    `${env.PUBLIC_URL}/oauth2callback`,
  )

export const getYoutubeClient = (refreshToken: string) => {
  const auth = getOAuth2Client()

  auth.setCredentials({ refresh_token: refreshToken })

  return youtube({ version: "v3", auth })
}

export const subscribeToChannel = (id: string) =>
  fetch("https://pubsubhubbub.appspot.com", {
    method: "POST",
    body: new URLSearchParams([
      ["hub.callback", `${env.PUBLIC_URL}/pubsubhubbub`],
      ["hub.mode", "subscribe"],
      [
        "hub.topic",
        `https://www.youtube.com/xml/feeds/videos.xml?channel_id=${id}`,
      ],
      ["hub.verify", "async"],
    ]),
  })

export const isShorts = async (id: string) => {
  try {
    const {
      data: { items },
    } = await youtube({
      version: "v3",
      auth: env.YOUTUBE_API_TOKEN,
    }).videos.list({ part: ["contentDetails"], id: [id] })

    const duration = items?.[0]?.contentDetails?.duration

    if (!duration) {
      return false
    }

    const ms = parse(duration)

    return ms !== null && ms > 0 && ms <= 180_000
  } catch {
    return false
  }
}
